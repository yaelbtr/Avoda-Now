import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  securityHeaders,
  globalRateLimit,
  jobsListRateLimit,
  otpRateLimit,
  botDetection,
  antiEnumeration,
} from "../security";
import { makeRequest } from "./map";
import { getWorkersWithExpiringAvailability, markAvailabilityReminderSent, getJobCountByCityAndCategory, getActiveJobs, seedRegionsIfEmpty } from "../db";
import { sendSms } from "../sms";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Trust proxy: required for accurate IP detection behind load balancers ───
  app.set("trust proxy", 1);

  // ── Compression: gzip/brotli for all text responses (JSON, HTML, XML) ──────
  app.use(compression({ threshold: 1024 })); // only compress responses > 1KB

  // ── Security headers (helmet) ─────────────────────────────────────────────
  app.use(securityHeaders);

  // ── Cache-Control: API responses must never be cached by browsers/CDNs ─────
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // ── Body size limit: 8mb for photo upload, 10kb for all other API routes ───
  app.use("/api/upload-photo", express.json({ limit: "8mb" }));
  app.use("/api/trpc", express.json({ limit: "10kb" }));
  app.use("/api/trpc", express.urlencoded({ limit: "10kb", extended: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Global rate limit: 60 req/min per IP ─────────────────────────────────
  app.use("/api/trpc", globalRateLimit);

  // ── Bot detection: block known scraper User-Agents ────────────────────────
  app.use("/api/trpc", botDetection);

  // ── Anti-enumeration: detect sequential ID scanning ──────────────────────
  app.use("/api/trpc", antiEnumeration);

  // ── Stricter limits on jobs list endpoints ────────────────────────────────
  app.use("/api/trpc/jobs.list", jobsListRateLimit);
  app.use("/api/trpc/jobs.search", jobsListRateLimit);

  // ── OTP endpoint rate limit: 5 req/hour per IP ───────────────────────────
  app.use("/api/trpc/auth.sendOtp", otpRateLimit);

  // ── Geocode proxy for city search ──────────────────────────────────────────
  app.get("/api/maps/geocode", async (req, res) => {
    try {
      const address = req.query.address as string;
      if (!address) return res.status(400).json({ error: "address required" });
      const data = await makeRequest("/maps/api/geocode/json", { address });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "geocode failed" });
    }
  });

  // ── Profile photo upload endpoint (8mb limit, auth required) ──────────────
  app.post("/api/upload-photo", async (req, res) => {
    try {
      const { storagePut } = await import("../storage");
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Verify auth via sdk
      const { sdk: sdkInstance } = await import("./sdk");
      const authUser = await sdkInstance.authenticateRequest(req).catch(() => null);
      if (!authUser) return res.status(401).json({ error: "Unauthorized" });
      const { base64, mimeType } = req.body as { base64: string; mimeType: string };
      if (!base64 || !mimeType) return res.status(400).json({ error: "Missing base64 or mimeType" });
      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const key = `profile-photos/${authUser.id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "DB unavailable" });
      await db.update(users).set({ profilePhoto: url }).where(eq(users.id, authUser.id));
      res.json({ url });
    } catch (err) {
      console.error("[upload-photo]", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ── SEO: sitemap.xml (dynamic — includes /jobs/* routes with real job counts) ────────────────
  // In-process cache: regenerate at most once every 10 minutes
  let _sitemapCache: { xml: string; ts: number } | null = null;
  const SITEMAP_CACHE_TTL = 10 * 60 * 1000;

  app.get("/sitemap.xml", async (_req, res) => {
    const now = Date.now();
    if (_sitemapCache && now - _sitemapCache.ts < SITEMAP_CACHE_TTL) {
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=600");
      return res.send(_sitemapCache.xml);
    }

    const baseUrl = "https://avodanow.co.il";
    const todayStr = new Date().toISOString().split("T")[0];

    // Static pages
    const urls: string[] = [
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${baseUrl}/find-jobs</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>`,
      `<url><loc>${baseUrl}/post-job</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ];

    try {
      // Dynamic pages: only include city/category combos that have active jobs
      const jobCounts = await getJobCountByCityAndCategory();

      // Build sets of cities and categories that have jobs
      const activeCities = new Set<string>();
      const activeCategories = new Set<string>();
      const activeCombos = new Set<string>(); // "category|city"

      for (const row of jobCounts) {
        if (row.city) activeCities.add(row.city);
        if (row.category) activeCategories.add(row.category);
        if (row.city && row.category) activeCombos.add(`${row.category}|${row.city}`);
      }

      // /jobs/{city}
      for (const city of Array.from(activeCities)) {
        urls.push(`<url><loc>${baseUrl}/jobs/${encodeURIComponent(city)}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
      }

      // /jobs/{category}
      for (const cat of Array.from(activeCategories)) {
        urls.push(`<url><loc>${baseUrl}/jobs/${encodeURIComponent(cat)}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
      }

      // /jobs/{category}/{city}
      for (const combo of Array.from(activeCombos)) {
        const [cat, city] = combo.split("|");
        urls.push(`<url><loc>${baseUrl}/jobs/${encodeURIComponent(cat)}/${encodeURIComponent(city)}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`);
      }
    } catch (err) {
      console.warn("[sitemap] DB query failed, using static fallback:", err);
      // Fallback: add static city/category pages
      const fallbackCities = ["תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה"];
      const fallbackCats = ["delivery", "warehouse", "kitchen", "cleaning", "security"];
      for (const city of fallbackCities) urls.push(`<url><loc>${baseUrl}/jobs/${encodeURIComponent(city)}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
      for (const cat of fallbackCats) urls.push(`<url><loc>${baseUrl}/jobs/${encodeURIComponent(cat)}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    }

    // /jobs/today, /jobs/evening, /jobs/weekend, /jobs/immediate — time-based pages
    const TIME_FILTERS = ["today", "evening", "weekend", "immediate"];
    for (const tf of TIME_FILTERS) {
      urls.push(`<url><loc>${baseUrl}/jobs/${tf}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    }
    // /jobs/{time}/{city} — time + city combos for top cities
    const TOP_CITIES = ["תל אביב","ירושלים","חיפה","ראשון לציון","פתח תקווה","אשדוד","נתניה","באר שבע","בני ברק","רמת גן"];
    for (const tf of TIME_FILTERS) {
      for (const city of TOP_CITIES) {
        urls.push(`<url><loc>${baseUrl}/jobs/${tf}/${encodeURIComponent(city)}</loc><lastmod>${todayStr}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`);
      }
    }

    // /guide/temporary-jobs hub + all category sub-pages (always included — static content)
    const GUIDE_CATEGORIES = ["delivery","warehouse","kitchen","cleaning","childcare","eldercare","security","construction","retail","events","agriculture"];
    urls.push(`<url><loc>${baseUrl}/guide/temporary-jobs</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
    for (const cat of GUIDE_CATEGORIES) {
      urls.push(`<url><loc>${baseUrl}/guide/temporary-jobs/${cat}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
    }

    // /guide/:topic — standalone guide pages
    const GUIDE_TOPICS = ["student-jobs", "delivery-salary", "passover-jobs"];
    for (const topic of GUIDE_TOPICS) {
      urls.push(`<url><loc>${baseUrl}/guide/${topic}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
    }

    // /faq/:slug — FAQ pages
    const FAQ_SLUGS = ["jobs", "delivery-jobs", "student-jobs"];
    for (const slug of FAQ_SLUGS) {
      urls.push(`<url><loc>${baseUrl}/faq/${slug}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
    }

    // /best/:slug — curated best-jobs pages
    const BEST_SLUGS = ["delivery-jobs", "student-jobs", "evening-jobs", "weekend-jobs", "immediate-jobs"];
    for (const slug of BEST_SLUGS) {
      urls.push(`<url><loc>${baseUrl}/best/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    _sitemapCache = { xml, ts: Date.now() };
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(xml);
  });

  // ── SEO: RSS feed /jobs/rss.xml ────────────────────────────────────────────────────────────────
  let _rssCache: { xml: string; ts: number } | null = null;
  const RSS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  app.get("/jobs/rss.xml", async (_req, res) => {
    const now = Date.now();
    if (_rssCache && now - _rssCache.ts < RSS_CACHE_TTL) {
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600");
      return res.send(_rssCache.xml);
    }

    const baseUrl = "https://avodanow.co.il";
    const buildDate = new Date().toUTCString();

    try {
      const jobs = await getActiveJobs(100);
      const items = jobs.map((j) => {
        const title = `${j.title}${j.city ? ` ב${j.city}` : ""}`;
        // Build slug-based URL: /job/{id}-{slug}
        const titleSlug = j.title.trim().replace(/[\s_]+/g, "-").replace(/[^\u0590-\u05FF\w-]/g, "").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
        const citySlug = j.city ? j.city.trim().replace(/[\s_]+/g, "-").replace(/[^\u0590-\u05FF\w-]/g, "").slice(0, 30) : "";
        const slug = [titleSlug, citySlug].filter(Boolean).join("-");
        const link = slug ? `${baseUrl}/job/${j.id}-${slug}` : `${baseUrl}/job/${j.id}`;
        const pubDate = new Date(j.createdAt).toUTCString();
        const salary = j.salary
          ? `שכר: ₪${j.salary} ל${j.salaryType === "hourly" ? "שעה" : j.salaryType === "daily" ? "יום" : "חודש"}`
          : "";
        const desc = [j.description?.slice(0, 300), salary].filter(Boolean).join(" | ");
        return [
          "  <item>",
          `    <title><![CDATA[${title}]]></title>`,
          `    <link>${link}</link>`,
          `    <guid isPermaLink="true">${link}</guid>`,
          `    <pubDate>${pubDate}</pubDate>`,
          `    <description><![CDATA[${desc}]]></description>`,
          ...(j.category ? [`    <category><![CDATA[${j.category}]]></category>`] : []),
          "  </item>",
        ].join("\n");
      });

      const xml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
        `<channel>`,
        `  <title>AvodaNow — משרות זמניות</title>`,
        `  <link>${baseUrl}</link>`,
        `  <description>לוח דרושים מהיר ופשוט — עבודות זמניות קרוב אליך</description>`,
        `  <language>he</language>`,
        `  <lastBuildDate>${buildDate}</lastBuildDate>`,
        `  <atom:link href="${baseUrl}/jobs/rss.xml" rel="self" type="application/rss+xml"/>`,
        ...items,
        `</channel>`,
        `</rss>`,
      ].join("\n");

      _rssCache = { xml, ts: Date.now() };
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600");
      res.send(xml);
    } catch (err) {
      console.error("[rss] Failed to generate RSS feed:", err);
      res.status(500).send("RSS generation failed");
    }
  });

  // ── SEO: robots.txt ──────────────────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    const content = [
      "User-agent: *",
      "Allow: /",
      "Allow: /find-jobs",
      "Allow: /jobs",
      "Allow: /jobs/",
      "",
      "# Private pages — require login, no SEO value",
      "Disallow: /post-job",
      "Disallow: /my-jobs",
      "Disallow: /my-applications",
      "Disallow: /profile",
      "Disallow: /worker-profile",
      "Disallow: /admin",
      "Disallow: /api/",
      "Disallow: /dashboard",
      "",
      "Sitemap: https://avodanow.co.il/sitemap.xml",
    ].join("\n");
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(content);
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Seed regions on first startup
    seedRegionsIfEmpty().catch((err) => console.warn("[Regions] Seed failed:", err));
  });
}

startServer().catch(console.error);

// ── Availability expiry reminder: run every 5 minutes ────────────────────────
// Sends an SMS to workers whose availability expires in ~30 minutes.
setInterval(async () => {
  try {
    const expiring = await getWorkersWithExpiringAvailability();
    for (const worker of expiring) {
      const minutesLeft = Math.round((worker.availableUntil.getTime() - Date.now()) / 60_000);
      const msg =
        `הזמינות שלך ב-Job-Now פוקחת בעוד ${minutesLeft} דקות.
` +
        `להארכת הזמינות כנס ל: https://job-now.manus.space`;
      const result = await sendSms(worker.phone, msg);
      if (result.success) {
        await markAvailabilityReminderSent(worker.availabilityId);
        console.log(`[Reminder] Sent expiry SMS to worker ${worker.userId}`);
      }
    }
  } catch (err) {
    console.warn("[Reminder] Error sending availability expiry reminders:", err);
  }
}, 5 * 60 * 1000); // every 5 minutes

import "dotenv/config";
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
import { getWorkersWithExpiringAvailability, markAvailabilityReminderSent } from "../db";
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

  // ── Security headers (helmet) ─────────────────────────────────────────────
  app.use(securityHeaders);

  // ── Body size limit: 10kb for API, larger only for file upload routes ─────
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

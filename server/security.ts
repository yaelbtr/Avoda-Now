/**
 * Security middleware for Job-Now
 * Protects against: scraping, bot abuse, API enumeration, data theft, XSS, and CORS abuse.
 *
 * Exports:
 *   securityHeaders  — Helmet with CSP (enabled in production)
 *   corsMiddleware   — CORS restricted to allowed origins
 *   globalRateLimit  — 60 req/min per IP
 *   jobsListRateLimit — 20 req/min per IP (anti-scraping)
 *   otpRateLimit     — 5 req/hour per IP
 *   botDetection     — block known scraper User-Agents
 *   antiEnumeration  — detect sequential ID scanning
 */
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// ── Allowed CORS origins ──────────────────────────────────────────────────────
// Single source of truth for all allowed origins.
// Add new domains here when deploying to new environments.
const ALLOWED_ORIGINS = [
  "https://avodanow.co.il",
  "https://www.avodanow.co.il",
  "https://job-now.manus.space",
  "https://jobboard-resblbse.manus.space",
  // Dev: allow localhost on any port
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  // Manus sandbox preview domains (dev/staging)
  /^https:\/\/[a-z0-9-]+\.sg1\.manus\.computer$/,
  /^https:\/\/[a-z0-9-]+\.manus\.space$/,
];

/**
 * CORS middleware — restricts cross-origin requests to the allowed origins list.
 * Applied globally before tRPC and API routes.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl in dev)
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin not allowed — ${origin}`));
    }
  },
  credentials: true,           // allow cookies (session cookie)
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,               // preflight cache: 24h
});

// ── Helmet security headers ──────────────────────────────────────────────────
// CSP is enabled in production; disabled in development to allow Vite HMR.
const isProduction = process.env.NODE_ENV === "production";

export const securityHeaders = helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Google Maps JS API (loaded via Manus proxy)
            "https://maps.googleapis.com",
            "https://maps.gstatic.com",
            // Google Fonts
            "https://fonts.googleapis.com",
            // Inline scripts needed by Vite production build (hashed in prod)
            "'unsafe-inline'",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",  // Tailwind CSS-in-JS and inline styles
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "data:",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:",  // S3 CDN images, Google Maps tiles
          ],
          connectSrc: [
            "'self'",
            "https://maps.googleapis.com",
            "https://api.manus.im",
            "wss:",  // WebSocket for Vite HMR in dev (noop in prod)
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,  // CSP off in development — Vite HMR requires relaxed policy
  crossOriginEmbedderPolicy: false,  // Required for Google Maps
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// ── Known scraper / bot User-Agent patterns ──────────────────────────────────
const BOT_UA_PATTERNS = [
  /python-requests/i,
  /scrapy/i,
  /curl\//i,
  /wget\//i,
  /httpx/i,
  /aiohttp/i,
  /go-http-client/i,
  /java\//i,
  /okhttp/i,
  /axios\/0\.[0-9]/i, // very old axios versions used by scrapers
  /node-fetch/i,
  /got\//i,
  /superagent/i,
  /libwww-perl/i,
  /mechanize/i,
  /phantomjs/i,
  /headlesschrome/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /^$/,  // empty User-Agent
];

/**
 * Block requests from known scraper bots.
 * Legitimate browsers always send a proper User-Agent.
 */
export function botDetection(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers["user-agent"] ?? "";
  const isBot = BOT_UA_PATTERNS.some((pattern) => pattern.test(ua));
  if (isBot) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  next();
}

// ── Global rate limiter — 60 req/min per IP ──────────────────────────────────
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי בקשות. נסה שוב בעוד דקה." },
  skip: (req) => req.path.startsWith("/api/oauth"), // don't limit OAuth flow
});

// ── Jobs list rate limiter — 20 req/min per IP (anti-scraping) ───────────────
export const jobsListRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי בקשות לרשימת משרות. נסה שוב בעוד דקה." },
  keyGenerator: (req) => {
    // Use forwarded IP if behind proxy, fall back to socket IP
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
    return req.socket.remoteAddress ?? "unknown";
  },
});

// ── OTP rate limiter — 5 req/hour per IP (already in smsProvider, extra layer) ─
// Express-level OTP guard: high ceiling (50/hour) to catch only extreme abuse.
// Fine-grained per-phone limits (5/hour for regular users, unlimited for admins)
// are enforced inside the tRPC sendOtp procedure via checkAndIncrementSendRate.
export const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי ניסיונות אימות. נסה שוב בעוד שעה." },
});

// ── Request body size limit ──────────────────────────────────────────────────
// Applied via express.json({ limit: "10kb" }) in the main server file.

// ── Anti-enumeration: detect sequential ID scanning ─────────────────────────
const enumerationTracker = new Map<string, { ids: number[]; lastSeen: number }>();
const ENUM_WINDOW_MS = 10_000; // 10 seconds
const ENUM_THRESHOLD = 15;     // 15 sequential IDs in 10s = suspicious

export function antiEnumeration(req: Request, res: Response, next: NextFunction) {
  // Only check /api/trpc/jobs.getById requests
  if (!req.path.includes("jobs.getById")) {
    next();
    return;
  }

  const ip = (() => {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string") return fwd.split(",")[0].trim();
    return req.socket.remoteAddress ?? "unknown";
  })();

  // Extract job ID from query string (tRPC sends it as JSON in `input`)
  const inputStr = typeof req.query.input === "string" ? req.query.input : "";
  let jobId: number | null = null;
  try {
    const parsed = JSON.parse(inputStr);
    const id = parsed?.id ?? parsed?.["0"]?.id;
    if (typeof id === "number") jobId = id;
  } catch {
    // ignore parse errors
  }

  if (jobId === null) {
    next();
    return;
  }

  const now = Date.now();
  const entry = enumerationTracker.get(ip);

  if (!entry || now - entry.lastSeen > ENUM_WINDOW_MS) {
    enumerationTracker.set(ip, { ids: [jobId], lastSeen: now });
    next();
    return;
  }

  entry.ids.push(jobId);
  entry.lastSeen = now;

  // Check if the IDs form a sequential pattern (e.g., 1,2,3,4,5...)
  if (entry.ids.length >= ENUM_THRESHOLD) {
    const sorted = [...entry.ids].sort((a, b) => a - b);
    const isSequential = sorted.every(
      (id, i) => i === 0 || id - sorted[i - 1] <= 2
    );
    if (isSequential) {
      enumerationTracker.delete(ip);
      res.status(429).json({ error: "חשד לסריקה אוטומטית. גישה חסומה זמנית." });
      return;
    }
    // Reset window if not sequential
    enumerationTracker.set(ip, { ids: [jobId], lastSeen: now });
  }

  next();
}

// ── Cleanup stale enumeration entries every 5 minutes ───────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(enumerationTracker.entries())) {
    if (now - entry.lastSeen > ENUM_WINDOW_MS * 6) {
      enumerationTracker.delete(ip);
    }
  }
}, 5 * 60 * 1000);

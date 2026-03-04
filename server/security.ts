/**
 * Security middleware for Job-Now
 * Protects against: scraping, bot abuse, API enumeration, and data theft.
 */
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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
export const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי ניסיונות אימות. נסה שוב בעוד שעה." },
});

// ── Helmet security headers ──────────────────────────────────────────────────
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Vite dev server needs this off; enable in prod via env
  crossOriginEmbedderPolicy: false, // Required for Google Maps
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
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

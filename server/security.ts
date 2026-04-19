/**
 * Security middleware for Job-Now
 * Protects against: scraping, bot abuse, API enumeration, data theft, XSS, CORS abuse,
 * and path traversal (CWE-22) on tRPC batch endpoints.
 *
 * Exports:
 *   securityHeaders       — Helmet with CSP (enabled in production)
 *   corsMiddleware        — CORS restricted to allowed origins
 *   globalRateLimit       — 60 req/min per IP
 *   jobsListRateLimit     — 20 req/min per IP (anti-scraping)
 *   otpRateLimit          — 5 req/hour per IP
 *   botDetection          — block known scraper User-Agents
 *   antiEnumeration       — detect sequential ID scanning
 *   trpcPathTraversalGuard — block path traversal patterns in tRPC batch URLs (CWE-22)
 *   buildCspDirectives     — nonce-aware CSP directive builder (used by serveStatic for per-request nonce injection)
 */
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ENV } from "./_core/env";

function toOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function addOrigin(target: string[], value: string | undefined): void {
  const origin = toOrigin(value);
  if (origin && !target.includes(origin)) {
    target.push(origin);
  }
}

// ── Allowed CORS origins ──────────────────────────────────────────────────────
// Single source of truth for all allowed origins.
// Add new domains here when deploying to new environments.
const ALLOWED_ORIGINS = [
  ...Array.from(new Set([
    "https://avodanow.co.il",
    "https://www.avodanow.co.il",
    "https://avoda-now.onrender.com",
    ENV.appOrigin,
  ])).filter(Boolean),
  // Dev: allow localhost on any port
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
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
// CSP is enabled in ALL environments.
// In development, extra Vite HMR directives are added to avoid blocking hot-reload.
const isProduction = process.env.NODE_ENV === "production";

/**
 * buildCspDirectives — returns a complete, nonce-aware CSP directive map.
 *
 * Design decisions:
 *  - 'unsafe-inline' is REMOVED from script-src in production; replaced by nonce + 'strict-dynamic'.
 *  - 'unsafe-inline' is kept in style-src (Tailwind + Radix UI inject inline styles at runtime).
 *  - img-src uses explicit CDN hostnames instead of 'https:' wildcard.
 *  - connect-src covers: tRPC (self), Forge proxy (Maps/LLM), OAuth, Umami, Push.
 *  - worker-src 'self' blob: covers /sw.js service worker.
 *  - frame-src / object-src: 'none' — clickjacking + plugin protection.
 *
 * @param nonce - Per-request cryptographic nonce (base64). Injected into script-src
 *                alongside 'strict-dynamic' to allow SSR shell inline scripts.
 * @param dev   - When true, adds Vite HMR relaxations: 'unsafe-inline', 'unsafe-eval',
 *                ws:, wss:. NEVER set in production.
 */
export function buildCspDirectives(
  nonce?: string,
  dev = false
): Record<string, string[]> {
  const mapsProxyUrl =
    process.env.MAPS_PROXY_URL ??
    process.env.VITE_MAPS_PROXY_URL ??
    process.env.VITE_FRONTEND_FORGE_API_URL ??
    ENV.forgeApiUrl;

  const scriptSrc: string[] = [
    "'self'",
    // Maps JS API loaded from Google CDN (required by Maps SDK)
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
  ];
  addOrigin(scriptSrc, ENV.forgeApiUrl);
  addOrigin(scriptSrc, mapsProxyUrl);
  addOrigin(scriptSrc, process.env.ANALYTICS_ENDPOINT ?? process.env.VITE_ANALYTICS_ENDPOINT);

  if (nonce) {
    // Nonce allows the specific inline <script> tags in index.html (SSR shell).
    // 'strict-dynamic' propagates trust to scripts loaded by the nonce-allowed script.
    scriptSrc.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  }

  if (dev) {
    // Vite HMR injects inline scripts and uses eval() for hot-module replacement.
    // These are only safe in a local development environment — NEVER in production.
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  }

  const connectSrc: string[] = [
    "'self'",
    // Google Maps API (direct calls from Maps SDK)
    "https://maps.googleapis.com",
    // Browser Web Push subscriptions (endpoint is dynamic per browser)
    "https:",
  ];
  addOrigin(connectSrc, ENV.forgeApiUrl);
  addOrigin(connectSrc, mapsProxyUrl);
  addOrigin(connectSrc, ENV.oAuthServerUrl);
  addOrigin(connectSrc, process.env.ANALYTICS_ENDPOINT ?? process.env.VITE_ANALYTICS_ENDPOINT);

  if (dev) {
    // Vite HMR uses WebSocket on the same host for hot-reload.
    // wss: covers the encrypted WebSocket used by the Vite dev server.
    connectSrc.push("ws:", "wss:");
  }

  return {
    // Fallback for directives not explicitly listed
    defaultSrc: ["'self'"],

    // JavaScript sources
    scriptSrc,

    // CSS sources — 'unsafe-inline' required for Tailwind + Radix UI runtime styles
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
    ],

    // Web fonts
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "data:",
    ],

    // Images — explicit CDN hostnames (no wildcard 'https:')
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      // Project CDN (S3 via CloudFront)
      "https://d2xsxph8kpxj0f.cloudfront.net",
      // Google Maps tiles and Street View
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
      "https://*.googleapis.com",
      "https://*.gstatic.com",
      // Google user avatars (OAuth profile pictures)
      "https://lh3.googleusercontent.com",
      // Unsplash placeholder images used in UI
      "https://images.unsplash.com",
      // GitHub avatars (used in some UI placeholders)
      "https://github.com",
    ],

    // XHR / fetch / WebSocket connections
    connectSrc,

    // Service Worker and dynamic workers
    workerSrc: ["'self'", "blob:"],

    // Manifest for PWA
    manifestSrc: ["'self'"],

    // No iframes allowed (prevents clickjacking)
    frameSrc: ["'none'"],

    // No plugins (Flash, Java applets, etc.)
    objectSrc: ["'none'"],

    // Restrict <base> tag to same origin
    baseUri: ["'self'"],

    // Form submissions only to same origin
    formAction: ["'self'"],

    // Force all HTTP sub-resources to HTTPS (skipped in dev — localhost is HTTP)
    ...(dev ? {} : { upgradeInsecureRequests: [] }),
  };
}

export const securityHeaders = helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Google Maps JS API
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
  // 60 req/min: generous enough for infinite-scroll pagination (10 items/page × up to 6 pages)
  // while still blocking scrapers that hit hundreds of requests per minute.
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי בקשות לרשימת משרות. נסה שוב בעוד דקה." },
  // Skip authenticated users: they are already rate-limited by the global 60 req/min limiter
  // and infinite scroll is a legitimate use-case for logged-in workers browsing jobs.
  skip: (req) => {
    // tRPC sets a session cookie; if it is present the user is authenticated
    const cookies = req.headers.cookie ?? "";
    return cookies.includes("app_session_id=");
  },
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

// ── Generic in-memory rate limiter factory ──────────────────────────────────
/**
 * Creates a reusable in-memory rate limiter.
 *
 * @param maxRequests  Maximum allowed calls within the window.
 * @param windowMs     Rolling window duration in milliseconds.
 * @returns            Object with `check(key)` and `reset(key)` helpers.
 *
 * `check(key)` returns:
 *   - `{ allowed: true }` when the call is within the limit.
 *   - `{ allowed: false, retryAfterMs: number }` when the limit is exceeded,
 *     where `retryAfterMs` is the milliseconds until the window resets.
 */
export function createInMemoryRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; windowStart: number }>();

  // Auto-cleanup stale entries every windowMs to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(store.entries())) {
      if (now - entry.windowStart >= windowMs) store.delete(key);
    }
  }, windowMs);

  return {
    check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now - entry.windowStart >= windowMs) {
        // New window
        store.set(key, { count: 1, windowStart: now });
        return { allowed: true };
      }

      if (entry.count >= maxRequests) {
        const retryAfterMs = windowMs - (now - entry.windowStart);
        return { allowed: false, retryAfterMs };
      }

      entry.count++;
      return { allowed: true };
    },

    reset(key: string): void {
      store.delete(key);
    },
  };
}

// ── tRPC Path Traversal Guard (CWE-22) ───────────────────────────────────────
/**
 * Blocks path traversal attempts on the tRPC batch endpoint.
 *
 * OWASP ZAP flags tRPC batch URLs like:
 *   /api/trpc/platform.settings,categories.list,live.heroStats?batch=1&input=...
 * because the procedure path looks like a file path with directory separators.
 *
 * This middleware validates:
 *  1. Procedure names in the URL path only contain safe characters
 *     (letters, digits, dots, commas, underscores, hyphens).
 *  2. The raw URL does not contain path traversal sequences
 *     (../, ..\, %2F%2E%2E, null bytes, encoded variants).
 *  3. The `input` query parameter, when present, does not contain
 *     traversal sequences after URL-decoding.
 *
 * Legitimate tRPC procedure names match: /^[a-zA-Z0-9._,\-]+$/
 * Any deviation is rejected with 400 Bad Request.
 */

/** Patterns that indicate a path traversal attempt. */
const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.[/\\]/,           // ../  or ..\
  /\.\.[/\\]?$/,         // .. at end of segment
  /%2e%2e[%2f%5c]/i,     // URL-encoded ../
  /%252e%252e/i,          // double-encoded ..
  /\0/,                   // null byte
  /%00/i,                 // URL-encoded null byte
  /[/\\]{2,}/,            // double slashes (path confusion)
];

/** Allowlist regex for tRPC procedure names in the URL path segment. */
const TRPC_PROCEDURE_ALLOWLIST = /^[a-zA-Z0-9._,\-]+$/;

/**
 * Express middleware that guards /api/trpc/* against CWE-22 path traversal.
 * Must be registered BEFORE the tRPC express middleware.
 */
export function trpcPathTraversalGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const rawUrl = req.url ?? "";

  // 1. Check raw URL for traversal sequences (catches encoded variants too)
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(rawUrl)) {
      res.status(400).json({ error: "Bad Request", code: "INVALID_PATH" });
      return;
    }
  }

  // 2. Validate the procedure name segment (everything after /api/trpc/)
  //    req.path in Express strips the mount prefix, so for /api/trpc/jobs.list
  //    req.path is /jobs.list — strip the leading slash.
  const procedurePath = req.path.replace(/^\//, "");
  if (procedurePath && !TRPC_PROCEDURE_ALLOWLIST.test(procedurePath)) {
    res.status(400).json({ error: "Bad Request", code: "INVALID_PROCEDURE" });
    return;
  }

  // 3. Check decoded `input` query param for traversal sequences
  const rawInput =
    typeof req.query.input === "string" ? req.query.input : "";
  if (rawInput) {
    let decoded = rawInput;
    try {
      decoded = decodeURIComponent(rawInput);
    } catch {
      // malformed encoding — treat as suspicious
      res.status(400).json({ error: "Bad Request", code: "INVALID_INPUT_ENCODING" });
      return;
    }
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(decoded)) {
        res.status(400).json({ error: "Bad Request", code: "INVALID_INPUT" });
        return;
      }
    }
  }

  next();
}

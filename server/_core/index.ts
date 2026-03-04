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

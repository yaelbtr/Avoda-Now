import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { buildCspDirectives } from "../security";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Hashed Vite assets (JS/CSS bundles with content hash) — safe to cache for 1 year
  app.use(
    "/assets",
    express.static(path.resolve(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    })
  );

  // Everything else (favicon, manifest, etc.) — cache for 1 day, except HTML
  app.use(
    express.static(distPath, {
      maxAge: "1d",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  // fall through to index.html — inject per-request CSP nonce
  // This replaces the static sendFile so we can:
  //  1. Generate a fresh nonce for every HTML response
  //  2. Inject it into all inline <script nonce="..."> tags in index.html
  //  3. Set the Content-Security-Policy header with the same nonce
  const isProduction = process.env.NODE_ENV === "production";
  const indexHtmlPath = path.resolve(distPath, "index.html");

  // Cache the index.html template in memory so we don't hit the disk on every
  // request. The file never changes at runtime (it's a build artifact), so
  // reading it once at startup is safe. This eliminates the ~1-5 ms fs.readFileSync
  // overhead per request and reduces TTFB for the HTML response.
  let _cachedIndexHtml: string | null = null;
  function getIndexHtml(): string {
    if (!_cachedIndexHtml) {
      _cachedIndexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    }
    return _cachedIndexHtml;
  }

  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (!isProduction) {
      // In development Vite serves HTML directly; this branch is a safety fallback.
      res.sendFile(indexHtmlPath);
      return;
    }

    try {
      let html = getIndexHtml();

      // Generate a cryptographically random nonce for this request.
      // nanoid(24) gives ~143 bits of entropy — well above the 128-bit minimum.
      const nonce = nanoid(24);

      // Inject nonce into every inline <script> tag in the SSR shell.
      // The SSR shell uses synchronous inline scripts that cannot be moved to
      // external files without breaking the instant-render behaviour.
      html = html.replace(/<script(?!\s[^>]*\bsrc=)/g, `<script nonce="${nonce}"`);

      // Build the full CSP directive set with this request's nonce.
      const directives = buildCspDirectives(nonce);

      // Serialise directives to a CSP header string.
      // Helmet's format: each directive is "name value1 value2; ..."
      const cspHeader = Object.entries(directives)
        .map(([key, values]) => {
          // Convert camelCase directive keys to kebab-case (Helmet convention)
          const kebab = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
          return values.length > 0 ? `${kebab} ${values.join(" ")}` : kebab;
        })
        .join("; ");

      res.setHeader("Content-Security-Policy", cspHeader);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } catch (err) {
      console.error("[CSP] Failed to inject nonce into index.html:", err);
      // Fallback: serve without nonce (CSP header still set by Helmet globally)
      res.sendFile(indexHtmlPath);
    }
  });
}

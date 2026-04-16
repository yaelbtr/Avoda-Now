import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

function resolveDistPublicPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
  ];

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  return match ?? candidates[0];
}

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
  const distPath = resolveDistPublicPath();
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  } else {
    console.log(`[Static] Serving client from ${distPath}`);
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

  app.use("/assets/*", (_req, res) => {
    res.status(404).end();
  });

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

  app.use((req, res, next) => {
    if (path.extname(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const DEFAULT_API_PROXY_TARGET = "http://localhost:3001";
const API_PROXY_CANDIDATES = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

async function canReachHealthcheck(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 400);

  try {
    const response = await fetch(`${baseUrl}/healthz`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveApiProxyTarget(command: "serve" | "build"): Promise<string> {
  const explicitTarget = process.env.VITE_API_PROXY_TARGET;
  if (explicitTarget) return explicitTarget;
  if (command !== "serve") return DEFAULT_API_PROXY_TARGET;

  for (const candidate of API_PROXY_CANDIDATES) {
    if (await canReachHealthcheck(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_API_PROXY_TARGET;
}

export default defineConfig(async ({ command }) => {
  const apiProxyTarget = await resolveApiProxyTarget(command);

  if (command === "serve") {
    console.log(`[vite] API proxy target: ${apiProxyTarget}`);
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // No manualChunks — let Rollup/Vite manage the entire chunk graph.
          // Any attempt to manually split vendor chunks caused circular import
          // ordering in production: the "vendor-react" chunk imported from
          // "vendor" because Rollup placed shared Radix/TanStack helpers there,
          // making vendor load BEFORE vendor-react and crashing with
          // "Cannot read properties of undefined (reading 'createContext')".
          // Vite's automatic chunking respects the import graph and is safe.
        },
      },
    },
    server: {
      host: true,
      allowedHosts: ["localhost", "127.0.0.1"],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      // פרוקסי לבקשות API לשרת החי שזמין כרגע בסביבת הפיתוח
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

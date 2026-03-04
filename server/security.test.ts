import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { botDetection, antiEnumeration } from "./security";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" },
    path: "/api/trpc/jobs.list",
    query: {},
    socket: { remoteAddress: "1.2.3.4" },
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const ctx = { statusCode: null as number | null, body: null as unknown };
  const res = {
    status(code: number) {
      ctx.statusCode = code;
      return res;
    },
    json(data: unknown) {
      ctx.body = data;
      return res;
    },
  } as unknown as Response;
  return { res, ctx };
}

// ── Bot Detection ─────────────────────────────────────────────────────────────

describe("botDetection middleware", () => {
  it("allows legitimate iPhone browser User-Agent", () => {
    const next = vi.fn();
    const req = makeReq({
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });
    const { res } = makeRes();
    botDetection(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows Android Chrome browser", () => {
    const next = vi.fn();
    const req = makeReq({
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      },
    });
    const { res } = makeRes();
    botDetection(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("blocks python-requests scraper", () => {
    const next = vi.fn();
    const req = makeReq({ headers: { "user-agent": "python-requests/2.31.0" } });
    const { res, ctx } = makeRes();
    botDetection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.statusCode).toBe(403);
  });

  it("blocks Scrapy spider", () => {
    const next = vi.fn();
    const req = makeReq({
      headers: { "user-agent": "Scrapy/2.11.0 (+https://scrapy.org)" },
    });
    const { res, ctx } = makeRes();
    botDetection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.statusCode).toBe(403);
  });

  it("blocks curl", () => {
    const next = vi.fn();
    const req = makeReq({ headers: { "user-agent": "curl/7.88.1" } });
    const { res, ctx } = makeRes();
    botDetection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.statusCode).toBe(403);
  });

  it("blocks empty User-Agent", () => {
    const next = vi.fn();
    const req = makeReq({ headers: { "user-agent": "" } });
    const { res, ctx } = makeRes();
    botDetection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.statusCode).toBe(403);
  });

  it("blocks headless Chrome", () => {
    const next = vi.fn();
    const req = makeReq({
      headers: { "user-agent": "Mozilla/5.0 HeadlessChrome/120.0" },
    });
    const { res, ctx } = makeRes();
    botDetection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.statusCode).toBe(403);
  });

  it("blocks Puppeteer", () => {
    const next = vi.fn();
    const req = makeReq({
      headers: { "user-agent": "Mozilla/5.0 puppeteer/21.0.0" },
    });
    const { res, ctx } = makeRes();
    botDetection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.statusCode).toBe(403);
  });
});

// ── Anti-Enumeration ──────────────────────────────────────────────────────────

describe("antiEnumeration middleware", () => {
  it("allows non-getById requests", () => {
    const next = vi.fn();
    const req = makeReq({ path: "/api/trpc/jobs.list" });
    const { res } = makeRes();
    antiEnumeration(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows getById requests with valid non-sequential input", () => {
    const next = vi.fn();
    const req = makeReq({
      path: "/api/trpc/jobs.getById",
      query: { input: JSON.stringify({ id: 42 }) },
    });
    const { res } = makeRes();
    antiEnumeration(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows getById with unparseable input", () => {
    const next = vi.fn();
    const req = makeReq({
      path: "/api/trpc/jobs.getById",
      query: { input: "invalid-json" },
    });
    const { res } = makeRes();
    antiEnumeration(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("blocks sequential ID enumeration attack (15 sequential IDs)", () => {
    const ip = "10.0.0.77";
    let blockedCtx: { statusCode: number | null } | null = null;

    for (let id = 1; id <= 15; id++) {
      const next = vi.fn();
      const req = makeReq({
        path: "/api/trpc/jobs.getById",
        query: { input: JSON.stringify({ id }) },
        headers: { "user-agent": "Mozilla/5.0", "x-forwarded-for": ip },
      });
      const { res, ctx } = makeRes();
      antiEnumeration(req, res, next);
      if (id === 15) {
        blockedCtx = ctx;
      }
    }

    expect(blockedCtx?.statusCode).toBe(429);
  });
});

// ── Exports ───────────────────────────────────────────────────────────────────

describe("security module exports", () => {
  it("exports all required middleware functions", async () => {
    const security = await import("./security");
    expect(typeof security.botDetection).toBe("function");
    expect(typeof security.antiEnumeration).toBe("function");
    expect(typeof security.globalRateLimit).toBe("function");
    expect(typeof security.jobsListRateLimit).toBe("function");
    expect(typeof security.otpRateLimit).toBe("function");
    expect(typeof security.securityHeaders).toBe("function");
  });
});

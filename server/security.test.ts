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

// ─── XSS Sanitization Tests ──────────────────────────────────────────────────

import { sanitizeText, sanitizeRichText, sanitizeTextArray } from "./sanitize";

describe("sanitizeText", () => {
  it("removes script tags", () => {
    const input = 'Hello <script>alert("xss")</script> World';
    expect(sanitizeText(input)).toBe("Hello  World");
  });

  it("removes event handler attributes", () => {
    const input = '<img src="x" onerror="alert(1)">';
    expect(sanitizeText(input)).toBe("");
  });

  it("removes all HTML tags", () => {
    const input = "<b>bold</b> and <i>italic</i>";
    expect(sanitizeText(input)).toBe("bold and italic");
  });

  it("preserves plain text including Hebrew", () => {
    const input = "שלום עולם! Hello World 123";
    expect(sanitizeText(input)).toBe("שלום עולם! Hello World 123");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("handles null gracefully", () => {
    expect(sanitizeText(null as unknown as string)).toBe("");
  });

  it("handles undefined gracefully", () => {
    expect(sanitizeText(undefined as unknown as string)).toBe("");
  });

  it("removes javascript: protocol links", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    expect(sanitizeText(input)).toBe("click");
  });
});

describe("sanitizeRichText", () => {
  it("allows safe HTML tags like b, i, ul, li", () => {
    const input = "<b>bold</b> <i>italic</i>";
    const result = sanitizeRichText(input);
    expect(result).toContain("<b>bold</b>");
    expect(result).toContain("<i>italic</i>");
  });

  it("removes script tags", () => {
    const input = "<p>Hello</p><script>alert('xss')</script>";
    expect(sanitizeRichText(input)).not.toContain("<script>");
  });

  it("removes onerror attributes", () => {
    const input = '<img src="x" onerror="alert(1)">';
    expect(sanitizeRichText(input)).not.toContain("onerror");
  });

  it("removes onclick attributes", () => {
    const input = '<p onclick="alert(1)">text</p>';
    expect(sanitizeRichText(input)).not.toContain("onclick");
  });
});

describe("sanitizeTextArray", () => {
  it("sanitizes each element in the array and filters empty results", () => {
    // sanitizeTextArray filters out empty strings after sanitization
    const input = ["normal text", '<script>alert("xss")</script>', "<b>bold</b>"];
    const result = sanitizeTextArray(input);
    // script tag becomes empty string and is filtered out by filter(Boolean)
    expect(result).toEqual(["normal text", "bold"]);
    expect(result).not.toContain("<script>");
  });

  it("handles empty array", () => {
    expect(sanitizeTextArray([])).toEqual([]);
  });
});

// ─── CORS Origin Pattern Tests ────────────────────────────────────────────────

describe("CORS allowed origin patterns", () => {
  // Mirror the patterns from security.ts
  const allowedPatterns = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
  ];
  const exactAllowed = [
    "https://avodanow.co.il",
    "https://www.avodanow.co.il",
    "https://avoda-now.onrender.com",
  ];

  function isOriginAllowed(origin: string): boolean {
    if (exactAllowed.includes(origin)) return true;
    return allowedPatterns.some((p) => p.test(origin));
  }

  it("allows localhost origins", () => {
    expect(isOriginAllowed("http://localhost:3000")).toBe(true);
    expect(isOriginAllowed("http://localhost:5173")).toBe(true);
  });

  it("allows production domains", () => {
    expect(isOriginAllowed("https://avodanow.co.il")).toBe(true);
    expect(isOriginAllowed("https://www.avodanow.co.il")).toBe(true);
    expect(isOriginAllowed("https://avoda-now.onrender.com")).toBe(true);
  });

  it("blocks unknown external origins", () => {
    expect(isOriginAllowed("https://evil.com")).toBe(false);
    expect(isOriginAllowed("https://attacker.io")).toBe(false);
    expect(isOriginAllowed("http://malicious-site.net")).toBe(false);
  });

  it("blocks non-https production domain", () => {
    expect(isOriginAllowed("http://avodanow.co.il")).toBe(false);
  });
});

// ─── Zod Input Validation Tests ───────────────────────────────────────────────

import { z } from "zod";

describe("Job input Zod schema max-length validation", () => {
  const jobInputSchema = z.object({
    title: z.string().min(2).max(200),
    description: z.string().min(5).max(3000),
    address: z.string().max(300).optional(),
    city: z.string().max(100).optional(),
    businessName: z.string().max(200).optional(),
    workingHours: z.string().max(200).optional(),
    contactName: z.string().max(100).optional(),
  });

  it("rejects title longer than 200 chars", () => {
    const result = jobInputSchema.safeParse({
      title: "a".repeat(201),
      description: "valid description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 3000 chars", () => {
    const result = jobInputSchema.safeParse({
      title: "Valid Title",
      description: "a".repeat(3001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects address longer than 300 chars", () => {
    const result = jobInputSchema.safeParse({
      title: "Valid Title",
      description: "Valid description",
      address: "a".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid job input", () => {
    const result = jobInputSchema.safeParse({
      title: "מחסנאי לעבודה מיידית",
      description: "דרוש מחסנאי לעבודה במחסן גדול בתל אביב",
      city: "תל אביב",
      address: "רחוב הרצל 1",
    });
    expect(result.success).toBe(true);
  });
});

describe("Worker profile Zod schema validation", () => {
  const workerProfileSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    workerBio: z.string().max(500).nullable().optional(),
    preferenceText: z.string().max(1000).nullable().optional(),
    workerTags: z.array(z.string().max(50)).max(20).optional(),
  });

  it("rejects bio longer than 500 chars", () => {
    const result = workerProfileSchema.safeParse({ workerBio: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 tags", () => {
    const result = workerProfileSchema.safeParse({
      workerTags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tag longer than 50 chars", () => {
    const result = workerProfileSchema.safeParse({
      workerTags: ["a".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid worker profile", () => {
    const result = workerProfileSchema.safeParse({
      name: "ישראל ישראלי",
      workerBio: "עובד מסור ואמין",
      workerTags: ["מחסנאי", "נהג", "ניקיון"],
    });
    expect(result.success).toBe(true);
  });
});

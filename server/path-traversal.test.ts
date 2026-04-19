/**
 * path-traversal.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for trpcPathTraversalGuard (CWE-22 fix).
 *
 * Tests cover:
 *  1. Legitimate tRPC batch URLs pass through
 *  2. Path traversal sequences in URL path are blocked (400)
 *  3. Invalid procedure name characters are blocked (400)
 *  4. Path traversal in `input` query param is blocked (400)
 *  5. Null bytes in URL are blocked (400)
 *  6. Double-encoded traversal sequences are blocked (400)
 *  7. Malformed URL encoding in input is blocked (400)
 */
import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { trpcPathTraversalGuard } from "./security";

// ── Test helper: build a minimal mock Express request ────────────────────────
function mockReq(path: string, inputQuery?: string): Request {
  const url = inputQuery ? `${path}?input=${inputQuery}` : path;
  return {
    url,
    path,
    query: inputQuery ? { input: inputQuery } : {},
    headers: {},
  } as unknown as Request;
}

// ── Test helper: build a mock Express response that captures status + json ────
function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("trpcPathTraversalGuard — CWE-22 path traversal protection", () => {
  // ── 1. Legitimate tRPC batch URLs must pass ──────────────────────────────
  it("allows legitimate single procedure path", () => {
    const req = mockReq("/jobs.list");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("allows legitimate batch procedure path (comma-separated)", () => {
    const req = mockReq("/platform.settings,categories.list,live.heroStats");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows procedure path with underscores and hyphens", () => {
    const req = mockReq("/admin.get_users,jobs.list-active");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows empty procedure path (root /api/trpc)", () => {
    const req = mockReq("/");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  // ── 2. Path traversal in URL path must be blocked ────────────────────────
  it("blocks ../ in URL path", () => {
    const req = mockReq("/../etc/passwd");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("blocks ..\\ in URL path", () => {
    const req = mockReq("/..\\windows\\system32");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // ── 3. Invalid procedure name characters must be blocked ─────────────────
  it("blocks procedure name with forward slash", () => {
    const req = mockReq("/jobs/list");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("blocks procedure name with backslash", () => {
    const req = mockReq("/jobs\\list");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("blocks procedure name with shell metacharacters", () => {
    const req = mockReq("/jobs;rm -rf /");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // ── 4. Path traversal in input query param must be blocked ───────────────
  it("blocks ../ in input query param", () => {
    const req = mockReq("/jobs.list", "../etc/passwd");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("blocks URL-encoded ../ in input query param", () => {
    const req = mockReq("/jobs.list", "%2e%2e%2fetc%2fpasswd");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // ── 5. Null bytes must be blocked ────────────────────────────────────────
  it("blocks null byte in URL", () => {
    const req = mockReq("/jobs.list\x00");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("blocks URL-encoded null byte in URL", () => {
    const req = mockReq("/jobs.list%00");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // ── 6. Double-encoded traversal must be blocked ──────────────────────────
  it("blocks double-encoded ../ (%252e%252e) in URL", () => {
    const req = mockReq("/%252e%252e%252fetc%252fpasswd");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // ── 7. Malformed URL encoding in input must be blocked ───────────────────
  it("blocks malformed percent-encoding in input param", () => {
    const req = mockReq("/jobs.list", "%GG%ZZ");
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // ── 8. Legitimate JSON input must pass ───────────────────────────────────
  it("allows legitimate JSON input param", () => {
    const input = encodeURIComponent(JSON.stringify({ category: "all", limit: 10 }));
    const req = mockReq("/jobs.list", input);
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows legitimate tRPC batch input param", () => {
    const batchInput = encodeURIComponent(
      JSON.stringify({ "0": { category: "all" }, "1": {} })
    );
    const req = mockReq(
      "/platform.settings,categories.list,live.heroStats",
      batchInput
    );
    const res = mockRes();
    const next = vi.fn();
    trpcPathTraversalGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

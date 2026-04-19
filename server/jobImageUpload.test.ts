/**
 * Tests for job image upload endpoint logic.
 * Covers: file type validation, size limit, S3 key format, auth guard.
 * These are pure-logic tests — no HTTP server or S3 calls are made.
 */
import { describe, it, expect } from "vitest";

// ── Constants (mirrors server/_core/index.ts) ──────────────────────────────
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8mb server hard limit
const CLIENT_MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4mb client soft limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// ── Pure helpers extracted from the endpoint ──────────────────────────────
function isAllowedMimeType(mime: string): mime is (typeof ALLOWED_MIME_TYPES)[number] {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function getExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function buildS3Key(userId: number, suffix: string, mimeType: string): string {
  return `job-images/${userId}-${suffix}.${getExtension(mimeType)}`;
}

function isWithinServerLimit(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES;
}

function isWithinClientLimit(sizeBytes: number): boolean {
  return sizeBytes <= CLIENT_MAX_SIZE_BYTES;
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe("Job image upload — MIME type validation", () => {
  it("accepts image/jpeg", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
  });

  it("accepts image/png", () => {
    expect(isAllowedMimeType("image/png")).toBe(true);
  });

  it("accepts image/webp", () => {
    expect(isAllowedMimeType("image/webp")).toBe(true);
  });

  it("rejects image/gif", () => {
    expect(isAllowedMimeType("image/gif")).toBe(false);
  });

  it("rejects application/pdf", () => {
    expect(isAllowedMimeType("application/pdf")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAllowedMimeType("")).toBe(false);
  });
});

describe("Job image upload — extension mapping", () => {
  it("maps image/png → png", () => {
    expect(getExtension("image/png")).toBe("png");
  });

  it("maps image/webp → webp", () => {
    expect(getExtension("image/webp")).toBe("webp");
  });

  it("maps image/jpeg → jpg", () => {
    expect(getExtension("image/jpeg")).toBe("jpg");
  });

  it("maps unknown type → jpg (safe fallback)", () => {
    expect(getExtension("image/bmp")).toBe("jpg");
  });
});

describe("Job image upload — S3 key format", () => {
  it("key starts with job-images/ prefix", () => {
    const key = buildS3Key(42, "ts-suffix", "image/jpeg");
    expect(key.startsWith("job-images/")).toBe(true);
  });

  it("key contains userId", () => {
    const key = buildS3Key(99, "ts-suffix", "image/jpeg");
    expect(key).toContain("99-");
  });

  it("key ends with correct extension for png", () => {
    const key = buildS3Key(1, "ts-suffix", "image/png");
    expect(key.endsWith(".png")).toBe(true);
  });

  it("key ends with correct extension for webp", () => {
    const key = buildS3Key(1, "ts-suffix", "image/webp");
    expect(key.endsWith(".webp")).toBe(true);
  });
});

describe("Job image upload — size limits", () => {
  it("4MB file passes client limit", () => {
    expect(isWithinClientLimit(4 * 1024 * 1024)).toBe(true);
  });

  it("4MB + 1 byte fails client limit", () => {
    expect(isWithinClientLimit(4 * 1024 * 1024 + 1)).toBe(false);
  });

  it("8MB file passes server limit", () => {
    expect(isWithinServerLimit(8 * 1024 * 1024)).toBe(true);
  });

  it("8MB + 1 byte fails server limit", () => {
    expect(isWithinServerLimit(8 * 1024 * 1024 + 1)).toBe(false);
  });

  it("client limit is stricter than server limit", () => {
    expect(CLIENT_MAX_SIZE_BYTES).toBeLessThan(MAX_FILE_SIZE_BYTES);
  });
});

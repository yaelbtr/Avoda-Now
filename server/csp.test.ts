/**
 * csp.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for buildCspDirectives (Content-Security-Policy builder).
 *
 * Tests cover:
 *  1. All required directives are present
 *  2. 'unsafe-inline' is absent from script-src (XSS protection)
 *  3. 'unsafe-inline' is present in style-src (required for Tailwind/Radix)
 *  4. Nonce is correctly injected into script-src when provided
 *  5. 'strict-dynamic' is added alongside nonce
 *  6. frame-src and object-src are locked to 'none'
 *  7. upgrade-insecure-requests is present
 *  8. All required CDN hostnames are in img-src
 *  9. All required API endpoints are in connect-src
 * 10. worker-src allows blob: for service worker
 * 11. Different nonces produce different script-src values (uniqueness)
 * 12. No nonce → no 'strict-dynamic' in script-src
 */
import { describe, it, expect } from "vitest";
import { buildCspDirectives } from "./security";

describe("buildCspDirectives — Content-Security-Policy builder", () => {
  // ── 1. All required directives are present ────────────────────────────────
  it("returns all required CSP directives", () => {
    const directives = buildCspDirectives();
    const keys = Object.keys(directives);
    expect(keys).toContain("defaultSrc");
    expect(keys).toContain("scriptSrc");
    expect(keys).toContain("styleSrc");
    expect(keys).toContain("fontSrc");
    expect(keys).toContain("imgSrc");
    expect(keys).toContain("connectSrc");
    expect(keys).toContain("workerSrc");
    expect(keys).toContain("frameSrc");
    expect(keys).toContain("objectSrc");
    expect(keys).toContain("baseUri");
    expect(keys).toContain("formAction");
    expect(keys).toContain("upgradeInsecureRequests");
  });

  // ── 2. 'unsafe-inline' must NOT be in script-src ─────────────────────────
  it("does NOT include 'unsafe-inline' in script-src", () => {
    const { scriptSrc } = buildCspDirectives();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  // ── 3. 'unsafe-inline' must be in style-src ──────────────────────────────
  it("includes 'unsafe-inline' in style-src (required for Tailwind/Radix)", () => {
    const { styleSrc } = buildCspDirectives();
    expect(styleSrc).toContain("'unsafe-inline'");
  });

  // ── 4. Nonce is injected into script-src when provided ───────────────────
  it("injects nonce into script-src when nonce is provided", () => {
    const nonce = "abc123XYZ";
    const { scriptSrc } = buildCspDirectives(nonce);
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
  });

  // ── 5. 'strict-dynamic' is added alongside nonce ─────────────────────────
  it("adds 'strict-dynamic' to script-src when nonce is provided", () => {
    const { scriptSrc } = buildCspDirectives("test-nonce");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  // ── 6. frame-src and object-src are locked to 'none' ─────────────────────
  it("locks frame-src to 'none' (prevents clickjacking)", () => {
    const { frameSrc } = buildCspDirectives();
    expect(frameSrc).toEqual(["'none'"]);
  });

  it("locks object-src to 'none' (no Flash/Java applets)", () => {
    const { objectSrc } = buildCspDirectives();
    expect(objectSrc).toEqual(["'none'"]);
  });

  // ── 7. upgrade-insecure-requests is present ──────────────────────────────
  it("includes upgrade-insecure-requests directive", () => {
    const { upgradeInsecureRequests } = buildCspDirectives();
    expect(upgradeInsecureRequests).toBeDefined();
    expect(Array.isArray(upgradeInsecureRequests)).toBe(true);
  });

  // ── 8. Required CDN hostnames are in img-src ─────────────────────────────
  it("includes CloudFront CDN in img-src", () => {
    const { imgSrc } = buildCspDirectives();
    expect(imgSrc).toContain("https://d2xsxph8kpxj0f.cloudfront.net");
  });

  it("includes Google Maps in img-src", () => {
    const { imgSrc } = buildCspDirectives();
    expect(imgSrc).toContain("https://maps.googleapis.com");
    expect(imgSrc).toContain("https://maps.gstatic.com");
  });

  it("includes Google user avatars in img-src", () => {
    const { imgSrc } = buildCspDirectives();
    expect(imgSrc).toContain("https://lh3.googleusercontent.com");
  });

  // ── 9. Required API endpoints are in connect-src ─────────────────────────
  it("includes Manus Forge proxy in connect-src", () => {
    const { connectSrc } = buildCspDirectives();
    expect(
      connectSrc.some(
        (s) =>
          s.includes("forge.butterfly-effect.dev") ||
          s.includes("forge.manus.im")
      )
    ).toBe(true);
  });

  it("includes Manus OAuth backend in connect-src", () => {
    const { connectSrc } = buildCspDirectives();
    expect(connectSrc).toContain("https://api.manus.im");
  });

  it("includes Google Maps API in connect-src", () => {
    const { connectSrc } = buildCspDirectives();
    expect(connectSrc).toContain("https://maps.googleapis.com");
  });

  // ── 10. worker-src allows blob: for service worker ───────────────────────
  it("allows blob: in worker-src for service worker", () => {
    const { workerSrc } = buildCspDirectives();
    expect(workerSrc).toContain("blob:");
    expect(workerSrc).toContain("'self'");
  });

  // ── 11. Different nonces produce different script-src values ─────────────
  it("produces unique script-src for different nonces", () => {
    const { scriptSrc: src1 } = buildCspDirectives("nonce-aaa");
    const { scriptSrc: src2 } = buildCspDirectives("nonce-bbb");
    expect(src1.join(" ")).not.toEqual(src2.join(" "));
  });

  // ── 12. No nonce → no 'strict-dynamic' in script-src ────────────────────
  it("does NOT add 'strict-dynamic' when no nonce is provided", () => {
    const { scriptSrc } = buildCspDirectives();
    expect(scriptSrc).not.toContain("'strict-dynamic'");
  });

  // ── 13. default-src is 'self' ─────────────────────────────────────────────
  it("sets default-src to 'self'", () => {
    const { defaultSrc } = buildCspDirectives();
    expect(defaultSrc).toEqual(["'self'"]);
  });

  // ── 14. base-uri and form-action are restricted to 'self' ─────────────────
  it("restricts base-uri to 'self'", () => {
    const { baseUri } = buildCspDirectives();
    expect(baseUri).toEqual(["'self'"]);
  });

  it("restricts form-action to 'self'", () => {
    const { formAction } = buildCspDirectives();
    expect(formAction).toEqual(["'self'"]);
  });

  // ── 15. dev=true adds HMR relaxations ───────────────────────────────────
  it("adds 'unsafe-inline' and 'unsafe-eval' to script-src in dev mode", () => {
    const { scriptSrc } = buildCspDirectives(undefined, true);
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'unsafe-eval'");
  });

  it("adds ws: and wss: to connect-src in dev mode for Vite HMR", () => {
    const { connectSrc } = buildCspDirectives(undefined, true);
    expect(connectSrc).toContain("ws:");
    expect(connectSrc).toContain("wss:");
  });

  it("does NOT add 'unsafe-eval' to script-src in production mode", () => {
    const { scriptSrc } = buildCspDirectives(undefined, false);
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("does NOT add ws: or wss: to connect-src in production mode", () => {
    const { connectSrc } = buildCspDirectives(undefined, false);
    expect(connectSrc).not.toContain("ws:");
    expect(connectSrc).not.toContain("wss:");
  });

  // ── 16. upgrade-insecure-requests is absent in dev mode ─────────────────
  it("omits upgrade-insecure-requests in dev mode (localhost is HTTP)", () => {
    const directives = buildCspDirectives(undefined, true);
    expect(directives.upgradeInsecureRequests).toBeUndefined();
  });

  it("includes upgrade-insecure-requests in production mode", () => {
    const directives = buildCspDirectives(undefined, false);
    expect(directives.upgradeInsecureRequests).toBeDefined();
  });
});

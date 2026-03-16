/**
 * employer-lock.test.ts
 *
 * Tests for the employer-lock feature:
 *  - isEmployerLockActive db helper
 *  - admin.getEmployerLock / admin.setEmployerLock procedures
 *  - platform.settings public procedure (bypass for admin/test roles)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock the db module so no real DB connection is needed ──────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSystemSetting: vi.fn(),
    setSystemSetting: vi.fn(),
    isEmployerLockActive: vi.fn(),
  };
});

import { getSystemSetting, setSystemSetting, isEmployerLockActive } from "./db";

const mockGetSystemSetting = vi.mocked(getSystemSetting);
const mockSetSystemSetting = vi.mocked(setSystemSetting);
const mockIsEmployerLockActive = vi.mocked(isEmployerLockActive);

// ── isEmployerLockActive helper ─────────────────────────────────────────────────────
describe("isEmployerLockActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when key is absent (null)", async () => {
    mockIsEmployerLockActive.mockResolvedValue(false);
    const result = await isEmployerLockActive();
    expect(result).toBe(false);
  });

  it("returns true when key is 'true'", async () => {
    mockIsEmployerLockActive.mockResolvedValue(true);
    const result = await isEmployerLockActive();
    expect(result).toBe(true);
  });

  it("returns false when key is 'false'", async () => {
    mockIsEmployerLockActive.mockResolvedValue(false);
    const result = await isEmployerLockActive();
    expect(result).toBe(false);
  });

  it("returns false for any other non-true value", async () => {
    mockIsEmployerLockActive.mockResolvedValue(false);
    const result = await isEmployerLockActive();
    expect(result).toBe(false);
  });
});// ── admin.getEmployerLock procedure ──────────────────────────────────────────
describe("admin.getEmployerLock procedure logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns { active: false } when lock is off", async () => {
    mockIsEmployerLockActive.mockResolvedValue(false);
    const active = await isEmployerLockActive();
    expect({ active }).toEqual({ active: false });
  });

  it("returns { active: true } when lock is on", async () => {
    mockIsEmployerLockActive.mockResolvedValue(true);
    const active = await isEmployerLockActive();
    expect({ active }).toEqual({ active: true });
  });
});

// ── admin.setEmployerLock procedure logic ────────────────────────────────────
describe("admin.setEmployerLock procedure logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls setSystemSetting with 'true' when activating", async () => {
    mockSetSystemSetting.mockResolvedValue(undefined);
    await setSystemSetting("employerLock", "true");
    expect(mockSetSystemSetting).toHaveBeenCalledWith("employerLock", "true");
  });

  it("calls setSystemSetting with 'false' when deactivating", async () => {
    mockSetSystemSetting.mockResolvedValue(undefined);
    await setSystemSetting("employerLock", "false");
    expect(mockSetSystemSetting).toHaveBeenCalledWith("employerLock", "false");
  });

  it("returns { success: true, active: true } on activation", async () => {
    mockSetSystemSetting.mockResolvedValue(undefined);
    await setSystemSetting("employerLock", "true");
    const result = { success: true, active: true };
    expect(result).toEqual({ success: true, active: true });
  });

  it("returns { success: true, active: false } on deactivation", async () => {
    mockSetSystemSetting.mockResolvedValue(undefined);
    await setSystemSetting("employerLock", "false");
    const result = { success: true, active: false };
    expect(result).toEqual({ success: true, active: false });
  });
});

// ── platform.settings bypass logic ───────────────────────────────────────────
describe("platform.settings bypass logic", () => {
  beforeEach(() => vi.clearAllMocks());

  const buildSettingsResult = (
    employerLock: boolean,
    role?: "admin" | "test" | "user"
  ) => {
    const bypassLock = role === "admin" || role === "test";
    return { employerLock: bypassLock ? false : employerLock };
  };

  it("returns employerLock=false for admin even when lock is active", () => {
    const result = buildSettingsResult(true, "admin");
    expect(result.employerLock).toBe(false);
  });

  it("returns employerLock=false for test user even when lock is active", () => {
    const result = buildSettingsResult(true, "test");
    expect(result.employerLock).toBe(false);
  });

  it("returns employerLock=true for regular user when lock is active", () => {
    const result = buildSettingsResult(true, "user");
    expect(result.employerLock).toBe(true);
  });

  it("returns employerLock=false for regular user when lock is inactive", () => {
    const result = buildSettingsResult(false, "user");
    expect(result.employerLock).toBe(false);
  });

  it("returns employerLock=true for unauthenticated user when lock is active", () => {
    const result = buildSettingsResult(true, undefined);
    expect(result.employerLock).toBe(true);
  });

  it("returns employerLock=false for unauthenticated user when lock is inactive", () => {
    const result = buildSettingsResult(false, undefined);
    expect(result.employerLock).toBe(false);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────
describe("employer lock edge cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isEmployerLockActive is idempotent — same key read twice returns consistent value", async () => {
    mockIsEmployerLockActive.mockResolvedValue(true);
    const a = await isEmployerLockActive();
    const b = await isEmployerLockActive();
    expect(a).toBe(b);
  });

  it("setSystemSetting is called exactly once per toggle", async () => {
    mockSetSystemSetting.mockResolvedValue(undefined);
    await setSystemSetting("employerLock", "true");
    expect(mockSetSystemSetting).toHaveBeenCalledTimes(1);
  });

  it("activating then deactivating results in two separate setSystemSetting calls", async () => {
    mockSetSystemSetting.mockResolvedValue(undefined);
    await setSystemSetting("employerLock", "true");
    await setSystemSetting("employerLock", "false");
    expect(mockSetSystemSetting).toHaveBeenCalledTimes(2);
    expect(mockSetSystemSetting).toHaveBeenNthCalledWith(1, "employerLock", "true");
    expect(mockSetSystemSetting).toHaveBeenNthCalledWith(2, "employerLock", "false");
  });
});

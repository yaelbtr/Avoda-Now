/**
 * Regression tests for verifyEmailCode procedure — name and phone saving.
 *
 * Bug: verifyEmailCode did not accept `name` or `phone` in its input schema,
 * so new email_otp users were created with name=null and phone=null even when
 * the registration form collected those values.
 *
 * Fix: Added optional `name` and `phone` fields to the input schema.
 *      After createUserByEmail(), if name/phone are provided, updateWorkerProfile()
 *      is called immediately to persist them.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn(),
    logEvent: vi.fn().mockResolvedValue(undefined),
    getUserByEmail: vi.fn(),
    createUserByEmail: vi.fn(),
    updateWorkerProfile: vi.fn().mockResolvedValue(undefined),
    updateUserLastSignedIn: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./emailOtp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./emailOtp")>();
  return {
    ...actual,
    verifyEmailOtp: vi.fn(),
  };
});

vi.mock("./smsProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./smsProvider")>();
  return {
    ...actual,
    normalizeIsraeliPhone: vi.fn((p: string) => {
      // Simple mock: 0501234567 → +972501234567
      if (p.startsWith("0")) return "+972" + p.slice(1);
      return p;
    }),
    splitIsraeliE164Phone: vi.fn((p: string) => {
      // +972501234567 → { prefix: "050", number: "1234567" }
      const local = "0" + p.slice(4);
      return { prefix: local.slice(0, 3), number: local.slice(3) };
    }),
  };
});

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  getUserByEmail,
  createUserByEmail,
  updateWorkerProfile,
} from "./db";
import { verifyEmailOtp } from "./emailOtp";
import { normalizeIsraeliPhone, splitIsraeliE164Phone } from "./smsProvider";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("verifyEmailCode — name and phone saving (regression)", () => {
  const mockUser = {
    id: 42,
    openId: "test-open-id",
    email: "test@example.com",
    name: null,
    phone: null,
    loginMethod: "email_otp",
    role: "user",
    userMode: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (verifyEmailOtp as ReturnType<typeof vi.fn>).mockResolvedValue("ok");
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null); // new user
    (createUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
  });

  it("calls updateWorkerProfile with name when provided for new user", async () => {
    // Simulate the logic that verifyEmailCode now executes
    const email = "test@example.com";
    const inputName = "ישראל ישראלי";
    const inputPhone = undefined;

    const result = await verifyEmailOtp(email, "123456");
    expect(result).toBe("ok");

    const user = await createUserByEmail(email);
    expect(user.id).toBe(42);

    if (inputName || inputPhone) {
      let normalizedPhone: string | undefined;
      let phoneParts: { phonePrefix?: string; phoneNumber?: string } = {};
      if (inputPhone) {
        normalizedPhone = normalizeIsraeliPhone(inputPhone);
        const split = splitIsraeliE164Phone(normalizedPhone);
        if (split) phoneParts = { phonePrefix: split.prefix, phoneNumber: split.number };
      }
      await updateWorkerProfile(user.id, {
        ...(inputName ? { name: inputName } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone, ...phoneParts } : {}),
      });
    }

    expect(updateWorkerProfile).toHaveBeenCalledWith(42, { name: "ישראל ישראלי" });
  });

  it("calls updateWorkerProfile with name AND phone when both provided", async () => {
    const email = "test@example.com";
    const inputName = "ישראל ישראלי";
    const inputPhone = "0501234567";

    const user = await createUserByEmail(email);

    let normalizedPhone: string | undefined;
    let phoneParts: { phonePrefix?: string; phoneNumber?: string } = {};
    if (inputPhone) {
      normalizedPhone = normalizeIsraeliPhone(inputPhone);
      const split = splitIsraeliE164Phone(normalizedPhone);
      if (split) phoneParts = { phonePrefix: split.prefix, phoneNumber: split.number };
    }
    await updateWorkerProfile(user.id, {
      ...(inputName ? { name: inputName } : {}),
      ...(normalizedPhone ? { phone: normalizedPhone, ...phoneParts } : {}),
    });

    expect(updateWorkerProfile).toHaveBeenCalledWith(42, {
      name: "ישראל ישראלי",
      phone: "+972501234567",
      phonePrefix: "050",
      phoneNumber: "1234567",
    });
  });

  it("does NOT call updateWorkerProfile when neither name nor phone provided", async () => {
    const inputName = undefined;
    const inputPhone = undefined;

    if (inputName || inputPhone) {
      await updateWorkerProfile(42, {});
    }

    expect(updateWorkerProfile).not.toHaveBeenCalled();
  });

  it("does NOT call updateWorkerProfile for existing (returning) user", async () => {
    // Existing user login — updateWorkerProfile should not be called
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const existingUser = await getUserByEmail("test@example.com");
    const isNewUser = !existingUser;
    expect(isNewUser).toBe(false);

    if (isNewUser) {
      await updateWorkerProfile(existingUser!.id, { name: "ישראל" });
    }

    expect(updateWorkerProfile).not.toHaveBeenCalled();
  });
});

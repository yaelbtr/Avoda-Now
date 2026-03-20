/**
 * emailOtp.ts — Email OTP authentication helpers.
 *
 * Security design:
 * - 6-digit code generated with crypto.randomInt (cryptographically secure)
 * - Only SHA-256 hash stored in DB — raw code never persisted
 * - 5-minute expiry
 * - Max 5 wrong attempts before record is invalidated
 * - 60-second cooldown between sends (enforced via createdAt check)
 */

import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import { getDb } from "./db";
import { emailVerifications } from "../drizzle/schema";
import { eq, desc, and, gt } from "drizzle-orm";

// ─── Constants ────────────────────────────────────────────────────────────────
export const EMAIL_OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const EMAIL_OTP_COOLDOWN_MS = 60 * 1000;   // 60 seconds between sends
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_CODE_LENGTH = 6;

// ─── Code generation & hashing ───────────────────────────────────────────────

/** Generate a cryptographically secure 6-digit numeric code. */
export function generateEmailCode(): string {
  // crypto.randomInt is uniform and secure; avoids Math.random bias
  const code = crypto.randomInt(100000, 999999);
  return code.toString();
}

/** SHA-256 hex hash of a raw OTP code. */
export function hashEmailCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// ─── SendGrid email sender ────────────────────────────────────────────────────

/** Send a 6-digit OTP to the given email address via SendGrid. */
export async function sendEmailOtp(to: string, code: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM ?? "no-reply@avodanow.co.il";

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  sgMail.setApiKey(apiKey);

  await sgMail.send({
    to,
    from,
    subject: "קוד האימות שלך — AvodaNow",
    text: `קוד האימות שלך הוא: ${code}\n\nהקוד תקף ל-5 דקות.`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">קוד האימות שלך</h2>
        <p style="color: #555; margin-bottom: 24px;">הזן את הקוד הבא כדי להתחבר ל-AvodaNow:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #1a1a1a;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 16px;">הקוד תקף ל-5 דקות. אם לא ביקשת קוד זה, התעלם מהודעה זו.</p>
      </div>
    `,
  });
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

/**
 * Check if a send cooldown is active for this email.
 * Returns the remaining cooldown in ms (0 = no cooldown).
 */
export async function getEmailSendCooldown(email: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cutoff = new Date(Date.now() - EMAIL_OTP_COOLDOWN_MS);
  const [latest] = await db
    .select({ createdAt: emailVerifications.createdAt })
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        gt(emailVerifications.createdAt, cutoff)
      )
    )
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);

  if (!latest) return 0;
  const elapsed = Date.now() - latest.createdAt.getTime();
  return Math.max(0, EMAIL_OTP_COOLDOWN_MS - elapsed);
}

/**
 * Insert a new OTP record (overwrite strategy: delete old records for this email first).
 * Returns the raw code (to be emailed) — never stored.
 */
export async function createEmailOtp(email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = generateEmailCode();
  const codeHash = hashEmailCode(code);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MS);

  // Delete previous records for this email (overwrite strategy)
  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.email, email));

  await db.insert(emailVerifications).values({
    email,
    codeHash,
    expiresAt,
    attempts: 0,
  });

  return code;
}

/**
 * Verify a submitted code against the latest DB record.
 * Returns: "ok" | "expired" | "wrong" | "max_attempts" | "not_found"
 */
export type VerifyEmailResult = "ok" | "expired" | "wrong" | "max_attempts" | "not_found";

export async function verifyEmailOtp(
  email: string,
  code: string
): Promise<VerifyEmailResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [record] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.email, email))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);

  if (!record) return "not_found";

  if (record.expiresAt < new Date()) return "expired";

  if (record.attempts >= EMAIL_OTP_MAX_ATTEMPTS) return "max_attempts";

  const hash = hashEmailCode(code);

  if (hash !== record.codeHash) {
    // Increment attempts
    await db
      .update(emailVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailVerifications.id, record.id));
    return "wrong";
  }

  // Success — delete the record so it can't be reused
  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.id, record.id));

  return "ok";
}

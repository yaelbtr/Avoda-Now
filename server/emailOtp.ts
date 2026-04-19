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
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { sendEmail } from "./_core/email";
import { emailVerifications, emailUnsubscribes } from "../drizzle/schema";
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

/** Send a 6-digit OTP to the given email address via the Forge API. */
export async function sendEmailOtp(to: string, code: string): Promise<void> {
  const sent = await sendEmail({
    to,
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

  if (!sent) {
    throw new Error("Forge API email send returned false");
  }
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

// ─── Unsubscribe helpers ─────────────────────────────────────────────────────

/** Generate a cryptographically secure random unsubscribe token (hex, 32 bytes). */
export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Upsert an unsubscribe token for the given email.
 * Returns the token (existing or newly created).
 * Call this before sending any marketing email.
 */
export async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select({ token: emailUnsubscribes.token })
    .from(emailUnsubscribes)
    .where(eq(emailUnsubscribes.email, email))
    .limit(1);

  if (existing) return existing.token;

  const token = generateUnsubscribeToken();
  await db.insert(emailUnsubscribes).values({ email, token });
  return token;
}

/**
 * Build the unsubscribe URL for a given token.
 * Uses the production domain by default; falls back to localhost in dev.
 */
export function buildUnsubscribeUrl(token: string): string {
  return `${ENV.appBaseUrl}/unsubscribe?token=${token}`;
}

/**
 * Confirm an unsubscribe request by token.
 * Returns the email that was unsubscribed, or null if token not found.
 */
export async function confirmUnsubscribe(token: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [record] = await db
    .select()
    .from(emailUnsubscribes)
    .where(eq(emailUnsubscribes.token, token))
    .limit(1);

  if (!record) return null;

  await db
    .update(emailUnsubscribes)
    .set({ unsubscribedAt: new Date() })
    .where(eq(emailUnsubscribes.token, token));

  return record.email;
}

/**
 * Check if an email is unsubscribed from marketing emails.
 * Returns true if the email has confirmed unsubscribe.
 */
export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [record] = await db
    .select({ unsubscribedAt: emailUnsubscribes.unsubscribedAt })
    .from(emailUnsubscribes)
    .where(eq(emailUnsubscribes.email, email))
    .limit(1);

  return !!record?.unsubscribedAt;
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

/**
 * Send a welcome email after a new user completes the registration wizard.
 * Fire-and-forget — caller should use .catch() to avoid blocking the response.
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<void> {
  // Skip if user has unsubscribed from marketing emails
  const unsubscribed = await isEmailUnsubscribed(params.to);
  if (unsubscribed) {
    console.info(`[sendWelcomeEmail] Skipping — ${params.to} is unsubscribed`);
    return;
  }

  const firstName = params.name.split(" ")[0] || params.name;
  const unsubToken = await getOrCreateUnsubscribeToken(params.to);
  const unsubUrl = buildUnsubscribeUrl(unsubToken);

  const sent = await sendEmail({
    to: params.to,
    subject: `ברוך הבא ל-AvodaNow, ${firstName}! 🎉`,
    text: `שלום ${firstName},\n\nברוך הבא ל-AvodaNow!\nהפרופיל שלך נוצר בהצלחה ואתה מוכן לקבל הצעות עבודה.\n\nבהצלחה,\nצוות AvodaNow\n\nלהסרה מרשימת התפוצה: ${unsubUrl}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2d4a1e; font-size: 28px; margin: 0;">AvodaNow</h1>
          <p style="color: #888; font-size: 13px; margin: 4px 0 0;">עבודה עכשיו</p>
        </div>

        <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">ברוך הבא, ${firstName}! 🎉</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          הפרופיל שלך נוצר בהצלחה. עכשיו אתה יכול לקבל הצעות עבודה ממעסיקים באזורך.
        </p>

        <div style="background: #f9f7f2; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #2d4a1e; margin: 0 0 12px; font-size: 16px;">מה הלאה?</h3>
          <ul style="color: #555; font-size: 15px; line-height: 2; margin: 0; padding-right: 20px;">
            <li>הגדר את הזמינות שלך כדי שמעסיקים יוכלו למצוא אותך</li>
            <li>עדכן את הקטגוריות המועדפות עליך</li>
            <li>הוסף תמונת פרופיל — עובדים עם תמונה מקבלים פי 3 יותר פניות</li>
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${ENV.appBaseUrl}/worker-profile"
             style="display: inline-block; background: #2d4a1e; color: #ffffff; text-decoration: none;
                    padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
            כניסה לפרופיל שלי
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center; margin: 0; line-height: 1.8;">
          קיבלת מייל זה כי נרשמת ל-AvodaNow.<br/>
          אם לא ביצעת פעולה זו, התעלם מהודעה זו.<br/>
          <a href="${unsubUrl}" style="color: #aaa; text-decoration: underline;">הסרה מרשימת התפוצה</a>
        </p>
      </div>
    `,
  });

  if (sent) {
    console.log(`[sendWelcomeEmail] Welcome email sent to ${params.to}`);
  } else {
    console.warn(`[sendWelcomeEmail] Forge API returned false for ${params.to} — falling back to owner notification`);
    try {
      const { notifyOwner } = await import("./_core/notification");
      await notifyOwner({
        title: "משתמש חדש נרשם",
        content: `שם: ${params.name}\nמייל: ${params.to}\n(שליחת מייל ברוך הבא נכשלה)`,
      });
    } catch {
      // Ignore fallback errors
    }
  }
}

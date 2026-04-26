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

export const EMAIL_OTP_EXPIRY_MS = 5 * 60 * 1000;
export const EMAIL_OTP_COOLDOWN_MS = 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_CODE_LENGTH = 6;

export function generateEmailCode(): string {
  const code = crypto.randomInt(100000, 999999);
  return code.toString();
}

export function hashEmailCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function sendEmailOtp(to: string, code: string): Promise<void> {
  const sent = await sendEmail({
    to,
    subject: "קוד האימות שלך — YallaAvoda",
    text: `קוד האימות שלך הוא: ${code}\n\nהקוד תקף ל-5 דקות.`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">קוד האימות שלך</h2>
        <p style="color: #555; margin-bottom: 24px;">הזן את הקוד הבא כדי להתחבר ל-YallaAvoda:</p>
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

export async function createEmailOtp(email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = generateEmailCode();
  const codeHash = hashEmailCode(code);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MS);

  await db.delete(emailVerifications).where(eq(emailVerifications.email, email));

  await db.insert(emailVerifications).values({
    email,
    codeHash,
    expiresAt,
    attempts: 0,
  });

  return code;
}

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
    await db
      .update(emailVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailVerifications.id, record.id));
    return "wrong";
  }

  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.id, record.id));

  return "ok";
}

export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

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

export function buildUnsubscribeUrl(token: string): string {
  return `${ENV.appBaseUrl}/unsubscribe?token=${token}`;
}

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

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<void> {
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
    subject: `ברוך הבא ל-YallaAvoda, ${firstName}! 🎉`,
    text: `שלום ${firstName},\n\nברוך הבא ל-YallaAvoda!\nהפרופיל שלך נוצר בהצלחה ואתה מוכן לקבל הצעות עבודה.\n\nבהצלחה,\nצוות YallaAvoda\n\nלהסרה מרשימת התפוצה: ${unsubUrl}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2d4a1e; font-size: 28px; margin: 0;">YallaAvoda</h1>
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
          קיבלת מייל זה כי נרשמת ל-YallaAvoda.<br/>
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

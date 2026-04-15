import { ENV } from "./_core/env";

/**
 * Plain SMS sender using Twilio Messages API.
 *
 * This is separate from smsProvider.ts (which uses Twilio Verify for OTP).
 * Use this module to send arbitrary text messages to users (e.g. job alerts).
 *
 * Requires:
 *  - TWILIO_ACCOUNT_SID
 *  - TWILIO_AUTH_TOKEN
 *  - TWILIO_FROM_NUMBER  (a Twilio phone number in E.164, e.g. +12025551234)
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";

function authHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
  );
}

export interface SmsSendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Send a plain SMS message to a single E.164 phone number.
 * Returns { success: true, sid } on success, { success: false, error } on failure.
 */
export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn("[SMS] Twilio credentials not fully configured - skipping SMS");
    return { success: false, error: "SMS service not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader(),
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_FROM_NUMBER,
        Body: body,
      }).toString(),
    });

    const json = (await res.json()) as { sid?: string; message?: string; code?: number };

    if (!res.ok) {
      console.warn(`[SMS] Failed to send to ${to}: ${json.message ?? res.statusText}`);
      return { success: false, error: json.message ?? "SMS send failed" };
    }

    return { success: true, sid: json.sid };
  } catch (err) {
    console.warn("[SMS] Network error:", err);
    return { success: false, error: "Network error" };
  }
}

/**
 * Send job-alert SMS to a list of workers.
 * Fire-and-forget: errors are logged but not thrown.
 * Returns the count of successfully sent messages.
 */
export async function sendJobAlerts(
  workers: Array<{ id: number; phone: string; name: string | null }>,
  job: { title: string; city: string | null; category: string; isUrgent: boolean; id: number }
): Promise<number> {
  if (workers.length === 0) return 0;

  const urgentPrefix = job.isUrgent ? "דחוף! " : "";
  const cityPart = job.city ? ` ב${job.city}` : "";
  const message =
    `${urgentPrefix}משרה חדשה ב-Job-Now שמתאימה לפרופיל שלך:\n` +
    `${job.title}${cityPart}\n` +
    `לצפייה: ${ENV.appBaseUrl}/jobs/${job.id}\n` +
    `להסרה מהתראות: עדכן קטגוריות בפרופיל שלך`;

  let sent = 0;
  // Send in parallel, cap at 20 concurrent.
  const chunks: Array<typeof workers> = [];
  for (let i = 0; i < workers.length; i += 20) {
    chunks.push(workers.slice(i, i + 20));
  }
  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((w) => sendSms(w.phone, message))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) sent++;
    }
  }
  return sent;
}

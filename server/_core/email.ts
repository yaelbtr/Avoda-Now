/**
 * Email helper - sends transactional emails via the Manus Forge API.
 *
 * The Forge API exposes a `SendEmail` endpoint under the same base URL
 * used by notifications and other built-in services.
 *
 * Usage:
 *   await sendEmail({ to, subject, html, text })
 *
 * Returns `true` on success, `false` when the upstream service is
 * temporarily unavailable (callers can fall back to owner notification).
 */

import { ENV } from "./env";

export type EmailPayload = {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML body (preferred) */
  html: string;
  /** Plain-text fallback */
  text?: string;
};

const buildEmailEndpoint = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("webdevtoken.v1.WebDevService/SendEmail", normalizedBase).toString();
};

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn("[Email] Forge API not configured - skipping email send.");
    return false;
  }

  const endpoint = buildEmailEndpoint(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Email] Failed to send email (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Email] Error calling email service:", error);
    return false;
  }
}

/**
 * Sends a Hebrew welcome email to a newly registered user.
 * Non-blocking - failure is logged but does not throw.
 */
export async function sendWelcomeEmail(params: {
  name: string;
  email: string;
}): Promise<void> {
  const { name, email } = params;
  const displayName = name || "משתמש יקר";
  const baseUrl = ENV.appBaseUrl;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ברוכים הבאים ל-AvodaNow</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f0; font-family: Arial, Helvetica, sans-serif; direction: rtl; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background-color: #4a5c3f; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body h2 { color: #2d3b22; font-size: 20px; margin: 0 0 12px; }
    .body p { color: #4a5c3f; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .cta { display: block; width: fit-content; margin: 24px auto; padding: 14px 36px; background-color: #7ab648; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; }
    .footer { background-color: #f5f5f0; padding: 20px 24px; text-align: center; }
    .footer p { color: #888; font-size: 12px; margin: 4px 0; }
    .footer a { color: #4a5c3f; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>AvodaNow - עבודה עכשיו</h1>
      <p>פלטפורמת העבודה הזמנית המובילה בישראל</p>
    </div>
    <div class="body">
      <h2>ברוכים הבאים, ${displayName}!</h2>
      <p>
        שמחים שהצטרפת ל-AvodaNow - המקום שבו מוצאים עבודה זמנית ומתנדבים
        בקרבת מקום, בקלות ובמהירות.
      </p>
      <p>
        עכשיו תוכל/י לחפש משרות קרובות אליך, להגיש מועמדות בלחיצה אחת,
        ולהתחבר למעסיקים ישירות דרך WhatsApp.
      </p>
      <a class="cta" href="${baseUrl}/find-jobs">מצא/י עבודה עכשיו</a>
      <p style="font-size:13px; color:#888;">
        לשאלות ותמיכה ניתן לפנות אלינו בכתובת
        <a href="mailto:info@avodanow.co.il" style="color:#4a5c3f;">info@avodanow.co.il</a>
      </p>
    </div>
    <div class="footer">
      <p>AvodaNow &copy; ${new Date().getFullYear()} - כל הזכויות שמורות</p>
      <p>
        <a href="${baseUrl}/terms">תנאי שימוש</a>
        &nbsp;|&nbsp;
        <a href="${baseUrl}/privacy">מדיניות פרטיות</a>
        &nbsp;|&nbsp;
        <a href="${baseUrl}/accessibility">נגישות</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const sent = await sendEmail({
    to: email,
    subject: `ברוכים הבאים ל-AvodaNow, ${displayName}!`,
    html,
  });

  if (sent) {
    console.log(`[Email] Welcome email sent to ${email}`);
  } else {
    console.warn(`[Email] Welcome email failed for ${email} - falling back to owner notification`);
    // Non-blocking fallback: notify owner so no registration is silently lost.
    try {
      const { notifyOwner } = await import("./notification");
      await notifyOwner({
        title: "משתמש חדש נרשם",
        content: `שם: ${name}\nמייל: ${email}\n(שליחת מייל ברוך הבא נכשלה)`,
      });
    } catch {
      // Ignore fallback errors.
    }
  }
}

/**
 * Email helper – sends transactional emails via SMTP (primary) or SendGrid (fallback).
 *
 * Transport priority:
 *   1. SMTP  — uses SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SECURE
 *   2. SendGrid — uses SENDGRID_API_KEY (fallback when SMTP is not configured)
 *
 * Usage:
 *   await sendEmail({ to, subject, html, text })
 *
 * Returns `true` on success, `false` when all transports fail (callers can fall
 * back to owner notification).
 */

import nodemailer from "nodemailer";

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

// ─── SMTP transport ──────────────────────────────────────────────────────────

function createSmtpTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE !== "false"; // default true

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // allow self-signed certs on custom mail servers
  });
}

async function sendViaSmtp(payload: EmailPayload): Promise<boolean> {
  const transport = createSmtpTransport();
  if (!transport) return false;

  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@avodanow.co.il";

  try {
    await transport.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? payload.html.replace(/<[^>]+>/g, ""),
    });
    return true;
  } catch (error) {
    console.warn("[Email/SMTP] Failed to send email:", error);
    return false;
  }
}

// ─── SendGrid fallback ────────────────────────────────────────────────────────

async function sendViaSendGrid(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;

  const from = process.env.EMAIL_FROM ?? "no-reply@avodanow.co.il";

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: from },
        subject: payload.subject,
        content: [
          { type: "text/plain", value: payload.text ?? payload.html.replace(/<[^>]+>/g, "") },
          { type: "text/html", value: payload.html },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Email/SendGrid] Failed (${response.status})${detail ? `: ${detail}` : ""}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Email/SendGrid] Error calling SendGrid API:", error);
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a transactional email. Tries SMTP first, then SendGrid as fallback.
 * Returns `true` on success, `false` when all transports fail.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // 1. Try SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const sent = await sendViaSmtp(payload);
    if (sent) return true;
    console.warn("[Email] SMTP failed, trying SendGrid fallback...");
  }

  // 2. Try SendGrid
  if (process.env.SENDGRID_API_KEY) {
    const sent = await sendViaSendGrid(payload);
    if (sent) return true;
  }

  console.warn("[Email] All transports failed for:", payload.to);
  return false;
}

/**
 * Sends a Hebrew welcome email to a newly registered user.
 * Non-blocking – failure is logged but does not throw.
 */
export async function sendWelcomeEmail(params: {
  name: string;
  email: string;
}): Promise<void> {
  const { name, email } = params;
  const displayName = name || "משתמש יקר";

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
      <h1>AvodaNow – עבודה עכשיו</h1>
      <p>פלטפורמת העבודה הזמנית המובילה בישראל</p>
    </div>
    <div class="body">
      <h2>ברוכים הבאים, ${displayName}!</h2>
      <p>
        שמחים שהצטרפת ל-AvodaNow – המקום שבו מוצאים עבודה זמנית ומתנדבים
        בקרבת מקום, בקלות ובמהירות.
      </p>
      <p>
        עכשיו תוכל/י לחפש משרות קרובות אליך, להגיש מועמדות בלחיצה אחת,
        ולהתחבר למעסיקים ישירות דרך WhatsApp.
      </p>
      <a class="cta" href="https://avodanow.co.il/find-jobs">מצא/י עבודה עכשיו</a>
      <p style="font-size:13px; color:#888;">
        לשאלות ותמיכה ניתן לפנות אלינו בכתובת
        <a href="mailto:info@avodanow.co.il" style="color:#4a5c3f;">info@avodanow.co.il</a>
      </p>
    </div>
    <div class="footer">
      <p>AvodaNow &copy; ${new Date().getFullYear()} – כל הזכויות שמורות</p>
      <p>
        <a href="https://avodanow.co.il/terms">תנאי שימוש</a>
        &nbsp;|&nbsp;
        <a href="https://avodanow.co.il/privacy">מדיניות פרטיות</a>
        &nbsp;|&nbsp;
        <a href="https://avodanow.co.il/accessibility">נגישות</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const sent = await sendEmail({
    to: email,
    subject: `ברוכים הבאים ל-AvodaNow, ${displayName}! 🎉`,
    html,
  });

  if (sent) {
    console.log(`[Email] Welcome email sent to ${email}`);
  } else {
    console.warn(`[Email] Welcome email failed for ${email} – falling back to owner notification`);
    try {
      const { notifyOwner } = await import("./notification");
      await notifyOwner({
        title: "משתמש חדש נרשם",
        content: `שם: ${name}\nמייל: ${email}\n(שליחת מייל ברוך הבא נכשלה)`,
      });
    } catch {
      // Ignore fallback errors
    }
  }
}

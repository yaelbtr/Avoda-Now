/**
 * supportEmail.ts
 * Sends support-report emails via Nodemailer using the configured SMTP credentials.
 * Single source of truth for all support email logic.
 */
import nodemailer, { type SendMailOptions } from "nodemailer";
import { ENV } from "./_core/env";

export interface SupportReportPayload {
  userId?: string | null;
  phone?: string | null;
  subject?: string | null;
  message: string;
  pageUrl: string;
  userAgent: string;
  screenResolution?: string | null;
  timestamp: string;
  screenshotBase64?: string | null; // data:image/png;base64,...
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpSecure,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });
}

export async function sendSupportReport(payload: SupportReportPayload): Promise<void> {
  const transporter = buildTransporter();

  const subject = payload.subject
    ? `App Support Report — ${payload.subject}`
    : "App Support Report";

  const bodyText = [
    `User ID:    ${payload.userId ?? "לא מחובר"}`,
    `Phone:      ${payload.phone ?? "—"}`,
    `Page:       ${payload.pageUrl}`,
    `Browser:    ${payload.userAgent}`,
    `Resolution: ${payload.screenResolution ?? "—"}`,
    `Time:       ${payload.timestamp}`,
    ``,
    `Message:`,
    payload.message,
  ].join("\n");

  // Build attachments array — attach screenshot if provided
  type Attachment = NonNullable<SendMailOptions["attachments"]>[number];
  const attachments: Attachment[] = [];
  if (payload.screenshotBase64) {
    // Strip the data-URL prefix if present: "data:image/png;base64,<data>"
    const base64Data = payload.screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
    attachments.push({
      filename: "screenshot.png",
      content: Buffer.from(base64Data, "base64"),
      contentType: "image/png",
    });
  }

  await transporter.sendMail({
    from: `"YallaAvoda Support" <${ENV.smtpUser}>`,
    to: "support@avodanow.co.il",
    subject,
    text: bodyText,
    attachments,
  });
}

/**
 * Lightweight SMTP connectivity test — verifies credentials without sending a mail.
 * Returns true on success, false on failure.
 */
export async function verifySMTPConnection(): Promise<boolean> {
  try {
    const transporter = buildTransporter();
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
/**
 * SMS Provider Abstraction Layer
 *
 * To switch SMS providers in the future, implement the SmsProvider interface
 * and swap the export at the bottom of this file.
 *
 * Current provider: Twilio Verify API
 */

export interface OtpSendResult {
  success: boolean;
  error?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  approved: boolean;
  error?: string;
}

export interface SmsProvider {
  /**
   * Send an OTP to the given E.164 phone number.
   * The provider manages code generation, storage, and expiry.
   */
  sendOtp(phone: string): Promise<OtpSendResult>;

  /**
   * Verify the OTP code entered by the user.
   * Returns approved=true if the code matches and has not expired.
   */
  verifyOtp(phone: string, code: string): Promise<OtpVerifyResult>;
}

// ─── Twilio Verify Provider ───────────────────────────────────────────────────

class TwilioVerifyProvider implements SmsProvider {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly serviceSid: string;
  private readonly baseUrl: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    this.serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";
    this.baseUrl = `https://verify.twilio.com/v2/Services/${this.serviceSid}`;
  }

  private get authHeader(): string {
    return "Basic " + Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
  }

  async sendOtp(phone: string): Promise<OtpSendResult> {
    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      console.error("[TwilioVerify] Missing credentials");
      return { success: false, error: "SMS service not configured" };
    }

    try {
      const res = await fetch(`${this.baseUrl}/Verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: this.authHeader,
        },
        body: new URLSearchParams({ To: phone, Channel: "sms" }).toString(),
      });

      const body = await res.json() as { status?: string; message?: string; code?: number };

      if (!res.ok) {
        console.error("[TwilioVerify] sendOtp failed:", body);
        // Twilio error 60200 = invalid phone number
        if (body.code === 60200) {
          return { success: false, error: "מספר הטלפון אינו תקין" };
        }
        return { success: false, error: "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות." };
      }

      return { success: true };
    } catch (err) {
      console.error("[TwilioVerify] sendOtp network error:", err);
      return { success: false, error: "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות." };
    }
  }

  async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      return { success: false, approved: false, error: "SMS service not configured" };
    }

    try {
      const res = await fetch(`${this.baseUrl}/VerificationCheck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: this.authHeader,
        },
        body: new URLSearchParams({ To: phone, Code: code }).toString(),
      });

      const body = await res.json() as { status?: string; message?: string; code?: number };

      if (!res.ok) {
        console.error("[TwilioVerify] verifyOtp failed:", body);
        // 60202 = max check attempts reached, 60203 = expired
        if (body.code === 60202) {
          return { success: false, approved: false, error: "מספר הניסיונות המרבי הגיע. בקש קוד חדש." };
        }
        if (body.code === 60203) {
          return { success: false, approved: false, error: "הקוד פג תוקף. בקש קוד חדש." };
        }
        return { success: false, approved: false, error: "קוד האימות שגוי." };
      }

      const approved = body.status === "approved";
      return { success: true, approved };
    } catch (err) {
      console.error("[TwilioVerify] verifyOtp network error:", err);
      return { success: false, approved: false, error: "שגיאה בבדיקת הקוד. נסו שוב." };
    }
  }
}

// ─── Export active provider ───────────────────────────────────────────────────
// To switch providers: replace `new TwilioVerifyProvider()` with another implementation.

export const smsProvider: SmsProvider = new TwilioVerifyProvider();

// ─── Phone number utilities ───────────────────────────────────────────────────

/**
 * Normalize an Israeli phone number to E.164 format (+972XXXXXXXXX).
 * Accepts: 05X-XXXXXXX, 05XXXXXXXX, +9725XXXXXXXX, 9725XXXXXXXX
 * Throws if the number cannot be normalized.
 */
export function normalizeIsraeliPhone(raw: string): string {
  const digits = raw.replace(/[\s\-().+]/g, "");

  // Already in international format
  if (digits.startsWith("972") && digits.length === 12) {
    return `+${digits}`;
  }
  // Local format starting with 0
  if (digits.startsWith("0") && digits.length === 10) {
    return `+972${digits.slice(1)}`;
  }
  // Already stripped of leading 0 but missing country code
  if (digits.length === 9 && digits.startsWith("5")) {
    return `+972${digits}`;
  }

  throw new Error(`מספר טלפון לא תקין: ${raw}`);
}

/**
 * Basic validation: E.164 format, Israeli mobile (05X).
 */
export function isValidIsraeliPhone(e164: string): boolean {
  return /^\+9725\d{8}$/.test(e164);
}

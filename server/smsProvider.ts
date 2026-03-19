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

  /** Send OTP via voice call (Twilio Verify call channel) */
  sendOtpVoice(phone: string): Promise<OtpSendResult>;

  /** Send OTP via email channel (fallback when SMS fails) */
  sendOtpToEmail(email: string): Promise<OtpSendResult>;

  /** Verify OTP that was sent to email */
  verifyEmailOtp(email: string, code: string): Promise<OtpVerifyResult>;

  /** Send OTP via WhatsApp (Twilio Verify whatsapp channel) */
  sendOtpWhatsApp(phone: string): Promise<OtpSendResult>;
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
      // Attempt with CustomFriendlyName first (requires feature enabled in Twilio Console)
      const res = await this.postVerification(phone, true);
      const body = await res.json() as { status?: string; message?: string; code?: number };

      if (!res.ok) {
        // 60204 = CustomFriendlyName not allowed on this service → retry without it
        if (body.code === 60204) {
          console.warn("[TwilioVerify] CustomFriendlyName not enabled, retrying without it");
          return this.sendOtpWithoutFriendlyName(phone);
        }
        console.error("[TwilioVerify] sendOtp failed:", body);
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

  /** Send OTP via WhatsApp (Twilio Verify whatsapp channel) */
  async sendOtpWhatsApp(phone: string): Promise<OtpSendResult> {
    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      return { success: false, error: "SMS service not configured" };
    }
    try {
      const res = await fetch(`${this.baseUrl}/Verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: this.authHeader,
        },
        body: new URLSearchParams({ To: phone, Channel: "whatsapp" }).toString(),
      });
      const body = await res.json() as { status?: string; message?: string; code?: number };
      if (!res.ok) {
        console.error("[TwilioVerify] sendOtpWhatsApp failed:", body);
        if (body.code === 60200) return { success: false, error: "מספר הטלפון אינו תקין" };
        // 60410 = WhatsApp channel not enabled on this service
        if (body.code === 60410) return { success: false, error: "ערוץ WhatsApp אינו מופעל בשירות" };
        return { success: false, error: "לא ניתן לשלוח קוד ב-WhatsApp כרגע. נסו שוב בעוד מספר דקות." };
      }
      return { success: true };
    } catch (err) {
      console.error("[TwilioVerify] sendOtpWhatsApp network error:", err);
      return { success: false, error: "לא ניתן לשלוח קוד ב-WhatsApp כרגע. נסו שוב בעוד מספר דקות." };
    }
  }

  /** Send OTP via voice call */
  async sendOtpVoice(phone: string): Promise<OtpSendResult> {
    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      return { success: false, error: "SMS service not configured" };
    }
    try {
      const res = await fetch(`${this.baseUrl}/Verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: this.authHeader,
        },
        // Note: Locale="he" is NOT supported for voice TTS (Twilio error 60331).
        // Omitting Locale lets Twilio use its default (en-US) for the spoken OTP.
        body: new URLSearchParams({ To: phone, Channel: "call" }).toString(),
      });
      const body = await res.json() as { status?: string; message?: string; code?: number };
      if (!res.ok) {
        console.error("[TwilioVerify] sendOtpVoice failed:", body);
        if (body.code === 60200) return { success: false, error: "מספר הטלפון אינו תקין" };
        return { success: false, error: "לא ניתן לבצע שיחה כרגע. נסו שוב בעוד מספר דקות." };
      }
      return { success: true };
    } catch (err) {
      console.error("[TwilioVerify] sendOtpVoice network error:", err);
      return { success: false, error: "לא ניתן לבצע שיחה כרגע. נסו שוב בעוד מספר דקות." };
    }
  }

  private postVerification(phone: string, withFriendlyName: boolean): Promise<Response> {
    const params: Record<string, string> = {
      To: phone,
      Channel: "sms",
      Locale: "he",
    };
    if (withFriendlyName) {
      params["CustomFriendlyName"] = "JobNow";
    }
    return fetch(`${this.baseUrl}/Verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: this.authHeader,
      },
      body: new URLSearchParams(params).toString(),
    });
  }

  private async sendOtpWithoutFriendlyName(phone: string): Promise<OtpSendResult> {
    try {
      const res = await this.postVerification(phone, false);
      const body = await res.json() as { status?: string; message?: string; code?: number };
      if (!res.ok) {
        console.error("[TwilioVerify] sendOtp (no friendly name) failed:", body);
        if (body.code === 60200) {
          return { success: false, error: "מספר הטלפון אינו תקין" };
        }
        return { success: false, error: "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות." };
      }
      return { success: true };
    } catch (err) {
      console.error("[TwilioVerify] sendOtp fallback network error:", err);
      return { success: false, error: "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות." };
    }
  }

  /** Send OTP via email channel (Twilio Verify email) */
  async sendOtpToEmail(email: string): Promise<OtpSendResult> {
    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      return { success: false, error: "SMS service not configured" };
    }
    try {
      const res = await fetch(`${this.baseUrl}/Verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: this.authHeader,
        },
        body: new URLSearchParams({ To: email, Channel: "email" }).toString(),
      });
      const body = await res.json() as { status?: string; message?: string; code?: number };
      if (!res.ok) {
        console.error("[TwilioVerify] sendOtpToEmail failed:", body);
        return { success: false, error: "לא ניתן לשלוח קוד למייל כרגע" };
      }
      return { success: true };
    } catch (err) {
      console.error("[TwilioVerify] sendOtpToEmail network error:", err);
      return { success: false, error: "שגיאה בשליחת קוד למייל" };
    }
  }

  /** Verify OTP that was sent to email (same VerificationCheck endpoint) */
  async verifyEmailOtp(email: string, code: string): Promise<OtpVerifyResult> {
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
        body: new URLSearchParams({ To: email, Code: code }).toString(),
      });
      const body = await res.json() as { status?: string; message?: string; code?: number };
      if (!res.ok) {
        console.error("[TwilioVerify] verifyEmailOtp failed:", body);
        return { success: false, approved: false, error: "קוד האימות שגוי" };
      }
      return { success: true, approved: body.status === "approved" };
    } catch (err) {
      console.error("[TwilioVerify] verifyEmailOtp network error:", err);
      return { success: false, approved: false, error: "שגיאה בבדיקת הקוד" };
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
 * Normalize any Israeli phone number to E.164 format (+972XXXXXXXXX).
 *
 * Accepted formats:
 *   05X-XXXXXXX   (local mobile, with or without dash)
 *   05XXXXXXXX    (local mobile, 10 digits)
 *   0X-XXXXXXX    (local landline)
 *   +972XXXXXXXXX (already E.164)
 *   972XXXXXXXXX  (international without +)
 *   5XXXXXXXX     (9 digits, missing leading 0)
 */
export function normalizeIsraeliPhone(raw: string): string {
  // Strip all non-digit characters except leading +
  const stripped = raw.trim();
  const digits = stripped.replace(/[\s\-().]/g, "").replace(/^\+/, "");

  // Already in international format: 972 + 9 digits = 12 digits total
  if (digits.startsWith("972") && digits.length >= 11 && digits.length <= 13) {
    return `+${digits}`;
  }

  // Local Israeli format: starts with 0, 9-10 digits
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 10) {
    return `+972${digits.slice(1)}`;
  }

  // Stripped of leading 0: 8-9 digits starting with 2-9
  if (!digits.startsWith("0") && !digits.startsWith("9") && digits.length >= 8 && digits.length <= 9) {
    return `+972${digits}`;
  }

  throw new Error(`מספר טלפון לא תקין: ${raw}`);
}

/**
 * Validate that a phone is in E.164 format and plausibly Israeli.
 * Accepts mobile (05X) and landline (02/03/04/08/09) numbers.
 * Deliberately permissive — Twilio will reject truly invalid numbers.
 */
export function isValidIsraeliPhone(e164: string): boolean {
  // Must start with +972 and have 11-13 total chars
  return /^\+972[2-9]\d{7,9}$/.test(e164);
}

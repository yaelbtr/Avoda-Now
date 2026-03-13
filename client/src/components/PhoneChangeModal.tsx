import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { combinePhone, type PhoneValue } from "./IsraeliPhoneInput";
import { IsraeliPhoneInput } from "./IsraeliPhoneInput";
import { X, Phone, ShieldCheck, Mail, Lock } from "lucide-react";

interface PhoneChangeModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after phone is successfully verified and updated in DB */
  onSuccess: (newPhoneVal: PhoneValue) => void;
}

type Step = "enter_phone" | "enter_otp" | "sms_failed" | "locked";

export function PhoneChangeModal({ open, onClose, onSuccess }: PhoneChangeModalProps) {
  const [step, setStep] = useState<Step>("enter_phone");
  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [useEmail, setUseEmail] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [hasEmailFallback, setHasEmailFallback] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const requestOtp = trpc.user.requestPhoneChangeOtp.useMutation();
  const requestOtpEmail = trpc.user.requestPhoneChangeOtpEmail.useMutation();
  const verifyOtp = trpc.user.verifyPhoneChangeOtp.useMutation();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("enter_phone");
      setPhoneVal({ prefix: "", number: "" });
      setNormalizedPhone("");
      setOtp(["", "", "", "", "", ""]);
      setCountdown(0);
      setUseEmail(false);
      setMaskedEmail("");
      setHasEmailFallback(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSendOtp = async () => {
    const combined = combinePhone(phoneVal);
    if (phoneVal.prefix.length !== 3 || phoneVal.number.length !== 7) {
      toast.error("יש להזין מספר טלפון מלא");
      return;
    }
    try {
      const res = await requestOtp.mutateAsync({ phone: combined });
      if (res.smsFailed) {
        // SMS failed — show fallback screen
        setNormalizedPhone(res.normalizedPhone);
        setHasEmailFallback(res.hasEmailFallback);
        setStep("sms_failed");
        return;
      }
      setNormalizedPhone(res.normalizedPhone);
      setUseEmail(false);
      setStep("enter_otp");
      setCountdown(30);
      toast.success(`קוד נשלח ל-${combined}`);
    } catch (err: any) {
      if (err?.data?.code === "TOO_MANY_REQUESTS" && err?.message?.includes("נעול")) {
        setStep("locked");
      } else {
        toast.error(err?.message ?? "שגיאה בשליחת קוד");
      }
    }
  };

  const handleSendEmailOtp = async () => {
    try {
      const res = await requestOtpEmail.mutateAsync({ phone: combinePhone(phoneVal) });
      setNormalizedPhone(res.normalizedPhone);
      setMaskedEmail(res.maskedEmail);
      setUseEmail(true);
      setStep("enter_otp");
      setCountdown(30);
      toast.success(`קוד נשלח למייל ${res.maskedEmail}`);
    } catch (err: any) {
      toast.error(err?.message ?? "שגיאה בשליחת קוד למייל");
    }
  };

  const doVerify = async (code: string) => {
    try {
      await verifyOtp.mutateAsync({
        phone: normalizedPhone,
        code,
        phonePrefix: phoneVal.prefix,
        phoneNumber: phoneVal.number,
        useEmail,
      });
      toast.success("מספר הטלפון עודכן בהצלחה!");
      onSuccess(phoneVal);
      onClose();
    } catch (err: any) {
      if (err?.data?.code === "TOO_MANY_REQUESTS" && err?.message?.includes("נעול")) {
        setStep("locked");
      } else {
        toast.error(err?.message ?? "קוד שגוי או פג תוקף");
      }
    }
  };

  const handleVerifyOtp = () => {
    const code = otp.join("");
    if (code.length !== 6) { toast.error("יש להזין קוד בן 6 ספרות"); return; }
    doVerify(code);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    if (digit && index === 5 && newOtp.every((d) => d !== "")) {
      setTimeout(() => doVerify(newOtp.join("")), 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      if (useEmail) {
        const res = await requestOtpEmail.mutateAsync({ phone: combinePhone(phoneVal) });
        setMaskedEmail(res.maskedEmail);
        toast.success(`קוד חדש נשלח למייל ${res.maskedEmail}`);
      } else {
        await requestOtp.mutateAsync({ phone: combinePhone(phoneVal) });
        toast.success("קוד חדש נשלח");
      }
      setOtp(["", "", "", "", "", ""]);
      setCountdown(30);
    } catch (err: any) {
      toast.error(err?.message ?? "שגיאה בשליחת קוד");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl p-6 shadow-xl"
        dir="rtl"
        style={{ background: "white" }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור חלון"
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Step 1: Enter new phone ── */}
        {step === "enter_phone" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
                <Phone className="h-5 w-5" style={{ color: "#4F583B" }} />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">עדכון מספר טלפון</h2>
                <p className="text-xs text-muted-foreground">נשלח קוד אימות למספר החדש</p>
              </div>
            </div>

            <IsraeliPhoneInput
              value={phoneVal}
              onChange={setPhoneVal}
              label="מספר טלפון חדש"
            />

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={requestOtp.isPending || phoneVal.prefix.length !== 3 || phoneVal.number.length !== 7}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: "oklch(0.35 0.08 122)", color: "white" }}
            >
              {requestOtp.isPending ? "שולח..." : "שלח קוד אימות"}
            </button>
          </div>
        )}

        {/* ── SMS failed — offer email fallback ── */}
        {step === "sms_failed" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100">
                <Phone className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">שליחת SMS נכשלה</h2>
                <p className="text-xs text-muted-foreground">לא הצלחנו לשלוח קוד לטלפון</p>
              </div>
            </div>

            {hasEmailFallback ? (
              <>
                <p className="text-sm text-foreground">
                  ניתן לקבל את קוד האימות למייל הרשום בחשבון שלך.
                </p>
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={requestOtpEmail.isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "oklch(0.35 0.08 122)", color: "white" }}
                >
                  <Mail className="h-4 w-4" />
                  {requestOtpEmail.isPending ? "שולח למייל..." : "שלח קוד למייל"}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                לא נמצאה כתובת מייל בחשבון. אנא פנה לתמיכה.
              </p>
            )}

            <button
              type="button"
              onClick={() => setStep("enter_phone")}
              className="w-full text-xs text-muted-foreground underline"
            >
              חזור לשינוי מספר
            </button>
          </div>
        )}

        {/* ── Locked out ── */}
        {step === "locked" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">החשבון נעול זמנית</h2>
                <p className="text-xs text-muted-foreground">לשינוי מספר טלפון</p>
              </div>
            </div>
            <p className="text-sm text-foreground">
              לאחר 5 ניסיונות כושלים, האפשרות לשינוי מספר טלפון נעולה לשעה אחת.
              נשלחה התראה לצוות האבטחה.
            </p>
            <p className="text-xs text-muted-foreground">
              אם זה לא אתה, פנה לתמיכה מיידית.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: "oklch(0.35 0.08 122)", color: "white" }}
            >
              סגור
            </button>
          </div>
        )}

        {/* ── Step 2: Enter OTP ── */}
        {step === "enter_otp" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
                {useEmail ? <Mail className="h-5 w-5" style={{ color: "#4F583B" }} /> : <ShieldCheck className="h-5 w-5" style={{ color: "#4F583B" }} />}
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">אימות מספר טלפון</h2>
                <p className="text-xs text-muted-foreground">
                  {useEmail
                    ? `הזן את הקוד שנשלח למייל ${maskedEmail}`
                    : `הזן את הקוד שנשלח ל-${combinePhone(phoneVal)}`}
                </p>
              </div>
            </div>

            {/* 6 OTP digit boxes — LTR order for digits */}
            <div className="flex gap-2 justify-center" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all"
                  style={{
                    borderColor: digit ? "oklch(0.45 0.1 122)" : "oklch(0.88 0.03 122)",
                    background: digit ? "oklch(0.97 0.02 122)" : "white",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifyOtp.isPending || otp.some((d) => d === "")}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: "oklch(0.35 0.08 122)", color: "white" }}
            >
              {verifyOtp.isPending ? "מאמת..." : "אמת ועדכן מספר"}
            </button>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-muted-foreground">שלח שוב בעוד {countdown} שניות</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={requestOtp.isPending || requestOtpEmail.isPending}
                  className="text-xs font-medium underline"
                  style={{ color: "oklch(0.45 0.1 122)" }}
                >
                  שלח קוד חדש
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep("enter_phone")}
              className="w-full text-xs text-muted-foreground underline"
            >
              חזור לשינוי מספר
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

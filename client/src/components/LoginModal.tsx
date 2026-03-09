import { useState, useEffect, useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { popReturnPath } from "@/const";
import { AppButton } from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { saveReturnPath, getGoogleLoginUrl } from "@/const";
import { IsraeliPhoneInput, combinePhone, type PhoneValue } from "@/components/IsraeliPhoneInput";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

/** Normalize Israeli phone for display */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return raw;
}

const RESEND_COOLDOWN_SEC = 30;
const OTP_LENGTH = 6;

export default function LoginModal({ open, onClose, message }: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [name, setName] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { refetch } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // ── Timer helpers ────────────────────────────────────────────────────────────
  const startResendTimer = useCallback(() => {
    setResendCountdown(RESEND_COOLDOWN_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("phone");
        setPhone("");
        setPhoneVal({ prefix: "", number: "" });
        setNormalizedPhone("");
        setName("");
        setDigits(Array(OTP_LENGTH).fill(""));
        setResendCountdown(0);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    }
  }, [step]);

  // ── tRPC mutations ───────────────────────────────────────────────────────────
  const sendOtp = trpc.auth.sendOtp.useMutation({
    onSuccess: (data) => {
      setNormalizedPhone(data.phone);
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      startResendTimer();
      toast.success("קוד אימות נשלח לטלפון שלך 📱");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: () => {
      setStep("success");
      setTimeout(async () => {
        // Refresh auth state first so isAuthenticated becomes true
        await refetch();
        // Invalidate all cached queries so phone numbers and auth-gated data refresh
        // Do NOT await invalidateQueries — let it run in background so the modal
        // closes quickly and RoleSelectionScreen can render immediately
        queryClient.invalidateQueries();
        toast.success("התחברת בהצלחה! 🎉");
        onClose();
        // Navigate back to the page the user was on before login
        const returnPath = popReturnPath();
        if (returnPath) navigate(returnPath);
      }, 800);
    },
    onError: (e) => {
      toast.error(e.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 60);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSend = () => {
    // Build combined phone from split fields
    const combined = phoneVal.prefix.length === 3 && phoneVal.number.length === 7
      ? combinePhone(phoneVal)
      : phone.trim();
    if (!combined || combined.length < 9) return toast.error("הכנס מספר טלפון תקין");
    setPhone(combined);
    sendOtp.mutate({ phone: combined });
  };

  const submitOtp = useCallback((code: string) => {
    if (code.length !== OTP_LENGTH) return;
    verifyOtp.mutate({ phone: normalizedPhone || phone, code, name: name || undefined });
  }, [verifyOtp, normalizedPhone, phone, name]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all boxes filled
    if (digit && next.every(d => d !== "")) {
      submitOtp(next.join(""));
    }
  };

  const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowRight" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      const code = digits.join("");
      if (code.length === OTP_LENGTH) submitOtp(code);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("") as string[];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) submitOtp(pasted);
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setDigits(Array(OTP_LENGTH).fill(""));
    sendOtp.mutate({ phone: phone.trim() });
  };

  const isOtpComplete = digits.every(d => d !== "");
  const displayPhone = formatPhoneDisplay(phone);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden" dir="rtl">

        {/* ── Phone step ─────────────────────────────────────────────────────── */}
        {step === "phone" && (
          <div className="p-6 space-y-5">
            <DialogHeader className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2 mb-1">
                <DialogTitle className="text-xl font-bold">כניסה / הרשמה</DialogTitle>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
              </div>
              <DialogDescription className="text-right text-sm">
                {message ? (
                  <span className="font-medium text-foreground block mb-1">{message}</span>
                ) : null}
                הכנס מספר טלפון ישראלי ונשלח לך קוד אימות
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <IsraeliPhoneInput
                  value={phoneVal}
                  onChange={setPhoneVal}
                  label="מספר טלפון"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5 text-right">
                  שם מלא <span className="text-muted-foreground font-normal">(אופציונלי)</span>
                </label>
                <Input
                  placeholder="ישראל ישראלי"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="h-11 text-right"
                />
              </div>
            </div>

            <AppButton
              variant="brand"
              size="lg"
              className="w-full"
              onClick={handleSend}
              disabled={sendOtp.isPending || (phoneVal.prefix.length !== 3 || phoneVal.number.length !== 7)}
            >
              {sendOtp.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                : "שלח קוד אימות"}
            </AppButton>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">או</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* ── Google login ── */}
            <button
              type="button"
              onClick={() => {
                saveReturnPath();
                window.location.href = getGoogleLoginUrl();
              }}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
            >
              {/* Google SVG logo */}
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              כניסה עם Google
            </button>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              בהתחברות אתה מסכים ל
              <a href="/terms" className="text-primary hover:underline mx-1">תנאי השימוש</a>
              ול
              <a href="/privacy" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
            </p>
          </div>
        )}

        {/* ── OTP step ───────────────────────────────────────────────────────── */}
        {step === "otp" && (
          <div className="p-6 space-y-5">
            <DialogHeader className="text-right space-y-1">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => { setStep("phone"); setDigits(Array(OTP_LENGTH).fill("")); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
                  aria-label="חזרה"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">אימות קוד SMS</DialogTitle>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
              <DialogDescription className="text-right text-sm">
                הכנס את הקוד שנשלח ל-
                <span dir="ltr" className="font-semibold text-foreground mx-1">{displayPhone}</span>
              </DialogDescription>
            </DialogHeader>

            {/* 6 separate digit boxes — rendered LTR so box 0 is leftmost */}
            <div className="space-y-2">
              <label className="text-sm font-medium block text-right">קוד אימות (6 ספרות)</label>
              <div className="flex gap-2 justify-center" dir="ltr">
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={digits[i]}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={e => e.target.select()}
                    disabled={verifyOtp.isPending}
                    className={[
                      "w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none",
                      "bg-background text-foreground transition-all duration-150",
                      digits[i]
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                הקוד תקף ל-10 דקות · מקסימום 3 ניסיונות
              </p>
            </div>

            <AppButton
              variant="brand"
              size="lg"
              className="w-full"
              onClick={() => submitOtp(digits.join(""))}
              disabled={verifyOtp.isPending || !isOtpComplete}
            >
              {verifyOtp.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />מאמת...</>
                : <><CheckCircle2 className="h-4 w-4 ml-2" />אמת קוד</>}
            </AppButton>

            {/* Resend row */}
            <div className="flex items-center justify-between text-sm" dir="rtl">
              <button
                onClick={handleResend}
                disabled={resendCountdown > 0 || sendOtp.isPending}
                className={`flex items-center gap-1.5 transition-colors ${
                  resendCountdown > 0
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-primary hover:text-primary/80"
                }`}
              >
                {sendOtp.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />}
                {resendCountdown > 0
                  ? <span>שלח שוב בעוד <span className="font-semibold tabular-nums">{resendCountdown}</span> שניות</span>
                  : "שלח קוד מחדש"}
              </button>

              <button
                onClick={() => { setStep("phone"); setDigits(Array(OTP_LENGTH).fill("")); }}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                שנה מספר
              </button>
            </div>
          </div>
        )}

        {/* ── Success step ───────────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">ברוך הבא!</h3>
              <p className="text-sm text-muted-foreground mt-1">התחברת בהצלחה</p>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

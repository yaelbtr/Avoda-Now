import { useState, useEffect, useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
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

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [name, setName] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { refetch } = useAuth();

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
      setTimeout(() => {
        toast.success("התחברת בהצלחה! 🎉");
        refetch();
        onClose();
      }, 1400);
    },
    onError: (e) => {
      toast.error(e.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 60);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = phone.trim();
    if (!trimmed) return toast.error("הכנס מספר טלפון");
    sendOtp.mutate({ phone: trimmed });
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
                הכנס מספר טלפון ישראלי ונשלח לך קוד אימות
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1.5 text-right">מספר טלפון</label>
                <Input
                  type="tel"
                  placeholder="050-0000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: "left" }}
                  autoComplete="tel"
                  inputMode="tel"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  לדוגמה: 050-1234567 או +972501234567
                </p>
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

            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={handleSend}
              disabled={sendOtp.isPending || !phone.trim()}
            >
              {sendOtp.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                : "שלח קוד אימות"}
            </Button>

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

            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={() => submitOtp(digits.join(""))}
              disabled={verifyOtp.isPending || !isOtpComplete}
            >
              {verifyOtp.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />מאמת...</>
                : <><CheckCircle2 className="h-4 w-4 ml-2" />אמת קוד</>}
            </Button>

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

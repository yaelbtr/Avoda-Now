import { useState, useEffect, useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { popReturnPath } from "@/const";
import { AppButton } from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle2, RefreshCw, ArrowLeft, X, UserPlus, LogIn } from "lucide-react";
import { saveReturnPath, getGoogleLoginUrl } from "@/const";
import { IsraeliPhoneInput, combinePhone, type PhoneValue } from "@/components/IsraeliPhoneInput";
import { AnimatePresence, motion } from "framer-motion";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
  /** When true, after successful login non-admins are shown a "not an admin" message instead of entering the app */
  maintenanceMode?: boolean;
  /** Callback fired after login when user is NOT an admin (only relevant in maintenanceMode) */
  onNonAdminLogin?: () => void;
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

type Tab = "login" | "register";

export default function LoginModal({ open, onClose, message, maintenanceMode, onNonAdminLogin }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("login");
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
        setActiveTab("login");
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

  // Reset step when switching tabs
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setStep("phone");
    setPhone("");
    setPhoneVal({ prefix: "", number: "" });
    setNormalizedPhone("");
    setName("");
    setDigits(Array(OTP_LENGTH).fill(""));
    setResendCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

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
    onSuccess: (data) => {
      setStep("success");
      setTimeout(async () => {
        await refetch();
        queryClient.invalidateQueries();

        if (maintenanceMode && data.user?.role !== "admin") {
          toast.error("גישה מוגבלת — המערכת בתחזוקה. רק מנהלים יכולים להיכנס כעת.");
          onClose();
          onNonAdminLogin?.();
          return;
        }

        toast.success("התחברת בהצלחה! 🎉");
        onClose();
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
    const combined = phoneVal.prefix.length === 3 && phoneVal.number.length === 7
      ? combinePhone(phoneVal)
      : phone.trim();
    if (!combined || combined.length < 9) return toast.error("הכנס מספר טלפון תקין");
    if (activeTab === "register" && !name.trim()) return toast.error("יש להכניס שם מלא");
    setPhone(combined);
    sendOtp.mutate({ phone: combined });
  };

  const submitOtp = useCallback((code: string) => {
    if (code.length !== OTP_LENGTH) return;
    verifyOtp.mutate({ phone: normalizedPhone || phone, code, name: name.trim() || undefined });
  }, [verifyOtp, normalizedPhone, phone, name]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (digit && next.every(d => d !== "")) submitOtp(next.join(""));
  };

  const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]; next[index] = ""; setDigits(next);
      } else if (index > 0) {
        const next = [...digits]; next[index - 1] = ""; setDigits(next);
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
  const isPhoneValid = phoneVal.prefix.length === 3 && phoneVal.number.length === 7;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="login-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--background)" }}
            dir="rtl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "oklch(0 0 0 / 0.06)", color: "var(--muted-foreground)" }}
              aria-label="סגור"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ── Tabs header (only on phone step) ── */}
            {step === "phone" && (
              <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => handleTabChange("login")}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors relative ${
                    activeTab === "login"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  התחברות
                  {activeTab === "login" && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                </button>
                <button
                  onClick={() => handleTabChange("register")}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors relative ${
                    activeTab === "register"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  הרשמה
                  {activeTab === "register" && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                </button>
              </div>
            )}

            {/* ── Phone step ── */}
            {step === "phone" && (
              <div className="p-6 space-y-5">
                {/* Title */}
                <div className="text-center space-y-1 pt-1">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                    style={{ background: "oklch(0.50 0.09 124.9 / 0.12)" }}>
                    {activeTab === "login"
                      ? <LogIn className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                      : <UserPlus className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />}
                  </div>
                  <h2 className="text-xl font-bold">
                    {activeTab === "login" ? "ברוך הבא בחזרה" : "הצטרף לAvodaNow"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {message
                      ? message
                      : activeTab === "login"
                        ? "הכנס מספר טלפון ונשלח לך קוד אימות"
                        : "הכנס פרטים ונשלח לך קוד אימות לאישור"}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Name field — register only */}
                  {activeTab === "register" && (
                    <div>
                      <label className="text-sm font-medium block mb-1.5">שם מלא</label>
                      <Input
                        placeholder="ישראל ישראלי"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        className="h-11 text-right"
                      />
                    </div>
                  )}

                  <IsraeliPhoneInput
                    value={phoneVal}
                    onChange={setPhoneVal}
                    label="מספר טלפון"
                  />
                </div>

                <AppButton
                  variant="brand"
                  size="lg"
                  className="w-full"
                  onClick={handleSend}
                  disabled={sendOtp.isPending || !isPhoneValid || (activeTab === "register" && !name.trim())}
                >
                  {sendOtp.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                    : activeTab === "login" ? "שלח קוד אימות" : "הרשם ושלח קוד"}
                </AppButton>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">או</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Google login */}
                <button
                  type="button"
                  onClick={() => { saveReturnPath(); window.location.href = getGoogleLoginUrl(); }}
                  className="w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  {activeTab === "login" ? "כניסה עם Google" : "הרשמה עם Google"}
                </button>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  בהמשך אתה מסכים ל
                  <a href="/terms" className="text-primary hover:underline mx-1">תנאי השימוש</a>
                  ול
                  <a href="/privacy" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
                </p>
              </div>
            )}

            {/* ── OTP step ── */}
            {step === "otp" && (
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1 pt-2">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                    style={{ background: "oklch(0.50 0.09 124.9 / 0.12)" }}>
                    <Phone className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                  </div>
                  <h2 className="text-xl font-bold">אימות קוד SMS</h2>
                  <p className="text-sm text-muted-foreground">
                    הכנס את הקוד שנשלח ל-
                    <span dir="ltr" className="font-semibold text-foreground mx-1">{displayPhone}</span>
                  </p>
                </div>

                {/* 6 digit boxes */}
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

                {/* Resend + back */}
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

            {/* ── Success step ── */}
            {step === "success" && (
              <div className="p-10 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">ברוך הבא!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === "register" ? "נרשמת בהצלחה" : "התחברת בהצלחה"}
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

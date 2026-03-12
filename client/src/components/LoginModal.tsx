import { useState, useEffect, useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { popReturnPath } from "@/const";
import { AppButton } from "@/components/AppButton";
import { toast } from "sonner";
import {
  Phone, Loader2, CheckCircle2, RefreshCw, ArrowLeft, X,
  UserPlus, LogIn, HardHat, Briefcase, MapPin, CheckCircle,
  User, Mail,
} from "lucide-react";
import { saveReturnPath, getGoogleLoginUrl } from "@/const";
import { IsraeliPhoneInput, combinePhone, type PhoneValue } from "@/components/IsraeliPhoneInput";
import { AnimatePresence, motion } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import CityAutocomplete from "@/components/CityAutocomplete";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
  maintenanceMode?: boolean;
  onNonAdminLogin?: () => void;
}

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
type Step = "phone" | "otp" | "role" | "setup" | "success";

export default function LoginModal({ open, onClose, message, maintenanceMode, onNonAdminLogin }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("phone");

  // Shared phone state
  const [phone, setPhone] = useState("");
  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [normalizedPhone, setNormalizedPhone] = useState("");

  // Registration-only fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isTestBypass, setIsTestBypass] = useState(false);

  // Post-OTP setup state
  const [selectedRole, setSelectedRole] = useState<"worker" | "employer" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);

  // Pending registration data to pass to verifyOtp
  const pendingRegData = useRef<{ name: string; email: string } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { refetch } = useAuth();
  const { setLocalModeOnly } = useUserMode();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { categories: dbCategories } = useCategories();

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
        setRegName("");
        setRegEmail("");
        setTermsAccepted(false);
        setDigits(Array(OTP_LENGTH).fill(""));
        setResendCountdown(0);
        setSelectedRole(null);
        setSelectedCategories([]);
        setSelectedCity("");
        pendingRegData.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setStep("phone");
    setPhone("");
    setPhoneVal({ prefix: "", number: "" });
    setNormalizedPhone("");
    setRegName("");
    setRegEmail("");
    setTermsAccepted(false);
    setDigits(Array(OTP_LENGTH).fill(""));
    setResendCountdown(0);
    pendingRegData.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (step === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 120);
  }, [step]);

  // ── tRPC mutations ───────────────────────────────────────────────────────────
  const sendOtp = trpc.auth.sendOtp.useMutation({
    onSuccess: (data) => {
      setNormalizedPhone(data.phone);
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      const bypass = (data as any).testBypass === true;
      setIsTestBypass(bypass);
      if (bypass) {
        toast.success("משתמש טסט — הכנס את 6 הספרות הראשונות של הטלפון");
      } else {
        startResendTimer();
        toast.success("קוד אימות נשלח לטלפון שלך 📱");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: async (data) => {
      if (maintenanceMode && data.user?.role !== "admin" && data.user?.role !== "test") {
        await refetch();
        toast.error("גישה מוגבלת — המערכת בתחזוקה. רק מנהלים יכולים להיכנס כעת.");
        onClose();
        onNonAdminLogin?.();
        return;
      }
      await refetch();
      queryClient.invalidateQueries();
      if (data.user?.userMode) {
        setStep("success");
        setTimeout(() => {
          toast.success("התחברת בהצלחה! 🎉");
          onClose();
          const returnPath = popReturnPath();
          if (returnPath) navigate(returnPath);
        }, 800);
      } else {
        setStep("role");
      }
    },
    onError: (e) => {
      toast.error(e.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 60);
    },
  });

  const setModeMutation = trpc.user.setMode.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onError: () => {},
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const isPhoneValid = phoneVal.prefix.length === 3 && phoneVal.number.length === 7;

  const handleSend = () => {
    const combined = isPhoneValid ? combinePhone(phoneVal) : phone.trim();
    if (!combined || combined.length < 9) return toast.error("הכנס מספר טלפון תקין");
    if (activeTab === "register") {
      if (!regName.trim()) return toast.error("יש להכניס שם מלא");
      if (!termsAccepted) return toast.error("יש לאשר את תנאי השימוש");
      // Store registration data to pass to verifyOtp
      pendingRegData.current = { name: regName.trim(), email: regEmail.trim() };
    }
    setPhone(combined);
    sendOtp.mutate({
      phone: combined,
      isRegistration: activeTab === "register",
      termsAccepted: activeTab === "register" ? termsAccepted : undefined,
    });
  };

  const submitOtp = useCallback((code: string) => {
    if (code.length !== OTP_LENGTH) return;
    const reg = pendingRegData.current;
    verifyOtp.mutate({
      phone: normalizedPhone || phone,
      code,
      ...(reg ? { name: reg.name, email: reg.email || undefined, termsAccepted: true } : {}),
    });
  }, [verifyOtp, normalizedPhone, phone]);

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

  const handleRoleSelect = (role: "worker" | "employer") => {
    setSelectedRole(role);
    setStep("setup");
    setModeMutation.mutate({ mode: role });
    setLocalModeOnly(role);
  };

  const handleSetupDone = async () => {
    setSetupSaving(true);
    try {
      if (selectedRole === "worker") {
        await updateProfileMutation.mutateAsync({
          preferredCategories: selectedCategories,
          preferredCity: selectedCity || undefined,
        });
      } else if (selectedRole === "employer") {
        await updateProfileMutation.mutateAsync({
          preferredCity: selectedCity || undefined,
        });
      }
    } catch {
      // non-blocking
    } finally {
      setSetupSaving(false);
    }
    setStep("success");
    setTimeout(() => {
      toast.success("ברוך הבא ל-AvodaNow! 🎉");
      onClose();
      queryClient.invalidateQueries();
      const returnPath = popReturnPath();
      if (returnPath) navigate(returnPath);
      else navigate(selectedRole === "employer" ? "/" : "/find-jobs");
    }, 700);
  };

  const handleSkipSetup = () => {
    setStep("success");
    setTimeout(() => {
      toast.success("ברוך הבא ל-AvodaNow! 🎉");
      onClose();
      queryClient.invalidateQueries();
      const returnPath = popReturnPath();
      if (returnPath) navigate(returnPath);
      else navigate(selectedRole === "employer" ? "/" : "/find-jobs");
    }, 700);
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev =>
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]
    );
  };

  const isOtpComplete = digits.every(d => d !== "");
  const displayPhone = formatPhoneDisplay(normalizedPhone || phone);

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
            {step !== "success" && (
              <button
                onClick={onClose}
                className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: "oklch(0 0 0 / 0.06)", color: "var(--muted-foreground)" }}
                aria-label="סגור"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* ── STEP: phone ── */}
            {step === "phone" && (
              <>
                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
                  {(["login", "register"] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors relative ${
                        activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      {tab === "login" ? "התחברות" : "הרשמה"}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                          style={{ background: "var(--primary)" }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="text-center space-y-1 pt-1">
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                      style={{ background: "oklch(0.50 0.09 124.9 / 0.12)" }}>
                      {activeTab === "login"
                        ? <LogIn className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                        : <UserPlus className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />}
                    </div>
                    <h2 className="text-xl font-bold">
                      {activeTab === "login" ? "ברוך הבא בחזרה" : "הצטרף ל-AvodaNow"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {message
                        ? message
                        : activeTab === "login"
                          ? "הכנס מספר טלפון ונשלח לך קוד אימות"
                          : "מלא את הפרטים ונשלח לך קוד אימות"}
                    </p>
                  </div>

                  {/* ── REGISTER: extra fields ── */}
                  {activeTab === "register" && (
                    <>
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          שם מלא <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          placeholder="ישראל ישראלי"
                          className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          dir="rtl"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          כתובת מייל <span className="text-xs text-muted-foreground">(אופציונלי)</span>
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="example@gmail.com"
                          className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          dir="ltr"
                        />
                      </div>
                    </>
                  )}

                  {/* Phone */}
                  <IsraeliPhoneInput value={phoneVal} onChange={setPhoneVal} label="מספר טלפון" />

                  {/* ── REGISTER: terms checkbox ── */}
                  {activeTab === "register" && (
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <div className="relative mt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={e => setTermsAccepted(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            termsAccepted
                              ? "border-primary bg-primary"
                              : "border-border group-hover:border-primary/50"
                          }`}
                        >
                          {termsAccepted && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        קראתי ואני מסכים/ה ל
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1" onClick={e => e.stopPropagation()}>תנאי השימוש</a>
                        ול
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1" onClick={e => e.stopPropagation()}>מדיניות הפרטיות</a>
                      </span>
                    </label>
                  )}

                  {/* Send OTP button */}
                  <AppButton
                    variant="brand"
                    size="lg"
                    className="w-full"
                    onClick={handleSend}
                    disabled={
                      sendOtp.isPending ||
                      !isPhoneValid ||
                      (activeTab === "register" && (!regName.trim() || !termsAccepted))
                    }
                  >
                    {sendOtp.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                      : "שלח קוד אימות"}
                  </AppButton>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">או</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === "register" && !termsAccepted) {
                        toast.error("יש לאשר את תנאי השימוש לפני הרשמה");
                        return;
                      }
                      saveReturnPath();
                      window.location.href = getGoogleLoginUrl();
                    }}
                    disabled={activeTab === "register" && !termsAccepted}
                    className={`w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-border transition-colors text-sm font-medium shadow-sm ${
                      activeTab === "register" && !termsAccepted
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        : "bg-white hover:bg-gray-50 text-gray-700"
                    }`}
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

                  {/* Login-only: terms note */}
                  {activeTab === "login" && (
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      בהמשך אתה מסכים ל
                      <a href="/terms" className="text-primary hover:underline mx-1">תנאי השימוש</a>
                      ול
                      <a href="/privacy" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── STEP: otp ── */}
            {step === "otp" && (
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1 pt-2">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                    style={{ background: isTestBypass ? "oklch(0.65 0.15 55 / 0.15)" : "oklch(0.50 0.09 124.9 / 0.12)" }}>
                    <Phone className="h-6 w-6" style={{ color: isTestBypass ? "oklch(0.65 0.15 55)" : "oklch(0.50 0.09 124.9)" }} />
                  </div>
                  <h2 className="text-xl font-bold">{isTestBypass ? "אימות משתמש טסט" : "אימות קוד SMS"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {isTestBypass
                      ? <>הכנס את <span className="font-semibold text-foreground">6 הספרות הראשונות</span> של מספר הטלפון <span dir="ltr" className="font-semibold text-foreground">{displayPhone}</span></>
                      : <>הכנס את הקוד שנשלח ל-<span dir="ltr" className="font-semibold text-foreground mx-1">{displayPhone}</span></>
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block text-right">
                    {isTestBypass ? "קוד טסט (6 ספרות ראשונות של הטלפון)" : "קוד אימות (6 ספרות)"}
                  </label>
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
                          digits[i] ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40",
                          "focus:border-primary focus:ring-2 focus:ring-primary/20",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {isTestBypass ? "קוד ביצוע בלבד — ללא SMS" : "הקוד תקף ל-10 דקות · מקסימום 3 ניסיונות"}
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

                <div className="flex items-center justify-between text-sm" dir="rtl">
                  <button
                    onClick={handleResend}
                    disabled={resendCountdown > 0 || sendOtp.isPending}
                    className={`flex items-center gap-1.5 transition-colors ${
                      resendCountdown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {sendOtp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
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

            {/* ── STEP: role selection ── */}
            {step === "role" && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1 pt-1">
                  <h2 className="text-xl font-bold">איך תרצה להשתמש ב-AvodaNow?</h2>
                  <p className="text-sm text-muted-foreground">ניתן לשנות בכל עת</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Worker card */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleRoleSelect("worker")}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center"
                    style={{ borderColor: "oklch(0.88 0.04 84.0)", background: "oklch(0.98 0.01 122.3)" }}
                    whileHover={{ borderColor: "oklch(0.50 0.09 124.9)", scale: 1.02 }}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "oklch(0.50 0.09 124.9 / 0.12)" }}>
                      <HardHat className="h-7 w-7" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">אני מחפש עבודה</p>
                      <p className="text-xs text-muted-foreground mt-0.5">עובד / פרילנסר</p>
                    </div>
                  </motion.button>

                  {/* Employer card */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleRoleSelect("employer")}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center"
                    style={{ borderColor: "oklch(0.88 0.04 84.0)", background: "oklch(0.98 0.01 122.3)" }}
                    whileHover={{ borderColor: "oklch(0.50 0.09 124.9)", scale: 1.02 }}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "oklch(0.75 0.12 76.7 / 0.12)" }}>
                      <Briefcase className="h-7 w-7" style={{ color: "oklch(0.55 0.12 76.7)" }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">אני מחפש עובדים</p>
                      <p className="text-xs text-muted-foreground mt-0.5">מעסיק / עסק</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── STEP: quick setup ── */}
            {step === "setup" && (
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1 pt-1">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                    style={{ background: "oklch(0.50 0.09 124.9 / 0.12)" }}>
                    <MapPin className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                  </div>
                  <h2 className="text-xl font-bold">
                    {selectedRole === "worker" ? "מה אתה מחפש?" : "איפה אתה צריך עובדים?"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedRole === "worker"
                      ? "בחר קטגוריות ואזור — ניתן לשנות בפרופיל"
                      : "בחר אזור עבודה — ניתן לשנות בהמשך"}
                  </p>
                </div>

                {selectedRole === "worker" && dbCategories.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">קטגוריות עבודה (אופציונלי)</label>
                    <div className="flex flex-wrap gap-2">
                      {dbCategories.map((cat) => {
                        const active = selectedCategories.includes(cat.slug);
                        return (
                          <button
                            key={cat.slug}
                            type="button"
                            onClick={() => toggleCategory(cat.slug)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
                            style={{
                              borderColor: active ? "oklch(0.50 0.09 124.9)" : "oklch(0.88 0.04 84.0)",
                              background: active ? "oklch(0.50 0.09 124.9 / 0.10)" : "transparent",
                              color: active ? "oklch(0.40 0.09 124.9)" : "var(--muted-foreground)",
                            }}
                          >
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                            {active && <CheckCircle className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">עיר / אזור (אופציונלי)</label>
                  <CityAutocomplete
                    value={selectedCity}
                    onChange={setSelectedCity}
                    onSelect={(city) => setSelectedCity(city)}
                    placeholder="הקלד שם עיר..."
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <AppButton
                    variant="brand"
                    size="lg"
                    className="flex-1"
                    onClick={handleSetupDone}
                    disabled={setupSaving}
                  >
                    {setupSaving ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שומר...</> : "התחל"}
                  </AppButton>
                  <AppButton variant="outline" size="lg" onClick={handleSkipSetup} disabled={setupSaving}>
                    דלג
                  </AppButton>
                </div>
              </div>
            )}

            {/* ── STEP: success ── */}
            {step === "success" && (
              <div className="p-10 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">ברוך הבא!</h3>
                  <p className="text-sm text-muted-foreground mt-1">מועבר לאפליקציה...</p>
                </div>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect, useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getGoogleLoginUrl, isOAuthLoginEnabled, popReturnPath } from "@/const";
import { AppButton, AppLogo, BrandName, GoogleAuthButton } from "@/components/ui";
import { toast } from "sonner";
import {
  Phone, PhoneCall, Loader2, CheckCircle2, RefreshCw, ArrowLeft, X,
  UserPlus, LogIn, HardHat, Briefcase, MapPin, CheckCircle,
  User, Mail,
} from "lucide-react";
import { IsraeliPhoneInput, combinePhone, isValidPhoneValue, type PhoneValue } from "@/components/IsraeliPhoneInput";
import { AppInput, AppLabel } from "@/components/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
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

const RESEND_COOLDOWN_SEC = 60;
const OTP_LENGTH = 6;

type Tab = "login" | "register";
type Step = "welcome" | "phone" | "channel" | "otp" | "role" | "setup" | "success";
type OtpChannel = "sms" | "email" | "call" | "whatsapp";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/login-hero-house_378bbdc3.jpg";

export default function LoginModal({ open, onClose, message, maintenanceMode, onNonAdminLogin }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("welcome");

  // Shared phone state
  const [phone, setPhone] = useState("");
  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [normalizedPhone, setNormalizedPhone] = useState("");

  // Registration-only fields
  const [regName, setRegName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  // Pre-fill email from Google account when available — updated via effect below
  const [regEmail, setRegEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [age18Accepted, setAge18Accepted] = useState(false);

  // Consent recording — fires after successful registration
  const recordConsent = trpc.user.recordConsent.useMutation();

  // Name validator: min 2 chars, letters/spaces/hyphens only
  /** Validate name — pass touched=true after first blur to show "required" error */
  const validateName = (val: string, touched = false): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return touched ? "שם מלא הוא שדה חובה" : null;
    if (trimmed.length < 2) return "שם חייב להכיל לפחות 2 תווים";
    if (!/^[\u0590-\u05FFa-zA-Z\s\-']+$/.test(trimmed)) return "שם יכול להכיל אותיות ורווחים בלבד";
    return null;
  };

  /** Validate email — pass touched=true after first blur to show "required" error */
  const validateEmail = (val: string, touched = false): string | null => {
    if (!val.trim()) return touched ? "אימייל הוא שדה חובה" : null;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val) ? null : "כתובת מייל לא תקינה";
  };

  // OTP state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isTestBypass, setIsTestBypass] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);

  // Post-OTP setup state
  const [selectedRole, setSelectedRole] = useState<"worker" | "employer" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);

  // OTP channel selection (for registration)
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("sms");
  const [channelEmailError, setChannelEmailError] = useState<string | null>(null);

  // Email login state (login tab only)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginEmailError, setLoginEmailError] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  // Track whether current OTP was sent via email-only flow (login tab)
  const [isEmailOtpFlow, setIsEmailOtpFlow] = useState(false);

  // Pending registration data to pass to verifyOtp
  const pendingRegData = useRef<{ name: string; email: string } | null>(null);

  // Send cooldown — 60 seconds after each OTP send attempt
  const [sendCooldown, setSendCooldown] = useState(0);
  const sendCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSendCooldown = useCallback(() => {
    setSendCooldown(60);
    if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
    sendCooldownRef.current = setInterval(() => {
      setSendCooldown(prev => {
        if (prev <= 1) { clearInterval(sendCooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const utils = trpc.useUtils();
  const { refetch, user: authUser, logout: authLogout } = useAuth();
  const { setLocalModeOnly } = useUserMode();
  const { employerLock } = usePlatformSettings();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { categories: dbCategories } = useCategories();
  const googleLoginEnabled = isOAuthLoginEnabled();

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
  useEffect(() => () => { if (sendCooldownRef.current) clearInterval(sendCooldownRef.current); }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("welcome");
        setActiveTab("login");
        setPhone("");
        setPhoneVal({ prefix: "", number: "" });
        setNormalizedPhone("");
        setRegName("");
        setRegEmail("");
        setTermsAccepted(false);
        setDigits(Array(OTP_LENGTH).fill(""));
        setResendCountdown(0);
        setSendCooldown(0);
        if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
        setSelectedRole(null);
        setSelectedCategories([]);
        setSelectedCity("");
        setChannelEmailError(null);
        setLoginEmail("");
        setLoginEmailError(null);
        setShowEmailLogin(false);
        setIsEmailOtpFlow(false);
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
    setSendCooldown(0);
    if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
    setDuplicateError(null);
    setNotFoundError(null);
    setChannelEmailError(null);
    setLoginEmail("");
    setLoginEmailError(null);
    setShowEmailLogin(false);
    setIsEmailOtpFlow(false);
    pendingRegData.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (step === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 120);
  }, [step]);

  useEffect(() => {
    if (open && message) {
      setActiveTab("login");
      setStep("phone");
    }
  }, [open, message]);

  const redirectToRegistrationCompletion = (options?: { email?: string }) => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setActiveTab("register");
    setStep("phone");
    setDuplicateError(null);
    setNotFoundError(null);
    setChannelEmailError(null);
    setLoginEmailError(null);
    setShowEmailLogin(false);
    setIsEmailOtpFlow(false);
    if (options?.email) {
      setRegEmail(options.email);
      setEmailError(null);
    }
  };

  const isIncompleteAccountError = (code: string | undefined) => code === "FORBIDDEN";

  // Pre-fill email (and name) from Google account when register tab is active
  useEffect(() => {
    if (open && activeTab === "register" && authUser) {
      if (authUser.email && !regEmail) setRegEmail(authUser.email);
      if (authUser.name && !regName) setRegName(authUser.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, authUser]);

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
        startSendCooldown();
        const displayPhone = formatPhoneDisplay(data.phone);
        toast.success(`קוד נשלח ל-${displayPhone} • תקף ל-5 דקות`, { duration: 5000 });
      }
    },
    onError: (e) => {
      // CONFLICT = phone or email already registered
      if (e.data?.code === "CONFLICT") {
        // In channel step, duplicateError is shown inline there too
        setDuplicateError(e.message);
        return;
      }
      // NOT_FOUND = phone not registered — show inline banner with register link
      if (e.data?.code === "NOT_FOUND") {
        setNotFoundError(e.message);
        return;
      }
      toast.error(e.message);
    },
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
      // Test user re-login: profile was reset on server — clear all client-side
      // profile/onboarding state from localStorage and sessionStorage so the
      // UI starts fresh (role selection, filter prefs, location cache, etc.).
      if ((data as any).testReset === true) {
        const keysToRemove = [
          "avoda_now_role",
          "avoda_now_role_user",
          "avoda_now_guest_role",
          "findJobs_filters",
          "findJobs_location",
          "myApplicationsLastSeen",
          "pushBannerDismissed",
          "avodanow_banner_dismissed",
        ];
        keysToRemove.forEach((k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });
        // Also clear the session-storage guest role key
        sessionStorage.removeItem("avoda_now_guest_role");
      }
      await refetch();
      queryClient.invalidateQueries();
      // Record consents for new registrations (isNewUser flag from server)
      if ((data as any).isNewUser && data.user?.id) {
        const consentTypes = ["terms", "privacy", "age_18"] as const;
        consentTypes.forEach((ct) => recordConsent.mutate({ consentType: ct }));
      }
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
      if (isIncompleteAccountError(e.data?.code)) {
        redirectToRegistrationCompletion();
        return;
      }
      // FORBIDDEN = existing user without termsAcceptedAt → must register
      if ((e.data?.code as string | undefined) === "FORBIDDEN") {
        setDigits(Array(OTP_LENGTH).fill(""));
        setActiveTab("register");
        setStep("phone");
        toast.error("חשבונך לא הושלם. יש להירשם ולאשר את תנאי השימוש.");
        return;
      }
      toast.error(e.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 60);
    },
  });

  // Email OTP mutations (login tab only)
  const sendEmailCode = trpc.auth.sendEmailCode.useMutation({
    onSuccess: () => {
      setIsEmailOtpFlow(true);
      setOtpChannel("email");
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      startResendTimer();
      startSendCooldown();
      const masked = loginEmail.includes("@")
        ? (() => { const [l, d] = loginEmail.split("@"); return `${l.slice(0, 2)}***@${d}`; })()
        : loginEmail;
      toast.success(`קוד נשלח למייל ${masked} • תקף ל-5 דקות`, { duration: 5000 });
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyEmailCode = trpc.auth.verifyEmailCode.useMutation({
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
      if ((data as any).isNewUser && data.user?.id) {
        const consentTypes = ["terms", "privacy", "age_18"] as const;
        consentTypes.forEach((ct) => recordConsent.mutate({ consentType: ct }));
      }
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
      if (isIncompleteAccountError(e.data?.code)) {
        redirectToRegistrationCompletion({ email: loginEmail.trim() || undefined });
        return;
      }
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

  const handleSend = (explicitChannel?: OtpChannel) => {
    const combined = isPhoneValid ? combinePhone(phoneVal) : phone.trim();
    if (!combined || combined.length < 9) return toast.error("הכנס מספר טלפון תקין");
    if (activeTab === "register") {
      if (!regName.trim()) return toast.error("יש להכניס שם מלא");
      if (!termsAccepted) return toast.error("יש לאשר את תנאי השימוש");
      if (!age18Accepted) return toast.error("יש לאשר כי הנך בן/בת 16 ומעלה");
      // Store registration data to pass to verifyOtp
      pendingRegData.current = { name: regName.trim(), email: regEmail.trim() };
    }
    // Use explicit channel if provided (avoids React stale state on same-tick calls)
    const channelToUse = explicitChannel ?? otpChannel;
    if (explicitChannel) setOtpChannel(explicitChannel);
    setPhone(combined);
    if (activeTab === "register") {
      // For registration: go to channel selection first
      setStep("channel");
    } else {
      sendOtp.mutate({ phone: combined, channel: channelToUse });
    }
  };

  const submitOtp = useCallback((code: string) => {
    if (code.length !== OTP_LENGTH) return;
    // Email OTP flow — route to verifyEmailCode
    // Pass name and phone for new registrations (pendingRegData is set in handleSend)
    if (isEmailOtpFlow) {
      const reg = pendingRegData.current;
      const phoneForServer = reg ? (
        isValidPhoneValue(phoneVal) ? combinePhone(phoneVal) : (phone.trim() || undefined)
      ) : undefined;
      verifyEmailCode.mutate({
        email: loginEmail,
        code,
        ...(reg ? { termsAccepted: true } : {}),
        ...(reg?.name ? { name: reg.name } : {}),
        ...(phoneForServer ? { phone: phoneForServer } : {}),
      });
      return;
    }
    const reg = pendingRegData.current;
    verifyOtp.mutate({
      phone: normalizedPhone || phone,
      code,
      ...(reg ? { name: reg.name, email: reg.email || undefined, termsAccepted: true } : {}),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyOtp, verifyEmailCode, normalizedPhone, phone, isEmailOtpFlow, loginEmail, phoneVal]);

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

  const handleChannelProceed = () => {
    const reg = pendingRegData.current;
    // Email channel: validate and use sendEmailCode
    if (otpChannel === "email") {
      const emailVal = reg?.email || "";
      const emailErr = validateEmail(emailVal, true);
      if (emailErr) {
        setChannelEmailError(emailErr);
        return;
      }
      setChannelEmailError(null);
      // Store email for verifyEmailCode
      setLoginEmail(emailVal);
      setIsEmailOtpFlow(true);
      sendEmailCode.mutate({ email: emailVal });
      return;
    }
    setChannelEmailError(null);
    sendOtp.mutate({
      phone: phone.trim(),
      isRegistration: true,
      termsAccepted: true,
      email: reg?.email || undefined,
      channel: otpChannel,
    });
  };

  const handleResend = (channel?: OtpChannel) => {
    if (resendCountdown > 0) return;
    setDigits(Array(OTP_LENGTH).fill(""));
    sendOtp.mutate({ phone: phone.trim(), channel: channel ?? otpChannel });
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

  const handleGoogleLogin = () => {
    if (!googleLoginEnabled) return;
    const returnPath = window.location.pathname + window.location.search;
    window.location.assign(getGoogleLoginUrl(returnPath));
  };

  if (!open) return null;

  return (
    <AnimatePresence mode="wait">
      {open && step === "welcome" && (
        <motion.div
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          dir="rtl"
        >
          <motion.div
            key="welcome-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="w-full max-w-lg flex flex-col"
            style={{
              borderRadius: "20px 20px 0 0",
              background: "var(--page-bg-gradient)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              touchAction: "none",
            }}
          >
            {/* Drag handle — animated hint */}
            <div className="flex justify-center pt-2.5 pb-0 flex-shrink-0" aria-hidden="true">
              <motion.div
                className="rounded-full"
                style={{ background: "rgba(0,0,0,0.22)", width: 40, height: 4 }}
                animate={{
                  width: [40, 52, 40],
                  opacity: [0.55, 1, 0.55],
                  y: [0, 3, 0],
                }}
                transition={{
                  duration: 1.6,
                  repeat: 3,
                  repeatDelay: 0.8,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "#666" }} aria-label="סגור">
                <X className="h-4 w-4" />
              </button>
              <AppLogo variant="light" size="sm" animated={false} />
              <div className="w-8" />
            </div>

            {/* Content area */}
            <div>

            {/* Welcome text */}
            <div className="px-5 pt-4 pb-2 text-center flex-shrink-0">
              <h1
                className="font-bold leading-tight tracking-tight mb-2"
                style={{ fontSize: "clamp(22px, 6vw, 28px)", color: "#1a2010" }}
              >
                ברוכים הבאים ל-<BrandName />
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "#4a5a38" }}>
                הדרך הפשוטה והמהירה ביותר למצוא את המשרה הבאה שלך ולנהל את הקריירה בביטחון.
              </p>
            </div>

            {/* Spacer */}
            <div className="flex-1" style={{ minHeight: 8 }} />

            {/* Action Buttons */}
            <div className="px-5 pb-3 flex flex-col gap-2.5 flex-shrink-0">
              {authUser ? (
                /* Already logged in — show profile shortcut instead of auth buttons */
                <>
                  <div className="text-center py-2 text-sm" style={{ color: "#4a5d23" }}>
                    מחובר כ-<strong>{authUser.name || authUser.email}</strong>
                  </div>
                  <AppButton
                    variant="cta"
                    size="lg"
                    className="w-full"
                    onClick={() => { onClose(); navigate("/profile"); }}
                  >
                    עבור לפרופיל
                  </AppButton>
                  <AppButton
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => { authLogout(); onClose(); }}
                  >
                    התנתק
                  </AppButton>
                </>
              ) : (
                /* Not logged in — normal auth flow */
                <>
                  <AppButton
                    variant="cta"
                    size="lg"
                    className="w-full"
                    onClick={() => { setActiveTab("register"); setStep("phone"); }}
                  >
                    הרשמה
                  </AppButton>
                  <AppButton
                    variant="cta-outline"
                    size="lg"
                    className="w-full"
                    onClick={() => { setActiveTab("login"); setStep("phone"); }}
                  >
                    התחברות
                  </AppButton>
                </>
              )}
            </div>

            {/* Footer terms */}
            <div className="px-5 pb-5 text-center flex-shrink-0">
              <p className="text-xs" style={{ color: "#9a9a8a" }}>
                בהמשך התהליך הינך מסכים ל
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline mx-0.5" style={{ color: "#556b2f" }}>תנאי השימוש</a>
                ול
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline mx-0.5" style={{ color: "#556b2f" }}>מדיניות הפרטיות</a>
                {" "}שלנו.
              </p>
            </div>

            </div> {/* end content gradient wrapper */}
          </motion.div>
        </motion.div>
      )}

      {/* ── LOGIN PHONE STEP: compact bottom sheet (no scroll) ── */}
      {open && step === "phone" && activeTab === "login" && (
        <motion.div
          key="login-phone-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          dir="rtl"
        >
          <motion.div
            key="login-phone-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
            className="w-full max-w-lg flex flex-col"
            style={{
              borderRadius: "20px 20px 0 0",
              background: "var(--page-bg-gradient)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              touchAction: "none",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-0 flex-shrink-0" aria-hidden="true">
              <motion.div
                className="rounded-full"
                style={{ background: "rgba(0,0,0,0.22)", width: 40, height: 4 }}
                animate={{ width: [40, 52, 40], opacity: [0.55, 1, 0.55], y: [0, 3, 0] }}
                transition={{ duration: 1.6, repeat: 3, repeatDelay: 0.8, ease: "easeInOut", delay: 0.5 }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
              <button
                onClick={() => setStep("welcome")}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: "#666" }}
                aria-label="חזור"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-bold" style={{ color: "#556b2f" }}>התחברות</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: "#666" }}
                aria-label="סגור"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="w-full space-y-4 px-5 pt-3 pb-5" dir="rtl">
              {message && (
                <div
                  className="rounded-lg border p-3 text-sm"
                  style={{
                    borderColor: "oklch(0.72 0.15 80.8 / 0.6)",
                    background: "oklch(0.82 0.15 80.8 / 0.12)",
                    color: "oklch(0.40 0.12 60)",
                  }}
                >
                  {message}
                </div>
              )}
              {/* Subtitle */}
              <p className="text-sm text-center" style={{ color: "#6b7280" }}>
                הכנס את מספר הטלפון שלך לקבלת קוד אימות
              </p>

              {/* Phone field */}
              <IsraeliPhoneInput
                value={phoneVal}
                onChange={(v) => { setPhoneVal(v); setNotFoundError(null); }}
                label="מספר טלפון"
              />

              {/* Not-found error */}
              {notFoundError && (
                <div className="rounded-lg border p-3 text-sm flex flex-col gap-2" dir="rtl"
                  style={{ borderColor: "oklch(0.72 0.15 80.8 / 0.6)", background: "oklch(0.82 0.15 80.8 / 0.12)", color: "oklch(0.40 0.12 60)" }}
                >
                  <p className="font-medium">{notFoundError}</p>
                  <button type="button" className="text-xs font-bold text-right hover:opacity-80 transition-opacity underline"
                    style={{ color: "oklch(0.38 0.14 55)" }}
                    onClick={() => { setNotFoundError(null); setActiveTab("register"); setStep("phone"); }}
                  >אנא בצע הרשמה תחילה</button>
                </div>
              )}

              {/* Send OTP buttons — SMS or Call */}
              <div className="flex flex-col gap-2">
                <AppButton
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={() => handleSend("sms")}
                  disabled={sendOtp.isPending || !isPhoneValid || sendCooldown > 0}
                >
                  {sendOtp.isPending && otpChannel === "sms"
                    ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                    : sendCooldown > 0
                      ? <>שלח שוב בעוד <span className="tabular-nums font-bold">{sendCooldown}</span>שנייות</>
                      : <><Phone className="h-4 w-4 ml-2" />קבל קוד ב-SMS</>}
                </AppButton>


                {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.04 122)" }} />
                  <span className="text-xs" style={{ color: "#9a9a8a" }}>או</span>
                  <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.04 122)" }} />
                </div>

                {/* Email OTP toggle */}
                {!showEmailLogin ? (
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl border-2 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    style={{ borderColor: "oklch(0.88 0.04 122)", color: "#556b2f", background: "transparent" }}
                    onClick={() => setShowEmailLogin(true)}
                  >
                    <Mail className="h-4 w-4" />
                    התחבר עם כתובת מייל
                  </button>
                ) : (
                  <div className="space-y-2">
                    <AppInput
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="כתובת מייל"
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginEmailError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const err = validateEmail(loginEmail, true);
                          if (err) { setLoginEmailError(err); return; }
                          sendEmailCode.mutate({ email: loginEmail });
                        }
                      }}
                      className="w-full text-right"
                      dir="ltr"
                    />
                    {loginEmailError && (
                      <p className="text-xs" style={{ color: "oklch(0.45 0.18 25)" }}>{loginEmailError}</p>
                    )}
                    <AppButton
                      variant="cta"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        const err = validateEmail(loginEmail, true);
                        if (err) { setLoginEmailError(err); return; }
                        sendEmailCode.mutate({ email: loginEmail });
                      }}
                      disabled={sendEmailCode.isPending || !loginEmail.trim() || sendCooldown > 0}
                    >
                      {sendEmailCode.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                        : sendCooldown > 0
                          ? <>שלח שוב בעוד <span className="tabular-nums font-bold">{sendCooldown}</span>שנייות</>
                          : <><Mail className="h-4 w-4 ml-2" />שלח קוד למייל</>}
                    </AppButton>
                    <button
                      type="button"
                      className="w-full text-xs text-center hover:underline"
                      style={{ color: "#9a9a8a" }}
                      onClick={() => { setShowEmailLogin(false); setLoginEmail(""); setLoginEmailError(null); }}
                    >
                      בטל
                    </button>
                  </div>
                )}
                {googleLoginEnabled && (
                  <>
                    <div className="flex items-center gap-3 my-1">
                      <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.04 122)" }} />
                      <span className="text-xs" style={{ color: "#9a9a8a" }}>או</span>
                      <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.04 122)" }} />
                    </div>

                    <GoogleAuthButton
                      label="כניסה עם Google"
                      onClick={handleGoogleLogin}
                    />
                    <p className="text-xs text-center" style={{ color: "#6b7280" }}>
                      מיועד למשתמשים קיימים בלבד
                    </p>
                  </>
                )}
              </div>

              {/* Footer */}
              <p className="text-center text-sm" style={{ color: "#6b7280" }}>
                עוד לא רשום?{" "}
                <button type="button" className="font-bold hover:underline" style={{ color: "oklch(0.50 0.14 85)" }}
                  onClick={() => { setActiveTab("register"); setStep("phone"); }}
                >הרשם כאן</button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── OTP + other steps: centered modal ── */}
      {open && step !== "phone" && step !== "welcome" && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--page-bg-gradient)" }}
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

            {/* ── STEP: channel ── */}
            {step === "channel" && (
              <div className="p-6 space-y-5" dir="rtl">
                {/* Header */}
                <div className="text-center space-y-2 pt-2">
                  <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                    style={{ background: "oklch(0.50 0.14 85 / 0.12)" }}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="oklch(0.50 0.14 85)" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: "#1a2010" }}>אימות זהות</h2>
                  <p className="text-sm" style={{ color: "#6b7280" }}>בחר כיצד לאמת את זהותך</p>
                </div>

                {/* Channel cards */}
                <div className="space-y-3">
                  {(["sms", "email"] as OtpChannel[]).map((ch) => (
                    <label
                      key={ch}
                      className="relative block cursor-pointer"
                      onClick={() => { setOtpChannel(ch); setChannelEmailError(null); }}
                    >
                      <div
                        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                        style={{
                          border: `2px solid ${otpChannel === ch ? (ch === "whatsapp" ? "#25D366" : "oklch(0.50 0.14 85)") : "oklch(0.88 0.04 122)"}`,
                          background: otpChannel === ch ? (ch === "whatsapp" ? "rgba(37,211,102,0.05)" : "oklch(0.50 0.14 85 / 0.05)") : "#ffffff",
                        }}
                      >
                        {/* Radio */}
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 order-last"
                          style={{ borderColor: otpChannel === ch ? (ch === "whatsapp" ? "#25D366" : "oklch(0.50 0.14 85)") : "#d1d5db" }}
                        >
                          {otpChannel === ch && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: ch === "whatsapp" ? "#25D366" : "oklch(0.50 0.14 85)" }} />
                          )}
                        </div>
                        {/* Text */}
                        <div className="flex-1 text-right">
                          <p className="font-bold text-base" style={{ color: "#1a2010" }}>
                            {ch === "sms" ? "קבלת סיסמא ב-SMS" : ch === "email" ? "קבלת סיסמא במייל" : ch === "whatsapp" ? "קבלת סיסמא ב-WhatsApp" : "קבלת סיסמא בשיחת טלפון"}
                          </p>
                          <p className="text-sm" style={{ color: "#6b7280" }}>
                            {ch === "email" ? (
                              <>הקוד יישלח לכתובת המייל שנרשמת בהרשמה</>
                            ) : ch === "whatsapp" ? (
                              <>הקוד יישלח ל-WhatsApp במספר{" "}
                                {phone ? (
                                  <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                                    {(() => {
                                      const d = phone.replace(/\D/g, "");
                                      return d.length >= 7 ? `${d.slice(0,3)}-****${d.slice(-3)}` : phone;
                                    })()}
                                  </span>
                                ) : "הטלפון שהזנת"}
                              </>
                            ) : ch === "sms" ? (
                              <>הקוד יישלח למספר{" "}
                                {phone ? (
                                  <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                                    {(() => {
                                      const d = phone.replace(/\D/g, "");
                                      return d.length >= 7 ? `${d.slice(0,3)}-****${d.slice(-3)}` : phone;
                                    })()}
                                  </span>
                                ) : "הטלפון שהזנת"}
                              </>
                            ) : (
                              <>תקבל שיחה אוטומטית עם הקוד למספר{" "}
                                {phone ? (
                                  <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                                    {(() => {
                                      const d = phone.replace(/\D/g, "");
                                      return d.length >= 7 ? `${d.slice(0,3)}-****${d.slice(-3)}` : phone;
                                    })()}
                                  </span>
                                ) : "הטלפון שהזנת"}
                              </>
                            )}
                          </p>
                        </div>
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: ch === "whatsapp" ? "rgba(37,211,102,0.10)" : "oklch(0.50 0.14 85 / 0.10)" }}
                        >
                          {ch === "email" ? (
                            <Mail className="w-5 h-5" style={{ color: "oklch(0.50 0.14 85)" }} />
                          ) : ch === "whatsapp" ? (
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          ) : (
                            <Phone className="w-5 h-5" style={{ color: "oklch(0.50 0.14 85)" }} />
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Channel email format error */}
                {channelEmailError && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: "oklch(0.95 0.03 25 / 0.8)", color: "oklch(0.45 0.18 25)", border: "1px solid oklch(0.85 0.08 25 / 0.5)" }}
                    dir="rtl"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{channelEmailError}</span>
                  </div>
                )}



                {/* CTA */}
                <div className="space-y-3 pt-1">
                  <AppButton
                    variant="cta"
                    size="lg"
                    className="w-full"
                    onClick={handleChannelProceed}
                    disabled={sendOtp.isPending || sendCooldown > 0}
                  >
                    {sendOtp.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                    ) : sendCooldown > 0 ? (
                      <>שלח שוב בעוד <span className="tabular-nums font-bold mx-1">{sendCooldown}</span>שנייות</>
                    ) : (
                      <>המשך לקבלת הקוד <ArrowLeft className="h-4 w-4 mr-1" /></>
                    )}
                  </AppButton>



                  <button
                    type="button"
                    className="w-full py-2 text-sm font-medium hover:underline transition-colors"
                    style={{ color: "#6b7280" }}
                    onClick={() => { setStep("phone"); setDuplicateError(null); }}
                  >
                    חזרה למסך ההתחברות
                  </button>
                </div>

                {/* Security badge */}
                <div className="flex justify-center pt-1">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
                    style={{ background: "oklch(0.96 0.01 100)", color: "#6b7280" }}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>החיבור שלך מאובטח ומוצפן בדרגה גבוהה</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP: otp ── */}
            {step === "otp" && (
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1 pt-2">
                  {/* Icon — changes based on channel */}
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                    style={{ background: isTestBypass
                      ? "oklch(0.65 0.15 55 / 0.15)"
                      : otpChannel === "email"
                        ? "oklch(0.50 0.14 85 / 0.12)"
                        : otpChannel === "whatsapp"
                          ? "rgba(37,211,102,0.12)"
                          : "oklch(0.50 0.09 124.9 / 0.12)" }}>
                    {isTestBypass
                      ? <Phone className="h-6 w-6" style={{ color: "oklch(0.65 0.15 55)" }} />
                      : otpChannel === "email"
                        ? <Mail className="h-6 w-6" style={{ color: "oklch(0.50 0.14 85)" }} />
                        : otpChannel === "whatsapp"
                          ? <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          : <Phone className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                    }
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold">
                    {isTestBypass
                      ? "אימות משתמש טסט"
                      : otpChannel === "email"
                        ? "אימות קוד מייל"
                        : otpChannel === "whatsapp"
                          ? "אימות קוד WhatsApp"
                          : "אימות קוד SMS"}
                  </h2>

                  {/* Subtitle — shows masked destination */}
                  <p className="text-sm text-muted-foreground">
                    {isTestBypass ? (
                      <>הכנס את <span className="font-semibold text-foreground">6 הספרות הראשונות</span> של מספר הטלפון{" "}
                        <span dir="ltr" className="font-semibold text-foreground">{displayPhone}</span>
                      </>
                    ) : otpChannel === "email" ? (
                      <>קוד אימות נשלח למייל{"\ "}
                        <span className="font-semibold text-foreground">
                          {pendingRegData.current?.email
                            ? (() => {
                                const [local, domain] = pendingRegData.current.email.split("@");
                                return `${local.slice(0, 2)}***@${domain}`;
                              })()
                            : "המייל שלך"}
                        </span>
                      </>
                    ) : otpChannel === "whatsapp" ? (
                      <>קוד אימות נשלח ל-WhatsApp במספר{"\ "}
                        <span dir="ltr" className="font-semibold text-foreground mx-1">{displayPhone}</span>
                      </>
                    ) : (
                      <>קוד אימות נשלח למספר{"\ "}
                        <span dir="ltr" className="font-semibold text-foreground mx-1">{displayPhone}</span>
                      </>
                    )}
                  </p>

                  {/* Channel badge */}
                  {!isTestBypass && (
                    <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: "oklch(0.50 0.09 124.9 / 0.10)",
                        color: "oklch(0.40 0.09 124.9)",
                      }}
                    >
                      {otpChannel === "email"
                        ? <><Mail className="w-3 h-3" /> נשלח למייל</>
                        : otpChannel === "call"
                        ? <><Phone className="w-3 h-3" /> נשלח בשיחה</>
                        : otpChannel === "whatsapp"
                        ? <><svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> נשלח ב-WhatsApp</>
                        : <><Phone className="w-3 h-3" /> נשלח ב-SMS</>
                      }
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <AppLabel>{isTestBypass ? "קוד טסט (6 ספרות ראשונות של הטלפון)" : "קוד אימות (6 ספרות)"}</AppLabel>
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
                        disabled={verifyOtp.isPending || verifyEmailCode.isPending}
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
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={() => submitOtp(digits.join(""))}
                  disabled={(verifyOtp.isPending || verifyEmailCode.isPending) || !isOtpComplete}
                >
                  {(verifyOtp.isPending || verifyEmailCode.isPending)
                    ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />מאמת...</>
                    : <><CheckCircle2 className="h-4 w-4 ml-2" />אמת קוד</>}
                </AppButton>

                <div className="flex items-center justify-between text-sm" dir="rtl">
                  <button
                    onClick={() => {
                      if (isEmailOtpFlow) {
                        if (resendCountdown > 0) return;
                        setDigits(Array(OTP_LENGTH).fill(""));
                        sendEmailCode.mutate({ email: loginEmail });
                      } else {
                        handleResend();
                      }
                    }}
                    disabled={resendCountdown > 0 || sendOtp.isPending || sendEmailCode.isPending}
                    className={`flex items-center gap-1.5 transition-colors ${
                      resendCountdown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {(sendOtp.isPending || sendEmailCode.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {resendCountdown > 0
                      ? <span>שלח שוב בעוד <span className="font-semibold tabular-nums">{resendCountdown}</span> שניות</span>
                      : "שלח קוד מחדש"}
                  </button>

                  {/* Right side: change channel or change number */}
                  <div className="flex items-center gap-3">
                    {/* Channel already chosen in phone step — no toggle needed here */}
                    {activeTab === "register" && (
                      <button
                        onClick={() => { setStep("channel"); setDigits(Array(OTP_LENGTH).fill(""));}}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        שנה שיטת קבלה
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setStep("phone");
                        setDigits(Array(OTP_LENGTH).fill(""));
                        if (isEmailOtpFlow) { setShowEmailLogin(false); setIsEmailOtpFlow(false); }
                      }}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {isEmailOtpFlow ? "שנה מייל" : "שנה מספר"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP: role selection ── */}
            {step === "role" && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1 pt-1">
                  <h2 className="text-xl font-bold">איך תרצה להשתמש ב-<BrandName />?</h2>
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

                  {/* Employer card — disabled when employer lock is active */}
                  <motion.button
                    whileTap={employerLock ? {} : { scale: 0.97 }}
                    onClick={() => { if (!employerLock) handleRoleSelect("employer"); }}
                    disabled={employerLock}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center relative"
                    style={{
                      borderColor: employerLock ? "oklch(0.88 0.04 84.0 / 0.4)" : "oklch(0.88 0.04 84.0)",
                      background: employerLock ? "oklch(0.96 0.01 122.3)" : "oklch(0.98 0.01 122.3)",
                      opacity: employerLock ? 0.55 : 1,
                      cursor: employerLock ? "not-allowed" : "pointer",
                    }}
                    whileHover={employerLock ? {} : { borderColor: "oklch(0.50 0.09 124.9)", scale: 1.02 }}
                  >
                    {employerLock && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: "oklch(0.88 0.04 84.0)", color: "oklch(0.45 0.05 84.0)" }}>
                        בקרוב
                      </span>
                    )}
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "oklch(0.75 0.12 76.7 / 0.12)" }}>
                      <Briefcase className="h-7 w-7" style={{ color: employerLock ? "oklch(0.70 0.06 76.7)" : "oklch(0.55 0.12 76.7)" }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{employerLock ? "פרסום משרה" : "אני מחפש עובדים"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{employerLock ? "זמין בקרוב" : "מעסיק / עסק"}</p>
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
                    <AppLabel>קטגוריות עבודה (אופציונלי)</AppLabel>
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
                  <AppLabel>עיר / אזור (אופציונלי)</AppLabel>
                  <CityAutocomplete
                    value={selectedCity}
                    onChange={setSelectedCity}
                    onSelect={(city) => setSelectedCity(city)}
                    placeholder="הקלד שם עיר..."
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <AppButton
                    variant="cta"
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

      {/* ── REGISTER SCREEN: bottom sheet (new design) ── */}
      {open && step === "phone" && activeTab === "register" && (
        <motion.div
          key="register-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          dir="rtl"
        >
          <motion.div
            key="register-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
            className="w-full max-w-lg flex flex-col"
            style={{
              borderRadius: "20px 20px 0 0",
              background: "var(--page-bg-gradient)",
              maxHeight: "95dvh",
              overflowY: "auto",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
              touchAction: "none",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-0 flex-shrink-0" aria-hidden="true">
              <motion.div
                className="rounded-full"
                style={{ background: "rgba(0,0,0,0.18)", width: 40, height: 4 }}
                animate={{ width: [40, 52, 40], opacity: [0.55, 1, 0.55], y: [0, 3, 0] }}
                transition={{ duration: 1.6, repeat: 3, repeatDelay: 0.8, ease: "easeInOut", delay: 0.5 }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
              <button
                onClick={() => { setActiveTab("login"); setStep("welcome"); }}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "#4a5d23" }}
                aria-label="חזור"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-bold" style={{ color: "#556b2f" }}>הרשמה</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "#666" }}
                aria-label="סגור"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="px-6 pt-2 pb-4 space-y-3 overflow-y-auto">

              {/* Already-logged-in guard */}
              {authUser && (
                <div className="rounded-xl border p-5 text-center space-y-4" dir="rtl"
                  style={{ background: "oklch(0.97 0.02 124.9)", borderColor: "oklch(0.88 0.06 124.9)" }}
                >
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "oklch(0.50 0.09 124.9 / 0.15)" }}>
                    <CheckCircle2 className="h-6 w-6" style={{ color: "#4a5d23" }} />
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: "#1a2010" }}>כבר מחובר כ–{authUser.name || "משתמש"}</p>
                    <p className="text-sm mt-1" style={{ color: "#6b7280" }}>אתה כבר מחובר למערכת. אם ברצונך להתחבר בחשבון אחר, צא תחילה.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                      style={{ background: "oklch(0.50 0.14 85)" }}
                    >סגור</button>
                    <button
                      type="button"
                      onClick={() => { authLogout(); onClose(); }}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm border transition-all hover:bg-gray-50"
                      style={{ color: "#6b7280", borderColor: "#d1d5db" }}
                    >צא והתחבר בחשבון אחר</button>
                  </div>
                </div>
              )}

              {/* Registration form — hidden when already logged in */}
              {/* Capture authUser before narrowing so TS doesn't infer never inside the block */}
              {((_authUser) => !_authUser && (<>
              {/* authUserEmail: string | null = _authUser?.email ?? null (always null here since !_authUser) */}
              {/* Subtitle */}
              <div className="text-center pb-1">
                <p className="text-sm" style={{ color: "#4a5a38" }}>הכנס את פרטיך ליצירת חשבון חדש</p>
              </div>

              {/* Full name */}
              <AppInput
                label="שם מלא"
                required
                type="text"
                value={regName}
                onChange={e => {
                  setRegName(e.target.value);
                  setDuplicateError(null);
                  if (nameError) setNameError(validateName(e.target.value));
                }}
                onBlur={e => setNameError(validateName(e.target.value))}
                placeholder="ישראל ישראלי"
                dir="rtl"
                error={nameError || undefined}
                icon={<User className="h-4 w-4" />}
              />

              {/* Phone */}
              <IsraeliPhoneInput value={phoneVal} onChange={(v) => { setPhoneVal(v); setNotFoundError(null); }} label="מספר טלפון" />

              {/* Email — read-only when pre-filled from Google account */}
              <AppInput
                label="אימייל"
                required
                type="email"
                value={regEmail}
                readOnly={!!(authUser?.email && regEmail === authUser.email)}
                onChange={e => {
                  if (authUser?.email && regEmail === authUser.email) return; // guard read-only
                  setRegEmail(e.target.value);
                  setDuplicateError(null);
                  setEmailError(validateEmail(e.target.value));
                }}
                onBlur={e => {
                  if (authUser?.email && regEmail === authUser.email) return;
                  setEmailError(validateEmail(e.target.value));
                }}
                placeholder="email@example.com"
                dir="ltr"
                error={emailError || undefined}
                icon={<Mail className="h-4 w-4" />}
              />
              {authUser?.email && regEmail === authUser.email && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#4a5d23" }} dir="rtl">
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  מולא אוטומטית מחשבון Google
                </p>
              )}

              {/* Terms checkbox */}
              <div className="flex items-start gap-3 py-0">
                <div className="flex h-6 items-center">
                  <input
                    type="checkbox"
                    id="reg-terms"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                    style={{ accentColor: "#4a5d23" }}
                  />
                </div>
                <label htmlFor="reg-terms" className="text-sm leading-6 cursor-pointer" style={{ color: "#374151" }}>
                  קראתי ואני מסכים/ה ל{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#4a5d23" }} onClick={e => e.stopPropagation()}>תנאי השימוש</a>
                  {" "}ול{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#4a5d23" }} onClick={e => e.stopPropagation()}>מדיניות הפרטיות</a>
                </label>
              </div>

              {/* Age 18+ checkbox */}
              <div className="flex items-start gap-3 py-0">
                <div className="flex h-6 items-center">
                  <input
                    type="checkbox"
                    id="reg-age18"
                    checked={age18Accepted}
                    onChange={e => setAge18Accepted(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                    style={{ accentColor: "#4a5d23" }}
                  />
                </div>
                <label htmlFor="reg-age18" className="text-sm leading-6 cursor-pointer" style={{ color: "#374151" }}>
                  אני מאשר/ת כי אני בן/בת <strong>16 ומעלה</strong>
                </label>
              </div>

              {/* Duplicate error */}
              {duplicateError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-2">
                  <p className="font-medium">{duplicateError}</p>
                  <a href="mailto:support@avodanow.co.il" className="underline text-red-600 text-xs">פנה למנהל המערכת</a>
                </div>
              )}

              {/* Register button */}
              <AppButton
                variant="cta"
                size="lg"
                className="w-full mt-1"
                onClick={() => handleSend()}
                disabled={
                  sendOtp.isPending ||
                  !isPhoneValid ||
                  !regName.trim() ||
                  !regEmail.trim() ||
                  !!emailError ||
                  !!nameError ||
                  !termsAccepted ||
                  !age18Accepted
                }
              >
                {sendOtp.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                  : "הרשמה"}
              </AppButton>



              {/* Login link */}
              <p className="text-center text-sm pt-2" style={{ color: "#6b7280" }}>
                כבר יש לך חשבון?{" "}
                <button
                  type="button"
                  className="font-bold hover:underline"
                  style={{ color: "#4a5d23" }}
                  onClick={() => handleTabChange("login")}
                >
                  התחבר כאן
                </button>
              </p>
              </>))(authUser)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

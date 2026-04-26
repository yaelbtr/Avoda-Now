import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getGoogleLoginUrl, isGoogleLoginEnabled, popReturnPath } from "@/const";
import { AppButton, AppInput, AppLabel, GoogleAuthButton } from "@/components/ui";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, X } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
  maintenanceMode?: boolean;
  onNonAdminLogin?: () => void;
  onLoginSuccess?: () => void;
}

type Step = "entry" | "sent" | "success";

export default function LoginModal({
  open,
  onClose,
  message,
  maintenanceMode,
  onNonAdminLogin,
  onLoginSuccess,
}: LoginModalProps) {
  const [step, setStep] = useState<Step>("entry");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginEmailError, setLoginEmailError] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [sendCooldown, setSendCooldown] = useState(0);

  const sendCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const googleLoginEnabled = isGoogleLoginEnabled();
  const { refetch } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("entry");
        setLoginEmail("");
        setLoginEmailError(null);
        setDigits(Array(6).fill(""));
        setSendCooldown(0);
        if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => () => {
    if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
  }, []);

  const startSendCooldown = useCallback((seconds = 60) => {
    setSendCooldown(seconds);
    if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
    sendCooldownRef.current = setInterval(() => {
      setSendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(sendCooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const validateEmail = (val: string, touched = false): string | null => {
    if (!val.trim()) return touched ? "אימייל הוא שדה חובה" : null;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val) ? null : "כתובת מייל לא תקינה";
  };

  const sendEmailCode = trpc.auth.sendEmailCode.useMutation({
    onSuccess: () => {
      setStep("sent");
      setDigits(Array(6).fill(""));
      startSendCooldown();
      const masked = loginEmail.includes("@")
        ? (() => {
            const [local, domain] = loginEmail.split("@");
            return `${local.slice(0, 2)}***@${domain}`;
          })()
        : loginEmail;
      toast.success(`קוד נשלח למייל ${masked}`);
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS") {
        const match = error.message.match(/(\d+)/);
        const seconds = match ? parseInt(match[1], 10) : 60;
        startSendCooldown(seconds);
      }
      toast.error(error.message);
    },
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
      setStep("success");
      setTimeout(() => {
        toast.success("התחברת בהצלחה");
        onClose();
        onLoginSuccess?.();
        const returnPath = popReturnPath();
        if (returnPath) {
          navigate(returnPath);
        }
      }, 700);
    },
    onError: (error) => {
      toast.error(error.message);
      setDigits(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 60);
    },
  });

  useEffect(() => {
    if (step === "sent") {
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    }
  }, [step]);

  const handleSendEmailCode = () => {
    const error = validateEmail(loginEmail, true);
    if (error) {
      setLoginEmailError(error);
      return;
    }

    setLoginEmailError(null);
    sendEmailCode.mutate({
      email: loginEmail,
    });
  };

  const handleGoogleLogin = () => {
    if (!googleLoginEnabled) return;
    const returnPath = window.location.pathname + window.location.search;
    window.location.assign(getGoogleLoginUrl(returnPath));
  };

  const handleBackToEntry = () => {
    setStep("entry");
    setDigits(Array(6).fill(""));
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < next.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = next.join("");
    if (code.length === 6 && !next.includes("")) {
      verifyEmailCode.mutate({
        email: loginEmail.trim(),
        code,
      });
    }
  };

  const handleDigitKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = Array(6).fill("").map((_, index) => pasted[index] ?? "");
    setDigits(next);

    const targetIndex = Math.min(pasted.length, 5);
    inputRefs.current[targetIndex]?.focus();

    if (pasted.length === 6) {
      verifyEmailCode.mutate({
        email: loginEmail.trim(),
        code: pasted,
      });
    }
  };

  const handleVerifyClick = () => {
    const code = digits.join("");
    if (code.length !== 6 || digits.includes("")) {
      toast.error("יש להזין קוד בן 6 ספרות");
      return;
    }

    verifyEmailCode.mutate({
      email: loginEmail.trim(),
      code,
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence mode="wait">
      {step === "entry" && (
        <motion.div
          key="login-entry-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          dir="rtl"
        >
          <motion.div
            key="login-entry-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-full max-w-lg flex flex-col"
            style={{
              borderRadius: "20px 20px 0 0",
              background: "var(--page-bg-gradient)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="flex justify-center pt-2.5 pb-0 flex-shrink-0" aria-hidden="true">
              <div
                className="rounded-full"
                style={{ background: "rgba(0,0,0,0.22)", width: 40, height: 4 }}
              />
            </div>

            <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
              <div className="w-8" />
              <h2 className="text-lg font-bold" style={{ color: "#556b2f" }}>
                ברוכים הבאים ל-YallaAvoda
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: "#666" }}
                aria-label="סגור"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pt-1 pb-6 flex flex-col gap-4">
              <p className="text-sm text-center" style={{ color: "#888" }}>
                כניסה מהירה עם Google או קוד חד-פעמי למייל
              </p>

              {message && (
                <div
                  className="rounded-xl px-4 py-2.5 text-sm text-center font-medium"
                  style={{
                    background: "oklch(0.50 0.14 80 / 0.08)",
                    color: "oklch(0.50 0.14 80)",
                  }}
                >
                  {message}
                </div>
              )}

              {googleLoginEnabled && (
                <GoogleAuthButton label="המשך עם Google" onClick={handleGoogleLogin} />
              )}

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.04 122)" }} />
                <span className="text-xs" style={{ color: "#999" }}>או עם אימייל</span>
                <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.04 122)" }} />
              </div>

              <div className="flex flex-col gap-1.5">
                <AppLabel htmlFor="login-email">אימייל</AppLabel>
                <div className="relative">
                  <AppInput
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="אימייל"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginEmailError) {
                        setLoginEmailError(validateEmail(e.target.value));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendEmailCode();
                    }}
                    dir="ltr"
                    className="pr-10"
                  />
                  <Mail
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: "#aaa" }}
                  />
                </div>
                {loginEmailError && (
                  <p className="text-xs" style={{ color: "oklch(0.55 0.18 30)" }}>
                    {loginEmailError}
                  </p>
                )}
              </div>

              <AppButton
                variant="cta"
                size="lg"
                onClick={handleSendEmailCode}
                disabled={sendEmailCode.isPending || sendCooldown > 0}
                className="w-full"
              >
                {sendEmailCode.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שולח קוד...
                  </>
                ) : sendCooldown > 0 ? (
                  <>
                    שלח שוב בעוד{" "}
                    <span className="tabular-nums font-bold">{sendCooldown}</span>{" "}
                    שניות
                  </>
                ) : (
                  "שלחו לי קוד למייל"
                )}
              </AppButton>

              <p className="text-center text-xs leading-relaxed" style={{ color: "#999" }}>
                בהמשך, את/ה מאשר/ת את{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#667" }}
                >
                  תנאי השימוש
                </a>{" "}
                ו
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#667" }}
                >
                  מדיניות הפרטיות
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {step === "sent" && (
        <motion.div
          key="login-sent-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          dir="rtl"
        >
          <motion.div
            key="login-sent-card"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: "var(--page-bg-gradient)" }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToEntry}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: "#666" }}
                aria-label="חזור"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-bold" style={{ color: "#556b2f" }}>
                הזינו את הקוד
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ color: "#666" }}
                aria-label="סגור"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.38 0.15 160 / 0.12)" }}
              >
                <CheckCircle2
                  className="h-8 w-8"
                  style={{ color: "oklch(0.38 0.15 160)" }}
                />
              </div>
              <p className="text-sm" style={{ color: "#666" }}>
                שלחנו קוד חד-פעמי לכתובת
              </p>
              <p className="font-medium text-sm" style={{ color: "#222" }}>
                {loginEmail}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#999" }}>
                הזינו את הקוד שקיבלתם במייל. הקוד תקף ל-5 דקות.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2" dir="ltr">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => handleDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleDigitKeyDown(index, event)}
                  onPaste={handlePaste}
                  onFocus={(event) => event.target.select()}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  disabled={verifyEmailCode.isPending}
                  className="w-11 h-14 rounded-xl border-2 text-center text-2xl font-bold bg-background text-foreground"
                  style={{ borderColor: digit ? "oklch(0.50 0.09 124.9)" : "oklch(0.88 0.04 122)" }}
                />
              ))}
            </div>

            <AppButton
              variant="cta"
              size="lg"
              onClick={handleVerifyClick}
              disabled={verifyEmailCode.isPending || digits.includes("")}
              className="w-full"
            >
              {verifyEmailCode.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  מאמת...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  אמת קוד
                </>
              )}
            </AppButton>

            <AppButton
              variant="outline"
              size="lg"
              onClick={handleSendEmailCode}
              disabled={sendEmailCode.isPending || sendCooldown > 0}
              className="w-full"
            >
              {sendEmailCode.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שולח שוב...
                </>
              ) : sendCooldown > 0 ? (
                <>
                  שלח שוב בעוד{" "}
                  <span className="tabular-nums font-bold">{sendCooldown}</span>{" "}
                  שניות
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  שלחו שוב את הקוד
                </>
              )}
            </AppButton>
          </motion.div>
        </motion.div>
      )}

      {step === "success" && (
        <motion.div
          key="login-success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          dir="rtl"
        >
          <motion.div
            key="login-success-card"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
            style={{ background: "var(--page-bg-gradient)" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.38 0.15 160 / 0.12)" }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color: "oklch(0.38 0.15 160)" }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: "#556b2f" }}>
              התחברת בהצלחה
            </h2>
            <p className="text-sm" style={{ color: "#666" }}>
              מעבירים אותך חזרה לאפליקציה...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

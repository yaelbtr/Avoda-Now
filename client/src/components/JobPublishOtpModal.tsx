/**
 * JobPublishOtpModal — Two-step OTP verification before publishing a job.
 *
 * Step 1 (channel): User picks SMS or Email.
 * Step 2 (otp):     User enters the 6-digit code.
 *
 * On success the modal calls onSuccess(job) and the parent navigates away.
 * On close/cancel the modal calls onClose() without publishing.
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare, Mail, Loader2, CheckCircle2, RefreshCw, X, ShieldCheck,
} from "lucide-react";
import { AppButton } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type OtpChannel = "sms" | "email";
type Step = "channel" | "otp" | "success";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

// ─── Props ────────────────────────────────────────────────────────────────────

interface JobPublishOtpModalProps {
  open: boolean;
  onClose: () => void;
  /** Full job payload to submit after OTP is verified. */
  jobData: Record<string, unknown>;
  /** Called with the created job after successful OTP verification. */
  onSuccess: (job: unknown) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobPublishOtpModal({
  open,
  onClose,
  jobData,
  onSuccess,
}: JobPublishOtpModalProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("channel");
  const [channel, setChannel] = useState<OtpChannel>("sms");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on open/close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("channel");
        setChannel("sms");
        setMaskedTarget("");
        setDigits(Array(OTP_LENGTH).fill(""));
        setResendCountdown(0);
        setOtpError(null);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-focus first OTP input when entering otp step
  useEffect(() => {
    if (step === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 120);
  }, [step]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Resend countdown ─────────────────────────────────────────────────────────
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

  // ── tRPC mutations ───────────────────────────────────────────────────────────
  const sendOtp = trpc.jobs.sendPublishOtp.useMutation({
    onSuccess: (data) => {
      setMaskedTarget(data.maskedTarget);
      setDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(null);
      setStep("otp");
      startResendTimer();
      toast.success(`קוד נשלח ל-${data.maskedTarget} • תקף ל-5 דקות`, { duration: 5000 });
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const verifyOtp = trpc.jobs.verifyPublishOtp.useMutation({
    onSuccess: (job) => {
      setStep("success");
      setTimeout(() => {
        onSuccess(job);
      }, 1200);
    },
    onError: (e) => {
      setOtpError(e.message);
      // Clear digits so user can re-enter
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSendOtp = () => {
    sendOtp.mutate({ channel });
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    sendOtp.mutate({ channel });
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setOtpError(null);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all digits filled
    if (digit && next.every(d => d !== "")) {
      const code = next.join("");
      verifyOtp.mutate({ channel, code, jobData: jobData as Parameters<typeof verifyOtp.mutate>[0]["jobData"] });
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setOtpError(null);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) {
      verifyOtp.mutate({ channel, code: pasted, jobData: jobData as Parameters<typeof verifyOtp.mutate>[0]["jobData"] });
    }
  };

  const code = digits.join("");
  const isCodeComplete = code.length === OTP_LENGTH;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base">אימות לפרסום משרה</span>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5">

            {/* ── Step: channel ── */}
            {step === "channel" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  בחר כיצד לקבל את קוד האימות לפרסום המשרה:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* SMS option */}
                  <button
                    onClick={() => setChannel("sms")}
                    disabled={!user?.phone}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      channel === "sms"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <MessageSquare className={`w-6 h-6 ${channel === "sms" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">SMS</span>
                    {user?.phone && (
                      <span className="text-xs text-muted-foreground">
                        {user.phone.slice(-4).padStart(user.phone.length, "•")}
                      </span>
                    )}
                    {!user?.phone && (
                      <span className="text-xs text-destructive">אין טלפון</span>
                    )}
                  </button>

                  {/* Email option */}
                  <button
                    onClick={() => setChannel("email")}
                    disabled={!user?.email}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      channel === "email"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Mail className={`w-6 h-6 ${channel === "email" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">מייל</span>
                    {user?.email && (
                      <span className="text-xs text-muted-foreground truncate max-w-[90px]">
                        {user.email.replace(/(.{2}).*(@.*)/, "$1***$2")}
                      </span>
                    )}
                    {!user?.email && (
                      <span className="text-xs text-destructive">אין מייל</span>
                    )}
                  </button>
                </div>

                <AppButton
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={sendOtp.isPending || (!user?.phone && !user?.email)}
                >
                  {sendOtp.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin ml-2" />שולח קוד...</>
                  ) : (
                    "שלח קוד אימות"
                  )}
                </AppButton>
              </div>
            )}

            {/* ── Step: otp ── */}
            {step === "otp" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    קוד אימות נשלח ל-<span className="font-medium text-foreground">{maskedTarget}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">הזן את הקוד בן 6 הספרות</p>
                </div>

                {/* OTP digit inputs — LTR order for numeric code */}
                <div className="flex justify-center gap-2" dir="ltr">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 bg-background transition-all outline-none focus:border-primary ${
                        otpError ? "border-destructive" : digit ? "border-primary" : "border-border"
                      }`}
                      disabled={verifyOtp.isPending}
                    />
                  ))}
                </div>

                {/* Error */}
                {otpError && (
                  <p className="text-sm text-destructive text-center">{otpError}</p>
                )}

                {/* Submit button */}
                <AppButton
                  className="w-full"
                  onClick={() => verifyOtp.mutate({ channel, code, jobData: jobData as Parameters<typeof verifyOtp.mutate>[0]["jobData"] })}
                  disabled={!isCodeComplete || verifyOtp.isPending}
                >
                  {verifyOtp.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin ml-2" />מאמת...</>
                  ) : (
                    "אמת ופרסם משרה"
                  )}
                </AppButton>

                {/* Resend */}
                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      שליחה חוזרת בעוד {resendCountdown} שניות
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={sendOtp.isPending}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      שלח קוד חדש
                    </button>
                  )}
                </div>

                {/* Back to channel selection */}
                <div className="text-center">
                  <button
                    onClick={() => { setStep("channel"); setDigits(Array(OTP_LENGTH).fill("")); setOtpError(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    שנה אמצעי אימות
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: success ── */}
            {step === "success" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-lg">המשרה פורסמה בהצלחה!</p>
                  <p className="text-sm text-muted-foreground">מעביר אותך לדף המשרה...</p>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

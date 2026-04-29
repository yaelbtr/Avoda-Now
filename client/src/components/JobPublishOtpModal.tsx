/**
 * JobPublishOtpModal — Two-step OTP verification before publishing a job.
 * Visual design mirrors LoginModal exactly (same backdrop, card, channel cards, OTP inputs).
 *
 * Step 1 (channel): User picks SMS or Email — shown as full-width radio cards.
 * Step 2 (otp):     User enters the 6-digit code with auto-advance inputs.
 * Step 3 (success): Animated check, then parent navigates away.
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from "react";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Phone, Loader2, CheckCircle2, RefreshCw, X, ArrowLeft } from "lucide-react";
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
  /** טלפון שהמשתמש הזין בטופס — מועבר רק כשאין טלפון בחשבון */
  pendingContactPhone?: { prefix: string; number: string };
  /** שם שהמשתמש הזין בטופס — מועבר רק כשאין שם בחשבון */
  pendingContactName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobPublishOtpModal({
  open,
  onClose,
  jobData,
  onSuccess,
  pendingContactPhone,
  pendingContactName,
}: JobPublishOtpModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("channel");
  const [channel, setChannel] = useState<OtpChannel>("sms");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sendCooldown, setSendCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendRateLimitError, setSendRateLimitError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on open/close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("channel");
        setChannel("sms");
        setMaskedTarget("");
        setDigits(Array(OTP_LENGTH).fill(""));
        setResendCountdown(0);
        setSendCooldown(0);
        setOtpError(null);
        setSendRateLimitError(null);
        if (timerRef.current) clearInterval(timerRef.current);
        if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-focus first OTP input when entering otp step
  useEffect(() => {
    if (step === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 120);
  }, [step]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
  }, []);

  // ── Timers ───────────────────────────────────────────────────────────────────
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

  const startSendCooldown = useCallback((seconds = 60) => {
    setSendCooldown(seconds);
    if (sendCooldownRef.current) clearInterval(sendCooldownRef.current);
    sendCooldownRef.current = setInterval(() => {
      setSendCooldown(prev => {
        if (prev <= 1) { clearInterval(sendCooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── tRPC mutations ──────────────────────────────────────────────────────────────────────────────
  const sendOtp = trpc.jobs.sendPublishOtp.useMutation({
    onSuccess: (data) => {
      setSendRateLimitError(null);
      setMaskedTarget(data.maskedTarget);
      setDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(null);
      setStep("otp");
      startResendTimer();
      startSendCooldown();
      toast.success(`קוד נשלח ל-${data.maskedTarget} • תקף ל-5 דקות`, { duration: 5000 });
    },
    onError: (e) => {
      if (e.data?.code === "TOO_MANY_REQUESTS") {
        const match = e.message.match(/(\d+)/);
        const secs = match ? parseInt(match[1], 10) : 60;
        startSendCooldown(secs);
        setSendRateLimitError(e.message);
        return;
      }
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
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const pendingOtpExtras = pendingContactPhone
    ? {
        pendingPhonePrefix: pendingContactPhone.prefix,
        pendingPhoneNumber: pendingContactPhone.number,
        pendingName: pendingContactName,
      }
    : {};

  const handleSendOtp = () => {
    sendOtp.mutate({ channel, ...pendingOtpExtras });
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    sendOtp.mutate({ channel, ...pendingOtpExtras });
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
    if (digit && next.every(d => d !== "")) {
      const code = next.join("");
      verifyOtp.mutate({ channel, code, jobData: jobData as Parameters<typeof verifyOtp.mutate>[0]["jobData"], ...pendingOtpExtras });
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
      verifyOtp.mutate({ channel, code: pasted, jobData: jobData as Parameters<typeof verifyOtp.mutate>[0]["jobData"], ...pendingOtpExtras });
    }
  };

  const code = digits.join("");
  const isCodeComplete = code.length === OTP_LENGTH;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
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
            {step === "channel" && (() => {
              // ── מסלול רגיל: יש טלפון (קיים בחשבון או הוזן בטופס) — בחירת ערוץ ──
              return (
                <div className="p-6 space-y-5" dir="rtl">
                  {/* Header */}
                  <div className="text-center space-y-2 pt-2">
                    <div
                      className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                      style={{ background: "oklch(0.50 0.14 85 / 0.12)" }}
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="oklch(0.50 0.14 85)" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: "#1a2010" }}>אימות לפרסום משרה</h2>
                    <p className="text-sm" style={{ color: "#6b7280" }}>בחר כיצד לקבל את קוד האימות</p>
                  </div>

                  {/* Channel cards — full-width radio style like LoginModal */}
                  <div className="space-y-3">
                    {(pendingContactPhone ? ["sms"] : ["sms", "email"] as OtpChannel[]).map((ch) => {
                      const isSelected = channel === ch;
                      const hasSmsTarget = !!(user?.phone || pendingContactPhone);
                      const isDisabled = ch === "sms" ? !hasSmsTarget : !user?.email;
                      const label = ch === "sms" ? "קבלת קוד ב-SMS" : "קבלת קוד במייל";
                      const sublabel = ch === "sms"
                        ? (user?.phone
                            ? (() => { const d = user.phone.replace(/\D/g, ""); return d.length >= 7 ? `${d.slice(0, 3)}-****${d.slice(-3)}` : user.phone; })()
                            : pendingContactPhone
                              ? `${pendingContactPhone.prefix}-***-${pendingContactPhone.number.slice(-3)}`
                              : "אין מספר טלפון")
                        : (user?.email
                            ? user.email.replace(/(.{2}).*(@.*)/, "$1***$2")
                            : "אין כתובת מייל בחשבון");

                      return (
                        <label
                          key={ch}
                          className={`relative block ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                          onClick={() => { if (!isDisabled) { setChannel(ch); } }}
                        >
                          <div
                            className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                            style={{
                              border: `2px solid ${isSelected ? "oklch(0.50 0.14 85)" : "oklch(0.88 0.04 122)"}`,
                              background: isSelected ? "oklch(0.50 0.14 85 / 0.05)" : "#ffffff",
                            }}
                          >
                            {/* Radio dot */}
                            <div
                              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 order-last"
                              style={{ borderColor: isSelected ? "oklch(0.50 0.14 85)" : "#d1d5db" }}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.50 0.14 85)" }} />
                              )}
                            </div>
                            {/* Text */}
                            <div className="flex-1 text-right">
                              <p className="font-bold text-base" style={{ color: "#1a2010" }}>{label}</p>
                              <p className="text-sm" style={{ color: isDisabled ? "#ef4444" : "#6b7280" }}>{sublabel}</p>
                            </div>
                            {/* Icon */}
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "oklch(0.50 0.14 85 / 0.10)" }}
                            >
                              {ch === "email"
                                ? <Mail className="w-5 h-5" style={{ color: "oklch(0.50 0.14 85)" }} />
                                : <Phone className="w-5 h-5" style={{ color: "oklch(0.50 0.14 85)" }} />
                              }
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Rate-limit error banner */}
                  {sendRateLimitError && (
                    <div className="rounded-lg border p-3 text-sm flex items-start gap-2" dir="rtl"
                      style={{ borderColor: "oklch(0.72 0.18 25 / 0.5)", background: "oklch(0.97 0.04 25 / 0.15)", color: "oklch(0.42 0.18 25)" }}
                    >
                      <span className="mt-0.5 shrink-0">⚠️</span>
                      <p className="font-medium">{sendRateLimitError}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="space-y-3 pt-1">
                    <AppButton
                      variant="cta"
                      size="lg"
                      className="w-full"
                      onClick={handleSendOtp}
                      disabled={sendOtp.isPending || sendCooldown > 0 || (channel === "sms" ? !(user?.phone || pendingContactPhone) : !user?.email)}
                    >
                      {sendOtp.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin ml-2" />שולח קוד...</>
                      ) : sendCooldown > 0 ? (
                        <>שלח שוב בעוד <span className="tabular-nums font-bold mx-1">{sendCooldown}</span>שניות</>
                      ) : (
                        <>המשך לקבלת הקוד <ArrowLeft className="h-4 w-4 mr-1" /></>
                      )}
                    </AppButton>
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
              );
            })()}

            {/* ── STEP: otp ── */}
            {step === "otp" && (
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1 pt-2">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                    style={{ background: channel === "email" ? "oklch(0.50 0.14 85 / 0.12)" : "oklch(0.50 0.09 124.9 / 0.12)" }}
                  >
                    {channel === "email"
                      ? <Mail className="h-6 w-6" style={{ color: "oklch(0.50 0.14 85)" }} />
                      : <Phone className="h-6 w-6" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                    }
                  </div>

                  <h2 className="text-xl font-bold">
                    {channel === "email" ? "אימות קוד מייל" : "אימות קוד SMS"}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    קוד אימות נשלח ל-
                    <span className="font-semibold text-foreground mx-1">{maskedTarget}</span>
                  </p>

                  {/* Channel badge */}
                  <div
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "oklch(0.50 0.09 124.9 / 0.10)", color: "oklch(0.40 0.09 124.9)" }}
                  >
                    {channel === "email"
                      ? <><Mail className="w-3 h-3" /> נשלח למייל</>
                      : <><Phone className="w-3 h-3" /> נשלח ב-SMS</>
                    }
                  </div>
                </div>

                {/* OTP digit inputs */}
                <div>
                  <p className="text-sm font-medium mb-3 text-center" style={{ color: "#374151" }}>
                    קוד אימות (6 ספרות)
                  </p>
                  <div className="flex gap-2 justify-center" dir="ltr">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        onFocus={e => e.target.select()}
                        disabled={verifyOtp.isPending}
                        className={[
                          "w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none",
                          "bg-background text-foreground transition-all duration-150",
                          otpError
                            ? "border-destructive bg-destructive/5"
                            : digit
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40",
                          "focus:border-primary focus:ring-2 focus:ring-primary/20",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                </div>

                {/* Error */}
                {otpError && (
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
                    <span>{otpError}</span>
                  </div>
                )}

                {/* Submit button */}
                <AppButton
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={() => verifyOtp.mutate({ channel, code, jobData: jobData as Parameters<typeof verifyOtp.mutate>[0]["jobData"] })}
                  disabled={!isCodeComplete || verifyOtp.isPending}
                >
                  {verifyOtp.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin ml-2" />מאמת ומפרסם...</>
                  ) : (
                    <>אמת ופרסם משרה <ArrowLeft className="h-4 w-4 mr-1" /></>
                  )}
                </AppButton>

                {/* Resend */}
                <div className="text-center space-y-2">
                  {resendCountdown > 0 ? (
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      שליחה חוזרת בעוד{" "}
                      <span className="tabular-nums font-bold">{resendCountdown}</span>{" "}
                      שניות
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={sendOtp.isPending}
                      className="text-xs font-medium hover:underline flex items-center gap-1 mx-auto transition-colors"
                      style={{ color: "oklch(0.50 0.14 85)" }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      שלח קוד חדש
                    </button>
                  )}

                  <button
                    type="button"
                    className="w-full py-2 text-sm font-medium hover:underline transition-colors"
                    style={{ color: "#6b7280" }}
                    onClick={() => { setStep("channel"); setDigits(Array(OTP_LENGTH).fill("")); setOtpError(null); }}
                  >
                    שנה אמצעי אימות
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

            {/* ── STEP: success ── */}
            {step === "success" && (
              <div className="p-6 flex flex-col items-center gap-4 py-10">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle2 className="w-16 h-16" style={{ color: "oklch(0.50 0.14 85)" }} />
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="font-bold text-xl" style={{ color: "#1a2010" }}>המשרה פורסמה בהצלחה!</p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>מעביר אותך לדף המשרה...</p>
                </div>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

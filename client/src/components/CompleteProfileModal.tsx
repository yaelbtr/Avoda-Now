/**
 * CompleteProfileModal
 *
 * Shown automatically to Google OAuth users who have no phone number on file.
 * Lets them add their phone (required for job matching and contact), or skip.
 *
 * Uses the existing `user.updateProfile` tRPC mutation — no new backend needed.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Phone, X, CheckCircle2, UserCheck } from "lucide-react";
import { IsraeliPhoneInput, combinePhone, type PhoneValue } from "@/components/IsraeliPhoneInput";

// ── Design tokens (match LoginModal palette) ────────────────────────────────
const OVERLAY = "oklch(0 0 0 / 0.55)";
const CARD_BG = "oklch(0.18 0.03 122.3)";
const CARD_BORDER = "oklch(0.42 0.07 124.9 / 0.5)";
const BRAND = "oklch(0.82 0.15 80.8)";
const BRAND_DIM = "oklch(0.82 0.15 80.8 / 0.15)";
const TEXT = "oklch(0.96 0.02 95)";
const TEXT_MUTED = "oklch(0.75 0.04 95)";

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CompleteProfileModal({ open, onClose }: CompleteProfileModalProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [submitted, setSubmitted] = useState(false);

  const isPhoneValid = phoneVal.prefix.length === 3 && phoneVal.number.length === 7;

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setSubmitted(true);
      setTimeout(onClose, 1800);
    },
    onError: (err) => {
      toast.error(err.message || "שגיאה בשמירת הטלפון. נסה שוב.");
    },
  });

  const handleSubmit = () => {
    if (!isPhoneValid) return;
    const phone = combinePhone(phoneVal);
    updateProfile.mutate({ phone });
  };

  const handleSkip = () => {
    onClose();
  };

  // Don't render if user already has a phone (safety guard)
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="complete-profile-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: OVERLAY, backdropFilter: "blur(4px)" }}
          dir="rtl"
        >
          <motion.div
            key="complete-profile-card"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              color: TEXT,
            }}
          >
            {/* Decorative blobs */}
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "oklch(0.50 0.14 85 / 0.12)", filter: "blur(32px)" }}
            />
            <div
              className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "oklch(0.60 0.12 140 / 0.10)", filter: "blur(28px)" }}
            />

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 left-3 p-1.5 rounded-lg transition-colors hover:bg-white/10 z-10"
              style={{ color: TEXT_MUTED }}
              aria-label="דלג"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-6 flex flex-col items-center gap-5">
              {/* Success state */}
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-4"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "oklch(0.82 0.15 80.8 / 0.15)" }}
                    >
                      <CheckCircle2 className="h-7 w-7" style={{ color: BRAND }} />
                    </div>
                    <p className="text-base font-semibold" style={{ color: TEXT }}>
                      הטלפון נשמר בהצלחה!
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full flex flex-col items-center gap-5"
                  >
                    {/* Icon + header */}
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: BRAND_DIM }}
                      >
                        <UserCheck className="h-7 w-7" style={{ color: BRAND }} />
                      </div>
                      <h2 className="text-lg font-bold text-center" style={{ color: TEXT }}>
                        השלמת פרופיל
                      </h2>
                      <p className="text-sm text-center leading-relaxed" style={{ color: TEXT_MUTED }}>
                        {user?.name ? `שלום ${user.name}! ` : ""}
                        הוסף מספר טלפון כדי שמעסיקים יוכלו ליצור איתך קשר ישירות.
                      </p>
                    </div>

                    {/* Phone input */}
                    <div className="w-full">
                      <IsraeliPhoneInput
                        value={phoneVal}
                        onChange={setPhoneVal}
                        label="מספר טלפון"
                      />
                    </div>

                    {/* Submit button */}
                    <button
                      type="button"
                      disabled={!isPhoneValid || updateProfile.isPending}
                      onClick={handleSubmit}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                      style={{
                        background: isPhoneValid
                          ? "linear-gradient(135deg, oklch(0.82 0.15 80.8) 0%, oklch(0.72 0.18 65) 100%)"
                          : "oklch(0.82 0.15 80.8 / 0.3)",
                        color: "oklch(0.22 0.03 122.3)",
                        boxShadow: isPhoneValid ? "0 2px 12px oklch(0.82 0.15 80.8 / 0.35)" : "none",
                      }}
                    >
                      {updateProfile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      {updateProfile.isPending ? "שומר..." : "שמור מספר טלפון"}
                    </button>

                    {/* Skip link */}
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="text-xs underline-offset-2 hover:underline transition-colors"
                      style={{ color: TEXT_MUTED }}
                    >
                      דלג לעת עתה
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

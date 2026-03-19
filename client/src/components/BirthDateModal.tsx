/**
 * BirthDateModal
 *
 * Shown when a worker tries to apply for a job but has no birth_date on record.
 * Collects the birth date, validates age >= 16, and records a legal acknowledgement.
 *
 * Mobile: slides up as a bottom-sheet with rounded top corners.
 * Desktop: centered dialog (max-w-sm).
 *
 * Props:
 *   isOpen       — controls visibility
 *   onClose      — called when the modal is dismissed without saving
 *   onSuccess    — called after birth date is successfully saved; receives { age, isMinor }
 *   jobId        — optional job context for the legal acknowledgement log
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Calendar, ShieldCheck, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { calcAge, isTooYoung } from "@shared/ageUtils";

interface BirthDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { age: number; isMinor: boolean }) => void;
  jobId?: number;
}

export function BirthDateModal({ isOpen, onClose, onSuccess, jobId }: BirthDateModalProps) {
  const [birthDate, setBirthDate] = useState("");
  const [declared, setDeclared] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const saveBirthDate = trpc.user.saveBirthDate.useMutation({
    onSuccess: (data) => {
      setLocalError(null);
      onSuccess({ age: data.age, isMinor: data.isMinor ?? false });
    },
    onError: (err) => {
      setLocalError(err.message);
    },
  });

  const validate = (): string | null => {
    if (!birthDate) return "נא להזין תאריך לידה.";
    const age = calcAge(birthDate);
    if (age === null) return "תאריך לידה לא תקין.";
    if (isTooYoung(age)) return "הרשמה כעובד זמינה מגיל 16 בלבד.";
    if (!declared) return "יש לאשר את ההצהרה לפני המשך.";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { setLocalError(err); return; }
    saveBirthDate.mutate({ birthDate, jobId });
  };

  const handleClose = () => {
    setLocalError(null);
    setBirthDate("");
    setDeclared(false);
    onClose();
  };

  // max date: must be at least 16 years old
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d.toISOString().split("T")[0];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9998,
            }}
          />

          {/* Sheet / Dialog */}
          <motion.div
            key="sheet"
            dir="rtl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              background: "var(--background, #fff)",
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "var(--border, #e2e8f0)",
                margin: "0 auto 20px",
              }}
            />

            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="סגור"
              style={{
                position: "absolute",
                top: 20,
                left: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--muted-foreground, #888)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
                <Calendar size={22} style={{ color: "var(--primary, #4F583B)" }} />
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground, #1a1a1a)" }}>
                  אימות גיל
                </span>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted-foreground, #666)", margin: 0 }}>
                כדי להגיש מועמדות, עלינו לאמת את גילך.
              </p>
            </div>

            {/* Birth date input */}
            <div style={{ marginBottom: 16 }}>
              <Label
                htmlFor="birth-date-mobile"
                style={{ display: "block", textAlign: "right", fontSize: 14, fontWeight: 600, marginBottom: 8 }}
              >
                תאריך לידה
              </Label>
              <Input
                id="birth-date-mobile"
                type="date"
                value={birthDate}
                max={maxDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  setLocalError(null);
                }}
                dir="ltr"
                style={{
                  width: "100%",
                  height: 48,
                  fontSize: 16, // prevents iOS zoom
                  textAlign: "right",
                  borderRadius: 12,
                }}
              />
            </div>

            {/* Declaration checkbox */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 14px",
                borderRadius: 12,
                background: "var(--muted, #f5f5f5)",
                border: "1px solid var(--border, #e2e8f0)",
                marginBottom: 12,
              }}
            >
              <Checkbox
                id="declaration-mobile"
                checked={declared}
                onCheckedChange={(checked) => {
                  setDeclared(checked === true);
                  setLocalError(null);
                }}
                style={{ marginTop: 2, flexShrink: 0, width: 20, height: 20 }}
              />
              <Label
                htmlFor="declaration-mobile"
                style={{ fontSize: 14, lineHeight: 1.5, cursor: "pointer", textAlign: "right" }}
              >
                <ShieldCheck
                  size={15}
                  style={{ display: "inline", marginLeft: 4, verticalAlign: "middle", color: "var(--primary, #4F583B)" }}
                />
                אני מצהיר/ה כי המידע שמסרתי נכון ומדויק.
              </Label>
            </div>

            {/* Legal reference */}
            <p style={{ fontSize: 12, textAlign: "right", color: "var(--muted-foreground, #888)", marginBottom: 12 }}>
              לפרטים על זכויות עובדים צעירים, ראה/י את{" "}
              <a
                href="https://www.nevo.co.il/law_html/Law01/P220_001.htm"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--primary, #4F583B)", textDecoration: "underline" }}
              >
                חוק עבודת נוער, תשי&quot;ג-1953
              </a>
              .
            </p>

            {/* Error */}
            {localError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--destructive, #dc2626)",
                  fontSize: 13,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(220,38,38,0.08)",
                  marginBottom: 12,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{localError}</span>
              </div>
            )}

            {/* Actions — full-width stacked on mobile */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button
                onClick={handleSubmit}
                disabled={saveBirthDate.isPending}
                style={{
                  width: "100%",
                  height: 50,
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 14,
                }}
              >
                {saveBirthDate.isPending ? "שומר..." : "אישור"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={saveBirthDate.isPending}
                style={{
                  width: "100%",
                  height: 46,
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 14,
                }}
              >
                ביטול
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

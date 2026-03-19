/**
 * BirthDateModal
 *
 * Shown when a worker tries to apply for a job but has no birth_date on record.
 * Collects the birth date, validates age >= 16, and records a legal acknowledgement.
 *
 * Props:
 *   isOpen       — controls visibility
 *   onClose      — called when the modal is dismissed without saving
 *   onSuccess    — called after birth date is successfully saved; receives { age, isMinor }
 *   jobId        — optional job context for the legal acknowledgement log
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Calendar, ShieldCheck } from "lucide-react";
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

  // Validate locally before hitting the server
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

  // Compute max date (must be at least 16 years old)
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d.toISOString().split("T")[0];
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="w-full max-w-sm mx-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-1">
            <Calendar className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg font-bold">אימות גיל</DialogTitle>
          </div>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            כדי להגיש מועמדות, עלינו לאמת את גילך.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Birth date input */}
          <div className="space-y-1.5">
            <Label htmlFor="birth-date" className="text-sm font-medium">
              תאריך לידה
            </Label>
            <Input
              id="birth-date"
              type="date"
              value={birthDate}
              max={maxDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                setLocalError(null);
              }}
              className="text-right"
              dir="ltr"
            />
          </div>

          {/* Declaration checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Checkbox
              id="declaration"
              checked={declared}
              onCheckedChange={(checked) => {
                setDeclared(checked === true);
                setLocalError(null);
              }}
              className="mt-0.5"
            />
            <Label
              htmlFor="declaration"
              className="text-sm leading-relaxed cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 inline-block ml-1 text-primary" />
              אני מצהיר/ה כי המידע שמסרתי נכון ומדויק.
            </Label>
          </div>

          {/* Legal reference link */}
          <p className="text-xs text-right" style={{ color: "var(--muted-foreground)" }}>
            לפרטים על זכויות עובדים צעירים, ראה/י את{" "}
            <a
              href="https://www.nevo.co.il/law_html/Law01/P220_001.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 transition-opacity"
              style={{ color: "var(--brand)" }}
            >
              חוק עבודת נוער, תשי"ג-1953
            </a>
            .
          </p>
          {/* Error message */}
          {localError && (
            <div className="flex items-center gap-2 text-destructive text-sm p-2 rounded-md bg-destructive/10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSubmit}
              disabled={saveBirthDate.isPending}
              className="flex-1"
            >
              {saveBirthDate.isPending ? "שומר..." : "אישור"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saveBirthDate.isPending}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

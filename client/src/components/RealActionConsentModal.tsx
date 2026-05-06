import { useState } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { type LegalConsentType } from "@shared/const";
import { LegalConsentLinks } from "@/components/ui/legalConsentText";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RealActionConsentModal({ open, onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: outdatedData, isLoading: isCheckingOutdated } = trpc.user.checkOutdatedConsents.useQuery(
    undefined,
    { enabled: open }
  );

  const outdated = outdatedData?.outdated ?? [];
  const currentVersions = outdatedData?.currentVersions;
  const hasOutdated = outdated.length > 0;

  const recordConsent = trpc.user.recordConsent.useMutation();
  const acceptMutation = trpc.user.acceptRealActionConsent.useMutation({
    onSuccess: () => onConfirm(),
  });

  const isPending = recordConsent.isPending || acceptMutation.isPending;

  const consentTypes: LegalConsentType[] = hasOutdated
    ? (outdated as LegalConsentType[])
    : ["terms", "privacy"];
  const allChecked = consentTypes.every((t) => !!checked[t]);

  async function handleConfirm() {
    if (!allChecked || isPending) return;
    setError(null);
    try {
      if (hasOutdated && currentVersions) {
        for (const type of outdated) {
          await recordConsent.mutateAsync({
            consentType: type,
            documentVersion: currentVersions[type],
          });
        }
      }
      acceptMutation.mutate();
    } catch {
      setError("אירעה שגיאה בשמירת הסכמתך. אנא נסה שנית.");
    }
  }

  // מחכה לבדיקת outdated לפני הצגת תוכן
  const showLoading = open && isCheckingOutdated;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {hasOutdated ? "עדכנו את המסמכים המשפטיים שלנו" : "אישור תנאי שימוש"}
          </DialogTitle>
          {hasOutdated && (
            <p className="text-sm text-muted-foreground mt-1">
              נדרש אישורך מחדש לפני המשך הפעולה
            </p>
          )}
        </DialogHeader>

        {showLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">טוען...</div>
        ) : (
          <div className="py-2">
            <label className="flex items-start gap-3 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => {
                  const next = e.target.checked;
                  setChecked((prev) => {
                    const updated = { ...prev };
                    consentTypes.forEach((t) => { updated[t] = next; });
                    return updated;
                  });
                  setError(null);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
              />
              <span><LegalConsentLinks types={consentTypes} /></span>
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allChecked || isPending || showLoading}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                שומר...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                אישור והמשך
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

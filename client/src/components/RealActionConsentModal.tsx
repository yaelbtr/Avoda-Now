import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { LEGAL_DOCUMENT_PATHS } from "@shared/const";
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
  const [checked, setChecked] = useState(false);
  const acceptMutation = trpc.user.acceptRealActionConsent.useMutation({
    onSuccess: () => {
      onConfirm();
    },
  });

  function handleConfirm() {
    if (!checked) return;
    acceptMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>אישור תנאי שימוש</DialogTitle>
        </DialogHeader>

        <label className="flex items-start gap-3 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
          />
          <span>
            קראתי ואני מסכים/ה ל
            <a
              href={LEGAL_DOCUMENT_PATHS.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-olive hover:opacity-80"
            >
              תנאי השימוש
            </a>
            {" "}ול
            <a
              href={LEGAL_DOCUMENT_PATHS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-olive hover:opacity-80"
            >
              מדיניות הפרטיות
            </a>
          </span>
        </label>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={acceptMutation.isPending}
            className="w-full sm:w-auto"
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!checked || acceptMutation.isPending}
            className="w-full sm:w-auto"
          >
            {acceptMutation.isPending ? "שומר..." : "אישור והמשך"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

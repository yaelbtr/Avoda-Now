/**
 * IdleWarningDialog
 *
 * Shown when the user has been idle for 18 minutes (2 minutes before auto-logout).
 * Displays a countdown and lets the user stay logged in.
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface IdleWarningDialogProps {
  open: boolean;
  secondsLeft: number;
  onStayLoggedIn: () => void;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}:${String(sec).padStart(2, "0")} דקות`;
  return `${sec} שניות`;
}

export function IdleWarningDialog({
  open,
  secondsLeft,
  onStayLoggedIn,
}: IdleWarningDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        dir="rtl"
        className="max-w-sm text-right"
      >
        <AlertDialogHeader className="items-end">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <AlertDialogTitle className="text-amber-700">
              עומד להתנתק
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-right text-base">
            לא זוהתה פעילות במשך זמן מה.
            <br />
            תנותק אוטומטית בעוד{" "}
            <span className="font-bold text-amber-700 tabular-nums">
              {formatSeconds(secondsLeft)}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start">
          <AlertDialogAction
            onClick={onStayLoggedIn}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            המשך להיות מחובר
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

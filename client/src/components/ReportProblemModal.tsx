/**
 * ReportProblemModal
 * Allows users to report a problem with an automatic screenshot capture.
 * - Captures the page with html2canvas when the modal opens
 * - Collects subject + message (phone auto-filled for logged-in users)
 * - Sends to support@avodanow.co.il via the support.reportProblem tRPC procedure
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface ReportProblemModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportProblemModal({ open, onClose }: ReportProblemModalProps) {
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reportMutation = trpc.support.reportProblem.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message ?? "שגיאה בשליחת הדיווח. נסה שוב.");
    },
  });

  // Capture screenshot when modal opens
  const captureScreenshot = useCallback(async () => {
    setScreenshotLoading(true);
    setScreenshotError(false);
    try {
      // Dynamically import html2canvas to keep the initial bundle small
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 0.6, // reduce size for email attachment
        logging: false,
      });
      setScreenshot(canvas.toDataURL("image/png"));
    } catch {
      setScreenshotError(true);
    } finally {
      setScreenshotLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setSubject("");
      setMessage("");
      setPhone(user?.phone ?? "");
      setScreenshot(null);
      setScreenshotError(false);
      // Small delay so the modal itself doesn't appear in the screenshot
      const t = setTimeout(captureScreenshot, 300);
      return () => clearTimeout(t);
    }
  }, [open, user?.phone, captureScreenshot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("יש להזין תיאור הבעיה");
      return;
    }
    reportMutation.mutate({
      message: message.trim(),
      subject: subject.trim() || undefined,
      phone: phone.trim() || undefined,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString(),
      screenshotBase64: screenshot ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-lg w-full"
        dir="rtl"
        style={{ fontFamily: "Heebo, sans-serif" }}
      >
        <DialogHeader>
          <DialogTitle className="text-right text-lg font-bold">
            דווח על בעיה
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="text-base font-semibold">הפנייה נשלחה בהצלחה. תודה על הדיווח.</p>
            <Button variant="outline" onClick={onClose} className="mt-2">סגור</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="rp-phone" className="text-sm font-medium">
                טלפון <span className="text-muted-foreground text-xs">(אופציונלי)</span>
              </Label>
              <Input
                id="rp-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05x-xxxxxxx"
                className="text-right"
              />
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <Label htmlFor="rp-subject" className="text-sm font-medium">
                נושא <span className="text-muted-foreground text-xs">(אופציונלי)</span>
              </Label>
              <Input
                id="rp-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="לדוגמה: כפתור שליחה לא עובד"
                maxLength={200}
              />
            </div>

            {/* Message */}
            <div className="space-y-1">
              <Label htmlFor="rp-message" className="text-sm font-medium">
                תיאור הבעיה <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rp-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="תאר את הבעיה בפירוט..."
                rows={4}
                maxLength={5000}
                required
              />
            </div>

            {/* Screenshot preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  צילום מסך
                </Label>
                {screenshot && (
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    הסר
                  </button>
                )}
              </div>

              {screenshotLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-3 rounded-lg border border-dashed">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מצלם מסך...
                </div>
              )}

              {screenshotError && !screenshotLoading && (
                <div className="flex items-center gap-2 text-sm text-amber-600 py-2 px-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  לא ניתן לצלם את המסך. הדיווח יישלח ללא צילום.
                </div>
              )}

              {screenshot && !screenshotLoading && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={screenshot}
                    alt="צילום מסך"
                    className="w-full h-auto max-h-40 object-cover object-top"
                  />
                </div>
              )}

              {!screenshot && !screenshotLoading && !screenshotError && (
                <button
                  type="button"
                  onClick={captureScreenshot}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Camera className="w-4 h-4" />
                  צלם מסך מחדש
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={reportMutation.isPending || !message.trim()}
                className="flex-1"
                style={{ background: "oklch(0.50 0.14 85)", color: "#fff" }}
              >
                {reportMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin ml-2" />שולח...</>
                ) : (
                  "שלח דיווח"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                ביטול
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

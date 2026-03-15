import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { AppTextarea, AppLabel } from "@/components/ui";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RateWorkerModalProps {
  open: boolean;
  onClose: () => void;
  workerId: number;
  workerName: string;
  applicationId?: number;
}

export function RateWorkerModal({ open, onClose, workerId, workerName, applicationId }: RateWorkerModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const utils = trpc.useUtils();

  const { data: existingRating, isLoading: loadingExisting } = trpc.ratings.getMyRating.useQuery(
    { workerId },
    { enabled: open }
  );

  // Pre-fill if already rated
  useState(() => {
    if (existingRating) {
      setRating(existingRating.rating);
      setComment(existingRating.comment ?? "");
    }
  });

  const rateMutation = trpc.ratings.rateWorker.useMutation({
    onSuccess: ({ isNew }) => {
      toast.success(isNew ? "הדירוג נשמר בהצלחה!" : "הדירוג עודכן בהצלחה!");
      utils.user.getPublicProfile.invalidate({ userId: workerId });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("יש לבחור דירוג בין 1 ל-5 כוכבים");
      return;
    }
    rateMutation.mutate({
      workerId,
      rating,
      comment: comment.trim() || undefined,
      applicationId,
    });
  };

  const displayRating = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">דרג את {workerName}</DialogTitle>
          <DialogDescription className="text-right">
            הדירוג יעזור לעובדים אחרים ולמעסיקים להעריך את רמת השירות
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Star selector */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} כוכבים`}
                >
                  <Star
                    className="w-9 h-9 transition-colors"
                    fill={displayRating >= star ? "#f59e0b" : "none"}
                    stroke={displayRating >= star ? "#f59e0b" : "#94a3b8"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p className="text-center text-sm font-medium text-muted-foreground">
              {displayRating === 0 && "בחר דירוג"}
              {displayRating === 1 && "גרוע"}
              {displayRating === 2 && "לא מספק"}
              {displayRating === 3 && "סביר"}
              {displayRating === 4 && "טוב"}
              {displayRating === 5 && "מצוין!"}
            </p>

            {/* Comment */}
            <div>
              <AppLabel>הערה (אופציונלי)</AppLabel>
              <AppTextarea
                dir="rtl"
                placeholder="שתף את חווייתך עם העובד..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-left mt-1">{comment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <AppButton
                variant="brand"
                className="flex-1"
                onClick={handleSubmit}
                disabled={rateMutation.isPending || rating === 0}
              >
                {rateMutation.isPending ? "שומר..." : existingRating ? "עדכן דירוג" : "שלח דירוג"}
              </AppButton>
              <AppButton variant="outline" onClick={onClose} disabled={rateMutation.isPending}>
                ביטול
              </AppButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

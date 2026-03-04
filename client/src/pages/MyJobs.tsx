import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/LoginModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Briefcase, PlusCircle, Loader2, Trash2, CheckCircle, XCircle,
  Clock, MapPin, Users, DollarSign, ChevronLeft
} from "lucide-react";
import { getCategoryIcon, getCategoryLabel, formatSalary, getStartTimeLabel } from "@shared/categories";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "פעיל", variant: "default" },
  closed: { label: "סגור", variant: "secondary" },
  expired: { label: "פג תוקף", variant: "outline" },
  under_review: { label: "בבדיקה", variant: "destructive" },
};

export default function MyJobs() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: myJobs, isLoading } = trpc.jobs.myJobs.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      utils.jobs.myJobs.invalidate();
      toast.success("סטטוס עודכן");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteJob = trpc.jobs.delete.useMutation({
    onSuccess: () => {
      utils.jobs.myJobs.invalidate();
      setDeleteId(null);
      toast.success("המשרה נמחקה");
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center" dir="rtl">
        <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold text-foreground mb-2">כניסה נדרשת</h2>
        <p className="text-muted-foreground mb-6">התחבר כדי לנהל את המשרות שלך</p>
        <Button onClick={() => setLoginOpen(true)}>כניסה / הרשמה</Button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    );
  }

  const activeJobs = myJobs?.filter((j) => j.status === "active") ?? [];
  const otherJobs = myJobs?.filter((j) => j.status !== "active") ?? [];

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-right">המשרות שלי</h1>
          <p className="text-sm text-muted-foreground mt-0.5 text-right">
            {activeJobs.length}/3 משרות פעילות
          </p>
        </div>
        <Button onClick={() => navigate("/post-job")} className="gap-2" size="sm">
          <PlusCircle className="h-4 w-4" />
          פרסם משרה
        </Button>
      </div>

      {/* Active limit bar */}
      {activeJobs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 mb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{activeJobs.length} מתוך 3</span>
            <span className="font-medium">משרות פעילות</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(activeJobs.length / 3) * 100}%` }}
            />
          </div>
          {activeJobs.length >= 3 && (
            <p className="text-xs text-destructive mt-2">
              הגעת למגבלה. סגור משרה כדי לפרסם חדשה.
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !myJobs || myJobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">אין לך משרות עדיין</p>
          <Button className="mt-4 gap-2" onClick={() => navigate("/post-job")}>
            <PlusCircle className="h-4 w-4" />
            פרסם את המשרה הראשונה שלך
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {myJobs.map((job) => {
            const statusInfo = STATUS_LABELS[job.status] ?? STATUS_LABELS.active;
            const isVolunteer = job.salaryType === "volunteer";
            const expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
            const daysLeft = expiresAt
              ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
              : null;

            return (
              <div key={job.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {getCategoryIcon(job.category)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">{getCategoryLabel(job.category)}</p>
                    </div>
                  </div>
                  <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.address.split(",")[0]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getStartTimeLabel(job.startTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {job.workersNeeded} עובדים
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {isVolunteer ? "התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
                  </span>
                  {daysLeft !== null && job.status === "active" && (
                    <span className={`flex items-center gap-1 font-medium ${daysLeft <= 1 ? "text-destructive" : "text-primary"}`}>
                      <Clock className="h-3 w-3" />
                      {daysLeft === 0 ? "פג היום" : `${daysLeft} ימים נותרו`}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => navigate(`/job/${job.id}`)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    צפה
                  </Button>
                  {job.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-muted-foreground"
                      onClick={() => updateStatus.mutate({ id: job.id, status: "closed" })}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      סגור משרה
                    </Button>
                  ) : job.status === "closed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-primary"
                      onClick={() => updateStatus.mutate({ id: job.id, status: "active" })}
                      disabled={updateStatus.isPending || activeJobs.length >= 3}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      הפעל מחדש
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(job.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    מחק
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת משרה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשרה? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:flex-row" dir="rtl">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteJob.mutate({ id: deleteId })}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

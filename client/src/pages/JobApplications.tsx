import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppButton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  User,
  XCircle,
} from "lucide-react";
import { RateWorkerModal } from "@/components/RateWorkerModal";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDistance(km: number | null | undefined): string {
  if (km == null) return "מיקום לא ידוע";
  if (km < 1) return `${Math.round(km * 1000)} מ'`;
  return `${km.toFixed(1)} ק"מ`;
}

function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: he });
}

function isNew(createdAt: Date | string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-100 text-yellow-800" },
  viewed: { label: "נצפה", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "התקבל", className: "bg-green-100 text-green-800" },
  rejected: { label: "נדחה", className: "bg-red-100 text-red-800" },
  offered: { label: "הצעה נשלחה", className: "bg-purple-100 text-purple-800" },
  offer_rejected: { label: "דחה הצעה", className: "bg-gray-100 text-gray-600" },
};

// ── Star rating display ─────────────────────────────────────────────────────
function MiniStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3 h-3"
          style={{
            color: i <= full ? "#f59e0b" : i === full + 1 && half ? "#f59e0b" : "#d1d5db",
            fill: i <= full ? "#f59e0b" : i === full + 1 && half ? "#fde68a" : "none",
          }}
        />
      ))}
      <span className="text-xs font-bold text-amber-700 mr-0.5">{rating.toFixed(1)}</span>
    </span>
  );
}

// ── Applicant card ────────────────────────────────────────────────────────────
function ApplicantCard({
  app,
  onAccept,
  onReject,
  isPending,
}: {
  app: {
    id: number;
    status: string;
    workerId?: number | null;
    workerName: string | null;
    workerPhone: string | null;
    workerBio: string | null;
    workerPreferredCity: string | null;
    message: string | null;
    contactRevealed: boolean;
    createdAt: Date | string;
    distanceKm: number | null;
    workerRating?: string | null;
    completedJobsCount?: number;
  };
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  isPending: boolean;
}) {
  const [rateOpen, setRateOpen] = useState(false);
  // When status=offered and worker accepted (contactRevealed=true), override the badge label
  const statusStyle = app.status === "offered" && app.contactRevealed
    ? { label: "העובד אישר את ההצעה", className: "bg-green-100 text-green-800" }
    : (STATUS_STYLE[app.status] ?? { label: app.status, className: "bg-gray-100 text-gray-700" });
  const contactRevealed = app.contactRevealed && app.workerPhone;
  const phone = app.workerPhone ?? "";
  const rating = app.workerRating ? parseFloat(app.workerRating) : null;

  return (
    <Card
      className={`transition-all ${
        app.status === "rejected" ? "opacity-50" : ""
      } ${app.status === "accepted" ? "border-green-300 bg-green-50/30" : ""}`}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* ── Left: worker info ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold">{app.workerName ?? "עובד אנונימי"}</span>
              <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
              {isNew(app.createdAt) && app.status === "pending" && (
                <Badge className="bg-blue-100 text-blue-800 font-bold">חדש</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {formatDistance(app.distanceKm)}
                {app.workerPreferredCity ? ` · ${app.workerPreferredCity}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {timeAgo(app.createdAt)}
              </span>
              {/* Rating + completed jobs */}
              {rating !== null && rating > 0 ? (
                <span className="flex items-center gap-1">
                  <MiniStars rating={rating} />
                  {(app.completedJobsCount ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">({app.completedJobsCount} עבודות)</span>
                  )}
                </span>
              ) : (
                (app.completedJobsCount ?? 0) > 0 ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase className="w-3 h-3" />
                    {app.completedJobsCount} עבודות
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">עובד חדש</span>
                )
              )}
            </div>

            {app.workerBio && (
              <p className="text-sm mt-2 text-foreground/80 line-clamp-2">{app.workerBio}</p>
            )}

            {app.message && (
              <p className="text-sm mt-1 italic text-muted-foreground flex items-start gap-1">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                "{app.message}"
              </p>
            )}

            {/* ── Contact buttons (only after accept) ── */}
            {contactRevealed && (
              <div className="flex gap-2 mt-3 flex-wrap">
                <a href={`tel:${phone}`}>
                  <AppButton size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                    <Phone className="w-4 h-4" />
                    {phone}
                  </AppButton>
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AppButton size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </AppButton>
                </a>
              </div>
            )}
          </div>

          {/* ── Right: action buttons ── */}
          {app.status === "pending" && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <AppButton
                size="sm"
                variant="outline"
                className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 min-w-[80px]"
                onClick={() => onAccept(app.id)}
                disabled={isPending}
              >
                <CheckCircle className="w-4 h-4" />
                קבל
              </AppButton>
              <AppButton
                size="sm"
                variant="outline"
                className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 min-w-[80px]"
                onClick={() => onReject(app.id)}
                disabled={isPending}
              >
                <XCircle className="w-4 h-4" />
                דחה
              </AppButton>
            </div>
          )}

          {app.status === "accepted" && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              {!contactRevealed && (
                <Badge className="bg-green-100 text-green-800 flex-shrink-0">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  התקבל
                </Badge>
              )}
              {app.workerId && (
                <AppButton
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 min-w-[80px]"
                  onClick={() => setRateOpen(true)}
                >
                  <Star className="w-4 h-4" />
                  דרג
                </AppButton>
              )}
            </div>
          )}

          {/* Rating modal */}
          {app.workerId && (
            <RateWorkerModal
              open={rateOpen}
              onClose={() => setRateOpen(false)}
              workerId={app.workerId}
              workerName={app.workerName ?? "עובד"}
              applicationId={app.id}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobApplications() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: applicants, isLoading, error } = trpc.jobs.getJobApplications.useQuery(
    { jobId },
    { enabled: !!user && !isNaN(jobId) }
  );

  const updateStatus = trpc.jobs.updateApplicationStatus.useMutation({
    onSuccess: (_, vars) => {
      utils.jobs.getJobApplications.invalidate({ jobId });
      toast.success(vars.action === "accept" ? "המועמד התקבל! פרטי הקשר נחשפו." : "המועמד נדחה.");
    },
    onError: (e, vars) => {
      // Minor restriction errors on accept — surface the exact server reason with a
      // dedicated icon so the employer understands why the action was blocked.
      const isMinorBlock =
        vars.action === "accept" &&
        (e.data?.code === "FORBIDDEN" || e.data?.code === "PRECONDITION_FAILED");

      if (isMinorBlock) {
        toast.error(e.message, {
          description: "לא ניתן לקבל עובד זה למשרה בשל הגבלות חוק עבודת נוער.",
          duration: 6000,
          icon: "🔞",
        });
      } else {
        toast.error(e.message);
      }
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4 text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-muted-foreground mb-4">יש להתחבר כדי לצפות במועמדים</p>
            <AppButton variant="brand" onClick={() => navigate("/")}>חזרה לדף הבית</AppButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full mx-4 text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-muted-foreground mb-4">אין לך הרשאה לצפות במועמדים למשרה זו</p>
            <AppButton variant="brand" onClick={() => navigate("/my-jobs")}>המשרות שלי</AppButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = applicants?.filter((a) => a.status === "pending") ?? [];
  const accepted = applicants?.filter((a) => a.status === "accepted") ?? [];
  const rejected = applicants?.filter((a) => a.status === "rejected") ?? [];
  // Offer-related groups
  // offered = pending offers only (worker has NOT yet responded)
  const offered = applicants?.filter((a) => a.status === "offered" && !a.contactRevealed) ?? [];
  // offerAccepted = worker accepted the offer (contactRevealed=true)
  const offerAccepted = applicants?.filter((a) => a.status === "offered" && a.contactRevealed) ?? [];
  const offerRejected = applicants?.filter((a) => a.status === "offer_rejected") ?? [];
  const total = applicants?.length ?? 0;

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* ── Header ── */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => navigate("/my-jobs")}
            className="flex items-center gap-1"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה
          </AppButton>
          <div className="flex-1">
            <h1 className="text-lg font-bold">מועמדים למשרה</h1>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {total} מועמד{total !== 1 ? "ים" : ""} · {pending.length} ממתינ{pending.length !== 1 ? "ים" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">אין מועמדים עדיין</p>
            <p className="text-muted-foreground text-sm mt-1">מועמדים יופיעו כאן ברגע שיגישו מועמדות</p>
          </div>
        ) : (
          <>
            {/* ── Pending ── */}
            {pending.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  ממתינים לתשובה
                  <Badge variant="secondary">{pending.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {pending.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                      onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Accepted ── */}
            {accepted.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  התקבלו
                  <Badge className="bg-green-100 text-green-800">{accepted.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {accepted.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                      onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Rejected ── */}
            {rejected.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  נדחו
                  <Badge variant="secondary">{rejected.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {rejected.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                      onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Offers sent (awaiting worker response) ── */}
            {offered.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  הצעות שנשלחו — ממתינות לתשובת העובד
                  <Badge className="bg-purple-100 text-purple-800">{offered.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {offered.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                      onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Offer accepted by worker (employer sees worker phone) ── */}
            {offerAccepted.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  אישרו הצעה — טלפון העובד גלוי
                  <Badge className="bg-green-100 text-green-800">{offerAccepted.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {offerAccepted.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                      onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Offer rejected by worker ── */}
            {offerRejected.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  דחו את ההצעה
                  <Badge variant="secondary">{offerRejected.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {offerRejected.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                      onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

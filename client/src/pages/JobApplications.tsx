import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppButton } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  Clock,
  Gift,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Star,
  User,
  XCircle,
} from "lucide-react";
import { RateWorkerModal } from "@/components/RateWorkerModal";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";

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

// STATUS_CONFIG removed — use getApplicationStatusLabel from @shared/const instead

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
      <span className="text-xs font-bold" style={{ color: "oklch(0.65 0.13 76.7)" }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

// ── Applicant card — mirrors MyApplications card structure exactly ────────────

function ApplicantCard({
  app,
  onAccept,
  onReject,
  isPending,
  idx,
  isCapReached = false,
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
    /** CDN URL of the worker's profile photo, null if not set */
    workerProfilePhoto?: string | null;
  };
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  isPending: boolean;
  idx: number;
  /** When true the accept button is hidden — job cap already reached */
  isCapReached?: boolean;
}) {
  const [rateOpen, setRateOpen] = useState(false);

  const isAccepted = app.status === "accepted";
  const isRejected = app.status === "rejected" || app.status === "offer_rejected";
  const isOfferedPending = app.status === "offered" && !app.contactRevealed;
  const isOfferedAccepted = app.status === "offered" && app.contactRevealed;
  const isPendingApp = app.status === "pending" || app.status === "viewed";

  const effectiveStatus = isOfferedAccepted ? "offered_accepted" : app.status;

  const phone = app.workerPhone ?? "";
  const rating = app.workerRating ? parseFloat(app.workerRating) : null;

  // Card style — identical logic to MyApplications
  const cardStyle: React.CSSProperties = {
    background: isAccepted || isOfferedAccepted
      ? "oklch(0.65 0.22 160 / 0.05)"
      : isOfferedPending
      ? "oklch(0.55 0.18 260 / 0.05)"
      : "white",
    border: isAccepted || isOfferedAccepted
      ? "1px solid oklch(0.65 0.22 160 / 0.20)"
      : isOfferedPending
      ? "2px solid oklch(0.55 0.18 260 / 0.40)"
      : "1px solid oklch(0.87 0.04 84.0)",
    borderRadius: "1rem",
    padding: "1rem",
    boxShadow: isOfferedPending
      ? "0 4px 16px oklch(0.55 0.18 260 / 0.12)"
      : "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
    opacity: isRejected ? 0.70 : 1,
  };

  // Avatar bg — same as MyApplications
  const avatarBg = isAccepted || isOfferedAccepted
    ? "oklch(0.65 0.22 160 / 0.12)"
    : isOfferedPending
    ? "oklch(0.55 0.18 260 / 0.12)"
    : "oklch(0.38 0.07 125.0 / 0.08)";

  const avatarColor = isAccepted || isOfferedAccepted
    ? "oklch(0.52 0.22 150)"
    : isOfferedPending
    ? "oklch(0.45 0.18 260)"
    : "oklch(0.38 0.07 125.0)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: idx * 0.04 }}
      style={cardStyle}
      dir="rtl"
    >
      {/* ── Offered pending banner ── */}
      {isOfferedPending && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs font-semibold"
          style={{
            background: "oklch(0.55 0.18 260 / 0.12)",
            color: "oklch(0.40 0.18 260)",
            border: "1px solid oklch(0.55 0.18 260 / 0.20)",
          }}
        >
          <Gift className="h-4 w-4 shrink-0" />
          <span>שלחת הצעת עבודה לעובד זה — ממתין לתשובה</span>
        </div>
      )}

      {/* ── Top row: icon + name/meta + status badge ── */}
      <div className="flex items-start gap-3 mb-2">
        {/* Avatar: profile photo if available, else letter-avatar; Gift icon overlay for offered-pending */}
        <div className="relative shrink-0">
          {app.workerProfilePhoto && !isOfferedPending ? (
            <img
              src={app.workerProfilePhoto}
              alt={app.workerName ?? "עובד"}
              className="w-10 h-10 rounded-xl object-cover"
              style={{ border: "1px solid oklch(0.88 0.03 120)" }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: avatarBg }}
            >
              {isOfferedPending ? (
                <Gift className="h-5 w-5" style={{ color: avatarColor }} />
              ) : (
                <span className="text-sm font-bold" style={{ color: avatarColor }}>
                  {app.workerName?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Name + sub-info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary, #1a2010)" }}>
              {app.workerName ?? "עובד אנונימי"}
            </p>
            {isNew(app.createdAt) && isPendingApp && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: "oklch(0.55 0.18 260 / 0.12)",
                  color: "oklch(0.40 0.18 260)",
                  border: "1px solid oklch(0.55 0.18 260 / 0.25)",
                }}
              >
                חדש
              </span>
            )}
          </div>
          {/* Rating / experience line */}
          {rating !== null && rating > 0 ? (
            <div className="flex items-center gap-1 mt-0.5">
              <MiniStars rating={rating} />
              {(app.completedJobsCount ?? 0) > 0 && (
                <span className="text-xs" style={{ color: "var(--text-muted, #6b7280)" }}>
                  ({app.completedJobsCount} עבודות)
                </span>
              )}
            </div>
          ) : (app.completedJobsCount ?? 0) > 0 ? (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted, #6b7280)" }}>
              <Briefcase className="h-3 w-3" />
              {app.completedJobsCount} עבודות
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted, #6b7280)" }}>עובד חדש</p>
          )}
        </div>

        {/* Status badge — Radix Tooltip via shared StatusBadge */}
        <StatusBadge
          status={app.status}
          effectiveStatus={effectiveStatus}
          perspective="employer"
          className="px-2.5 py-1 font-semibold shrink-0"
        />
      </div>

      {/* ── Meta row ── */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted, #6b7280)" }}>
          <MapPin className="h-3 w-3" />
          {formatDistance(app.distanceKm)}
          {app.workerPreferredCity ? ` · ${app.workerPreferredCity}` : ""}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint, #9ca3af)" }}>
          <Clock className="h-3 w-3" />
          {timeAgo(app.createdAt)}
        </span>
      </div>

      {/* ── Bio ── */}
      {app.workerBio && (
        <p className="text-xs mb-2 line-clamp-2" style={{ color: "var(--text-secondary, #374151)" }}>
          {app.workerBio}
        </p>
      )}

      {/* ── Message — identical quote style to MyApplications ── */}
      {app.message && (
        <p
          className="text-xs italic mb-2 line-clamp-2 px-3 py-2 rounded-lg"
          style={{
            color: "var(--text-secondary, #374151)",
            background: "oklch(0.93 0.03 91.6)",
            borderRight: "3px solid oklch(0.75 0.12 76.7)",
          }}
        >
          "{app.message}"
        </p>
      )}

      {/* ── Pending: accept / reject ── */}
      {isPendingApp && (
        <div className="flex gap-2 mt-3">
          {/* Hide accept button when cap is reached */}
          {!isCapReached && (
            <button
              disabled={isPending}
              onClick={() => onAccept(app.id)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl font-bold transition-all"
              style={{
                background: "oklch(0.52 0.18 145)",
                color: "white",
                border: "none",
                boxShadow: "0 2px 10px oklch(0.52 0.18 145 / 0.35)",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              קבל
            </button>
          )}
          <button
            disabled={isPending}
            onClick={() => onReject(app.id)}
            className="flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl font-semibold transition-all"
            style={{
              background: "oklch(0.97 0.01 20)",
              color: "oklch(0.48 0.20 22)",
              border: "1.5px solid oklch(0.75 0.16 22 / 0.45)",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <XCircle className="h-3.5 w-3.5" />
            דחה
          </button>
        </div>
      )}

      {/* ── Accepted: contact buttons + rate ── */}
      {isAccepted && app.contactRevealed && phone && (
        <div className="flex gap-2 mt-3">
          <a href={`tel:${phone}`} className="flex-1">
            <button
              className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: "oklch(0.55 0.18 240 / 0.10)",
                border: "1.5px solid oklch(0.55 0.18 240 / 0.35)",
                color: "oklch(0.38 0.18 240)",
              }}
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </button>
          </a>
          <a
            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <button
              className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: "oklch(0.52 0.18 145)",
                border: "none",
                color: "white",
                boxShadow: "0 2px 8px oklch(0.52 0.18 145 / 0.30)",
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>
          </a>
          {app.workerId && (
            <button
              onClick={() => setRateOpen(true)}
              className="flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: "oklch(0.75 0.12 76.7 / 0.10)",
                border: "1px solid oklch(0.75 0.12 76.7 / 0.25)",
                color: "oklch(0.60 0.13 76.7)",
              }}
            >
              <Star className="h-3.5 w-3.5" />
              דרג
            </button>
          )}
        </div>
      )}

      {/* Accepted but contact not yet revealed */}
      {isAccepted && !app.contactRevealed && (
        <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.52 0.22 150)" }}>
          ✓ התקבל! פרטי הקשר יחשפו בקרוב.
        </p>
      )}

      {/* ── Offer accepted by worker: confirmation + contact ── */}
      {isOfferedAccepted && (
        <>
          <div
            className="mt-3 rounded-xl px-3 py-2.5 mb-2"
            style={{
              background: "oklch(0.65 0.22 160 / 0.08)",
              border: "1px solid oklch(0.65 0.22 160 / 0.20)",
            }}
          >
            <p className="text-xs font-bold" style={{ color: "oklch(0.52 0.22 150)" }}>
              ✓ העובד אישר את ההצעה!
            </p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.10 150)" }}>
              הטלפון של העובד גלוי — צור קשר עכשיו
            </p>
          </div>
          {phone && (
            <div className="flex gap-2">
              <a href={`tel:${phone}`} className="flex-1">
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
                  style={{
                    background: "oklch(0.55 0.18 240 / 0.10)",
                    border: "1.5px solid oklch(0.55 0.18 240 / 0.35)",
                    color: "oklch(0.38 0.18 240)",
                  }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {phone}
                </button>
              </a>
              <a
                href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
                  style={{
                    background: "oklch(0.52 0.18 145)",
                    border: "none",
                    color: "white",
                    boxShadow: "0 2px 8px oklch(0.52 0.18 145 / 0.30)",
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </a>
            </div>
          )}
        </>
      )}

      {/* ── Bottom row: view profile link + share — mirrors MyApplications ── */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={async () => {
            const url = `${window.location.origin}/worker/${app.workerId}`;
            if (navigator.share) {
              try { await navigator.share({ title: app.workerName ?? "עובד", url }); } catch {}
            } else {
              await navigator.clipboard.writeText(url);
              toast.success("קישור הועתק ללוח");
            }
          }}
          className="p-1 rounded-lg transition-all"
          title="שתף"
          style={{ color: "var(--text-muted, #6b7280)" }}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

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
    </motion.div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  bg,
  color,
  border,
}: {
  title: string;
  count: number;
  bg: string;
  color: string;
  border: string;
}) {
  return (
    <h2
      className="text-sm font-semibold mb-2 flex items-center gap-2"
      style={{ color: "var(--text-secondary, #374151)" }}
    >
      {title}
      <span
        className="text-xs px-2 py-0.5 rounded-full font-bold"
        style={{ background: bg, color, border: `1px solid ${border}` }}
      >
        {count}
      </span>
    </h2>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg, #f8f5ee)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "oklch(0.38 0.07 125.0)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: "var(--page-bg, #f8f5ee)" }} dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.38 0.07 125.0 / 0.10)" }}>
          <Briefcase className="h-8 w-8" style={{ color: "oklch(0.38 0.07 125.0)" }} />
        </div>
        <p className="text-base font-semibold text-center" style={{ color: "var(--text-primary, #1a2010)" }}>
          יש להתחבר כדי לצפות במועמדים
        </p>
        <AppButton variant="brand" onClick={() => navigate("/")}>חזרה לדף הבית</AppButton>
      </div>
    );
  }

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: "var(--page-bg, #f8f5ee)" }} dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.93 0.02 91.6)" }}>
          <XCircle className="h-8 w-8" style={{ color: "oklch(0.58 0.02 100)" }} />
        </div>
        <p className="text-base font-semibold text-center" style={{ color: "var(--text-primary, #1a2010)" }}>
          אין לך הרשאה לצפות במועמדים למשרה זו
        </p>
        <AppButton variant="brand" onClick={() => navigate("/my-jobs")}>חזרה למשרות שלי</AppButton>
      </div>
    );
  }

  const jobStatus = applicants?.jobStatus ?? null;
  const jobClosedReason = applicants?.jobClosedReason ?? null;
  const acceptedCount = applicants?.acceptedCount ?? 0;
  const allApplicants = applicants?.applicants ?? [];
  const isCapReached = jobClosedReason === "cap_reached";
  const pending = allApplicants.filter((a) => a.status === "pending" || a.status === "viewed");
  const accepted = allApplicants.filter((a) => a.status === "accepted");
  const rejected = allApplicants.filter((a) => a.status === "rejected");
  const offered = allApplicants.filter((a) => a.status === "offered" && !a.contactRevealed);
  const offerAccepted = allApplicants.filter((a) => a.status === "offered" && a.contactRevealed);
  const offerRejected = allApplicants.filter((a) => a.status === "offer_rejected");
  const total = allApplicants.length;

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg, #f8f5ee)" }} dir="rtl">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "oklch(0.28 0.06 122.3)",
          borderBottom: "1px solid oklch(0.35 0.06 122 / 0.5)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(`/job/${jobId}`)}
            className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{
              color: "oklch(0.85 0.05 91)",
              background: "oklch(0.35 0.06 122 / 0.40)",
              border: "1px solid oklch(0.45 0.06 122 / 0.40)",
            }}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה למשרה
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color: "oklch(0.95 0.02 91)" }}>
              מועמדים למשרה
            </h1>
            {!isLoading && (
              <p className="text-xs" style={{ color: "oklch(0.70 0.04 91)" }}>
                {total} מועמד{total !== 1 ? "ים" : ""} · {acceptedCount}/{3} התקבלו
                {isCapReached && " · ✅ הושלמה"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Cap-reached banner */}
        {!isLoading && isCapReached && (
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: "oklch(0.45 0.18 160 / 0.10)", border: "1px solid oklch(0.45 0.18 160 / 0.30)" }}
          >
            <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "oklch(0.45 0.18 160)" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "oklch(0.35 0.14 160)" }}>
                המשרה הושלמה — קיבלת 3 מועמדים
              </p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.10 160)" }}>
                המשרה נסגרה אוטומטית. לא ניתן לשלוח הצעות נוספות.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  border: "1px solid oklch(0.87 0.04 84.0)",
                  borderRadius: "1rem",
                  padding: "1rem",
                  boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded-lg animate-pulse w-1/3" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                    <div className="h-3 rounded-lg animate-pulse w-1/2" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                  </div>
                  <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                </div>
                <div className="mt-2 h-3 rounded-lg animate-pulse w-2/3" style={{ background: "oklch(0.93 0.02 91.6)" }} />
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.38 0.07 125.0 / 0.08)" }}
            >
              <User className="w-8 h-8" style={{ color: "oklch(0.38 0.07 125.0)" }} />
            </div>
            <p className="text-base font-semibold" style={{ color: "var(--text-primary, #1a2010)" }}>
              אין מועמדים עדיין
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted, #6b7280)" }}>
              מועמדים יופיעו כאן ברגע שיגישו מועמדות
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <>
              {/* ── Pending ── */}
              {pending.length > 0 && (
                <section key="pending">
                  <SectionHeader
                    title="ממתינים לתשובה"
                    count={pending.length}
                    bg="oklch(0.75 0.12 76.7 / 0.12)"
                    color="oklch(0.65 0.13 76.7)"
                    border="oklch(0.75 0.12 76.7 / 0.30)"
                  />
                  <div className="space-y-3">
                    {pending.map((app, idx) => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        idx={idx}
                        onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                        onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                        isPending={updateStatus.isPending}
                        isCapReached={isCapReached}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Accepted ── */}
              {accepted.length > 0 && (
                <section key="accepted">
                  <SectionHeader
                    title="התקבלו"
                    count={accepted.length}
                    bg="oklch(0.65 0.22 160 / 0.12)"
                    color="oklch(0.52 0.22 150)"
                    border="oklch(0.65 0.22 160 / 0.30)"
                  />
                  <div className="space-y-3">
                    {accepted.map((app, idx) => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        idx={idx}
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
                <section key="rejected">
                  <SectionHeader
                    title="נדחו"
                    count={rejected.length}
                    bg="oklch(0.93 0.02 91.6)"
                    color="oklch(0.58 0.02 100)"
                    border="oklch(0.87 0.04 84.0)"
                  />
                  <div className="space-y-3">
                    {rejected.map((app, idx) => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        idx={idx}
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
                <section key="offered">
                  <SectionHeader
                    title="הצעות שנשלחו — ממתינות לתשובת העובד"
                    count={offered.length}
                    bg="oklch(0.55 0.18 260 / 0.10)"
                    color="oklch(0.45 0.18 260)"
                    border="oklch(0.55 0.18 260 / 0.30)"
                  />
                  <div className="space-y-3">
                    {offered.map((app, idx) => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        idx={idx}
                        onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                        onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                        isPending={updateStatus.isPending}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Offer accepted by worker ── */}
              {offerAccepted.length > 0 && (
                <section key="offer-accepted">
                  <SectionHeader
                    title="אישרו הצעה — טלפון העובד גלוי"
                    count={offerAccepted.length}
                    bg="oklch(0.65 0.22 160 / 0.12)"
                    color="oklch(0.52 0.22 150)"
                    border="oklch(0.65 0.22 160 / 0.30)"
                  />
                  <div className="space-y-3">
                    {offerAccepted.map((app, idx) => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        idx={idx}
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
                <section key="offer-rejected">
                  <SectionHeader
                    title="דחו את ההצעה"
                    count={offerRejected.length}
                    bg="oklch(0.93 0.02 91.6)"
                    color="oklch(0.58 0.02 100)"
                    border="oklch(0.87 0.04 84.0)"
                  />
                  <div className="space-y-3">
                    {offerRejected.map((app, idx) => (
                      <ApplicantCard
                        key={app.id}
                        app={app}
                        idx={idx}
                        onAccept={(id) => updateStatus.mutate({ id, action: "accept" })}
                        onReject={(id) => updateStatus.mutate({ id, action: "reject" })}
                        isPending={updateStatus.isPending}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

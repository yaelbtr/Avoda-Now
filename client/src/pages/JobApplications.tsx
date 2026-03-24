import { useState } from "react";
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
  HourglassIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  ThumbsDown,
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

// ── Status config (mirrors MyApplications STATUS_CONFIG) ─────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
  border: string;
}> = {
  pending: {
    label: "ממתין",
    icon: <HourglassIcon className="h-3.5 w-3.5" />,
    bg: "oklch(0.75 0.12 76.7 / 0.12)",
    color: "oklch(0.65 0.13 76.7)",
    border: "oklch(0.75 0.12 76.7 / 0.30)",
  },
  viewed: {
    label: "נצפה",
    icon: <HourglassIcon className="h-3.5 w-3.5" />,
    bg: "oklch(0.50 0.07 125.0 / 0.12)",
    color: "oklch(0.38 0.07 125.0)",
    border: "oklch(0.50 0.07 125.0 / 0.30)",
  },
  accepted: {
    label: "התקבל",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    bg: "oklch(0.65 0.22 160 / 0.12)",
    color: "oklch(0.52 0.22 150)",
    border: "oklch(0.65 0.22 160 / 0.30)",
  },
  rejected: {
    label: "נדחה",
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "oklch(0.93 0.02 91.6)",
    color: "oklch(0.58 0.02 100)",
    border: "oklch(0.87 0.04 84.0)",
  },
  // offered + pending (worker hasn't responded)
  offered: {
    label: "הצעה נשלחה",
    icon: <Send className="h-3.5 w-3.5" />,
    bg: "oklch(0.55 0.18 260 / 0.10)",
    color: "oklch(0.45 0.18 260)",
    border: "oklch(0.55 0.18 260 / 0.30)",
  },
  // offered + contactRevealed (worker accepted)
  offered_accepted: {
    label: "העובד אישר",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    bg: "oklch(0.65 0.22 160 / 0.12)",
    color: "oklch(0.52 0.22 150)",
    border: "oklch(0.65 0.22 160 / 0.30)",
  },
  offer_rejected: {
    label: "דחה הצעה",
    icon: <ThumbsDown className="h-3.5 w-3.5" />,
    bg: "oklch(0.93 0.02 91.6)",
    color: "oklch(0.58 0.02 100)",
    border: "oklch(0.87 0.04 84.0)",
  },
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
      <span className="text-xs font-bold" style={{ color: "oklch(0.65 0.13 76.7)" }}>
        {rating.toFixed(1)}
      </span>
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

  // Resolve effective status key for config lookup
  const effectiveStatus =
    app.status === "offered" && app.contactRevealed
      ? "offered_accepted"
      : app.status;

  const cfg = STATUS_CONFIG[effectiveStatus] ?? {
    label: app.status,
    icon: <HourglassIcon className="h-3.5 w-3.5" />,
    bg: "oklch(0.93 0.02 91.6)",
    color: "oklch(0.58 0.02 100)",
    border: "oklch(0.87 0.04 84.0)",
  };

  const isAccepted = app.status === "accepted";
  const isRejected = app.status === "rejected" || app.status === "offer_rejected";
  const isOfferedPending = app.status === "offered" && !app.contactRevealed;
  const isOfferedAccepted = app.status === "offered" && app.contactRevealed;
  const isPendingApp = app.status === "pending" || app.status === "viewed";

  const contactRevealed = app.contactRevealed && app.workerPhone;
  const phone = app.workerPhone ?? "";
  const rating = app.workerRating ? parseFloat(app.workerRating) : null;

  // Card border/bg based on state
  const cardStyle: React.CSSProperties = {
    background: isAccepted || isOfferedAccepted
      ? "oklch(0.65 0.22 160 / 0.04)"
      : isOfferedPending
      ? "oklch(0.55 0.18 260 / 0.04)"
      : "white",
    border: isAccepted || isOfferedAccepted
      ? "1px solid oklch(0.65 0.22 160 / 0.25)"
      : isOfferedPending
      ? "2px solid oklch(0.55 0.18 260 / 0.35)"
      : "1px solid oklch(0.87 0.04 84.0)",
    borderRadius: "1rem",
    padding: "1rem",
    boxShadow: isOfferedPending
      ? "0 4px 16px oklch(0.55 0.18 260 / 0.10)"
      : "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
    opacity: isRejected ? 0.70 : 1,
    transition: "all 0.2s ease",
  };

  // Avatar icon bg
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
    <div style={cardStyle} dir="rtl">
      {/* ── Offered pending banner ── */}
      {isOfferedPending && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs font-semibold"
          style={{
            background: "oklch(0.55 0.18 260 / 0.10)",
            color: "oklch(0.40 0.18 260)",
            border: "1px solid oklch(0.55 0.18 260 / 0.20)",
          }}
        >
          <Gift className="h-4 w-4 shrink-0" />
          <span>שלחת הצעת עבודה לעובד זה — ממתין לתשובה</span>
        </div>
      )}

      {/* ── Top row: avatar + name + status badge ── */}
      <div className="flex items-start gap-3 mb-2">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: avatarBg }}
        >
          {isOfferedPending ? (
            <Gift className="h-5 w-5" style={{ color: avatarColor }} />
          ) : (
            <User className="h-5 w-5" style={{ color: avatarColor }} />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary, #1a2010)" }}>
              {app.workerName ?? "עובד אנונימי"}
            </p>
            {isNew(app.createdAt) && isPendingApp && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
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
          {/* Rating row */}
          {rating !== null && rating > 0 ? (
            <div className="flex items-center gap-1.5 mt-0.5">
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

        {/* Status badge */}
        <span
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.icon}
          {cfg.label}
        </span>
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

      {/* ── Message ── */}
      {app.message && (
        <p
          className="text-xs italic mb-2 line-clamp-2 px-3 py-2 rounded-lg flex items-start gap-1.5"
          style={{
            color: "var(--text-secondary, #374151)",
            background: "oklch(0.93 0.03 91.6)",
            borderRight: "3px solid oklch(0.75 0.12 76.7)",
          }}
        >
          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "oklch(0.65 0.13 76.7)" }} />
          "{app.message}"
        </p>
      )}

      {/* ── Pending: accept / reject ── */}
      {isPendingApp && (
        <div className="flex gap-2 mt-3">
          <button
            disabled={isPending}
            onClick={() => onAccept(app.id)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl font-bold transition-all"
            style={{
              background: "oklch(0.38 0.07 125.0)",
              color: "white",
              border: "none",
              boxShadow: "0 2px 8px oklch(0.38 0.07 125.0 / 0.28)",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            קבל
          </button>
          <button
            disabled={isPending}
            onClick={() => onReject(app.id)}
            className="flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 rounded-xl font-semibold transition-all"
            style={{
              background: "oklch(0.93 0.02 91.6)",
              color: "oklch(0.50 0.04 100)",
              border: "1px solid oklch(0.85 0.03 91.6)",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <XCircle className="h-3.5 w-3.5" />
            דחה
          </button>
        </div>
      )}

      {/* ── Accepted: contact buttons + rate ── */}
      {isAccepted && contactRevealed && (
        <div className="flex gap-2 mt-3">
          <a href={`tel:${phone}`} className="flex-1">
            <button
              className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
              style={{
                background: "oklch(0.38 0.07 125.0 / 0.08)",
                border: "1px solid oklch(0.38 0.07 125.0 / 0.20)",
                color: "oklch(0.38 0.07 125.0)",
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
                background: "oklch(0.65 0.22 160 / 0.08)",
                border: "1px solid oklch(0.65 0.22 160 / 0.20)",
                color: "oklch(0.52 0.22 150)",
              }}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
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
      {isAccepted && !contactRevealed && (
        <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.52 0.22 150)" }}>
          ✓ התקבל! פרטי הקשר יחשפו בקרוב.
        </p>
      )}

      {/* ── Offer accepted by worker: show phone ── */}
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
                    background: "oklch(0.38 0.07 125.0 / 0.08)",
                    border: "1px solid oklch(0.38 0.07 125.0 / 0.20)",
                    color: "oklch(0.38 0.07 125.0)",
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
                    background: "oklch(0.65 0.22 160 / 0.08)",
                    border: "1px solid oklch(0.65 0.22 160 / 0.20)",
                    color: "oklch(0.52 0.22 150)",
                  }}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
              </a>
            </div>
          )}
        </>
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
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.38 0.07 125.0 / 0.10)" }}
        >
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
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.93 0.02 91.6)" }}
        >
          <XCircle className="h-8 w-8" style={{ color: "oklch(0.58 0.02 100)" }} />
        </div>
        <p className="text-base font-semibold text-center" style={{ color: "var(--text-primary, #1a2010)" }}>
          אין לך הרשאה לצפות במועמדים למשרה זו
        </p>
        <AppButton variant="brand" onClick={() => navigate("/my-jobs")}>חזרה למשרות שלי</AppButton>
      </div>
    );
  }

  const pending = applicants?.filter((a) => a.status === "pending" || a.status === "viewed") ?? [];
  const accepted = applicants?.filter((a) => a.status === "accepted") ?? [];
  const rejected = applicants?.filter((a) => a.status === "rejected") ?? [];
  // offered = pending offers only (worker has NOT yet responded)
  const offered = applicants?.filter((a) => a.status === "offered" && !a.contactRevealed) ?? [];
  // offerAccepted = worker accepted the offer (contactRevealed=true)
  const offerAccepted = applicants?.filter((a) => a.status === "offered" && a.contactRevealed) ?? [];
  const offerRejected = applicants?.filter((a) => a.status === "offer_rejected") ?? [];
  const total = applicants?.length ?? 0;

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
            onClick={() => navigate("/my-jobs")}
            className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{
              color: "oklch(0.85 0.05 91)",
              background: "oklch(0.35 0.06 122 / 0.40)",
              border: "1px solid oklch(0.45 0.06 122 / 0.40)",
            }}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color: "oklch(0.95 0.02 91)" }}>
              מועמדים למשרה
            </h1>
            {!isLoading && (
              <p className="text-xs" style={{ color: "oklch(0.70 0.04 91)" }}>
                {total} מועמד{total !== 1 ? "ים" : ""} · {pending.length} ממתינ{pending.length !== 1 ? "ים" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
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
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded-lg animate-pulse w-1/3" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                    <div className="h-3 rounded-lg animate-pulse w-1/2" style={{ background: "oklch(0.93 0.02 91.6)" }} />
                  </div>
                </div>
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
          <>
            {/* ── Pending ── */}
            {pending.length > 0 && (
              <section>
                <SectionHeader
                  title="ממתינים לתשובה"
                  count={pending.length}
                  bg="oklch(0.75 0.12 76.7 / 0.12)"
                  color="oklch(0.65 0.13 76.7)"
                  border="oklch(0.75 0.12 76.7 / 0.30)"
                />
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
                <SectionHeader
                  title="התקבלו"
                  count={accepted.length}
                  bg="oklch(0.65 0.22 160 / 0.12)"
                  color="oklch(0.52 0.22 150)"
                  border="oklch(0.65 0.22 160 / 0.30)"
                />
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
                <SectionHeader
                  title="נדחו"
                  count={rejected.length}
                  bg="oklch(0.93 0.02 91.6)"
                  color="oklch(0.58 0.02 100)"
                  border="oklch(0.87 0.04 84.0)"
                />
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
                <SectionHeader
                  title="הצעות שנשלחו — ממתינות לתשובת העובד"
                  count={offered.length}
                  bg="oklch(0.55 0.18 260 / 0.10)"
                  color="oklch(0.45 0.18 260)"
                  border="oklch(0.55 0.18 260 / 0.30)"
                />
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

            {/* ── Offer accepted by worker ── */}
            {offerAccepted.length > 0 && (
              <section>
                <SectionHeader
                  title="אישרו הצעה — טלפון העובד גלוי"
                  count={offerAccepted.length}
                  bg="oklch(0.65 0.22 160 / 0.12)"
                  color="oklch(0.52 0.22 150)"
                  border="oklch(0.65 0.22 160 / 0.30)"
                />
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
                <SectionHeader
                  title="דחו את ההצעה"
                  count={offerRejected.length}
                  bg="oklch(0.93 0.02 91.6)"
                  color="oklch(0.58 0.02 100)"
                  border="oklch(0.87 0.04 84.0)"
                />
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

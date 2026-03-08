import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { AppButton } from "@/components/AppButton";
import BrandLoader from "@/components/BrandLoader";
import {
  Briefcase, MapPin, Clock, CheckCircle, XCircle,
  HourglassIcon, ChevronRight, Phone, MessageCircle,
} from "lucide-react";
import { getCategoryLabel, formatSalary } from "@shared/categories";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

// ── Color tokens ──────────────────────────────────────────────────────────────
const C_BG = "oklch(0.14 0.02 260)";
const C_CARD = "oklch(1 0 0 / 0.04)";
const C_CARD_BORDER = "oklch(1 0 0 / 0.09)";
const C_BRIGHT = "oklch(0.97 0.01 260)";
const C_MID = "oklch(0.72 0.03 260)";
const C_FAINT = "oklch(0.52 0.02 260)";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
  pending: {
    label: "ממתין",
    icon: <HourglassIcon className="h-3.5 w-3.5" />,
    bg: "oklch(0.75 0.15 80 / 0.12)",
    color: "oklch(0.75 0.15 80)",
    border: "oklch(0.75 0.15 80 / 0.3)",
  },
  viewed: {
    label: "נצפה",
    icon: <HourglassIcon className="h-3.5 w-3.5" />,
    bg: "oklch(0.70 0.18 260 / 0.12)",
    color: "oklch(0.70 0.18 260)",
    border: "oklch(0.70 0.18 260 / 0.3)",
  },
  accepted: {
    label: "התקבלת!",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    bg: "oklch(0.68 0.20 160 / 0.12)",
    color: "oklch(0.68 0.20 160)",
    border: "oklch(0.68 0.20 160 / 0.3)",
  },
  rejected: {
    label: "לא התקבלת",
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "oklch(1 0 0 / 0.04)",
    color: C_FAINT,
    border: C_CARD_BORDER,
  },
};

type MyApplication = {
  id: number;
  jobId: number;
  status: string;
  message: string | null;
  contactRevealed: boolean;
  createdAt: Date;
  jobTitle: string | null;
  jobAddress: string | null;
  jobCity: string | null;
  jobSalary: string | null;
  jobSalaryType: string | null;
  jobStatus: string | null;
  employerName: string | null;
  workerPhone?: string | null;
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Shimmer({ width = "100%", height = 14, rounded = "0.5rem" }: {
  width?: string | number; height?: number; rounded?: string;
}) {
  return (
    <div style={{ width, height, borderRadius: rounded, background: "oklch(1 0 0 / 7%)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <motion.div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 10%) 40%, oklch(1 0 0 / 18%) 50%, oklch(1 0 0 / 10%) 60%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div style={{ background: C_CARD, border: `1px solid ${C_CARD_BORDER}`, borderRadius: "1rem", padding: "1rem" }}>
      <div className="flex items-start gap-3 mb-3">
        <Shimmer width={40} height={40} rounded="0.75rem" />
        <div className="flex-1 space-y-2">
          <Shimmer width="55%" height={14} />
          <Shimmer width="35%" height={11} />
        </div>
        <Shimmer width={72} height={24} rounded="9999px" />
      </div>
      <Shimmer width="80%" height={11} />
    </div>
  );
}

export default function MyApplications() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const { data: applications, isLoading } = trpc.jobs.myApplications.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C_BG }}>
        <BrandLoader />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: C_BG }}>
        <p className="text-base" style={{ color: C_MID }}>יש להתחבר כדי לצפות במועמדויות</p>
        <AppButton onClick={() => navigate("/")}>חזור לדף הבית</AppButton>
      </div>
    );
  }

  // ── Group by status ───────────────────────────────────────────────────────
  const pending = applications?.filter((a) => a.status === "pending" || a.status === "viewed") ?? [];
  const accepted = applications?.filter((a) => a.status === "accepted") ?? [];
  const rejected = applications?.filter((a) => a.status === "rejected") ?? [];

  const sections = [
    { key: "pending", label: "ממתינות לתשובה", items: pending },
    { key: "accepted", label: "התקבלתי!", items: accepted },
    { key: "rejected", label: "לא התקבלתי", items: rejected },
  ];

  return (
    <div className="min-h-screen pb-16" style={{ background: C_BG }} dir="rtl">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 px-4 py-4"
        style={{
          background: "oklch(0.14 0.02 260 / 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C_CARD_BORDER}`,
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <AppButton
            variant="ghost"
            size="sm"
            className="p-1.5"
            onClick={() => navigate("/")}
            style={{ color: C_MID }}
          >
            <ChevronRight className="h-5 w-5" />
          </AppButton>
          <div>
            <h1 className="text-lg font-bold" style={{ color: C_BRIGHT }}>
              המועמדויות שלי
            </h1>
            {applications && (
              <p className="text-xs" style={{ color: C_FAINT }}>
                {applications.length} מועמדויות סה"כ
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">
        {/* ── Loading ── */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && (!applications || applications.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.55 0.22 260 / 0.12)" }}
            >
              <Briefcase className="h-8 w-8" style={{ color: "oklch(0.70 0.18 260)" }} />
            </div>
            <p className="text-base font-semibold" style={{ color: C_MID }}>
              עדיין לא הגשת מועמדות
            </p>
            <p className="text-sm text-center" style={{ color: C_FAINT }}>
              חפש משרות מתאימות והגש מועמדות
            </p>
            <AppButton onClick={() => navigate("/find-jobs")}>חפש עבודה</AppButton>
          </div>
        )}

        {/* ── Sections ── */}
        {!isLoading && applications && applications.length > 0 && sections.map(({ key, label, items }) => {
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold" style={{ color: C_MID }}>{label}</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: STATUS_CONFIG[key === "pending" ? "pending" : key]?.bg ?? C_CARD,
                    color: STATUS_CONFIG[key === "pending" ? "pending" : key]?.color ?? C_FAINT,
                  }}
                >
                  {items.length}
                </span>
              </div>
              <AnimatePresence>
                <div className="space-y-3">
                  {items.map((app: MyApplication, idx: number) => {
                    const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
                    const isAccepted = app.status === "accepted";
                    const isRejected = app.status === "rejected";
                    const timeAgo = formatDistanceToNow(new Date(app.createdAt), {
                      addSuffix: true,
                      locale: he,
                    });

                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{
                          background: isAccepted
                            ? "oklch(0.68 0.20 160 / 0.06)"
                            : isRejected
                              ? "oklch(1 0 0 / 0.02)"
                              : C_CARD,
                          border: isAccepted
                            ? "1px solid oklch(0.68 0.20 160 / 0.2)"
                            : `1px solid ${C_CARD_BORDER}`,
                          borderRadius: "1rem",
                          padding: "1rem",
                          opacity: isRejected ? 0.65 : 1,
                        }}
                      >
                        {/* Top row: icon + title + status badge */}
                        <div className="flex items-start gap-3 mb-2">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: isAccepted
                                ? "oklch(0.68 0.20 160 / 0.15)"
                                : "oklch(0.55 0.22 260 / 0.12)",
                            }}
                          >
                            <Briefcase
                              className="h-5 w-5"
                              style={{
                                color: isAccepted
                                  ? "oklch(0.68 0.20 160)"
                                  : "oklch(0.70 0.18 260)",
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: C_BRIGHT }}>
                              {getCategoryLabel(app.jobTitle ?? "") || app.jobTitle || "משרה"}
                            </p>
                            {app.employerName && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: C_FAINT }}>
                                {app.employerName}
                              </p>
                            )}
                          </div>
                          {/* Status badge */}
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium shrink-0"
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

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                          {(app.jobCity || app.jobAddress) && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: C_FAINT }}>
                              <MapPin className="h-3 w-3" />
                              {app.jobCity ?? app.jobAddress}
                            </span>
                          )}
                          {app.jobSalary && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: C_FAINT }}>
                              {formatSalary(app.jobSalary, app.jobSalaryType ?? "hourly")}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs" style={{ color: C_FAINT }}>
                            <Clock className="h-3 w-3" />
                            {timeAgo}
                          </span>
                        </div>

                        {/* Message */}
                        {app.message && (
                          <p className="text-xs italic mb-2 line-clamp-2" style={{ color: C_MID }}>
                            "{app.message}"
                          </p>
                        )}

                        {/* Accepted: show contact buttons */}
                        {isAccepted && app.contactRevealed && app.workerPhone && (
                          <div className="flex gap-2 mt-2">
                            <a href={`tel:${app.workerPhone}`} className="flex-1">
                              <AppButton
                                size="sm"
                                className="gap-1.5 text-xs w-full"
                                style={{
                                  background: "oklch(0.55 0.22 260 / 0.15)",
                                  border: "1px solid oklch(0.55 0.22 260 / 0.3)",
                                  color: "oklch(0.70 0.18 260)",
                                }}
                              >
                                <Phone className="h-3.5 w-3.5" />
                                התקשר
                              </AppButton>
                            </a>
                            <a
                              href={`https://wa.me/${app.workerPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <AppButton
                                size="sm"
                                className="gap-1.5 text-xs w-full"
                                style={{
                                  background: "oklch(0.68 0.20 160 / 0.12)",
                                  border: "1px solid oklch(0.68 0.20 160 / 0.25)",
                                  color: "oklch(0.68 0.20 160)",
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </AppButton>
                            </a>
                          </div>
                        )}

                        {/* Accepted but contact not yet revealed */}
                        {isAccepted && !app.contactRevealed && (
                          <p className="text-xs mt-2" style={{ color: "oklch(0.68 0.20 160)" }}>
                            ✓ התקבלת! המעסיק ייצור איתך קשר בקרוב.
                          </p>
                        )}

                        {/* View job link */}
                        <div className="mt-2 text-left">
                          <a
                            href={`/job/${app.jobId}`}
                            className="text-xs underline"
                            style={{ color: "oklch(0.70 0.18 260 / 0.7)" }}
                          >
                            צפה במשרה
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useLocation, useSearch } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { AppButton } from "@/components/AppButton";
import BrandLoader from "@/components/BrandLoader";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Briefcase, MapPin, Clock, CheckCircle, XCircle,
  HourglassIcon, ChevronRight, Phone, MessageCircle,
  Bell, BellOff, Filter, ArrowUpDown, Bookmark, BookmarkX, Flame,
} from "lucide-react";
import { getCategoryLabel, formatSalary } from "@shared/categories";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

// ── Color tokens ──────────────────────────────────────────────────────────────
const C_BG = "oklch(0.14 0.02 260)";
const C_CARD = "oklch(1 0 0 / 0.04)";
const C_CARD_BORDER = "oklch(1 0 0 / 0.09)";
const C_BRIGHT = "oklch(0.97 0.01 260)";
const C_MID = "oklch(0.72 0.03 260)";
const C_FAINT = "oklch(0.52 0.02 260)";
const C_ACCENT = "oklch(0.70 0.18 260)";

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

type FilterStatus = "all" | "pending" | "accepted" | "rejected";
type SortOrder = "newest" | "oldest";

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
  const search = useSearch();
  const { isAuthenticated, loading } = useAuth();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Saved jobs sort
  type SavedSortBy = "savedAt" | "salary" | "city";
  const [savedSortBy, setSavedSortBy] = useState<SavedSortBy>("savedAt");
  const [savedSortDir, setSavedSortDir] = useState<"desc" | "asc">("desc");

  // Determine active tab from URL param
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab");
  const activeTab: "applications" | "saved" = tabParam === "saved" ? "saved" : "applications";

  const push = usePushNotifications();

  // Mark all application updates as "seen" when the worker visits this page
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem("myApplicationsLastSeen", new Date().toISOString());
    }
  }, [isAuthenticated]);

  const { data: applications, isLoading: appsLoading } = trpc.jobs.myApplications.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: savedJobs, isLoading: savedLoading, refetch: refetchSaved } = trpc.savedJobs.getSavedJobs.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();
  const unsaveMutation = trpc.savedJobs.unsave.useMutation({
    onSuccess: () => {
      utils.savedJobs.getSavedJobs.invalidate();
      utils.savedJobs.getSavedIds.invalidate();
      toast.success("המשרה הוסרה מהשמורים");
    },
    onError: () => toast.error("שגיאה בהסרת המשרה"),
  });

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!applications) return [];
    let list = [...applications] as MyApplication[];

    if (filterStatus !== "all") {
      if (filterStatus === "pending") {
        list = list.filter((a) => a.status === "pending" || a.status === "viewed");
      } else {
        list = list.filter((a) => a.status === filterStatus);
      }
    }

    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });

    return list;
  }, [applications, filterStatus, sortOrder]);

  // ── Saved jobs sort ───────────────────────────────────────────────────────
  const sortedSavedJobs = useMemo(() => {
    if (!savedJobs) return [];
    const list = [...savedJobs];
    list.sort((a, b) => {
      let cmp = 0;
      if (savedSortBy === "savedAt") {
        cmp = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
      } else if (savedSortBy === "salary") {
        const sa = parseFloat(a.salary ?? "0") || 0;
        const sb = parseFloat(b.salary ?? "0") || 0;
        cmp = sa - sb;
      } else if (savedSortBy === "city") {
        cmp = (a.city ?? "").localeCompare(b.city ?? "", "he");
      }
      return savedSortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [savedJobs, savedSortBy, savedSortDir]);

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

  const filterLabels: Record<FilterStatus, string> = {
    all: "הכל",
    pending: "ממתינות",
    accepted: "התקבלתי",
    rejected: "לא התקבלתי",
  };

  const isLoading = activeTab === "applications" ? appsLoading : savedLoading;

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
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <AppButton
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => navigate("/")}
              style={{ color: C_MID }}
            >
              <ChevronRight className="h-5 w-5" />
            </AppButton>
            <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: C_BRIGHT }}>
                {activeTab === "applications" ? "המועמדויות שלי" : "משרות ששמרתי"}
              </h1>
              {activeTab === "applications" && applications && (
                <p className="text-xs" style={{ color: C_FAINT }}>
                  {applications.length} מועמדויות סה"כ
                </p>
              )}
              {activeTab === "saved" && savedJobs && (
                <p className="text-xs" style={{ color: C_FAINT }}>
                  {savedJobs.length} משרות שמורות
                </p>
              )}
            </div>

            {/* Push notification toggle — only on applications tab */}
            {activeTab === "applications" && push.isSupported && (
              <AppButton
                variant="ghost"
                size="sm"
                className="p-1.5 shrink-0"
                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                disabled={push.isLoading}
                title={push.isSubscribed ? "בטל התראות" : "הפעל התראות"}
                style={{ color: push.isSubscribed ? "oklch(0.68 0.20 160)" : C_FAINT }}
              >
                {push.isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </AppButton>
            )}

            {/* Filter toggle — only on applications tab */}
            {activeTab === "applications" && (
              <AppButton
                variant="ghost"
                size="sm"
                className="p-1.5 shrink-0"
                onClick={() => setShowFilters((v) => !v)}
                style={{ color: showFilters ? C_ACCENT : C_FAINT }}
              >
                <Filter className="h-5 w-5" />
              </AppButton>
            )}
          </div>

          {/* ── Tab switcher ── */}
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "oklch(1 0 0 / 0.05)", border: `1px solid ${C_CARD_BORDER}` }}
          >
            <button
              onClick={() => navigate("/my-applications")}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-all"
              style={{
                background: activeTab === "applications" ? C_ACCENT : "transparent",
                color: activeTab === "applications" ? "oklch(0.14 0.02 260)" : C_MID,
              }}
            >
              <Briefcase className="h-4 w-4" />
              מועמדויות
              {applications && applications.length > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: activeTab === "applications" ? "oklch(0.14 0.02 260 / 0.2)" : "oklch(0.70 0.18 260 / 0.2)",
                    color: activeTab === "applications" ? "oklch(0.14 0.02 260)" : C_ACCENT,
                  }}
                >
                  {applications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/my-applications?tab=saved")}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-all"
              style={{
                background: activeTab === "saved" ? C_ACCENT : "transparent",
                color: activeTab === "saved" ? "oklch(0.14 0.02 260)" : C_MID,
              }}
            >
              <Bookmark className="h-4 w-4" />
              שמורות
              {savedJobs && savedJobs.length > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: activeTab === "saved" ? "oklch(0.14 0.02 260 / 0.2)" : "oklch(0.70 0.18 260 / 0.2)",
                    color: activeTab === "saved" ? "oklch(0.14 0.02 260)" : C_ACCENT,
                  }}
                >
                  {savedJobs.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Filter / Sort bar (applications tab only) ── */}
          <AnimatePresence>
            {activeTab === "applications" && showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* Status filter pills */}
                  {(["all", "pending", "accepted", "rejected"] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                      style={{
                        background: filterStatus === s ? C_ACCENT : C_CARD,
                        color: filterStatus === s ? "oklch(0.14 0.02 260)" : C_MID,
                        border: `1px solid ${filterStatus === s ? C_ACCENT : C_CARD_BORDER}`,
                      }}
                    >
                      {filterLabels[s]}
                    </button>
                  ))}

                  {/* Sort toggle */}
                  <button
                    onClick={() => setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium transition-all mr-auto"
                    style={{
                      background: C_CARD,
                      color: C_MID,
                      border: `1px solid ${C_CARD_BORDER}`,
                    }}
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {sortOrder === "newest" ? "חדש לישן" : "ישן לחדש"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* ── APPLICATIONS TAB ── */}
        {activeTab === "applications" && (
          <>
            {/* Push notification prompt */}
            {push.isSupported && !push.isSubscribed && push.permission !== "denied" && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "oklch(0.55 0.22 260 / 0.08)", border: `1px solid oklch(0.55 0.22 260 / 0.15)` }}
              >
                <Bell className="h-4 w-4 shrink-0" style={{ color: C_ACCENT }} />
                <p className="text-xs flex-1" style={{ color: C_MID }}>
                  הפעל התראות כדי לקבל עדכון מיידי כשמעסיק מגיב למועמדותך
                </p>
                <AppButton
                  size="sm"
                  className="text-xs shrink-0"
                  onClick={push.subscribe}
                  disabled={push.isLoading}
                  style={{ background: C_ACCENT, color: "oklch(0.14 0.02 260)" }}
                >
                  הפעל
                </AppButton>
              </div>
            )}

            {/* Push error */}
            {push.error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{ background: "oklch(0.55 0.22 20 / 0.10)", border: "1px solid oklch(0.55 0.22 20 / 0.25)", color: "oklch(0.75 0.18 20)" }}
              >
                <span className="shrink-0">⚠️</span>
                <span>{push.error}</span>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "oklch(0.55 0.22 260 / 0.12)" }}
                >
                  <Briefcase className="h-8 w-8" style={{ color: C_ACCENT }} />
                </div>
                <p className="text-base font-semibold" style={{ color: C_MID }}>
                  {filterStatus === "all" ? "עדיין לא הגשת מועמדות" : `אין מועמדויות בסטטוס "${filterLabels[filterStatus]}"`}
                </p>
                {filterStatus === "all" && (
                  <>
                    <p className="text-sm text-center" style={{ color: C_FAINT }}>
                      חפש משרות מתאימות והגש מועמדות
                    </p>
                    <AppButton onClick={() => navigate("/find-jobs")}>חפש עבודה</AppButton>
                  </>
                )}
              </div>
            )}

            {/* Application cards */}
            <AnimatePresence>
              {!isLoading && filtered.map((app: MyApplication, idx: number) => {
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
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.04 }}
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
                              : C_ACCENT,
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C_BRIGHT }}>
                          {getCategoryLabel(app.jobTitle ?? "") || app.jobTitle || "משרה"}
                        </p>
                        {app.employerName && (
                          <p className="text-xs truncate" style={{ color: C_FAINT }}>
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
                              color: C_ACCENT,
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
            </AnimatePresence>
          </>
        )}

        {/* ── SAVED JOBS TAB ── */}
        {activeTab === "saved" && (
          <>
            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && (!savedJobs || savedJobs.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "oklch(0.55 0.22 260 / 0.12)" }}
                >
                  <Bookmark className="h-8 w-8" style={{ color: C_ACCENT }} />
                </div>
                <p className="text-base font-semibold" style={{ color: C_MID }}>
                  עדיין לא שמרת משרות
                </p>
                <p className="text-sm text-center" style={{ color: C_FAINT }}>
                  לחץ על אייקון הסימניה בכרטיסי משרות כדי לשמור אותן לאחר כך
                </p>
                <AppButton onClick={() => navigate("/find-jobs")}>חפש עבודה</AppButton>
              </div>
            )}

            {/* Sort bar */}
            {!isLoading && savedJobs && savedJobs.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                <span className="text-xs shrink-0" style={{ color: C_FAINT }}>מיון:</span>
                {([
                  { key: "savedAt", label: "תאריך שמירה" },
                  { key: "salary",  label: "שכר" },
                  { key: "city",    label: "עיר" },
                ] as { key: "savedAt" | "salary" | "city"; label: string }[]).map(({ key, label }) => {
                  const active = savedSortBy === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (active) {
                          setSavedSortDir(d => d === "desc" ? "asc" : "desc");
                        } else {
                          setSavedSortBy(key);
                          setSavedSortDir("desc");
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all"
                      style={{
                        background: active ? C_ACCENT : "oklch(1 0 0 / 0.05)",
                        color: active ? "oklch(0.14 0.02 260)" : C_MID,
                        border: `1px solid ${active ? C_ACCENT : "oklch(1 0 0 / 0.1)"}`,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {label}
                      {active && (
                        <span style={{ fontSize: "0.65rem" }}>
                          {savedSortDir === "desc" ? " ↓" : " ↑"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Saved job cards */}
            <AnimatePresence>
              {!isLoading && savedJobs && sortedSavedJobs.map((job, idx) => {
                const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
                const savedTimeAgo = formatDistanceToNow(new Date(job.savedAt), {
                  addSuffix: true,
                  locale: he,
                });

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04 }}
                    style={{
                      background: isExpired ? "oklch(1 0 0 / 0.02)" : C_CARD,
                      border: `1px solid ${isExpired ? "oklch(1 0 0 / 0.06)" : C_CARD_BORDER}`,
                      borderRadius: "1rem",
                      padding: "1rem",
                      opacity: isExpired ? 0.6 : 1,
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "oklch(0.55 0.22 260 / 0.12)" }}
                      >
                        <Briefcase className="h-5 w-5" style={{ color: C_ACCENT }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate" style={{ color: C_BRIGHT }}>
                            {getCategoryLabel(job.title ?? "") || job.title || "משרה"}
                          </p>
                          {job.isUrgent && (
                            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: "oklch(0.65 0.22 30 / 0.15)", color: "oklch(0.75 0.22 30)", border: "1px solid oklch(0.65 0.22 30 / 0.3)" }}>
                              <Flame className="h-2.5 w-2.5" />
                              דחוף
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: "oklch(1 0 0 / 0.06)", color: C_FAINT, border: `1px solid ${C_CARD_BORDER}` }}>
                              פג תוקף
                            </span>
                          )}
                        </div>
                        {job.businessName && (
                          <p className="text-xs truncate" style={{ color: C_FAINT }}>
                            {job.businessName}
                          </p>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => unsaveMutation.mutate({ jobId: job.id })}
                        disabled={unsaveMutation.isPending}
                        className="p-1.5 rounded-lg transition-all shrink-0"
                        title="הסר מהשמורים"
                        style={{
                          background: "oklch(0.55 0.22 20 / 0.08)",
                          border: "1px solid oklch(0.55 0.22 20 / 0.2)",
                          color: "oklch(0.65 0.22 20)",
                        }}
                      >
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                      {(job.city || job.address) && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: C_FAINT }}>
                          <MapPin className="h-3 w-3" />
                          {job.city ?? job.address}
                        </span>
                      )}
                      {job.salary && (
                        <span className="text-xs" style={{ color: C_FAINT }}>
                          {formatSalary(job.salary, job.salaryType ?? "hourly")}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: C_FAINT }}>
                        <Bookmark className="h-3 w-3" />
                        נשמר {savedTimeAgo}
                      </span>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-between mt-2">
                      <a
                        href={`/job/${job.id}`}
                        className="text-xs underline"
                        style={{ color: "oklch(0.70 0.18 260 / 0.7)" }}
                      >
                        צפה במשרה
                      </a>
                      {!isExpired && (
                        <AppButton
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => navigate(`/job/${job.id}`)}
                          style={{
                            background: "oklch(0.55 0.22 260 / 0.15)",
                            border: "1px solid oklch(0.55 0.22 260 / 0.3)",
                            color: C_ACCENT,
                          }}
                        >
                          הגש מועמדות
                        </AppButton>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

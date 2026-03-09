import { useEffect, useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
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
  Search, ChevronLeft,
} from "lucide-react";
import { getCategoryLabel, formatSalary } from "@shared/categories";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
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
    label: "התקבלת!",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    bg: "oklch(0.65 0.22 160 / 0.12)",
    color: "oklch(0.52 0.22 150)",
    border: "oklch(0.65 0.22 160 / 0.30)",
  },
  rejected: {
    label: "לא התקבלת",
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "oklch(0.93 0.02 91.6)",
    color: "oklch(0.58 0.02 100)",
    border: "oklch(0.87 0.04 84.0)",
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
    <div style={{ width, height, borderRadius: rounded, background: "oklch(0.89 0.05 84.0 / 0.6)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <motion.div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, oklch(0.95 0.03 91.6 / 0.8) 40%, white 50%, oklch(0.95 0.03 91.6 / 0.8) 60%, transparent 100%)",
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
    <div style={{
      background: "white",
      border: "1px solid oklch(0.87 0.04 84.0)",
      borderRadius: "1rem",
      padding: "1rem",
      boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
    }}>
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

  const { data: savedJobs, isLoading: savedLoading } = trpc.savedJobs.getSavedJobs.useQuery(undefined, {
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--page-bg)" }}>
        <BrandLoader />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6" style={{ background: "var(--page-bg)" }} dir="rtl">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.38 0.07 125.0 / 0.10)" }}
        >
          <Briefcase className="h-8 w-8" style={{ color: "oklch(0.38 0.07 125.0)" }} />
        </div>
        <p className="text-base font-semibold text-center" style={{ color: "var(--text-primary)" }}>
          יש להתחבר כדי לצפות במועמדויות
        </p>
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
    <div className="min-h-screen pb-20" style={{ background: "var(--page-bg)" }} dir="rtl">

      {/* ── Page header banner ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Decorative dots */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{ position: "absolute", top: 12, left: 20, width: 80, height: 80, borderRadius: "50%", background: "oklch(0.55 0.09 122 / 0.15)" }} />
          <div style={{ position: "absolute", bottom: -20, right: 40, width: 120, height: 120, borderRadius: "50%", background: "oklch(0.55 0.09 122 / 0.10)" }} />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-4 pt-5 pb-5">
          {/* Back button + title */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
              style={{ background: "oklch(1 0 0 / 0.12)", color: "oklch(0.97 0.02 91)" }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1
                className="text-xl font-black leading-tight"
                style={{ color: "oklch(0.97 0.02 91)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
              >
                {activeTab === "applications" ? "המועמדויות שלי" : "משרות ששמרתי"}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.97 0.02 91 / 0.65)" }}>
                {activeTab === "applications"
                  ? applications ? `${applications.length} מועמדויות סה"כ` : "טוען..."
                  : savedJobs ? `${savedJobs.length} משרות שמורות` : "טוען..."}
              </p>
            </div>

            {/* Push notification toggle */}
            {activeTab === "applications" && push.isSupported && (
              <button
                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                disabled={push.isLoading}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{
                  background: push.isSubscribed ? "oklch(0.65 0.22 160 / 0.25)" : "oklch(1 0 0 / 0.12)",
                  color: push.isSubscribed ? "oklch(0.65 0.22 160)" : "oklch(0.97 0.02 91 / 0.70)",
                }}
                title={push.isSubscribed ? "בטל התראות" : "הפעל התראות"}
              >
                {push.isSubscribed ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
              </button>
            )}

            {/* Filter toggle */}
            {activeTab === "applications" && (
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{
                  background: showFilters ? "oklch(0.82 0.15 80.8 / 0.25)" : "oklch(1 0 0 / 0.12)",
                  color: showFilters ? "oklch(0.82 0.15 80.8)" : "oklch(0.97 0.02 91 / 0.70)",
                }}
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Tab switcher ── */}
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{ background: "oklch(1 0 0 / 0.10)", border: "1px solid oklch(1 0 0 / 0.15)" }}
          >
            <button
              onClick={() => navigate("/my-applications")}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2.5 px-3 rounded-xl transition-all"
              style={{
                background: activeTab === "applications"
                  ? "oklch(0.82 0.15 80.8)"
                  : "transparent",
                color: activeTab === "applications"
                  ? "oklch(0.22 0.03 122.3)"
                  : "oklch(0.97 0.02 91 / 0.70)",
                boxShadow: activeTab === "applications"
                  ? "0 2px 8px oklch(0.68 0.14 80.8 / 0.35)"
                  : "none",
              }}
            >
              <Briefcase className="h-4 w-4" />
              מועמדויות
              {applications && applications.length > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: activeTab === "applications"
                      ? "oklch(0.22 0.03 122.3 / 0.15)"
                      : "oklch(1 0 0 / 0.15)",
                    color: activeTab === "applications"
                      ? "oklch(0.22 0.03 122.3)"
                      : "oklch(0.97 0.02 91)",
                  }}
                >
                  {applications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/my-applications?tab=saved")}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2.5 px-3 rounded-xl transition-all"
              style={{
                background: activeTab === "saved"
                  ? "oklch(0.82 0.15 80.8)"
                  : "transparent",
                color: activeTab === "saved"
                  ? "oklch(0.22 0.03 122.3)"
                  : "oklch(0.97 0.02 91 / 0.70)",
                boxShadow: activeTab === "saved"
                  ? "0 2px 8px oklch(0.68 0.14 80.8 / 0.35)"
                  : "none",
              }}
            >
              <Bookmark className="h-4 w-4" />
              שמורות
              {savedJobs && savedJobs.length > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: activeTab === "saved"
                      ? "oklch(0.22 0.03 122.3 / 0.15)"
                      : "oklch(1 0 0 / 0.15)",
                    color: activeTab === "saved"
                      ? "oklch(0.22 0.03 122.3)"
                      : "oklch(0.97 0.02 91)",
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
                <div className="flex flex-wrap gap-2 pt-3">
                  {(["all", "pending", "accepted", "rejected"] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                      style={{
                        background: filterStatus === s
                          ? "oklch(0.82 0.15 80.8)"
                          : "oklch(1 0 0 / 0.12)",
                        color: filterStatus === s
                          ? "oklch(0.22 0.03 122.3)"
                          : "oklch(0.97 0.02 91 / 0.75)",
                        border: `1px solid ${filterStatus === s ? "oklch(0.82 0.15 80.8)" : "oklch(1 0 0 / 0.20)"}`,
                      }}
                    >
                      {filterLabels[s]}
                    </button>
                  ))}
                  <button
                    onClick={() => setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all mr-auto"
                    style={{
                      background: "oklch(1 0 0 / 0.12)",
                      color: "oklch(0.97 0.02 91 / 0.75)",
                      border: "1px solid oklch(1 0 0 / 0.20)",
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

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* ── APPLICATIONS TAB ── */}
        {activeTab === "applications" && (
          <>
            {/* Push notification prompt */}
            {push.isSupported && !push.isSubscribed && push.permission !== "denied" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{
                  background: "white",
                  border: "1px solid oklch(0.87 0.04 84.0)",
                  boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
                }}
              >
                <div
                  className="size-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.38 0.07 125.0 / 0.10)" }}
                >
                  <Bell className="h-4 w-4" style={{ color: "oklch(0.38 0.07 125.0)" }} />
                </div>
                <p className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>
                  הפעל התראות כדי לקבל עדכון מיידי כשמעסיק מגיב למועמדותך
                </p>
                <button
                  onClick={push.subscribe}
                  disabled={push.isLoading}
                  className="text-xs px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all"
                  style={{
                    background: "oklch(0.38 0.07 125.0)",
                    color: "oklch(0.97 0.02 91)",
                  }}
                >
                  הפעל
                </button>
              </motion.div>
            )}

            {/* Push error */}
            {push.error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{
                  background: "oklch(0.65 0.22 25 / 0.08)",
                  border: "1px solid oklch(0.65 0.22 25 / 0.20)",
                  color: "oklch(0.60 0.22 25)",
                }}
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
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "oklch(0.38 0.07 125.0 / 0.08)", border: "1px solid oklch(0.38 0.07 125.0 / 0.12)" }}
                >
                  <Briefcase className="h-9 w-9" style={{ color: "oklch(0.38 0.07 125.0)" }} />
                </div>
                <div className="text-center">
                  <p className="text-base font-black mb-1" style={{ color: "var(--text-primary)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}>
                    {filterStatus === "all" ? "עדיין לא הגשת מועמדות" : `אין מועמדויות בסטטוס "${filterLabels[filterStatus]}"`}
                  </p>
                  {filterStatus === "all" && (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      חפש משרות מתאימות והגש מועמדות
                    </p>
                  )}
                </div>
                {filterStatus === "all" && (
                  <motion.button
                    onClick={() => navigate("/find-jobs")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                      color: "oklch(0.97 0.02 91)",
                      boxShadow: "0 4px 16px oklch(0.28 0.06 122 / 0.30)",
                    }}
                  >
                    <Search className="h-4 w-4" />
                    חפש עבודה
                    <ChevronLeft className="h-4 w-4 opacity-60" />
                  </motion.button>
                )}
              </motion.div>
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
                        ? "oklch(0.65 0.22 160 / 0.05)"
                        : "white",
                      border: isAccepted
                        ? "1px solid oklch(0.65 0.22 160 / 0.20)"
                        : "1px solid oklch(0.87 0.04 84.0)",
                      borderRadius: "1rem",
                      padding: "1rem",
                      boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
                      opacity: isRejected ? 0.70 : 1,
                    }}
                  >
                    {/* Top row: icon + title + status badge */}
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isAccepted
                            ? "oklch(0.65 0.22 160 / 0.12)"
                            : "oklch(0.38 0.07 125.0 / 0.08)",
                        }}
                      >
                        <Briefcase
                          className="h-5 w-5"
                          style={{
                            color: isAccepted
                              ? "oklch(0.52 0.22 150)"
                              : "oklch(0.38 0.07 125.0)",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {getCategoryLabel(app.jobTitle ?? "") || app.jobTitle || "משרה"}
                        </p>
                        {app.employerName && (
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {app.employerName}
                          </p>
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

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                      {(app.jobCity || app.jobAddress) && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          <MapPin className="h-3 w-3" />
                          {app.jobCity ?? app.jobAddress}
                        </span>
                      )}
                      {app.jobSalary && (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "oklch(0.65 0.13 76.7)" }}>
                          {formatSalary(app.jobSalary, app.jobSalaryType ?? "hourly")}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                      </span>
                    </div>

                    {/* Message */}
                    {app.message && (
                      <p
                        className="text-xs italic mb-2 line-clamp-2 px-3 py-2 rounded-lg"
                        style={{
                          color: "var(--text-secondary)",
                          background: "oklch(0.93 0.03 91.6)",
                          borderRight: "3px solid oklch(0.75 0.12 76.7)",
                        }}
                      >
                        "{app.message}"
                      </p>
                    )}

                    {/* Accepted: show contact buttons */}
                    {isAccepted && app.contactRevealed && app.workerPhone && (
                      <div className="flex gap-2 mt-3">
                        <a href={`tel:${app.workerPhone}`} className="flex-1">
                          <button
                            className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
                            style={{
                              background: "oklch(0.38 0.07 125.0 / 0.08)",
                              border: "1px solid oklch(0.38 0.07 125.0 / 0.20)",
                              color: "oklch(0.38 0.07 125.0)",
                            }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            התקשר
                          </button>
                        </a>
                        <a
                          href={`https://wa.me/${app.workerPhone.replace(/\D/g, "")}`}
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
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </button>
                        </a>
                      </div>
                    )}

                    {/* Accepted but contact not yet revealed */}
                    {isAccepted && !app.contactRevealed && (
                      <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.52 0.22 150)" }}>
                        ✓ התקבלת! המעסיק ייצור איתך קשר בקרוב.
                      </p>
                    )}

                    {/* View job link */}
                    <div className="mt-2 text-left">
                      <a
                        href={`/job/${app.jobId}`}
                        className="text-xs font-medium underline underline-offset-2"
                        style={{ color: "oklch(0.50 0.07 125.0)" }}
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
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: "oklch(0.38 0.07 125.0 / 0.08)", border: "1px solid oklch(0.38 0.07 125.0 / 0.12)" }}
                >
                  <Bookmark className="h-9 w-9" style={{ color: "oklch(0.38 0.07 125.0)" }} />
                </div>
                <div className="text-center">
                  <p className="text-base font-black mb-1" style={{ color: "var(--text-primary)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}>
                    עדיין לא שמרת משרות
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    לחץ על אייקון הסימניה בכרטיסי משרות כדי לשמור אותן לאחר כך
                  </p>
                </div>
                <motion.button
                  onClick={() => navigate("/find-jobs")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                    color: "oklch(0.97 0.02 91)",
                    boxShadow: "0 4px 16px oklch(0.28 0.06 122 / 0.30)",
                  }}
                >
                  <Search className="h-4 w-4" />
                  חפש עבודה
                  <ChevronLeft className="h-4 w-4 opacity-60" />
                </motion.button>
              </motion.div>
            )}

            {/* Sort bar */}
            {!isLoading && savedJobs && savedJobs.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                <span className="text-xs shrink-0 font-medium" style={{ color: "var(--text-muted)" }}>מיון:</span>
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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all font-semibold"
                      style={{
                        background: active
                          ? "oklch(0.38 0.07 125.0)"
                          : "white",
                        color: active
                          ? "oklch(0.97 0.02 91)"
                          : "var(--text-secondary)",
                        border: `1px solid ${active ? "oklch(0.38 0.07 125.0)" : "oklch(0.87 0.04 84.0)"}`,
                        boxShadow: active ? "0 2px 8px oklch(0.28 0.06 122 / 0.20)" : "none",
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
                      background: "white",
                      border: `1px solid ${isExpired ? "oklch(0.87 0.04 84.0)" : "oklch(0.87 0.04 84.0)"}`,
                      borderRadius: "1rem",
                      padding: "1rem",
                      boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.06)",
                      opacity: isExpired ? 0.60 : 1,
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "oklch(0.38 0.07 125.0 / 0.08)" }}
                      >
                        <Briefcase className="h-5 w-5" style={{ color: "oklch(0.38 0.07 125.0)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {getCategoryLabel(job.title ?? "") || job.title || "משרה"}
                          </p>
                          {job.isUrgent && (
                            <span
                              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: "oklch(0.65 0.22 25 / 0.10)",
                                color: "oklch(0.60 0.22 25)",
                                border: "1px solid oklch(0.65 0.22 25 / 0.25)",
                              }}
                            >
                              <Flame className="h-2.5 w-2.5" />
                              דחוף
                            </span>
                          )}
                          {isExpired && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: "oklch(0.93 0.02 91.6)",
                                color: "var(--text-faint)",
                                border: "1px solid oklch(0.87 0.04 84.0)",
                              }}
                            >
                              פג תוקף
                            </span>
                          )}
                        </div>
                        {job.businessName && (
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
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
                          background: "oklch(0.65 0.22 25 / 0.06)",
                          border: "1px solid oklch(0.65 0.22 25 / 0.15)",
                          color: "oklch(0.60 0.22 25)",
                        }}
                      >
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                      {(job.city || job.address) && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          <MapPin className="h-3 w-3" />
                          {job.city ?? job.address}
                        </span>
                      )}
                      {job.salary && (
                        <span className="text-xs font-semibold" style={{ color: "oklch(0.65 0.13 76.7)" }}>
                          {formatSalary(job.salary, job.salaryType ?? "hourly")}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
                        <Bookmark className="h-3 w-3" />
                        נשמר {savedTimeAgo}
                      </span>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={`/job/${job.id}`}
                        className="text-xs font-medium underline underline-offset-2"
                        style={{ color: "oklch(0.50 0.07 125.0)" }}
                      >
                        צפה במשרה
                      </a>
                      {!isExpired && (
                        <motion.button
                          onClick={() => navigate(`/job/${job.id}`)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-bold transition-all"
                          style={{
                            background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                            color: "oklch(0.97 0.02 91)",
                            boxShadow: "0 2px 8px oklch(0.28 0.06 122 / 0.25)",
                          }}
                        >
                          הגש מועמדות
                          <ChevronLeft className="h-3.5 w-3.5 opacity-70" />
                        </motion.button>
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

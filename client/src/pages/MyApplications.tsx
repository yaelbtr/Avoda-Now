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
  Bell, BellOff, Bookmark, BookmarkX, Flame,
  Search, ChevronLeft, ArrowUpDown, Loader2, Send, Share2,
} from "lucide-react";
import { getCategoryLabel, formatSalary } from "@shared/categories";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { JobCard } from "@/components/JobCard";
import JobBottomSheet from "@/components/JobBottomSheet";

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

type AppStatus = "pending" | "viewed" | "accepted" | "rejected";
type AppSortBy = "jobDate" | "salary" | "city";

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
  // Applications filter + sort
  const [statusFilter, setStatusFilter] = useState<AppStatus[]>([]);
  const [appSortBy, setAppSortBy] = useState<AppSortBy>("jobDate");
  const [appSortDir, setAppSortDir] = useState<"desc" | "asc">("desc");
  const [statusDropOpen, setStatusDropOpen] = useState(false);

  // Saved jobs sort
  type SavedSortBy = "savedAt" | "salary" | "city";
  const [savedSortBy, setSavedSortBy] = useState<SavedSortBy>("savedAt");
  const [savedSortDir, setSavedSortDir] = useState<"desc" | "asc">("desc");

  // Quick-apply modal state
  const [applyJobId, setApplyJobId] = useState<number | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());

  // Bottom sheet state
  type BottomSheetJob = {
    id: number; title: string; category: string; address: string;
    city?: string | null; salary?: string | null; salaryType: string;
    contactPhone: string | null; businessName?: string | null;
    startTime: string; startDateTime?: Date | string | null;
    isUrgent?: boolean | null; workersNeeded: number;
    createdAt: Date | string; expiresAt?: Date | string | null;
    distance?: number; description?: string | null;
  };
  const [bottomSheetJob, setBottomSheetJob] = useState<BottomSheetJob | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

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

  // Quick-apply mutation
  const applyMutation = trpc.jobs.applyToJob.useMutation({
    onSuccess: (_, vars) => {
      setAppliedJobIds(prev => new Set(Array.from(prev).concat(vars.jobId)));
      setApplyJobId(null);
      setApplyMessage("");
      utils.jobs.myApplications.invalidate();
      toast.success("המועמדות נשלחה! המעסיק יקבל הודעה.");
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        setAppliedJobIds(prev => new Set(Array.from(prev).concat(applyJobId!)));
        setApplyJobId(null);
        toast.info("כבר הגשת מועמדות למשרה זו");
      } else {
        toast.error(err.message ?? "שגיאה בשליחת המועמדות");
      }
    },
  });

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

    // Multi-status filter
    if (statusFilter.length > 0) {
      list = list.filter((a) => {
        const s = a.status as AppStatus;
        // "pending" pill covers both pending + viewed
        if (statusFilter.includes("pending") && (s === "pending" || s === "viewed")) return true;
        return statusFilter.includes(s);
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (appSortBy === "jobDate") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (appSortBy === "salary") {
        const sa = parseFloat(a.jobSalary ?? "0") || 0;
        const sb = parseFloat(b.jobSalary ?? "0") || 0;
        cmp = sa - sb;
      } else if (appSortBy === "city") {
        cmp = (a.jobCity ?? "").localeCompare(b.jobCity ?? "", "he");
      }
      return appSortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [applications, statusFilter, appSortBy, appSortDir]);

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
        {/* Hero background image */}
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/my-applications-hero-iyRXrGMtR7uTEGLVaADSBQ.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          style={{ opacity: 0.75 }}
        />
        {/* Dark gradient overlay for text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to left, oklch(0.28 0.06 122 / 0.0) 0%, oklch(0.28 0.06 122 / 0.30) 45%, oklch(0.28 0.06 122 / 0.72) 100%)",
          }}
        />

        <div className="relative z-10 max-w-lg mx-auto px-4 pt-5 pb-5">
          {/* Back button + title */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
              style={{ background: "oklch(1 0 0 / 0.18)", color: "white" }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1
                className="text-xl font-black leading-tight"
                style={{ color: "white", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}
              >
                {activeTab === "applications" ? "המועמדויות שלי" : "משרות ששמרתי"}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.30)" }}>
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
                  background: push.isSubscribed ? "oklch(0.65 0.22 160 / 0.30)" : "oklch(1 0 0 / 0.18)",
                  color: push.isSubscribed ? "oklch(0.85 0.18 160)" : "rgba(255,255,255,0.85)",
                }}
                title={push.isSubscribed ? "בטל התראות" : "הפעל התראות"}
              >
                {push.isSubscribed ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
              </button>
            )}


          </div>

          {/* ── Tab switcher ── */}
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{ background: "oklch(0.93 0.02 100)", border: "1px solid oklch(0.89 0.03 100)" }}
          >
            {/* Applications tab */}
            <button
              onClick={() => navigate("/my-applications")}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl transition-all"
              style={activeTab === "applications"
                ? { background: "#4F583B", color: "white", boxShadow: "0 2px 8px rgba(79,88,59,0.35)" }
                : { background: "transparent", color: "oklch(0.40 0.04 100)" }
              }
            >
              <Briefcase className="h-4 w-4" />
              מועמדויות
            </button>
            {/* Saved tab */}
            <button
              onClick={() => navigate("/my-applications?tab=saved")}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl transition-all"
              style={activeTab === "saved"
                ? { background: "#4F583B", color: "white", boxShadow: "0 2px 8px rgba(79,88,59,0.35)" }
                : { background: "transparent", color: "oklch(0.40 0.04 100)" }
              }
            >
              <Bookmark className="h-4 w-4" />
              שמורות
            </button>
          </div>

          {/* Stats row */}
          {(applications || savedJobs) && (
            <div className="flex items-center justify-center gap-5 mt-4 pt-3" style={{ borderTop: "1px solid oklch(1 0 0 / 0.15)" }}>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black" style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
                  {applications ? applications.length : "–"}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>מועמדויות</span>
              </div>
              <div style={{ width: 1, height: 32, background: "oklch(1 0 0 / 0.20)" }} />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black" style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
                  {savedJobs ? savedJobs.length : "–"}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>משרות שמורות</span>
              </div>
              {applications && applications.filter(a => a.status === "accepted").length > 0 && (
                <>
                  <div style={{ width: 1, height: 32, background: "oklch(1 0 0 / 0.20)" }} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xl font-black" style={{ color: "oklch(0.85 0.18 160)", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
                      {applications.filter(a => a.status === "accepted").length}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>התקבלתי</span>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* ── APPLICATIONS TAB ── */}
        {activeTab === "applications" && (
          <>
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
                    {statusFilter.length === 0 ? "עדיין לא הגשת מועמדות" : "אין מועמדויות לסטטוס הנבחר"}
                  </p>
                  {statusFilter.length === 0 && (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      חפש משרות מתאימות והגש מועמדות
                    </p>
                  )}
                </div>
                {statusFilter.length === 0 && (
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

            {/* Filter + Sort bar */}
            {!isLoading && applications && applications.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                <span className="text-xs shrink-0 font-medium" style={{ color: "var(--text-muted)" }}>מיון:</span>

                {/* Sort pills */}
                {([
                  { key: "jobDate", label: "תאריך עבודה" },
                  { key: "salary",  label: "שכר" },
                  { key: "city",    label: "עיר" },
                ] as { key: AppSortBy; label: string }[]).map(({ key, label }) => {
                  const active = appSortBy === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (active) setAppSortDir(d => d === "desc" ? "asc" : "desc");
                        else { setAppSortBy(key); setAppSortDir("desc"); }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all font-semibold"
                      style={active
                        ? { background: "oklch(0.38 0.07 125.0)", color: "oklch(0.97 0.02 91)", border: "1px solid oklch(0.38 0.07 125.0)", boxShadow: "0 2px 8px oklch(0.28 0.06 122 / 0.20)" }
                        : { background: "white", color: "var(--text-secondary)", border: "1px solid oklch(0.87 0.04 84.0)" }
                      }
                    >
                      {label}
                      {active && <span style={{ fontSize: "0.65rem" }}>{appSortDir === "desc" ? " ↓" : " ↑"}</span>}
                    </button>
                  );
                })}

                {/* Status dropdown multi-checkbox */}
                <div className="relative mr-auto" dir="rtl">
                  <button
                    onClick={() => setStatusDropOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all font-semibold"
                    style={statusFilter.length > 0
                      ? { background: "oklch(0.38 0.07 125.0)", color: "oklch(0.97 0.02 91)", border: "1px solid oklch(0.38 0.07 125.0)", boxShadow: "0 2px 8px oklch(0.28 0.06 122 / 0.20)" }
                      : { background: "white", color: "var(--text-secondary)", border: "1px solid oklch(0.87 0.04 84.0)" }
                    }
                  >
                    סטטוס
                    {statusFilter.length > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                        style={{ background: "rgba(255,255,255,0.25)", color: "inherit" }}>
                        {statusFilter.length}
                      </span>
                    )}
                    <span style={{ fontSize: "0.6rem" }}>{statusDropOpen ? "▲" : "▼"}</span>
                  </button>

                  <AnimatePresence>
                    {statusDropOpen && (
                      <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-10" onClick={() => setStatusDropOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-1.5 z-20 rounded-2xl p-2 min-w-[160px]"
                          style={{ background: "white", border: "1px solid oklch(0.87 0.04 84.0)", boxShadow: "0 8px 24px oklch(0.28 0.06 122 / 0.14)" }}
                        >
                          {([
                            { key: "pending",  label: "ממתינות / נצפה" },
                            { key: "accepted", label: "התקבלתי" },
                            { key: "rejected", label: "לא התקבלתי" },
                          ] as { key: AppStatus; label: string }[]).map(({ key, label }) => {
                            const checked = statusFilter.includes(key);
                            return (
                              <button
                                key={key}
                                onClick={() => setStatusFilter(prev =>
                                  checked ? prev.filter(s => s !== key) : [...prev, key]
                                )}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-right"
                                style={checked
                                  ? { background: "oklch(0.38 0.07 125.0 / 0.10)", color: "oklch(0.30 0.07 125.0)" }
                                  : { background: "transparent", color: "var(--text-secondary)" }
                                }
                              >
                                <span
                                  className="flex items-center justify-center w-4 h-4 rounded shrink-0"
                                  style={checked
                                    ? { background: "oklch(0.38 0.07 125.0)", border: "1.5px solid oklch(0.38 0.07 125.0)" }
                                    : { background: "white", border: "1.5px solid oklch(0.80 0.04 84.0)" }
                                  }
                                >
                                  {checked && (
                                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </span>
                                {label}
                              </button>
                            );
                          })}
                          {statusFilter.length > 0 && (
                            <button
                              onClick={() => { setStatusFilter([]); setStatusDropOpen(false); }}
                              className="w-full mt-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                              style={{ background: "oklch(0.93 0.02 100)", color: "var(--text-muted)" }}
                            >
                              נקה הכל
                            </button>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
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

                    {/* View job link + share */}
                    <div className="mt-2 flex items-center gap-2 text-left">
                      <button
                        onClick={() => {
                          setBottomSheetJob({
                            id: app.jobId,
                            title: app.jobTitle ?? "משרה",
                            category: app.jobTitle ?? "other",
                            address: app.jobAddress ?? "",
                            city: app.jobCity,
                            salary: app.jobSalary,
                            salaryType: app.jobSalaryType ?? "hourly",
                            contactPhone: null,
                            businessName: app.employerName,
                            startTime: "flexible",
                            workersNeeded: 1,
                            createdAt: app.createdAt,
                          });
                          setBottomSheetOpen(true);
                        }}
                        className="text-xs font-medium underline underline-offset-2"
                        style={{ color: "oklch(0.50 0.07 125.0)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        צפה במשרה
                      </button>
                      <button
                        onClick={async () => {
                          const url = `${window.location.origin}/job/${app.jobId}`;
                          const title = app.jobTitle ?? "משרה";
                          const parts = [title];
                          if (app.employerName) parts.push(app.employerName);
                          if (app.jobCity) parts.push(`ב${app.jobCity}`);
                          if (app.jobSalary) parts.push(formatSalary(app.jobSalary, app.jobSalaryType ?? "hourly"));
                          const text = parts.join(" | ");
                          if (navigator.share) {
                            try { await navigator.share({ title, text, url }); }
                            catch {}
                          } else {
                            await navigator.clipboard.writeText(url);
                            toast.success("קישור המשרה הועתק ללוח");
                          }
                        }}
                        className="p-1 rounded-lg transition-all hover:bg-[oklch(0.38_0.07_125.0_/_0.08)]"
                        title="שתף משרה"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.38 0.07 125.0)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
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
            {!isLoading && savedJobs && savedJobs.length > 0 && (
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

            {/* Push notification prompt — saved tab */}
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
                  הפעל התראות כדי לקבל עדכון מיידי כשמעסיק מפרסם משרות חדשות
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

            {/* Saved job cards */}
            <AnimatePresence>
              {!isLoading && savedJobs && sortedSavedJobs.map((job, idx) => {
                return (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.04 }}>
                    <JobCard
                      job={{
                        id: job.id,
                        title: job.title ?? "",
                        businessName: job.businessName ?? undefined,
                        category: job.category ?? "",
                        city: job.city ?? undefined,
                        address: job.address ?? "",
                        salary: job.salary ?? undefined,
                        salaryType: (job.salaryType as any) ?? "hourly",
                        startDateTime: job.startDateTime ?? undefined,
                        startTime: job.startTime ?? undefined,
                        expiresAt: job.expiresAt ?? undefined,
                        isUrgent: job.isUrgent ?? false,
                        contactPhone: job.contactPhone ?? undefined,
                        workersNeeded: (job as any).workersNeeded ?? 1,
                        createdAt: (job as any).createdAt ?? new Date().toISOString(),
                      }}
                      isSaved
                      isApplied={appliedJobIds.has(job.id)}
                      onUnsave={(jobId) => unsaveMutation.mutate({ jobId })}
                      onApply={(jobId, message, origin) =>
                        applyMutation.mutate({ jobId, message, origin })
                      }
                      isApplyPending={applyMutation.isPending}
                      onCardClick={(j) => {
                        setBottomSheetJob({
                          id: j.id,
                          title: j.title,
                          category: j.category,
                          address: j.address,
                          city: j.city,
                          salary: j.salary,
                          salaryType: j.salaryType,
                          contactPhone: j.contactPhone ?? null,
                          businessName: j.businessName,
                          startTime: j.startTime,
                          startDateTime: j.startDateTime,
                          isUrgent: j.isUrgent,
                          workersNeeded: j.workersNeeded,
                          createdAt: j.createdAt,
                          expiresAt: j.expiresAt,
                        });
                        setBottomSheetOpen(true);
                      }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
         )}
      </div>

      {/* Job Details Bottom Sheet */}
      <JobBottomSheet
        job={bottomSheetJob}
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}

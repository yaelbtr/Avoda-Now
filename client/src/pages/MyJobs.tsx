import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import { AppButton } from "@/components/ui";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
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
import BrandLoader from "@/components/BrandLoader";
import {
  Briefcase, PlusCircle, Trash2, CheckCircle, XCircle,
  Clock, MapPin, Users, DollarSign, Eye, Zap,
  ChevronDown, ChevronUp, Phone, MessageCircle, UserCheck, UserX, Sparkles,
  ChevronRight,
} from "lucide-react";
import { getCategoryIcon, getCategoryLabel, formatSalary, getStartTimeLabel } from "@shared/categories";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; dot?: string }> = {
  active: {
    label: "פעיל",
    bg: "oklch(0.94 0.08 160 / 0.15)",
    color: "oklch(0.38 0.15 160)",
    border: "oklch(0.75 0.12 160 / 0.40)",
    dot: "oklch(0.55 0.20 160)",
  },
  closed: {
    label: "סגור",
    bg: "oklch(0.93 0.01 120 / 0.50)",
    color: "oklch(0.45 0.02 120)",
    border: "oklch(0.82 0.02 120)",
  },
  expired: {
    label: "פג תוקף",
    bg: "oklch(0.95 0.08 65 / 0.15)",
    color: "oklch(0.50 0.18 65)",
    border: "oklch(0.78 0.14 65 / 0.40)",
  },
  under_review: {
    label: "בבדיקה",
    bg: "oklch(0.93 0.06 250 / 0.15)",
    color: "oklch(0.42 0.18 250)",
    border: "oklch(0.72 0.14 250 / 0.40)",
  },
};

// ── Card style (matches MyApplications light cards) ───────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid oklch(0.90 0.03 122)",
  borderRadius: "1rem",
  boxShadow: "0 2px 10px oklch(0.35 0.08 122 / 0.06)",
  padding: "1rem",
};

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Shimmer({ width = "100%", height = 14, rounded = "0.5rem" }: {
  width?: string | number; height?: number; rounded?: string;
}) {
  return (
    <div style={{ width, height, borderRadius: rounded, background: "oklch(0.92 0.01 120)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <motion.div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, oklch(0.97 0.005 120) 40%, oklch(1 0 0) 50%, oklch(0.97 0.005 120) 60%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function MyJobCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={cardStyle}
    >
      <div className="flex items-start gap-3 mb-3">
        <Shimmer width={44} height={44} rounded="0.75rem" />
        <div className="flex-1 space-y-2">
          <Shimmer width="55%" height={15} />
          <Shimmer width="30%" height={11} />
        </div>
        <Shimmer width={56} height={22} rounded="9999px" />
      </div>
      <div className="flex gap-4 mb-3">
        <Shimmer width={80} height={11} />
        <Shimmer width={70} height={11} />
        <Shimmer width={60} height={11} />
      </div>
      <div className="flex gap-2">
        <Shimmer width={64} height={32} rounded="0.75rem" />
        <Shimmer width={90} height={32} rounded="0.75rem" />
        <Shimmer width={56} height={32} rounded="0.75rem" />
      </div>
    </motion.div>
  );
}

// ── Applicants Panel ──────────────────────────────────────────────────────────
type Applicant = {
  id: number;
  workerName: string | null;
  workerBio: string | null;
  workerPreferredCity: string | null;
  workerPhone: string | null;
  status: string;
  contactRevealed: boolean;
  message: string | null;
  createdAt: Date;
};

function ApplicantsPanel({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const { data: applicants, isLoading } = trpc.jobs.getApplications.useQuery({ jobId });

  const updateStatus = trpc.jobs.updateApplicationStatus.useMutation({
    onSuccess: (data, vars) => {
      utils.jobs.getApplications.invalidate({ jobId });
      if (vars.action === "accept") {
        toast.success("המועמד התקבל! פרטי הקשר נחשפו.");
      } else {
        toast.success("המועמד נדחה.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="pt-3 space-y-2">
        {[0, 1].map((i) => (
          <div key={i} style={{ background: "oklch(0.96 0.01 122)", borderRadius: "0.75rem", padding: "0.75rem" }}>
            <div className="flex gap-3">
              <Shimmer width={32} height={32} rounded="50%" />
              <div className="flex-1 space-y-1.5">
                <Shimmer width="50%" height={12} />
                <Shimmer width="30%" height={10} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!applicants || applicants.length === 0) {
    return (
      <div className="pt-3 text-center py-4">
        <p className="text-xs" style={{ color: "oklch(0.55 0.03 120)" }}>אין מועמדים עדיין</p>
      </div>
    );
  }

  return (
    <div className="pt-3 space-y-2">
      {applicants.map((app: Applicant) => {
        const isPending = app.status === "pending" || app.status === "viewed";
        const isAccepted = app.status === "accepted";
        const isRejected = app.status === "rejected";
        const isMutating = updateStatus.isPending && updateStatus.variables?.id === app.id;

        return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: isAccepted
                ? "oklch(0.68 0.20 160 / 0.07)"
                : isRejected
                  ? "oklch(0.96 0.01 120)"
                  : "oklch(0.97 0.01 122)",
              border: isAccepted
                ? "1px solid oklch(0.68 0.20 160 / 0.25)"
                : isRejected
                  ? "1px solid oklch(0.90 0.02 120)"
                  : "1px solid oklch(0.90 0.02 122)",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              opacity: isRejected ? 0.55 : 1,
            }}
          >
            {/* Worker info row */}
            <div className="flex items-start gap-2.5 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  background: isAccepted ? "oklch(0.68 0.20 160 / 0.18)" : "oklch(0.50 0.14 85 / 0.12)",
                  color: isAccepted ? "oklch(0.38 0.15 160)" : "oklch(0.38 0.07 125.0)",
                }}
              >
                {app.workerName?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.20 0.04 120)" }}>
                    {app.workerName ?? "עובד"}
                  </span>
                  {isAccepted && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "oklch(0.68 0.20 160 / 0.12)", color: "oklch(0.38 0.15 160)" }}>
                      התקבל
                    </span>
                  )}
                  {isRejected && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "oklch(0.93 0.01 120)", color: "oklch(0.50 0.02 120)" }}>
                      נדחה
                    </span>
                  )}
                </div>
                {app.workerPreferredCity && (
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "oklch(0.55 0.03 120)" }}>
                    <MapPin className="inline h-2.5 w-2.5" />
                    {app.workerPreferredCity}
                  </p>
                )}
                {app.message && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "oklch(0.40 0.04 120)" }}>
                    "{app.message}"
                  </p>
                )}
              </div>
            </div>

            {/* Contact info (accepted) */}
            {isAccepted && app.contactRevealed && app.workerPhone && (
              <div className="flex gap-2 mt-2">
                <a href={`tel:${app.workerPhone}`} className="flex-1">
                  <AppButton size="sm" className="gap-1.5 text-xs w-full"
                    style={{ background: "oklch(0.50 0.14 85 / 0.10)", border: "1px solid oklch(0.50 0.14 85 / 0.25)", color: "oklch(0.38 0.07 125.0)" }}>
                    <Phone className="h-3.5 w-3.5" />
                    {app.workerPhone}
                  </AppButton>
                </a>
                <a href={`https://wa.me/972${app.workerPhone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                  <AppButton size="sm" className="gap-1.5 text-xs"
                    style={{ background: "oklch(0.68 0.20 160 / 0.10)", border: "1px solid oklch(0.68 0.20 160 / 0.25)", color: "oklch(0.38 0.15 160)" }}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </AppButton>
                </a>
              </div>
            )}

            {/* Actions (pending) */}
            {isPending && (
              <div className="flex gap-2 mt-1">
                <AppButton size="sm" className="gap-1.5 text-xs flex-1" disabled={isMutating}
                  onClick={() => updateStatus.mutate({ id: app.id, action: "accept" })}
                  style={{ background: "oklch(0.68 0.20 160 / 0.10)", border: "1px solid oklch(0.68 0.20 160 / 0.28)", color: "oklch(0.38 0.15 160)" }}>
                  <UserCheck className="h-3.5 w-3.5" />
                  קבל
                </AppButton>
                <AppButton size="sm" className="gap-1.5 text-xs flex-1" disabled={isMutating}
                  onClick={() => updateStatus.mutate({ id: app.id, action: "reject" })}
                  style={{ background: "oklch(0.93 0.01 120)", border: "1px solid oklch(0.85 0.02 120)", color: "oklch(0.45 0.04 120)" }}>
                  <UserX className="h-3.5 w-3.5" />
                  דחה
                </AppButton>
              </div>
            )}
          </motion.div>
        );
      })}
      <div className="pt-2 text-center">
        <a href={`/jobs/${jobId}/applications`} className="text-xs underline" style={{ color: "oklch(0.50 0.14 85)" }}>
          צפה בכל המועמדים בדף מלא →
        </a>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyJobs() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const authQuery = useAuthQuery();
  const { employerLock } = usePlatformSettings();
  const [loginOpen, setLoginOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedApplicants, setExpandedApplicants] = useState<Set<number>>(new Set());
  const [autoExpandDone, setAutoExpandDone] = useState(false);

  useSEO({
    title: "המשרות שלי",
    description: "נהל את המשרות שפרסמת וצפה במועמדים.",
    canonical: "/my-jobs",
    noIndex: true,
  });

  const utils = trpc.useUtils();

  const { data: myJobs, isLoading } = trpc.jobs.myJobsWithPendingCounts.useQuery(undefined, {
    ...authQuery(),
  });

  const markViewed = trpc.jobs.markApplicationsViewed.useMutation({
    onSuccess: () => {
      utils.jobs.totalPendingApplications.invalidate();
      utils.jobs.myJobsWithPendingCounts.invalidate();
    },
  });

  useEffect(() => {
    if (isAuthenticated) markViewed.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Auto-expand applicants section for jobs that have any applicants (runs once on data load)
  useEffect(() => {
    if (!myJobs || autoExpandDone) return;
    const jobsWithApplicants = myJobs
      .filter((j) => ((j as { totalApplicationCount?: number }).totalApplicationCount ?? 0) > 0)
      .map((j) => j.id);
    if (jobsWithApplicants.length > 0) {
      setExpandedApplicants(new Set(jobsWithApplicants));
    }
    setAutoExpandDone(true);
  }, [myJobs, autoExpandDone]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      saveReturnPath();
      setLoginOpen(true);
    }
  }, [loading, isAuthenticated]);

  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => { utils.jobs.myJobsWithPendingCounts.invalidate(); toast.success("סטטוס עודכן"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteJob = trpc.jobs.delete.useMutation({
    onSuccess: () => { utils.jobs.myJobsWithPendingCounts.invalidate(); setDeleteId(null); toast.success("המשרה נמחקה"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleApplicants = (jobId: number) => {
    setExpandedApplicants((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  };

  const activeJobs = useMemo(() => myJobs?.filter((j) => j.status === "active") ?? [], [myJobs]);
  const push = usePushNotifications();

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <BrandLoader size="lg" label="טוען..." />
      </div>
    );
  }

  // ── Employer lock ─────────────────────────────────────────────────────────
  if (employerLock) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-5 px-6"
        style={{ background: "var(--page-bg)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.38 0.07 125.0 / 0.10)" }}>
          <Briefcase className="h-8 w-8" style={{ color: "oklch(0.38 0.07 125.0)" }} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: "oklch(0.20 0.04 120)" }}>ניהול משרות — בקרוב</h2>
          <p className="text-sm" style={{ color: "oklch(0.50 0.04 120)" }}>
            בשלב זה הפלטפורמה פתוחה <strong>לעובדים בלבד</strong>.<br />
            אפשרות ניהול משרות למעסיקים תיפתח בקרוב.
          </p>
        </div>
        <AppButton variant="brand" size="lg" className="gap-2" onClick={() => navigate("/find-jobs")}>
          חפש עבודה
        </AppButton>
      </div>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginModal open={loginOpen} onClose={() => { setLoginOpen(false); navigate("/"); }} />;
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--page-bg)" }} dir="rtl">

      {/* ── Page header banner (matches MyApplications) ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to left, oklch(0.28 0.06 122 / 0.0) 0%, oklch(0.28 0.06 122 / 0.25) 50%, oklch(0.28 0.06 122 / 0.60) 100%)",
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
                המשרות שלי
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.80)", textShadow: "0 1px 3px rgba(0,0,0,0.30)" }}>
                {isLoading ? "טוען..." : `${activeJobs.length}/3 משרות פעילות`}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <AppButton
                variant="brand"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/post-job")}
                style={{ background: "oklch(1 0 0 / 0.18)", border: "1px solid oklch(1 0 0 / 0.30)", color: "white" }}
              >
                <PlusCircle className="h-4 w-4" />
                פרסם משרה
              </AppButton>
            </motion.div>
          </div>

          {/* Stats row */}
          {myJobs && (
            <div className="flex items-center justify-center gap-5 pt-3" style={{ borderTop: "1px solid oklch(1 0 0 / 0.15)" }}>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black" style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
                  {myJobs.length}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>משרות סה"כ</span>
              </div>
              <div style={{ width: 1, height: 32, background: "oklch(1 0 0 / 0.20)" }} />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black" style={{ color: "oklch(0.85 0.18 160)", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
                  {activeJobs.length}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>פעילות</span>
              </div>
              {myJobs.reduce((s, j) => s + ((j as { pendingCount?: number }).pendingCount ?? 0), 0) > 0 && (
                <>
                  <div style={{ width: 1, height: 32, background: "oklch(1 0 0 / 0.20)" }} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xl font-black" style={{ color: "oklch(0.88 0.14 75)", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>
                      {myJobs.reduce((s, j) => s + ((j as { pendingCount?: number }).pendingCount ?? 0), 0)}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>מועמדים חדשים</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* ── Active limit bar ── */}
        <AnimatePresence>
          {!isLoading && activeJobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={cardStyle}
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span style={{ color: "oklch(0.50 0.04 120)" }}>{activeJobs.length} מתוך 3</span>
                <span className="font-semibold" style={{ color: "oklch(0.20 0.04 120)" }}>משרות פעילות</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 6, background: "oklch(0.90 0.02 120)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(activeJobs.length / 3) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  style={{
                    height: "100%", borderRadius: "9999px",
                    background: activeJobs.length >= 3
                      ? "linear-gradient(90deg, oklch(0.65 0.22 25) 0%, oklch(0.60 0.22 15) 100%)"
                      : "linear-gradient(90deg, oklch(0.50 0.14 85) 0%, oklch(0.55 0.20 160) 100%)",
                  }}
                />
              </div>
              {activeJobs.length >= 3 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs mt-2"
                  style={{ color: "oklch(0.55 0.22 25)" }}>
                  הגעת למגבלה — סגור משרה כדי לפרסם חדשה.
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Push notification prompt ── */}
        <AnimatePresence>
          {!isLoading && push.isSupported && !push.isSubscribed && push.permission !== "denied" && (
            <motion.div
              key="push-prompt"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{
                ...cardStyle,
                background: "oklch(0.97 0.04 85 / 0.50)",
                border: "1px solid oklch(0.82 0.12 85 / 0.40)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                  style={{ background: "oklch(0.88 0.14 75 / 0.25)", color: "oklch(0.50 0.18 65)" }}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "oklch(0.25 0.05 120)" }}>קבל התראות על מועמדים חדשים</p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.04 120)" }}>נשלח לך התראה מיד כשמועמד מגיש בקשה</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={push.subscribe}
                  disabled={push.isLoading}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: "oklch(0.50 0.18 65)",
                    color: "white",
                    opacity: push.isLoading ? 0.7 : 1,
                  }}
                >
                  {push.isLoading ? "..." : "הפעל"}
                </motion.button>
              </div>
              {push.error && (
                <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.22 25)" }}>{push.error}</p>
              )}
            </motion.div>
          )}
          {!isLoading && push.isSubscribed && (
            <motion.div
              key="push-active"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{
                background: "oklch(0.94 0.08 160 / 0.15)",
                border: "1px solid oklch(0.75 0.12 160 / 0.30)",
                color: "oklch(0.38 0.15 160)",
              }}
            >
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">התראות פעילות — תקבל עדכון על כל מועמד חדש</span>
              <button
                onClick={push.unsubscribe}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                title="בטל התראות"
              >
                <BellOff className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <MyJobCardSkeleton key={i} delay={i * 0.07} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && (!myJobs || myJobs.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "oklch(0.38 0.07 125.0 / 0.08)", border: "1px solid oklch(0.38 0.07 125.0 / 0.12)" }}
            >
              <Briefcase className="h-10 w-10" style={{ color: "oklch(0.38 0.07 125.0)" }} />
            </motion.div>
            <p className="font-bold text-lg mb-1" style={{ color: "oklch(0.20 0.04 120)" }}>אין לך משרות עדיין</p>
            <p className="text-sm mb-6" style={{ color: "oklch(0.50 0.04 120)" }}>
              פרסם את המשרה הראשונה שלך ומצא עובדים תוך דקות
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <AppButton variant="brand" className="gap-2" onClick={() => navigate("/post-job")}>
                <PlusCircle className="h-4 w-4" />
                פרסם את המשרה הראשונה שלך
              </AppButton>
            </motion.div>
          </motion.div>
        )}

        {/* ── Job cards ── */}
        {!isLoading && myJobs && myJobs.length > 0 && (
          <AnimatePresence mode="popLayout">
            {myJobs.map((job, i) => {
              const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.active;
              const isVolunteer = job.salaryType === "volunteer";
              const expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
              const daysLeft = expiresAt
                ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
                : null;
              const isExpiringSoon = daysLeft !== null && daysLeft <= 1 && job.status === "active";
              const applicantsExpanded = expandedApplicants.has(job.id);
              const pendingCount = (job as { pendingCount?: number }).pendingCount ?? 0;

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  layout
                  style={{
                    ...cardStyle,
                    ...(isExpiringSoon ? { borderColor: "oklch(0.60 0.22 25 / 0.35)" } : {}),
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Category icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{
                          background: "linear-gradient(135deg, oklch(0.94 0.06 85) 0%, oklch(0.90 0.08 75) 100%)",
                          border: "1px solid oklch(0.85 0.08 80)",
                        }}
                      >
                        {getCategoryIcon(job.category)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold truncate text-sm" style={{ color: "oklch(0.20 0.04 120)" }}>
                          {job.title}
                        </h3>
                        <p className="text-xs" style={{ color: "oklch(0.50 0.04 120)" }}>
                          {getCategoryLabel(job.category)}
                        </p>
                      </div>
                    </div>

                  {/* Badges row: status + pending applicants */}
                  <div className="flex flex-col items-end gap-1.5">
                    <div
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
                    >
                      {statusCfg.dot && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                      )}
                      {statusCfg.label}
                    </div>
                    {pendingCount > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: "oklch(0.60 0.22 25 / 0.12)",
                          border: "1px solid oklch(0.60 0.22 25 / 0.30)",
                          color: "oklch(0.50 0.22 25)",
                        }}
                      >
                        <Users className="h-3 w-3" />
                        {pendingCount} חדש{pendingCount > 1 ? "ים" : ""}
                      </motion.div>
                    )}
                  </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs mb-3">
                    <span className="flex items-center gap-1" style={{ color: "oklch(0.45 0.04 120)" }}>
                      <MapPin className="h-3 w-3" style={{ color: "oklch(0.55 0.14 80)" }} />
                      {job.address.split(",")[0]}
                    </span>
                    {/* Hide startTime when flexible — adds no actionable info */}
                    {job.startTime !== "flexible" && (
                      <span className="flex items-center gap-1" style={{ color: "oklch(0.45 0.04 120)" }}>
                        <Clock className="h-3 w-3" style={{ color: "oklch(0.55 0.14 80)" }} />
                        {getStartTimeLabel(job.startTime)}
                      </span>
                    )}
                    {/* Hide workersNeeded when 1 — default value, adds noise */}
                    {job.workersNeeded > 1 && (
                      <span className="flex items-center gap-1" style={{ color: "oklch(0.45 0.04 120)" }}>
                        <Users className="h-3 w-3" style={{ color: "oklch(0.55 0.14 80)" }} />
                        {job.workersNeeded} עובדים
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      <DollarSign className="h-3 w-3" style={{ color: isVolunteer ? "oklch(0.50 0.18 160)" : "oklch(0.55 0.14 80)" }} />
                      <span style={{ color: isVolunteer ? "oklch(0.38 0.15 160)" : "oklch(0.45 0.04 120)" }}>
                        {isVolunteer ? "התנדבות" : (formatSalary(job.salary ?? null, job.salaryType, job.hourlyRate ?? null) || "לא צוין")}
                      </span>
                    </span>
                    {daysLeft !== null && job.status === "active" && (
                      <span className="flex items-center gap-1 font-bold">
                        {isExpiringSoon && <Zap className="h-3 w-3" style={{ color: "oklch(0.60 0.22 25)" }} />}
                        <Clock className="h-3 w-3" style={{ color: isExpiringSoon ? "oklch(0.60 0.22 25)" : "oklch(0.55 0.14 80)" }} />
                        <span style={{ color: isExpiringSoon ? "oklch(0.45 0.22 25)" : "oklch(0.45 0.04 120)" }}>
                          {daysLeft === 0 ? "פג היום" : `${daysLeft} ימים נותרו`}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* View */}
                    <AppButton variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => navigate(`/job/${job.id}`)}
                      style={{ background: "oklch(0.94 0.06 85 / 0.30)", border: "1px solid oklch(0.85 0.08 80)", color: "oklch(0.45 0.12 80)" }}>
                      <Eye className="h-3.5 w-3.5" />
                      צפה
                    </AppButton>

                    {/* Applicants toggle */}
                    <AppButton variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => toggleApplicants(job.id)}
                      style={{
                        background: applicantsExpanded ? "oklch(0.93 0.06 250 / 0.20)" : "oklch(0.96 0.01 122)",
                        border: applicantsExpanded ? "1px solid oklch(0.72 0.14 250 / 0.50)" : "1px solid oklch(0.88 0.03 122)",
                        color: applicantsExpanded ? "oklch(0.42 0.18 250)" : "oklch(0.40 0.04 120)",
                      }}>
                      <Users className="h-3.5 w-3.5" />
                      מועמדים
                      {pendingCount > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "oklch(0.60 0.22 25)", color: "white", minWidth: "1.2rem", textAlign: "center", lineHeight: 1 }}>
                          {pendingCount}
                        </span>
                      )}
                      {applicantsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </AppButton>

                    {/* Matched workers */}
                    {job.status === "active" && (
                      <AppButton variant="outline" size="sm" className="gap-1.5 text-xs"
                        onClick={() => navigate(`/matched-workers?jobId=${job.id}`)}
                        style={{ background: "oklch(0.93 0.05 122 / 0.40)", border: "1px solid oklch(0.75 0.10 122 / 0.50)", color: "oklch(0.35 0.08 122)" }}>
                        <Sparkles className="h-3.5 w-3.5" />
                        עובדים מתאימים
                      </AppButton>
                    )}

                    {/* Close / Reactivate */}
                    {job.status === "active" ? (
                      <AppButton variant="outline" size="sm" className="gap-1.5 text-xs"
                        onClick={() => updateStatus.mutate({ id: job.id, status: "closed" })}
                        disabled={updateStatus.isPending}
                        style={{ background: "oklch(0.96 0.01 120)", border: "1px solid oklch(0.88 0.02 120)", color: "oklch(0.45 0.04 120)" }}>
                        <XCircle className="h-3.5 w-3.5" />
                        סגור משרה
                      </AppButton>
                    ) : job.status === "closed" ? (
                      <AppButton variant="outline" size="sm" className="gap-1.5 text-xs"
                        onClick={() => updateStatus.mutate({ id: job.id, status: "active" })}
                        disabled={updateStatus.isPending || activeJobs.length >= 3}
                        style={{ background: "oklch(0.68 0.20 160 / 0.08)", border: "1px solid oklch(0.68 0.20 160 / 0.25)", color: "oklch(0.38 0.15 160)" }}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        הפעל מחדש
                      </AppButton>
                    ) : null}


                  </div>

                  {/* ── Applicants Panel ── */}
                  <AnimatePresence>
                    {applicantsExpanded && (
                      <motion.div
                        key="applicants"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid oklch(0.90 0.02 122)" }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: "oklch(0.45 0.04 120)" }}>
                            מועמדים למשרה
                          </p>
                          <ApplicantsPanel jobId={job.id} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Delete confirmation dialog ── */}
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

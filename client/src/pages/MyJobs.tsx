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
  ChevronRight, Pencil,
} from "lucide-react";
import { getCategoryIcon, getCategoryLabel, formatSalary, getStartTimeLabel } from "@shared/categories";
import { normalizePhoneForWhatsApp, MAX_ACCEPTED_CANDIDATES } from "@shared/const";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff } from "lucide-react";
import { WorkerProfilePreviewModal } from "@/components/WorkerProfilePreviewModal";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { useCategories } from "@/hooks/useCategories";
import { SHIFT_PRESETS } from "@shared/const";

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

// ── Card style — AvodaNow design system ──────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(199,199,186,0.18)",
  borderRadius: "1rem",
  boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
  padding: "1.25rem",
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

// ── Worker Profile Bottom Sheet ─────────────────────────────────────────────
const DAYS_LABELS = [
  { value: "sunday",    label: "א׳" },
  { value: "monday",    label: "ב׳" },
  { value: "tuesday",   label: "ג׳" },
  { value: "wednesday", label: "ד׳" },
  { value: "thursday",  label: "ה׳" },
  { value: "friday",    label: "ש׳" },
  { value: "saturday",  label: "שבת" },
];

function WorkerProfileSheet({ workerId, onClose }: { workerId: number | null; onClose: () => void }) {
  const { categories: dbCategories } = useCategories();
  const citiesQuery = trpc.user.getCities.useQuery(undefined, { staleTime: 60_000 });
  const { profile } = useWorkerProfile(workerId);
  const categoryLabels = dbCategories.map((c) => ({ value: c.slug, label: c.name, icon: c.icon ?? "💼" }));
  const cityNames = profile?.preferredCities
    ? (citiesQuery.data ?? []).filter((c) => (profile.preferredCities as number[]).includes(c.id)).map((c) => c.nameHe)
    : [];
  return (
    <WorkerProfilePreviewModal
      open={workerId != null}
      onClose={onClose}
      name={profile?.name ?? ""}
      photo={profile?.profilePhoto ?? null}
      bio={profile?.workerBio ?? ""}
      categories={(profile?.preferredCategories as string[] | null) ?? []}
      categoryLabels={categoryLabels}
      preferredDays={(profile?.preferredDays as string[] | null) ?? []}
      preferredTimeSlots={(profile?.preferredTimeSlots as string[] | null) ?? []}
      dayLabels={DAYS_LABELS}
      timeSlotLabels={SHIFT_PRESETS}
      locationMode={(profile?.locationMode as "city" | "radius") ?? "city"}
      preferredCities={(profile?.preferredCities as number[] | null) ?? []}
      cityNames={cityNames}
      searchRadiusKm={profile?.searchRadiusKm ?? 5}
      workerRating={profile?.workerRating ?? null}
      completedJobsCount={profile?.completedJobsCount ?? 0}
      availabilityStatus={(profile?.availabilityStatus as "available_now" | "available_today" | "available_hours" | "not_available" | null) ?? null}
    />
  );
}

// ── Applicants Panel ──────────────────────────────────────────────────────────
type Applicant = {
  id: number;
  workerId: number | null;
  workerName: string | null;
  workerBio: string | null;
  workerPreferredCity: string | null;
  workerPhone: string | null;
  status: string;
  contactRevealed: boolean;
  message: string | null;
  createdAt: Date;
  /** CDN URL of the worker's profile photo, null if not set */
  workerProfilePhoto?: string | null;
};

function ApplicantsPanel({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const { data: applicants, isLoading } = trpc.jobs.getApplications.useQuery({ jobId });
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

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
                ? "rgba(16,185,129,0.06)"
                : isRejected
                  ? "#f9f9f7"
                  : "#f4f4f0",
              border: isAccepted
                ? "1px solid rgba(16,185,129,0.20)"
                : isRejected
                  ? "1px solid rgba(199,199,186,0.12)"
                  : "1px solid rgba(199,199,186,0.12)",
              borderRadius: "1rem",
              padding: "0.875rem",
              opacity: isRejected ? 0.55 : 1,
            }}
          >
            {/* Worker info row — click to open public profile */}
            <div
              className="flex items-start gap-3 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => app.workerId && setSelectedWorkerId(app.workerId)}
              title="צפה בפרופיל העובד"
            >
              {/* Avatar: photo if available, else coloured letter-avatar */}
              {app.workerProfilePhoto ? (
                <img
                  src={app.workerProfilePhoto}
                  alt={app.workerName ?? "עובד"}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0"
                  style={{ border: "1px solid rgba(199,199,186,0.18)" }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold shrink-0"
                  style={{
                    background: isAccepted ? "rgba(16,185,129,0.14)" : "#dce8b3",
                    color: isAccepted ? "#065f46" : "#313b15",
                    fontFamily: "Manrope, sans-serif",
                  }}
                >
                  {app.workerName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0 mb-1">
                  <span className="text-base font-bold" style={{ color: "#313b15", fontFamily: "Manrope, sans-serif" }}>
                    {app.workerName ?? "עובד"}
                  </span>
                  {/* Status badge — Radix Tooltip via shared StatusBadge */}
                  <StatusBadge status={app.status} perspective="employer" className="px-1.5 py-0.5" />
                </div>
                {app.workerPreferredCity && (
                  <p className="text-xs flex items-center gap-1" style={{ color: "#46483d" }}>
                    <MapPin className="inline h-3 w-3" style={{ color: "#795900" }} />
                    {app.workerPreferredCity}
                  </p>
                )}
                {app.message && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "#46483d" }}>
                    &ldquo;{app.message}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* WhatsApp + Phone call links — inline text style */}
            {app.workerPhone && (
              <div className="flex items-center gap-4 mt-2">
                <a
                  href={`https://wa.me/${normalizePhoneForWhatsApp(app.workerPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                  style={{ color: "oklch(0.40 0.18 145)" }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${app.workerPhone}`}
                  className="flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                  style={{ color: "oklch(0.38 0.18 240)" }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {app.workerPhone}
                </a>
              </div>
            )}

            {/* Actions (pending) — 2-column: accept (LEFT=dark green) | reject (RIGHT=grey) — RTL order */}
            {isPending && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {/* RIGHT cell (first in DOM = right in RTL): Reject — grey */}
                <button
                  className="flex items-center justify-center gap-1.5 font-semibold text-sm py-3 rounded-xl transition-all active:scale-95"
                  disabled={isMutating}
                  onClick={() => updateStatus.mutate({ id: app.id, action: "reject" })}
                  style={{
                    background: "#f0ede6",
                    color: "#46483d",
                    opacity: isMutating ? 0.6 : 1,
                  }}
                >
                  <UserX className="h-4 w-4" />
                  דחה
                </button>
                {/* LEFT cell (second in DOM = left in RTL): Accept — dark olive green */}
                <button
                  className="flex items-center justify-center gap-1.5 font-semibold text-sm py-3 rounded-xl transition-all active:scale-95"
                  disabled={isMutating}
                  onClick={() => updateStatus.mutate({ id: app.id, action: "accept" })}
                  style={{
                    background: "#313b15",
                    color: "#ffffff",
                    opacity: isMutating ? 0.6 : 1,
                  }}
                >
                  <UserCheck className="h-4 w-4" />
                  קבל
                </button>
              </div>
            )}
          </motion.div>
        );
      })}

      <WorkerProfileSheet
        workerId={selectedWorkerId}
        onClose={() => setSelectedWorkerId(null)}
      />
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

  // Auto-expand applicants panel only for the first job (runs once on data load)
  useEffect(() => {
    if (!myJobs || autoExpandDone) return;
    if (myJobs.length > 0) {
      setExpandedApplicants(new Set([myJobs[0].id]));
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
              const totalApplicationCount = (job as { totalApplicationCount?: number }).totalApplicationCount ?? 0;
              const acceptedCount = (job as { acceptedCount?: number }).acceptedCount ?? 0;
              const isCapReached = acceptedCount >= MAX_ACCEPTED_CANDIDATES;

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
                  {/* ── Hero header — exact match to design reference ── */}
                  {/* RTL: title+status block on RIGHT, action buttons stacked on LEFT */}
                  <div className="flex items-start gap-3 mb-4">
                    {/* Title + status — fills available space, right-aligned */}
                    <div className="flex-1 min-w-0 text-right">
                      <h3
                        className="font-bold text-xl leading-snug mb-1"
                        style={{ color: "#1a2010", fontFamily: "Heebo, sans-serif" }}
                      >
                        {job.title}
                      </h3>
                      {/* Status: dot RIGHT of text, entire row right-aligned */}
                      <div className="flex items-center justify-start gap-1.5" dir="rtl">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: job.status === "active" ? "#22c55e" : job.status === "closed" ? "#9ca3af" : "#f59e0b",
                          }}
                        />
                        <span className="text-sm font-medium" style={{ color: "#46483d" }}>
                          {job.status === "active" ? "משרה פעילה" : statusCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons — stacked column on the LEFT (RTL end) */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {/* Edit — pencil icon, fully rounded circle */}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => navigate(`/job/${job.id}`)}
                        title="ערוך משרה"
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                        style={{ background: "#f0ede6", color: "#46483d" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </motion.button>

                      {/* Close / Reopen — X or check icon, fully rounded circle */}
                      {job.status === "active" ? (
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => updateStatus.mutate({ id: job.id, status: "closed" })}
                          disabled={updateStatus.isPending}
                          title="סגור משרה"
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                          style={{ background: "#f0ede6", color: "#46483d", opacity: updateStatus.isPending ? 0.6 : 1 }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </motion.button>
                      ) : job.status === "closed" ? (
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => updateStatus.mutate({ id: job.id, status: "active" })}
                          disabled={updateStatus.isPending || activeJobs.length >= 3}
                          title="הפעל מחדש"
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#15803d", opacity: (updateStatus.isPending || activeJobs.length >= 3) ? 0.5 : 1 }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </motion.button>
                      ) : null}
                    </div>
                  </div>

                  {/* ── Chips row 1: salary (ירקרק) + location (אפור) ── */}
                  <div className="flex gap-2 mb-2">
                    {/* Salary — ירקרק background */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-0"
                      style={{ background: "#dce8b3", color: "#161e00" }}
                    >
                      <DollarSign className="h-3.5 w-3.5 shrink-0" style={{ color: "#414b23" }} />
                      <span className="text-sm font-semibold truncate">
                        {isVolunteer ? "התנדבות" : (formatSalary(job.salary ?? null, job.salaryType, job.hourlyRate ?? null) || "לא צוין")}
                      </span>
                    </div>
                    {/* Location — neutral grey */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-0"
                      style={{ background: "#f0ede6", color: "#46483d" }}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "#795900" }} />
                      <span className="text-sm font-semibold truncate">{job.address.split(",")[0]}</span>
                    </div>
                  </div>

                  {/* ── Chips row 2: expiry (red/neutral) + time ── */}
                  <div className="flex gap-2 mb-4">
                    {/* Expiry chip */}
                    {daysLeft !== null && job.status === "active" ? (
                      <div
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-0"
                        style={{
                          background: isExpiringSoon ? "rgba(239,68,68,0.10)" : "#f0ede6",
                          color: isExpiringSoon ? "#b91c1c" : "#46483d",
                        }}
                      >
                        <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: isExpiringSoon ? "#b91c1c" : "#795900" }} />
                        <span className="text-sm font-semibold">
                          {daysLeft === 0 ? "פג היום" : `${daysLeft} ימים נותרו`}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-0"
                        style={{ background: "#f0ede6", color: "#46483d" }}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "#795900" }} />
                        <span className="text-sm font-semibold">{job.workersNeeded > 1 ? `${job.workersNeeded} עובדים` : "עובד אחד"}</span>
                      </div>
                    )}
                    {/* Time chip */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-1 min-w-0"
                      style={{ background: "#f0ede6", color: "#46483d" }}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "#795900" }} />
                      <span className="text-sm font-semibold truncate">
                        {job.startTime === "flexible" ? "שעות גמישות" : getStartTimeLabel(job.startTime)}
                      </span>
                    </div>
                  </div>

                  {/* ── Analytics bento (RTL order) ──
                       In RTL grid: first child = RIGHT, second child = LEFT
                       Design: RIGHT = grey total | LEFT = ירקרק accepted
                  */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* RIGHT cell (first in DOM = right in RTL): grey — מועמדים סה"כ */}
                    <div
                      className="flex flex-col items-center justify-center py-5 rounded-2xl text-center"
                      style={{ background: "#f0ede6" }}
                    >
                      <span
                        className="text-3xl font-bold leading-none"
                        style={{ color: "#313b15", fontFamily: "Heebo, sans-serif" }}
                      >
                        {totalApplicationCount}
                      </span>
                      <span className="text-xs font-medium mt-1.5" style={{ color: "#6b7280" }}>
                        מועמדים סה&quot;כ
                      </span>
                    </div>
                    {/* LEFT cell (second in DOM = left in RTL): ירקרק — התקבלו */}
                    <div
                      className="flex flex-col items-center justify-center py-5 rounded-2xl text-center"
                      style={{ background: "#c8e6c9" }}
                    >
                      <span
                        className="text-3xl font-bold leading-none"
                        style={{ color: "#1b5e20", fontFamily: "Heebo, sans-serif" }}
                      >
                        {acceptedCount}/{MAX_ACCEPTED_CANDIDATES}
                      </span>
                      <span className="text-xs font-medium mt-1.5" style={{ color: "#2e7d32" }}>
                        התקבלו
                      </span>
                    </div>
                  </div>

                  {/* Matched workers link — right-aligned, arrow left */}
                  {job.status === "active" && (
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => navigate(`/matched-workers?jobId=${job.id}`)}
                        className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                        style={{ color: "#4a5d23" }}
                      >
                        <Sparkles className="h-3 w-3" />
                        עובדים מתאימים ←
                      </button>
                    </div>
                  )}

                  {/* ── Applicants section — only shown when there are applicants ── */}
                  {totalApplicationCount > 0 && (<div style={{ marginTop: "1rem", borderTop: "1px solid rgba(199,199,186,0.18)" }}>
                    {/* Section header with collapse toggle */}
                    <button
                      onClick={() => toggleApplicants(job.id)}
                      className="flex items-center justify-between w-full pt-3 pb-1"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" style={{ color: "#414b23" }} />
                        <span className="text-sm font-bold" style={{ color: "#313b15" }}>מועמדים</span>
                        {pendingCount > 0 && (
                          <span
                            className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                            style={{ background: "#dce8b3", color: "#161e00", minWidth: "1.4rem", textAlign: "center" }}
                          >
                            {pendingCount}
                          </span>
                        )}
                      </div>
                      <motion.div
                        animate={{ rotate: applicantsExpanded ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronUp className="h-4 w-4" style={{ color: "#46483d" }} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {applicantsExpanded && (
                        <motion.div
                          key="applicants"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: "hidden" }}
                        >
                          <ApplicantsPanel jobId={job.id} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>)}
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

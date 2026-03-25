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
  Briefcase, PlusCircle, Trash2, CheckCircle, CheckCircle2, XCircle,
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
  background: "oklch(0.97 0.012 100)",
  borderBottom: "1px solid oklch(0.92 0.02 100)",
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
  const [revealedPhoneIds, setRevealedPhoneIds] = useState<Set<number>>(new Set());

  const togglePhone = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

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
            className="rounded-2xl p-3.5 flex flex-col gap-0"
            style={{
              background: isAccepted ? "oklch(0.97 0.04 145 / 0.4)" : "white",
              border: isAccepted
                ? "1px solid oklch(0.80 0.12 145 / 0.3)"
                : "1px solid oklch(0.91 0.04 91.6)",
              boxShadow: "0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
              opacity: isRejected ? 0.5 : 1,
            }}
          >
            {/* Top row: avatar + info + action buttons */}
            <div className="flex items-center gap-3 w-full">
              {/* Avatar — click to open profile */}
              <div
                className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => app.workerId && setSelectedWorkerId(app.workerId)}
                title="צפה בפרופיל העובד"
              >
                {app.workerProfilePhoto ? (
                  <img
                    src={app.workerProfilePhoto}
                    alt={app.workerName ?? "עובד"}
                    className="w-10 h-10 rounded-xl object-cover"
                    style={{ border: "1px solid oklch(0.91 0.04 91.6)" }}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold"
                    style={{
                      background: isAccepted ? "oklch(0.92 0.08 145 / 0.25)" : "oklch(0.92 0.05 122 / 0.20)",
                      border: `1px solid ${isAccepted ? "oklch(0.80 0.12 145 / 0.3)" : "oklch(0.80 0.08 122 / 0.25)"}`,
                      color: isAccepted ? "oklch(0.38 0.15 145)" : "oklch(0.38 0.08 122)",
                    }}
                  >
                    {app.workerName?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>

              {/* Name + badge + city + message — fills space */}
              <div
                className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => app.workerId && setSelectedWorkerId(app.workerId)}
                title="צפה בפרופיל העובד"
              >
                <p className="font-bold text-[12px] truncate mb-0.5" dir="rtl" style={{ color: '#171f01' }}>
                  {app.workerName ?? "עובד"}
                </p>
                <div className="mb-1" dir="rtl">
                  <StatusBadge status={app.status} perspective="employer" className="px-1 py-0.5 text-[10px]" />
                </div>
                <div className="flex items-center gap-2 text-[11px]" dir="rtl" style={{ color: "oklch(0.55 0.03 100)" }}>
                  {app.workerPreferredCity && (
                    <span className="flex items-center gap-1">
                      <MapPin size={9} />{app.workerPreferredCity}
                    </span>
                  )}
                </div>
                {app.message && (
                  <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "oklch(0.50 0.04 100)" }}>
                    &ldquo;{app.message}&rdquo;
                  </p>
                )}
              </div>

              {/* Action buttons — right side */}
              <div className="flex flex-row gap-1.5 shrink-0">
                {isPending ? (
                  <>
                    {/* Reject */}
                    <button
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      disabled={isMutating}
                      onClick={() => updateStatus.mutate({ id: app.id, action: "reject" })}
                      style={{
                        background: "oklch(0.96 0.02 91.6)",
                        border: "1px solid oklch(0.89 0.05 84.0)",
                        color: "oklch(0.45 0.08 122)",
                        opacity: isMutating ? 0.6 : 1,
                      }}
                      title="דחה"
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                    {/* Accept */}
                    <button
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      disabled={isMutating}
                      onClick={() => updateStatus.mutate({ id: app.id, action: "accept" })}
                      style={{
                        background: "oklch(0.35 0.08 122)",
                        border: "1px solid oklch(0.28 0.06 122)",
                        color: "white",
                        opacity: isMutating ? 0.6 : 1,
                      }}
                      title="קבל"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Phone reveal button */}
                    {app.workerPhone && (
                      <button
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                        onClick={(e) => togglePhone(app.id, e)}
                        style={{
                          background: revealedPhoneIds.has(app.id)
                            ? "oklch(0.38 0.18 240)"
                            : "oklch(0.96 0.02 91.6)",
                          border: "1px solid oklch(0.89 0.05 84.0)",
                          color: revealedPhoneIds.has(app.id) ? "white" : "oklch(0.38 0.18 240)",
                        }}
                        title={revealedPhoneIds.has(app.id) ? app.workerPhone : "הצג מספר טלפון"}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* WhatsApp button */}
                    {app.workerPhone && (
                      <a
                        href={`https://wa.me/${normalizePhoneForWhatsApp(app.workerPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: "oklch(0.96 0.02 91.6)", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.40 0.18 145)" }}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Phone number reveal row — animated slide-down */}
            <AnimatePresence initial={false}>
              {!isPending && app.workerPhone && revealedPhoneIds.has(app.id) && (
                <motion.div
                  key="phone-reveal"
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="w-full pt-2 flex justify-start" style={{ borderTop: "1px solid oklch(0.91 0.04 91.6)" }}>
                    <a
                      href={`tel:${app.workerPhone}`}
                      className="flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: "oklch(0.38 0.18 240)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={11} />{app.workerPhone}
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                    background: "transparent",
                    border: "1px solid oklch(0.92 0.02 100)",
                    borderRadius: "1rem",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    ...(isExpiringSoon ? { borderColor: "oklch(0.60 0.22 25 / 0.35)" } : {}),
                  }}
                >
                  {/* ── Job details section (header + chips + analytics) ── */}
                  <div style={{
                    background: "oklch(0.97 0.012 100)",
                    borderBottom: "1px solid oklch(0.92 0.02 100)",
                    padding: "1.25rem",
                  }}>
                  {/* ── Hero header — matches HomeEmployer job card style ── */}
                  {/* RTL layout: briefcase icon RIGHT, title+status CENTER, action buttons LEFT */}
                  <div className="flex items-center gap-3 mb-3" dir="rtl">
                    {/* Title + status — fills available space */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5" dir="rtl">
                        <p className="font-bold text-[15px] truncate" style={{ color: "oklch(0.22 0.06 122)" }}>{job.title}</p>
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: job.status === "active" ? "oklch(0.90 0.10 145)" : job.status === "closed" ? "oklch(0.91 0.02 100)" : "oklch(0.93 0.08 30)",
                            color: job.status === "active" ? "oklch(0.30 0.15 145)" : job.status === "closed" ? "oklch(0.42 0.02 100)" : "oklch(0.40 0.12 30)",
                          }}
                        >
                          {job.status === "active" ? "פעיל" : job.status === "closed" ? "סגור" : "פג תוקף"}
                        </span>
                      </div>

                    </div>

                    {/* Action buttons — left side (last in RTL DOM) */}
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: "oklch(0.96 0.02 91.6)", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.45 0.08 122)" }}
                        title="צפייה"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/edit-job/${job.id}`)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: "oklch(0.96 0.02 91.6)", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.45 0.08 122)" }}
                        title="עריכה"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {/* Close/Reopen */}
                      {job.status === "active" ? (
                        <button
                          onClick={() => updateStatus.mutate({ id: job.id, status: "closed" })}
                          disabled={updateStatus.isPending}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: "oklch(0.96 0.02 91.6)", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.45 0.08 122)", opacity: updateStatus.isPending ? 0.6 : 1 }}
                          title="סגור משרה"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : job.status === "closed" ? (
                        <button
                          onClick={() => updateStatus.mutate({ id: job.id, status: "active" })}
                          disabled={updateStatus.isPending || activeJobs.length >= 3}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#15803d", opacity: (updateStatus.isPending || activeJobs.length >= 3) ? 0.5 : 1 }}
                          title="הפעל מחדש"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* ── Chips — 2×2 grid, equal width, same layout as analytics bento ── */}
                  <div className="grid grid-cols-2 gap-2 mb-4" dir="rtl">
                    {/* Salary chip */}
                    <span
                      className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-full"
                      style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
                    >
                      <DollarSign className="h-3 w-3 shrink-0" />
                      <span className="truncate">{isVolunteer ? "התנדבות" : (formatSalary(job.salary ?? null, job.salaryType, job.hourlyRate ?? null) || "לא צוין")}</span>
                    </span>
                    {/* Location chip */}
                    <span
                      className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-full"
                      style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.address.split(",")[0]}</span>
                    </span>
                    {/* Expiry chip — red when expiring soon, otherwise workers count */}
                    {daysLeft !== null && job.status === "active" ? (
                      <span
                        className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-full"
                        style={{
                          color: isExpiringSoon ? "#b91c1c" : "#4F583B",
                          backgroundColor: isExpiringSoon ? "rgba(239,68,68,0.10)" : "rgba(79,88,59,0.10)",
                          border: isExpiringSoon ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(79,88,59,0.18)",
                        }}
                      >
                        <Zap className="h-3 w-3 shrink-0" />
                        <span>{daysLeft === 0 ? "פג היום" : `${daysLeft} ימים נותרו`}</span>
                      </span>
                    ) : (
                      <span
                        className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-full"
                        style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
                      >
                        <Users className="h-3 w-3 shrink-0" />
                        <span>{job.workersNeeded > 1 ? `${job.workersNeeded} עובדים` : "עובד אחד"}</span>
                      </span>
                    )}
                    {/* Time chip */}
                    <span
                      className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-full"
                      style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
                    >
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.startTime === "flexible" ? "שעות גמישות" : getStartTimeLabel(job.startTime)}</span>
                    </span>
                  </div>

                  {/* ── Analytics bento — same style as HomeEmployer StatsRow ── */}
                  <div className="grid grid-cols-2 gap-2 mb-3" dir="rtl">
                    {/* RIGHT (first in RTL DOM): מועמדים סה"כ */}
                    <div
                      className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-[14px] text-center"
                      style={{
                        background: "oklch(0.97 0.02 122)",
                        border: "1px solid oklch(0.88 0.05 122)",
                        boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.10)",
                      }}
                    >
                      <Users style={{ width: 14, height: 14, color: "oklch(0.42 0.10 122)", flexShrink: 0 }} />
                      <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1, color: "oklch(0.22 0.06 122)", letterSpacing: "-0.3px" }}>
                        {totalApplicationCount}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: "oklch(0.45 0.07 122)", textAlign: "center", lineHeight: 1.2 }}>
                        מועמדים סה&quot;כ
                      </span>
                    </div>
                    {/* LEFT (second in RTL DOM): התקבלו */}
                    <div
                      className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-[14px] text-center"
                      style={{
                        background: "oklch(0.97 0.02 122)",
                        border: "1px solid oklch(0.88 0.05 122)",
                        boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.10)",
                      }}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14, color: "oklch(0.42 0.10 122)", flexShrink: 0 }} />
                      <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1, color: "oklch(0.22 0.06 122)", letterSpacing: "-0.3px" }}>
                        {acceptedCount}/{MAX_ACCEPTED_CANDIDATES}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: "oklch(0.45 0.07 122)", textAlign: "center", lineHeight: 1.2 }}>
                        התקבלו
                      </span>
                    </div>
                  </div>

                  {/* Matched workers link — centered */}
                  {job.status === "active" && (
                    <div className="flex justify-center mb-1">
                      <button
                        onClick={() => navigate(`/matched-workers?jobId=${job.id}`)}
                        className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                        style={{ color: "#4a5d23" }}
                      >
                        <Sparkles className="h-3 w-3" />
                        הצג עובדים מתאימים
                      </button>
                    </div>
                  )}
                  </div>{/* end job details section */}

                  {/* ── Applicants section — only shown when there are applicants ── */}
                  {totalApplicationCount > 0 && (<div style={{ padding: "0 1.25rem 1.25rem" }}>
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

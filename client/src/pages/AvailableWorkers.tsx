import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/ui";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import {
  MapPin, Users, Clock, AlertCircle, LocateFixed, Loader2,
  ShieldCheck, Timer, Briefcase, Send, ChevronDown, ChevronUp,
  CheckCircle2, EyeOff, Eye,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { formatDistance } from "@shared/categories";
import { toast } from "sonner";
import { useCountdown } from "@/hooks/useCountdown";
import { AnimatePresence, motion } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "זמין עכשיו";
  if (mins < 60) return `זמין מלפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  return `זמין מלפני ${hrs === 1 ? "שעה" : hrs + " שעות"}`;
}

// ── WorkerCountdownBadge ──────────────────────────────────────────────────────

function WorkerCountdownBadge({ availableUntil }: { availableUntil: Date | string | null | undefined }) {
  const countdown = useCountdown(availableUntil);
  if (!countdown) return null;

  const msLeft = availableUntil ? new Date(availableUntil).getTime() - Date.now() : 0;
  const isUrgent = msLeft < 30 * 60_000;
  const isCritical = msLeft < 10 * 60_000;

  const color = isCritical ? "oklch(0.55 0.20 25)" : isUrgent ? "oklch(0.60 0.18 60)" : "oklch(0.42 0.18 150)";
  const bg = isCritical ? "oklch(0.97 0.04 25)" : isUrgent ? "oklch(0.97 0.04 60)" : "oklch(0.97 0.04 150)";

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums"
      style={{ color, background: bg, border: `1px solid ${color}33` }}
      title="זמן שנותר לזמינות"
    >
      <Timer className="h-2.5 w-2.5 shrink-0" style={{ color }} />
      {countdown}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveJob = {
  id: number;
  title: string | null;
  category: string | null;
  status: string;
};

// ── JobPickerDropdown ─────────────────────────────────────────────────────────

type JobPickerProps = {
  workerId: number;
  activeJobs: ActiveJob[];
  /** jobIds already offered to this worker */
  offeredJobIds: Set<number>;
  onClose: () => void;
  onOfferSent: (jobId: number) => void;
};

function JobPickerDropdown({ workerId, activeJobs, offeredJobIds, onClose, onOfferSent }: JobPickerProps) {
  const sendOffer = trpc.jobs.sendJobOffer.useMutation({
    onSuccess: (data, vars) => {
      if (data.alreadyExists) {
        toast.info("הצעת עבודה כבר נשלחה לעובד זה עבור משרה זו.");
      } else {
        toast.success("הצעת העבודה נשלחה לעובד! הוא יקבל התראה.");
        onOfferSent(vars.jobId);
      }
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="mt-2 rounded-xl overflow-hidden"
      style={{
        border: "1px solid oklch(0.88 0.05 122)",
        background: "white",
        boxShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      }}
    >
      <p className="text-[11px] font-semibold px-3 pt-2.5 pb-1.5" style={{ color: "oklch(0.45 0.06 122)" }}>
        בחר משרה לשליחת הצעה:
      </p>
      {activeJobs.map((job) => {
        const alreadyOffered = offeredJobIds.has(job.id);
        return (
          <button
            key={job.id}
            disabled={sendOffer.isPending || alreadyOffered}
            onClick={() => sendOffer.mutate({ jobId: job.id, workerId, origin: window.location.origin })}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-right hover:bg-[oklch(0.97_0.012_100)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderTop: "1px solid oklch(0.94 0.02 100)" }}
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.42 0.10 122)" }} />
            <span className="flex-1 text-[12px] font-medium truncate" style={{ color: "#171f01" }}>
              {job.title ?? job.category ?? `משרה #${job.id}`}
            </span>
            {alreadyOffered ? (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: "oklch(0.94 0.06 145 / 0.4)", color: "oklch(0.38 0.15 145)" }}
              >
                נשלחה
              </span>
            ) : sendOffer.isPending && sendOffer.variables?.jobId === job.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: "oklch(0.42 0.10 122)" }} />
            ) : (
              <Send className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.42 0.10 122)" }} />
            )}
          </button>
        );
      })}
    </motion.div>
  );
}

// ── WorkerContactSection ──────────────────────────────────────────────────────

type ContactSectionProps = {
  workerId: number;
  isAuthenticated: boolean;
  isEmployer: boolean;
  activeJobs: ActiveJob[];
  jobsLoading: boolean;
  /** jobIds already offered to this worker (from getOfferedWorkerIds) */
  offeredJobIds: Set<number>;
  onLoginRequired: () => void;
  onOfferSent: (workerId: number, jobId: number) => void;
};

function WorkerContactSection({
  workerId,
  isAuthenticated,
  isEmployer,
  activeJobs,
  jobsLoading,
  offeredJobIds,
  onLoginRequired,
  onOfferSent,
}: ContactSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, navigate] = useLocation();

  const sendOffer = trpc.jobs.sendJobOffer.useMutation({
    onSuccess: (data, vars) => {
      if (data.alreadyExists) {
        toast.info("הצעת עבודה כבר נשלחה לעובד זה עבור משרה זו.");
      } else {
        toast.success("הצעת העבודה נשלחה לעובד! הוא יקבל התראה.");
        onOfferSent(workerId, vars.jobId);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // All active jobs already offered to this worker
  const allJobsOffered = activeJobs.length > 0 && activeJobs.every((j) => offeredJobIds.has(j.id));
  const someJobsOffered = activeJobs.some((j) => offeredJobIds.has(j.id));

  const handleClick = () => {
    if (!isAuthenticated) { saveReturnPath(); onLoginRequired(); return; }
    if (!isEmployer) { toast.info("רק מעסיקים יכולים לשלוח הצעות עבודה."); return; }
    if (jobsLoading) return;

    if (activeJobs.length === 0) { navigate("/post-job"); return; }

    if (activeJobs.length === 1) {
      if (offeredJobIds.has(activeJobs[0].id)) {
        toast.info("כבר שלחת הצעה לעובד זה עבור המשרה הפעילה שלך.");
        return;
      }
      sendOffer.mutate({ jobId: activeJobs[0].id, workerId, origin: window.location.origin });
      return;
    }

    setPickerOpen((v) => !v);
  };

  const isSending = sendOffer.isPending;
  const noJobs = isAuthenticated && isEmployer && !jobsLoading && activeJobs.length === 0;

  const btnLabel = noJobs
    ? "פרסם משרה לקשר"
    : isSending
    ? "שולח..."
    : allJobsOffered
    ? "הצעה נשלחה לכל המשרות"
    : "שלח בקשה לעובד";

  const BtnIcon = noJobs ? Briefcase : isSending ? Loader2 : allJobsOffered ? CheckCircle2 : Send;
  const multipleJobs = isAuthenticated && isEmployer && !jobsLoading && activeJobs.length > 1;

  return (
    <div className="mt-3">
      {/* Offered badge — shown when at least one job was already offered */}
      {!noJobs && someJobsOffered && !allJobsOffered && (
        <div
          className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium"
          style={{ color: "oklch(0.42 0.14 145)" }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          הצעה נשלחה לחלק מהמשרות
        </div>
      )}

      <AppButton
        size="sm"
        className="w-full gap-1.5 text-xs"
        disabled={isSending || jobsLoading || allJobsOffered}
        onClick={handleClick}
        style={{
          background: allJobsOffered
            ? "oklch(0.94 0.06 145 / 0.5)"
            : noJobs
            ? "oklch(0.55 0.04 100)"
            : "oklch(0.35 0.08 122)",
          color: allJobsOffered ? "oklch(0.38 0.15 145)" : "white",
          border: allJobsOffered
            ? "1px solid oklch(0.80 0.12 145 / 0.4)"
            : noJobs
            ? "1px solid oklch(0.48 0.04 100)"
            : "1px solid oklch(0.28 0.06 122)",
          opacity: jobsLoading ? 0.7 : 1,
          cursor: allJobsOffered ? "default" : undefined,
        }}
      >
        <BtnIcon className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
        {btnLabel}
        {multipleJobs && !isSending && !allJobsOffered && (
          pickerOpen
            ? <ChevronUp className="h-3.5 w-3.5 mr-auto" />
            : <ChevronDown className="h-3.5 w-3.5 mr-auto" />
        )}
      </AppButton>

      {/* Job picker dropdown for multiple active jobs */}
      <AnimatePresence>
        {pickerOpen && multipleJobs && !allJobsOffered && (
          <JobPickerDropdown
            workerId={workerId}
            activeJobs={activeJobs}
            offeredJobIds={offeredJobIds}
            onClose={() => setPickerOpen(false)}
            onOfferSent={(jobId) => onOfferSent(workerId, jobId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AvailableWorkers() {
  const { isAuthenticated } = useAuth();
  const { userMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);
  const [hideOffered, setHideOffered] = useState(false);

  // Optimistic local state: track newly sent offers without waiting for refetch
  const [localOfferedMap, setLocalOfferedMap] = useState<Record<number, number[]>>({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const isEmployer = isAuthenticated && userMode === "employer";

  // Employer profile
  const employerProfileQuery = trpc.user.getEmployerProfile.useQuery(undefined, {
    enabled: isEmployer,
    staleTime: 60_000,
  });
  const minWorkerAge = isEmployer ? (employerProfileQuery.data?.minWorkerAge ?? null) : null;
  const savedRadiusKm = isEmployer ? (employerProfileQuery.data?.workerSearchRadiusKm ?? null) : null;
  useEffect(() => {
    if (savedRadiusKm !== null) setRadiusKm(savedRadiusKm);
  }, [savedRadiusKm]);
  const savedLat = isEmployer && employerProfileQuery.data?.workerSearchLatitude
    ? parseFloat(employerProfileQuery.data.workerSearchLatitude) : null;
  const savedLng = isEmployer && employerProfileQuery.data?.workerSearchLongitude
    ? parseFloat(employerProfileQuery.data.workerSearchLongitude) : null;

  // Employer's active jobs
  const myJobsQuery = trpc.jobs.myJobsWithPendingCounts.useQuery(undefined, {
    enabled: isEmployer,
    staleTime: 30_000,
  });
  const activeJobs: ActiveJob[] = (myJobsQuery.data ?? []).filter((j) => j.status === "active");

  // Offered worker IDs (from server)
  const offeredQuery = trpc.jobs.getOfferedWorkerIds.useQuery(undefined, {
    enabled: isEmployer,
    staleTime: 30_000,
  });

  // Merge server data with optimistic local state
  const offeredMap: Record<number, number[]> = useMemo(() => {
    const base: Record<number, number[]> = { ...(offeredQuery.data ?? {}) };
    Object.entries(localOfferedMap).forEach(([wid, jids]) => {
      const widNum = Number(wid);
      const existing = new Set(base[widNum] ?? []);
      jids.forEach((jid) => existing.add(jid));
      base[widNum] = Array.from(existing);
    });
    return base;
  }, [offeredQuery.data, localOfferedMap]);

  const handleOfferSent = (workerId: number, jobId: number) => {
    setLocalOfferedMap((prev) => {
      const existing = new Set(prev[workerId] ?? []);
      existing.add(jobId);
      return { ...prev, [workerId]: Array.from(existing) };
    });
  };

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
        toast.success("מיקום עודכן");
      },
      () => { setLocating(false); toast.error("לא ניתן לאתר מיקום"); }
    );
  };

  const effectiveLat = userLat ?? savedLat ?? 31.7683;
  const effectiveLng = userLng ?? savedLng ?? 35.2137;
  // Track last-updated timestamp for the "updated X seconds ago" indicator
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: effectiveLat, lng: effectiveLng, radiusKm, limit: 50, minWorkerAge },
    {
      enabled: true,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false, // pause polling when tab is not visible
    }
  );

  // Update lastUpdatedAt whenever fresh data arrives (tRPC v11 — no onSuccess callback)
  useEffect(() => {
    if (workersQuery.data !== undefined) {
      setLastUpdatedAt(new Date());
    }
  }, [workersQuery.dataUpdatedAt]);

  // Tick every second to update "updated X seconds ago" display
  useEffect(() => {
    if (!lastUpdatedAt) return;
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt]);

  const allWorkers = workersQuery.data ?? [];

  // Filter: hide workers that received offers for ALL active jobs
  const workers = useMemo(() => {
    if (!hideOffered || activeJobs.length === 0) return allWorkers;
    return allWorkers.filter((w) => {
      const offeredJobIds = new Set(offeredMap[w.id] ?? []);
      return !activeJobs.every((j) => offeredJobIds.has(j.id));
    });
  }, [allWorkers, hideOffered, offeredMap, activeJobs]);

  const hiddenCount = allWorkers.length - workers.length;

  const calcDistance = (workerLat: string, workerLng: string) => {
    if (!userLat || !userLng) return null;
    const R = 6371;
    const lat1 = userLat * Math.PI / 180;
    const lat2 = parseFloat(workerLat) * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = (parseFloat(workerLng) - userLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          עובדים זמינים עכשיו
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          אנשים שסימנו שהם פנויים לעבוד עכשיו
        </p>
      </div>

      {/* Location + radius controls */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4 flex flex-wrap items-center gap-3">
        <AppButton
          variant="outline"
          size="sm"
          onClick={getLocation}
          disabled={locating}
          className="gap-2"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {userLat ? "עדכן מיקום" : "אתר מיקום"}
        </AppButton>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">רדיוס:</span>
          {[5, 10, 20, 50].map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                radiusKm === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r} ק"מ
            </button>
          ))}
        </div>

        {userLat && (
          <span className="text-xs text-green-600 flex items-center gap-1 mr-auto">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            מיקום פעיל
          </span>
        )}
      </div>

      {/* Age filter indicator */}
      {minWorkerAge && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm text-amber-800">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            מסנן גיל פעיל: מוצגים רק עובדים בני <strong>{minWorkerAge}+</strong> (לפי הגדרות הפרופיל שלך)
          </span>
        </div>
      )}

      {/* Active jobs summary + hide-offered toggle */}
      {isEmployer && !myJobsQuery.isLoading && activeJobs.length > 0 && (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between gap-2"
          style={{
            background: "oklch(0.97 0.04 145 / 0.35)",
            border: "1px solid oklch(0.85 0.08 145 / 0.4)",
          }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.38 0.12 145)" }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              <strong>{activeJobs.length}</strong> {activeJobs.length === 1 ? "משרה פעילה" : "משרות פעילות"}
            </span>
          </div>

          {/* Hide-offered toggle */}
          <button
            onClick={() => setHideOffered((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: hideOffered ? "oklch(0.38 0.12 145)" : "oklch(0.92 0.06 145 / 0.4)",
              color: hideOffered ? "white" : "oklch(0.38 0.12 145)",
              border: `1px solid ${hideOffered ? "oklch(0.30 0.10 145)" : "oklch(0.80 0.10 145 / 0.5)"}`,
            }}
            title={hideOffered ? "הצג גם עובדים שקיבלו הצעה" : "הסתר עובדים שכבר קיבלו הצעה"}
          >
            {hideOffered ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {hideOffered ? "הצג הכל" : "הסתר שנשלחו"}
          </button>
        </div>
      )}

      {/* Workers list */}
      {workersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <BrandLoader size="md" />
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">
            {hideOffered && hiddenCount > 0
              ? "כל העובדים הזמינים כבר קיבלו הצעה"
              : "אין עובדים זמינים באזור כרגע"}
          </p>
          <p className="text-sm mt-1">
            {hideOffered && hiddenCount > 0
              ? <button className="underline" onClick={() => setHideOffered(false)}>לחץ להצגת כולם ({hiddenCount})</button>
              : minWorkerAge
              ? `לא נמצאו עובדים בני ${minWorkerAge}+ בטווח ${radiusKm} ק"מ. נסה להרחיב את הרדיוס.`
              : `נסה להרחיב את הרדיוס או לחזור מאוחר יותר`}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              נמצאו <strong className="text-foreground">{workers.length}</strong> עובדים זמינים בטווח {radiusKm} ק"מ
              {hideOffered && hiddenCount > 0 && (
                <span className="text-xs mr-1" style={{ color: "oklch(0.55 0.06 100)" }}>
                  ({hiddenCount} מוסתרים)
                </span>
              )}
            </p>
          </div>
          <div className="space-y-3">
            {workers.map((worker) => {
              const dist = calcDistance(worker.latitude, worker.longitude);
              const offeredJobIds = new Set<number>(offeredMap[worker.id] ?? []);
              const hasAnyOffer = offeredJobIds.size > 0;

              return (
                <div
                  key={worker.id}
                  className="bg-card rounded-xl border p-4 shadow-sm transition-all"
                  style={{
                    borderColor: hasAnyOffer
                      ? "oklch(0.85 0.08 145 / 0.5)"
                      : "oklch(0.91 0.04 91.6)",
                    background: hasAnyOffer ? "oklch(0.98 0.02 145 / 0.3)" : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                        {worker.userName?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">
                            {worker.userName ?? "עובד"}
                          </p>
                          {/* "Offer sent" badge */}
                          {hasAnyOffer && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "oklch(0.92 0.08 145 / 0.4)",
                                color: "oklch(0.38 0.15 145)",
                                border: "1px solid oklch(0.80 0.12 145 / 0.3)",
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              הצעה נשלחה
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {worker.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {worker.city}
                            </span>
                          )}
                          {dist !== null && (
                            <span className="text-primary font-medium">{formatDistance(dist)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {relativeTime(worker.createdAt)}
                          </span>
                        </div>
                        {worker.availableUntil && (
                          <div className="mt-1">
                            <WorkerCountdownBadge availableUntil={worker.availableUntil} />
                          </div>
                        )}
                        {worker.note && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{worker.note}"</p>
                        )}
                      </div>
                    </div>

                    {/* Availability indicator */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 font-medium">פנוי</span>
                    </div>
                  </div>

                  {/* Smart contact section */}
                  <WorkerContactSection
                    workerId={worker.id}
                    isAuthenticated={isAuthenticated}
                    isEmployer={isEmployer}
                    activeJobs={activeJobs}
                    jobsLoading={myJobsQuery.isLoading}
                    offeredJobIds={offeredJobIds}
                    onLoginRequired={() => setLoginOpen(true)}
                    onOfferSent={handleOfferSent}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Last-updated timestamp indicator */}
      {lastUpdatedAt && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {secondsAgo < 5
              ? "עודכן זה עתה"
              : secondsAgo < 60
              ? `עודכן לפני ${secondsAgo} שניות`
              : `עודכן לפני ${Math.floor(secondsAgo / 60)} דקות`}
          </span>
          {workersQuery.isFetching && (
            <Loader2 className="h-3 w-3 animate-spin ml-1" />
          )}
        </div>
      )}

      {/* Info notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">כיצד להופיע ברשימה?</p>
          <p className="mt-0.5">עובדים יכולים ללחוץ על "אני פנוי לעבוד עכשיו" בדף הבית כדי להופיע ברשימה זו.</p>
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message="כדי לשלוח הצעות עבודה יש להתחבר למערכת" />
    </div>
  );
}

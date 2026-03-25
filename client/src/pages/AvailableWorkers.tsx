import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/ui";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import { MapPin, Users, Clock, AlertCircle, LocateFixed, Loader2, ShieldCheck, Timer, Briefcase, Send, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { formatDistance } from "@shared/categories";
import { toast } from "sonner";
import { useCountdown } from "@/hooks/useCountdown";
import { AnimatePresence, motion } from "framer-motion";

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "זמין עכשיו";
  if (mins < 60) return `זמין מלפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  return `זמין מלפני ${hrs === 1 ? "שעה" : hrs + " שעות"}`;
}

/**
 * Live countdown badge for a worker card.
 * Shows "נשאר HH:MM:SS" ticking every second.
 * Renders nothing once the time has expired.
 */
function WorkerCountdownBadge({ availableUntil }: { availableUntil: Date | string | null | undefined }) {
  const countdown = useCountdown(availableUntil);
  if (!countdown) return null;

  const msLeft = availableUntil ? new Date(availableUntil).getTime() - Date.now() : 0;
  const isUrgent = msLeft < 30 * 60_000;
  const isCritical = msLeft < 10 * 60_000;

  const color = isCritical
    ? "oklch(0.55 0.20 25)"
    : isUrgent
    ? "oklch(0.60 0.18 60)"
    : "oklch(0.42 0.18 150)";

  const bg = isCritical
    ? "oklch(0.97 0.04 25)"
    : isUrgent
    ? "oklch(0.97 0.04 60)"
    : "oklch(0.97 0.04 150)";

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

// ── Job picker for sending an offer ──────────────────────────────────────────
type ActiveJob = {
  id: number;
  title: string | null;
  category: string | null;
  status: string;
};

type JobPickerProps = {
  workerId: number;
  activeJobs: ActiveJob[];
  onClose: () => void;
};

function JobPickerDropdown({ workerId, activeJobs, onClose }: JobPickerProps) {
  const sendOffer = trpc.jobs.sendJobOffer.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.info("הצעת עבודה כבר נשלחה לעובד זה עבור משרה זו.");
      } else {
        toast.success("הצעת העבודה נשלחה לעובד! הוא יקבל התראה.");
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
      {activeJobs.map((job) => (
        <button
          key={job.id}
          disabled={sendOffer.isPending}
          onClick={() =>
            sendOffer.mutate({
              jobId: job.id,
              workerId,
              origin: window.location.origin,
            })
          }
          className="w-full flex items-center gap-2 px-3 py-2.5 text-right hover:bg-[oklch(0.97_0.012_100)] transition-colors disabled:opacity-60"
          style={{ borderTop: "1px solid oklch(0.94 0.02 100)" }}
        >
          <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.42 0.10 122)" }} />
          <span className="flex-1 text-[12px] font-medium truncate" style={{ color: "#171f01" }}>
            {job.title ?? job.category ?? `משרה #${job.id}`}
          </span>
          {sendOffer.isPending && sendOffer.variables?.jobId === job.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: "oklch(0.42 0.10 122)" }} />
          ) : (
            <Send className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.42 0.10 122)" }} />
          )}
        </button>
      ))}
    </motion.div>
  );
}

// ── Contact section per worker card ──────────────────────────────────────────
type ContactSectionProps = {
  workerId: number;
  isAuthenticated: boolean;
  isEmployer: boolean;
  activeJobs: ActiveJob[];
  jobsLoading: boolean;
  onLoginRequired: () => void;
};

function WorkerContactSection({
  workerId,
  isAuthenticated,
  isEmployer,
  activeJobs,
  jobsLoading,
  onLoginRequired,
}: ContactSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sendOffer = trpc.jobs.sendJobOffer.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.info("הצעת עבודה כבר נשלחה לעובד זה עבור משרה זו.");
      } else {
        toast.success("הצעת העבודה נשלחה לעובד! הוא יקבל התראה.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const [, navigate] = useLocation();

  const handleClick = () => {
    if (!isAuthenticated) { saveReturnPath(); onLoginRequired(); return; }
    if (!isEmployer) {
      toast.info("רק מעסיקים יכולים לשלוח הצעות עבודה.");
      return;
    }
    if (jobsLoading) return;

    if (activeJobs.length === 0) {
      // No active jobs → redirect to post job
      navigate("/post-job");
      return;
    }

    if (activeJobs.length === 1) {
      // Exactly one active job → send offer immediately
      sendOffer.mutate({
        jobId: activeJobs[0].id,
        workerId,
        origin: window.location.origin,
      });
      return;
    }

    // Multiple active jobs → toggle picker
    setPickerOpen((v) => !v);
  };

  const isSending = sendOffer.isPending;
  const noJobs = isAuthenticated && isEmployer && !jobsLoading && activeJobs.length === 0;
  const multipleJobs = isAuthenticated && isEmployer && !jobsLoading && activeJobs.length > 1;

  const btnLabel = noJobs
    ? "פרסם משרה לקשר"
    : isSending
    ? "שולח..."
    : "שלח בקשה לעובד";

  const BtnIcon = noJobs ? Briefcase : isSending ? Loader2 : Send;

  return (
    <div className="mt-3">
      <AppButton
        size="sm"
        className="w-full gap-1.5 text-xs"
        disabled={isSending || jobsLoading}
        onClick={handleClick}
        style={{
          background: noJobs ? "oklch(0.55 0.04 100)" : "oklch(0.35 0.08 122)",
          color: "white",
          border: `1px solid ${noJobs ? "oklch(0.48 0.04 100)" : "oklch(0.28 0.06 122)"}`,
          opacity: jobsLoading ? 0.7 : 1,
        }}
      >
        <BtnIcon className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
        {btnLabel}
        {multipleJobs && !isSending && (
          pickerOpen
            ? <ChevronUp className="h-3.5 w-3.5 mr-auto" />
            : <ChevronDown className="h-3.5 w-3.5 mr-auto" />
        )}
      </AppButton>

      {/* Job picker dropdown for multiple active jobs */}
      <AnimatePresence>
        {pickerOpen && multipleJobs && (
          <JobPickerDropdown
            workerId={workerId}
            activeJobs={activeJobs}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AvailableWorkers() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { userMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const isEmployer = isAuthenticated && userMode === "employer";

  // Employer profile (for minWorkerAge, saved location)
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
    ? parseFloat(employerProfileQuery.data.workerSearchLatitude)
    : null;
  const savedLng = isEmployer && employerProfileQuery.data?.workerSearchLongitude
    ? parseFloat(employerProfileQuery.data.workerSearchLongitude)
    : null;

  // Employer's active jobs (only fetched when authenticated employer)
  const myJobsQuery = trpc.jobs.myJobsWithPendingCounts.useQuery(undefined, {
    enabled: isEmployer,
    staleTime: 30_000,
  });
  const activeJobs: ActiveJob[] = (myJobsQuery.data ?? []).filter(
    (j) => j.status === "active"
  );

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
  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: effectiveLat, lng: effectiveLng, radiusKm, limit: 50, minWorkerAge },
    { enabled: true, refetchInterval: 60000 }
  );

  const workers = workersQuery.data ?? [];

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

      {/* Active jobs summary banner — shown only to employers with active jobs */}
      {isEmployer && !myJobsQuery.isLoading && activeJobs.length > 0 && (
        <div
          className="rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm"
          style={{
            background: "oklch(0.97 0.04 145 / 0.35)",
            border: "1px solid oklch(0.85 0.08 145 / 0.4)",
            color: "oklch(0.38 0.12 145)",
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            יש לך <strong>{activeJobs.length}</strong> {activeJobs.length === 1 ? "משרה פעילה" : "משרות פעילות"} — תוכל לשלוח הצעות עבודה ישירות לעובדים
          </span>
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
          <p className="font-medium text-foreground">אין עובדים זמינים באזור כרגע</p>
          <p className="text-sm mt-1">
            {minWorkerAge
              ? `לא נמצאו עובדים בני ${minWorkerAge}+ בטווח ${radiusKm} ק"מ. נסה להרחיב את הרדיוס.`
              : `נסה להרחיב את הרדיוס או לחזור מאוחר יותר`}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            נמצאו <strong className="text-foreground">{workers.length}</strong> עובדים זמינים בטווח {radiusKm} ק"מ
          </p>
          <div className="space-y-3">
            {workers.map((worker) => {
              const dist = calcDistance(worker.latitude, worker.longitude);
              return (
                <div key={worker.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                        {worker.userName?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {worker.userName ?? "עובד"}
                        </p>
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
                    onLoginRequired={() => setLoginOpen(true)}
                  />
                </div>
              );
            })}
          </div>
        </>
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

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import {
  ChevronRight,
  Loader2,
  Sparkles,
  User,
  MapPin,
  Star,
  Send,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { WorkerProfilePreviewModal } from "@/components/WorkerProfilePreviewModal";
import { useCategories } from "@/hooks/useCategories";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { SHIFT_PRESETS } from "@shared/const";

// ─── Constants ────────────────────────────────────────────────────────────────

const C_BG = "#fefcf4";
const C_DARK = "oklch(0.28 0.06 122)";
const C_GREEN = "oklch(0.38 0.10 125)";
const C_LIGHT_GREEN = "oklch(0.92 0.05 122)";
const C_BORDER = "oklch(0.90 0.04 91.6)";

const DAYS = [
  { value: "sunday",    label: "א׳" },
  { value: "monday",    label: "ב׳" },
  { value: "tuesday",   label: "ג׳" },
  { value: "wednesday", label: "ד׳" },
  { value: "thursday",  label: "ה׳" },
  { value: "friday",    label: "ש׳" },
  { value: "saturday",  label: "שבת" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedWorker {
  worker_id: number;
  score: number;
  name?: string;
  distance?: number;
  rating?: number;
  isMinor?: boolean;
  locationMissingGps?: boolean;
  profilePhoto?: string | null;
  /** Worker's current availability status — used to show the green dot */
  availabilityStatus?: string | null;
}

// ─── Worker Card ──────────────────────────────────────────────────────────────

function WorkerMatchCard({
  worker,
  jobId,
  onOfferSent,
  onCardClick,
  isCapReached = false,
}: {
  worker: MatchedWorker;
  jobId: number;
  onOfferSent: (workerId: number) => void;
  onCardClick: (workerId: number) => void;
  /** When true, the send-offer button is hidden — job cap already reached */
  isCapReached?: boolean;
}) {
  const [offerSent, setOfferSent] = useState(false);

  const sendOffer = trpc.jobs.sendJobOffer.useMutation({
    onSuccess: (data) => {
      setOfferSent(true);
      onOfferSent(worker.worker_id);
      if (data.alreadyExists) {
        toast("הצעה כבר נשלחה לעובד זה", { icon: "ℹ️" });
      } else {
        toast.success("הצעת עבודה נשלחה לעובד!");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const scorePercent = Math.round(worker.score * 100);
  const scoreColor =
    scorePercent >= 85
      ? "oklch(0.45 0.15 145)"
      : scorePercent >= 70
      ? "oklch(0.55 0.14 80)"
      : "oklch(0.55 0.10 50)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
      style={{ background: "white", border: `1px solid ${C_BORDER}` }}
      onClick={() => onCardClick(worker.worker_id)}
    >
      {/* Avatar — profile photo if available, letter-avatar fallback + availability dot */}
      <div className="relative flex-shrink-0">
        {worker.profilePhoto ? (
          <img
            src={worker.profilePhoto}
            alt={worker.name ?? "עובד"}
            className="w-12 h-12 rounded-xl object-cover"
            style={{ border: `1px solid ${C_BORDER}` }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: C_LIGHT_GREEN }}
          >
            {worker.name ? (
              <span className="text-base font-bold" style={{ color: C_DARK }}>
                {worker.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="h-6 w-6" style={{ color: C_DARK }} />
            )}
          </div>
        )}
        {/* Green pulsing dot — shown when worker is currently available */}
        {worker.availabilityStatus === "available_now" && (
          <span
            className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 animate-pulse"
            style={{ border: "2px solid white" }}
            title="עובד זמין עכשיו"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black truncate" style={{ color: C_DARK }}>
          {worker.name ?? `עובד #${worker.worker_id}`}
          {worker.isMinor && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.45)",
              color: "#d97706", borderRadius: 5, padding: "1px 6px",
              fontSize: 10, fontWeight: 700, marginRight: 6, verticalAlign: "middle",
            }}>
              16–17
            </span>
          )}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {/* Score badge */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${scoreColor}20`, color: scoreColor }}
          >
            התאמה {scorePercent}%
          </span>
          {/* Distance */}
          {worker.distance != null && (
            <span className="text-xs flex items-center gap-0.5" style={{ color: "oklch(0.55 0.04 122)" }}>
              <MapPin className="h-3 w-3" />
              {worker.distance < 1
                ? `${Math.round(worker.distance * 1000)} מ'`
                : `${worker.distance.toFixed(1)} ק"מ`}
            </span>
          )}
          {/* Missing GPS indicator for radius-mode workers without location */}
          {worker.locationMissingGps && (
            <span
              className="text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{ background: "oklch(0.97 0.04 55)", color: "oklch(0.45 0.12 55)", border: "1px solid oklch(0.85 0.08 55)" }}
            >
              <MapPin className="h-3 w-3" />
              מיקום לא מוגדר
            </span>
          )}
          {/* Rating */}
          {worker.rating != null && (
            <span className="text-xs flex items-center gap-0.5" style={{ color: "oklch(0.55 0.04 122)" }}>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {worker.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Action button — stop propagation so click doesn't open modal */}
      {isCapReached ? null : offerSent ? (
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
          style={{ background: C_LIGHT_GREEN, color: C_DARK }}
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          נשלח
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); sendOffer.mutate({ jobId, workerId: worker.worker_id }); }}
          disabled={sendOffer.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
          style={{
            background: `linear-gradient(135deg, oklch(0.38 0.10 125) 0%, oklch(0.28 0.06 122) 100%)`,
            color: "white",
          }}
        >
          {sendOffer.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          שלח הצעה
        </button>
      )}
    </motion.div>
  );
}

// ─── Worker Profile Bottom Sheet ──────────────────────────────────────────────

function WorkerProfileSheet({
  workerId,
  onClose,
}: {
  workerId: number | null;
  onClose: () => void;
}) {
  const { categories: dbCategories } = useCategories();
  const citiesQuery = trpc.user.getCities.useQuery(undefined, { staleTime: 60_000 });

  // useWorkerProfile provides 10-min tRPC staleTime + module-level in-memory cache
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
      dayLabels={DAYS}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatchedWorkers() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const [offeredWorkers, setOfferedWorkers] = useState<Set<number>>(new Set());
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  // Get jobId from URL query param
  const jobId = parseInt(new URLSearchParams(window.location.search).get("jobId") ?? "0");

  const { data: job } = trpc.jobs.getById.useQuery(
    { id: jobId },
    authQuery({ enabled: !!jobId })
  );

  const matchMutation = trpc.jobs.matchWorkers.useMutation();

  const [matchedWorkers, setMatchedWorkers] = useState<MatchedWorker[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch isMinor status for matched workers after they are loaded
  const workerIds = matchedWorkers?.map((w) => w.worker_id) ?? [];
  const minorStatusQuery = trpc.user.getWorkersMinorStatus.useQuery(
    { workerIds },
    { enabled: workerIds.length > 0, staleTime: 5 * 60 * 1000 }
  );
  const enrichedWorkers: MatchedWorker[] | null = matchedWorkers
    ? matchedWorkers.map((w) => ({
        ...w,
        isMinor: minorStatusQuery.data?.[w.worker_id] ?? false,
        locationMissingGps: w.locationMissingGps ?? false,
      }))
    : null;

  const handleMatch = async () => {
    if (!jobId) return;
    try {
      const result = await matchMutation.mutateAsync({ jobId });
      setMatchedWorkers(result.workers as MatchedWorker[]);
      setHasSearched(true);
    } catch {
      toast.error("שגיאה בחיפוש עובדים מתאימים");
    }
  };

  const handleOfferSent = (workerId: number) => {
    setOfferedWorkers((prev) => { const next = new Set(prev); next.add(workerId); return next; });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C_BG }}>
        <p className="text-gray-500">יש להתחבר</p>
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C_BG }}>
        <div className="text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "oklch(0.55 0.10 30)" }} />
          <p className="font-bold" style={{ color: C_DARK }}>לא נבחרה משרה</p>
          <button onClick={() => navigate("/my-jobs")} className="mt-3 text-sm underline" style={{ color: C_GREEN }}>
            עבור למשרות שלי
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: C_BG }} dir="rtl">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: C_BG, borderBottom: `1px solid ${C_BORDER}` }}
      >
        <button
          onClick={() => navigate(`/job/${jobId}`)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: C_LIGHT_GREEN }}
        >
          <ChevronRight className="h-5 w-5" style={{ color: C_DARK }} />
        </button>
        <div>
          <h1 className="text-[17px] font-black" style={{ color: C_DARK }}>
            עובדים מתאימים
          </h1>
          {job && (
            <p className="text-xs truncate max-w-[200px]" style={{ color: "oklch(0.55 0.04 122)" }}>
              {job.title}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Job summary card */}
        {job && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "white", border: `1px solid ${C_BORDER}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: C_LIGHT_GREEN }}
            >
              <Briefcase className="h-5 w-5" style={{ color: C_DARK }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate" style={{ color: C_DARK }}>{job.title}</p>
              <p className="text-xs truncate" style={{ color: "oklch(0.55 0.04 122)" }}>
                {job.city ?? job.address}
              </p>
            </div>
          </div>
        )}

        {/* Search button */}
        {!hasSearched && (
          <motion.button
            onClick={handleMatch}
            disabled={matchMutation.isPending}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[15px]"
            style={{
              background: `linear-gradient(135deg, oklch(0.38 0.10 125) 0%, oklch(0.28 0.06 122) 100%)`,
              color: "white",
              boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.35)",
            }}
          >
            {matchMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                מחפש עובדים מתאימים...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                מצא עובדים מתאימים
              </>
            )}
          </motion.button>
        )}

        {/* Results */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {enrichedWorkers && enrichedWorkers.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: C_DARK }}>
                      נמצאו {enrichedWorkers?.length ?? 0} עובדים מתאימים
                    </p>
                    <button
                      onClick={() => { setHasSearched(false); setMatchedWorkers(null); }}
                      className="text-xs underline"
                      style={{ color: C_GREEN }}
                    >
                      חפש שוב
                    </button>
                  </div>
                  {/* Cap-reached banner in MatchedWorkers */}
                  {job?.status === "closed" && job?.closedReason === "cap_reached" && (
                    <div
                      className="rounded-2xl px-4 py-3 flex items-start gap-3"
                      style={{ background: "oklch(0.45 0.18 160 / 0.10)", border: "1px solid oklch(0.45 0.18 160 / 0.30)" }}
                    >
                      <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "oklch(0.45 0.18 160)" }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: "oklch(0.35 0.14 160)" }}>
                          המשרה הושלמה — קיבלת 3 מועמדים
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.10 160)" }}>
                          לא ניתן לשלוח הצעות נוספות למשרה זו.
                        </p>
                      </div>
                    </div>
                  )}

                  {enrichedWorkers!.map((w, i) => (
                    <motion.div
                      key={w.worker_id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <WorkerMatchCard
                        worker={w}
                        jobId={jobId}
                        onOfferSent={handleOfferSent}
                        onCardClick={(id) => setSelectedWorkerId(id)}
                        isCapReached={job?.status === "closed" && job?.closedReason === "cap_reached"}
                      />
                    </motion.div>
                  ))}
                  {offeredWorkers.size > 0 && (
                    <p className="text-xs text-center py-2" style={{ color: "oklch(0.55 0.04 122)" }}>
                      {offeredWorkers.size} הצעות נשלחו
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: C_LIGHT_GREEN }}
                  >
                    <User className="h-7 w-7" style={{ color: C_DARK }} />
                  </div>
                  <p className="font-bold mb-1" style={{ color: C_DARK }}>
                    לא נמצאו עובדים מתאימים כרגע
                  </p>
                  <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.04 122)" }}>
                    ה-API החיצוני לא מוגדר עדיין, או שאין עובדים מתאימים
                  </p>
                  <button
                    onClick={() => { setHasSearched(false); setMatchedWorkers(null); }}
                    className="text-sm font-bold underline"
                    style={{ color: C_GREEN }}
                  >
                    נסה שוב
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Worker profile bottom sheet */}
      <WorkerProfileSheet
        workerId={selectedWorkerId}
        onClose={() => setSelectedWorkerId(null)}
      />
    </div>
  );
}

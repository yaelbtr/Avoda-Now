import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const C_BG = "#fefcf4";
const C_DARK = "oklch(0.28 0.06 122)";
const C_GREEN = "oklch(0.38 0.10 125)";
const C_LIGHT_GREEN = "oklch(0.92 0.05 122)";
const C_BORDER = "oklch(0.90 0.04 91.6)";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedWorker {
  worker_id: number;
  score: number;
  name?: string;
  distance?: number;
  rating?: number;
  isMinor?: boolean;
  availabilityStatus?: "available_now" | "available_today" | "available_hours" | "not_available" | null;
  preferredCategories?: string[];
  categoryCount?: number;
}

const AVAILABILITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  available_now: { label: "זמין עכשיו", color: "#166534", bg: "#dcfce7" },
  available_today: { label: "זמין היום", color: "#92400e", bg: "#fef3c7" },
  available_hours: { label: "זמין בשעות", color: "#1e40af", bg: "#dbeafe" },
  not_available: { label: "לא זמין", color: "#6b7280", bg: "#f3f4f6" },
};

// ─── Worker Card ──────────────────────────────────────────────────────────────

function WorkerMatchCard({
  worker,
  jobId,
  onOfferSent,
}: {
  worker: MatchedWorker;
  jobId: number;
  onOfferSent: (workerId: number) => void;
}) {
  const [offerSent, setOfferSent] = useState(false);

  const sendOffer = trpc.jobs.sendJobOffer.useMutation({
    onSuccess: (data) => {
      setOfferSent(true);
      onOfferSent(worker.worker_id);
      if (data.stub) {
        toast.success("ההצעה נשלחה (מצב בדיקה — API חיצוני לא מוגדר עדיין)");
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
  const availability = worker.availabilityStatus
    ? AVAILABILITY_MAP[worker.availabilityStatus]
    : null;
  const categoryBadge =
    worker.categoryCount === 1
      ? "רק הקטגוריה הזו"
      : worker.categoryCount && worker.categoryCount > 1
      ? `${worker.categoryCount} קטגוריות`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: "white", border: `1px solid ${C_BORDER}` }}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: C_LIGHT_GREEN }}
      >
        <User className="h-6 w-6" style={{ color: C_DARK }} />
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
          {availability && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: availability.bg, color: availability.color }}
            >
              {availability.label}
            </span>
          )}
          {categoryBadge && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#eef2ff", color: "#4338ca" }}
              title={worker.preferredCategories?.join(", ") || undefined}
            >
              {categoryBadge}
            </span>
          )}
          {/* Distance */}
          {worker.distance != null && (
            <span className="text-xs flex items-center gap-0.5" style={{ color: "oklch(0.55 0.04 122)" }}>
              <MapPin className="h-3 w-3" />
              {worker.distance < 1
                ? `${Math.round(worker.distance * 1000)} מ'`
                : `${worker.distance.toFixed(1)} ק"מ`}
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

      {/* Action button */}
      {offerSent ? (
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
          style={{ background: C_LIGHT_GREEN, color: C_DARK }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          נשלח
        </div>
      ) : (
        <button
          onClick={() => sendOffer.mutate({ jobId, workerId: worker.worker_id })}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatchedWorkers() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [offeredWorkers, setOfferedWorkers] = useState<Set<number>>(new Set());

  // Get jobId from URL query param
  const jobId = parseInt(new URLSearchParams(window.location.search).get("jobId") ?? "0");

  const { data: job } = trpc.jobs.getById.useQuery(
    { id: jobId },
    { enabled: !!jobId && isAuthenticated }
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
          onClick={() => navigate(-1 as unknown as string)}
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
                  {/*
                    ה-API החיצוני לא מוגדר עדיין, או שאין עובדים מתאימים
                  */}
                  <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.04 122)" }}>
                    {"\u05e0\u05e8\u05d0\u05d4 \u05e9\u05db\u05e8\u05d2\u05e2 \u05d0\u05d9\u05df \u05e2\u05d5\u05d1\u05d3\u05d9\u05dd \u05e9\u05d4\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc \u05e9\u05dc\u05d4\u05dd \u05de\u05ea\u05d0\u05d9\u05dd \u05dc\u05de\u05e9\u05e8\u05d4"}
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
    </div>
  );
}

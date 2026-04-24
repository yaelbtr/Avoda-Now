/**
 * WorkerLandingPage — /work/:slug
 *
 * Pre-activation landing page for a specific region.
 * Workers can join before employers are activated, building a supply-side
 * pool that triggers the region's "active" status once the threshold is met.
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/ui";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { MapPin, Users, CheckCircle2, Clock, ChevronLeft, Star, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const SITE_URL = "https://avodanow.co.il";

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, required }: { current: number; required: number }) {
  const pct = Math.min(100, Math.round((current / required) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1.5" dir="rtl">
        <span className="font-semibold text-olive-800">{current} עובדים הצטרפו</span>
        <span className="text-olive-500">יעד: {required}</span>
      </div>
      <div className="h-3 rounded-full bg-olive-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-amber-500 to-olive-600"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-olive-500 mt-1 text-center">
        {pct < 100
          ? `עוד ${required - current} עובדים נדרשים לפתיחת האזור`
          : "האזור מוכן לפתיחה! 🎉"}
      </p>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
        <CheckCircle2 className="h-4 w-4" />
        האזור פעיל
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        <Clock className="h-4 w-4" />
        מושהה זמנית
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <Clock className="h-4 w-4" />
      בהרצה — נפתח בקרוב
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorkerLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { setUserMode } = useUserMode();

  const { data: region, isLoading, error } = trpc.regions.getBySlug.useQuery(
    { slug: slug ?? "" },
    {
      enabled: !!slug,
      // Poll every 30 seconds to show real-time worker count updates
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
    }
  );

  useSEO({
    title: region
      ? `הצטרף לעובדים ב${region.name} | YallaAvoda`
      : "הצטרף כעובד | YallaAvoda",
    description: region
      ? `הצטרף לרשימת העובדים ב${region.name} ותהיה הראשון לקבל הצעות עבודה כשהאזור נפתח.`
      : "הצטרף לפלטפורמת YallaAvoda וקבל עבודות קרוב אליך.",
    canonical: `/work/${slug}`,
  });

  const handleJoin = () => {
    if (!isAuthenticated) {
      // Redirect to login, then back to worker profile
      window.location.href = getLoginUrl("/worker-profile");
      return;
    }
    // Set mode to worker and navigate to profile setup
    setUserMode("worker");
    navigate("/worker-profile");
    toast.success("מעולה! השלם את הפרופיל שלך כדי להצטרף לאזור");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-olive-50" dir="rtl">
        <div className="animate-pulse text-olive-600 text-lg">טוען...</div>
      </div>
    );
  }

  if (error || !region) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-olive-50 px-4" dir="rtl">
        <MapPin className="h-12 w-12 text-olive-300" />
        <h1 className="text-xl font-bold text-olive-800">האזור לא נמצא</h1>
        <p className="text-olive-500 text-center">לא מצאנו אזור בשם זה. בדוק את הקישור ונסה שוב.</p>
        <AppButton variant="brand" onClick={() => navigate("/")}>חזור לדף הבית</AppButton>
      </div>
    );
  }

  const isActive = region.status === "active";
  const pct = Math.min(100, Math.round((region.currentWorkers / region.minWorkersRequired) * 100));

  return (
    <div className="min-h-screen bg-olive-50" dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.28 0.06 122) 0%, oklch(0.38 0.09 122) 100%)",
          minHeight: "360px",
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-2xl mx-auto px-4 py-12 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <MapPin className="h-4 w-4 text-amber-300" />
              <span className="text-white/90">{region.centerCity}</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
              הצטרף לעובדים ב{region.name}
            </h1>
            <p className="text-white/80 text-lg mb-6 max-w-md mx-auto">
              {region.description ??
                `היה בין הראשונים לקבל עבודות ב${region.name}. הצטרף עכשיו ותהיה מוכן כשהמעסיקים מגיעים.`}
            </p>

            <StatusBadge status={region.status} />
          </motion.div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 40 C360 0 1080 0 1440 40 L1440 40 L0 40 Z" fill="oklch(0.97 0.01 122)" />
          </svg>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Progress card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-olive-600" />
            <h2 className="font-bold text-olive-800 text-lg">התקדמות האזור</h2>
          </div>
          <ProgressBar current={region.currentWorkers} required={region.minWorkersRequired} />

          {/* Real-time update indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-olive-400">ספירה בזמן אמת כל 30 שניות</span>
          </div>

          {isActive && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center font-medium">
              🎉 האזור פעיל! מעסיקים יכולים לפרסם עבודות עכשיו.
            </div>
          )}
        </motion.div>

        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-olive-800 mb-2">
            {isActive ? "האזור פעיל — הגש מועמדות עכשיו!" : "הצטרף לרשימת המתנה"}
          </h2>
          <p className="text-olive-500 mb-5 text-sm">
            {isActive
              ? "מעסיקים מחפשים עובדים עכשיו. הגדר את הפרופיל שלך וקבל עבודות."
              : `כשיצטרפו ${region.minWorkersRequired - region.currentWorkers} עובדים נוספים, האזור ייפתח למעסיקים ותתחיל לקבל הצעות עבודה.`}
          </p>
          <AppButton
            variant="brand"
            className="w-full text-base py-3"
            onClick={handleJoin}
          >
            {isAuthenticated
              ? (isActive ? "חפש עבודות עכשיו" : "הצטרף לאזור")
              : "הצטרף בחינם"}
          </AppButton>
          {!isAuthenticated && (
            <p className="text-xs text-olive-400 mt-2">הרשמה מהירה עם מספר טלפון בלבד</p>
          )}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6"
        >
          <h2 className="font-bold text-olive-800 text-lg mb-4">למה להצטרף?</h2>
          <div className="space-y-3">
            {[
              { icon: "⚡", title: "עבודות מיידיות", desc: "קבל הצעות עבודה ישירות לטלפון ברגע שמעסיק מפרסם" },
              { icon: "📍", title: "קרוב לבית", desc: `עבודות ב${region.name} ובסביבה, בתוך רדיוס של ${region.activationRadiusKm} ק\"מ` },
              { icon: "💰", title: "תשלום הוגן", desc: "ניקיון, אירועים, גינון, תיקונים ועוד — בתעריפים שוק" },
              { icon: "🌟", title: "בנה מוניטין", desc: "צבור ביקורות חיוביות ותהיה הבחירה הראשונה של מעסיקים" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold text-olive-800 text-sm">{item.title}</p>
                  <p className="text-olive-500 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Other regions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={() => navigate("/find-jobs")}
            className="inline-flex items-center gap-1 text-sm text-olive-500 hover:text-olive-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            חפש עבודות בכל הארץ
          </button>
        </motion.div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import {
  Search, MapPin, Loader2, ChevronLeft, Flame, Zap,
  CheckCircle2, Phone, Map, List, ArrowLeft, Briefcase, Info,
  Clock, Star, TrendingUp,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import ActivityTicker from "@/components/ActivityTicker";
import CarouselJobCard from "@/components/CarouselJobCard";
import LiveStats from "@/components/LiveStats";
import NearbyJobsMap from "@/components/NearbyJobsMap";

const CATEGORIES = [
  { value: "kitchen", label: "מסעדות", icon: "🍳" },
  { value: "warehouse", label: "מחסנים", icon: "📦" },
  { value: "delivery", label: "שליחויות", icon: "🚴" },
  { value: "events", label: "אירועים", icon: "🎉" },
  { value: "retail", label: "חנויות", icon: "🛍️" },
  { value: "cleaning", label: "ניקיון", icon: "🧹" },
  { value: "construction", label: "בנייה", icon: "🏗️" },
  { value: "agriculture", label: "חקלאות", icon: "🌾" },
];

const HOW_IT_WORKS = [
  { icon: Search, step: "1", title: "מצא עבודה", desc: "חפש לפי קטגוריה, מיקום, או עיין בעבודות הדחופות" },
  { icon: Phone, step: "2", title: "צור קשר", desc: "התקשר ישירות למעסיק או שלח הודעת WhatsApp בלחיצה אחת" },
  { icon: CheckCircle2, step: "3", title: "התחל לעבוד", desc: "הגע למקום ותתחיל לעבוד — לרוב עוד באותו יום" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { delay, duration: 0.5, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] } }),
};

interface HomeWorkerProps {
  onLoginRequired: (msg: string) => void;
}

export default function HomeWorker({ onLoginRequired }: HomeWorkerProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resetUserMode } = useUserMode();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(5);
  const [showMap, setShowMap] = useState(false);
  const [geoRequested, setGeoRequested] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<2 | 4 | 8>(4);
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const urgentQuery = trpc.jobs.listUrgent.useQuery({ limit: 4 });
  const todayQuery = trpc.jobs.listToday.useQuery({ limit: 4 });
  const nearbyQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm: nearbyRadius, limit: 12 },
    { enabled: !!userLat }
  );
  const latestQuery = trpc.jobs.list.useQuery({ limit: 6 });
  const workerStatusQuery = trpc.workers.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const setAvailableMutation = trpc.workers.setAvailable.useMutation({
    onSuccess: () => { workerStatusQuery.refetch(); setAvailabilityLoading(false); },
    onError: () => setAvailabilityLoading(false),
  });
  const setUnavailableMutation = trpc.workers.setUnavailable.useMutation({
    onSuccess: () => { workerStatusQuery.refetch(); setAvailabilityLoading(false); },
    onError: () => setAvailabilityLoading(false),
  });

  const urgentJobs = urgentQuery.data ?? [];
  const todayJobs = todayQuery.data ?? [];
  const jobs = userLat ? (nearbyQuery.data ?? []) : (latestQuery.data ?? []);
  const isLoading = userLat ? nearbyQuery.isLoading : latestQuery.isLoading;
  const isAvailable = !!workerStatusQuery.data;

  const requestGeo = () => {
    setGeoRequested(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  };

  const handleAvailabilityToggle = () => {
    if (!isAuthenticated) { onLoginRequired("כדי לסמן זמינות יש להתחבר למערכת"); return; }
    if (isAvailable) {
      setAvailabilityLoading(true);
      setUnavailableMutation.mutate();
    } else {
      setDurationOpen(true);
    }
  };

  const confirmAvailability = (hours: 2 | 4 | 8) => {
    setSelectedDuration(hours);
    setDurationOpen(false);
    setAvailabilityLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAvailableMutation.mutate({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: undefined,
            durationHours: hours,
          });
        },
        () => {
          setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: hours });
        }
      );
    } else {
      setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: hours });
    }
  };

  return (
    <div dir="rtl" style={{ background: "oklch(0.10 0.015 265)" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(160deg, oklch(0.12 0.030 255) 0%, oklch(0.15 0.035 275) 40%, oklch(0.11 0.025 295) 100%)",
          minHeight: "420px",
        }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -15, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.62 0.22 255 / 0.18) 0%, transparent 70%)" }}
          />
          <motion.div
            animate={{ x: [0, -18, 0], y: [0, 22, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.78 0.17 65 / 0.14) 0%, transparent 70%)" }}
          />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-10">
          {/* Top badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="flex justify-center mb-6"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{
                background: "oklch(1 0 0 / 8%)",
                border: "1px solid oklch(1 0 0 / 15%)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Briefcase className="h-4 w-4 text-blue-300" />
              מצא עבודה זמנית באזורך — היום
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="text-center mb-6"
          >
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-3">
              עבודות דחופות
              <br />
              <span className="gradient-text text-glow">מחכות לך עכשיו</span>
            </h1>
            <p className="text-white/60 text-base max-w-sm mx-auto leading-relaxed">
              קשר ישיר עם מעסיקים — ללא תיווך, ללא עמלות
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto mb-6"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                size="lg"
                className="w-full font-bold text-base h-12 gap-2 shadow-xl"
                style={{
                  background: "linear-gradient(135deg, oklch(0.78 0.17 65) 0%, oklch(0.68 0.22 50) 100%)",
                  color: "oklch(0.12 0.02 265)",
                  border: "none",
                  boxShadow: "0 8px 24px oklch(0.78 0.17 65 / 0.35)",
                }}
                onClick={() => navigate("/find-jobs")}
              >
                <Search className="h-5 w-5" />
                חפש עבודה עכשיו
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                size="lg"
                variant="outline"
                className="w-full font-bold text-base h-12 gap-2"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  border: "1px solid oklch(1 0 0 / 20%)",
                  color: "white",
                  backdropFilter: "blur(12px)",
                }}
                onClick={() => navigate("/jobs-today")}
              >
                <Flame className="h-5 w-5 text-orange-300" />
                עבודות להיום
              </Button>
            </motion.div>
          </motion.div>

          {/* Availability card */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
            className="max-w-sm mx-auto"
          >
            <div className="flex items-center gap-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={handleAvailabilityToggle}
                      disabled={availabilityLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300"
                      style={{
                        background: isAvailable
                          ? "linear-gradient(135deg, oklch(0.25 0.08 160) 0%, oklch(0.20 0.06 155) 100%)"
                          : "oklch(1 0 0 / 8%)",
                        border: isAvailable
                          ? "1px solid oklch(0.65 0.22 160 / 0.5)"
                          : "1px solid oklch(1 0 0 / 15%)",
                        backdropFilter: "blur(12px)",
                        boxShadow: isAvailable
                          ? "0 0 20px oklch(0.65 0.22 160 / 0.25)"
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {availabilityLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                        ) : (
                          <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAvailable ? "bg-green-400" : "bg-white/40"}`} />
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isAvailable ? "bg-green-400" : "bg-white/40"}`} />
                          </span>
                        )}
                        <span className="font-semibold text-sm text-white">
                          {isAvailable ? `פנוי לעבוד — ${selectedDuration}ש'` : "סמן את עצמך כזמין"}
                        </span>
                      </div>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: isAvailable ? "oklch(0.65 0.22 160 / 0.25)" : "oklch(1 0 0 / 12%)",
                          color: isAvailable ? "oklch(0.85 0.15 160)" : "oklch(1 0 0 / 60%)",
                        }}
                      >
                        {isAvailable ? "פעיל" : "לחץ"}
                      </span>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-right" dir="rtl">
                    <p className="font-semibold text-sm mb-1">
                      {isAvailable ? "אתה מסומן כזמין" : "סמן זמינות"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAvailable
                        ? `מעסיקים באזורך רואים אותך. הזמינות תתבטל אוטומטית לאחר ${selectedDuration} שעות, או לחץ שוב לביטול.`
                        : "תבחר כמה שעות אתה פנוי ותוסף לרשימת העובדים הזמינים."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <motion.button
                onClick={() => setInfoOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-colors"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  border: "1px solid oklch(1 0 0 / 15%)",
                }}
                aria-label="מידע נוסף"
              >
                <Info className="h-4 w-4 text-white/60" />
              </motion.button>
            </div>
          </motion.div>

          {/* Profile shortcut */}
          {isAuthenticated && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.4}
              className="text-center mt-3"
            >
              <button
                onClick={() => navigate("/worker-profile")}
                className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                עדכן קטגוריות מועדפות לקבלת התראות
                <ArrowLeft className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </div>
      </section>

      <ActivityTicker />
      <LiveStats mode="worker" />

      {/* ── Urgent Jobs Carousel ──────────────────────────────────────────── */}
      {(urgentJobs.length > 0 || todayJobs.length > 0 || urgentQuery.isLoading || todayQuery.isLoading) && (() => {
        const allCarouselJobs = [
          ...urgentJobs.map((j) => ({ job: j, badge: "urgent" as const })),
          ...todayJobs
            .filter((j) => !urgentJobs.some((u) => u.id === j.id))
            .map((j) => ({ job: j, badge: "today" as const })),
        ];
        const total = allCarouselJobs.length;
        return (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="pt-6"
          >
            <div className="max-w-2xl mx-auto px-4 flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-red-400 fill-red-400" />
                עבודות דחופות ולהיום
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/find-jobs?urgent=1")}
                className="gap-1 text-white/50 hover:text-white text-xs"
              >
                כל העבודות
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            {(urgentQuery.isLoading || todayQuery.isLoading) ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : (
              <div className="relative">
                {activeCarouselIdx < total - 1 && (
                  <button
                    onClick={() => {
                      const el = document.getElementById("job-carousel");
                      if (el) el.scrollBy({ left: -300, behavior: "smooth" });
                      setActiveCarouselIdx((i) => Math.min(i + 1, total - 1));
                    }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
                    style={{
                      background: "oklch(0.18 0.025 265)",
                      border: "1px solid oklch(1 0 0 / 12%)",
                    }}
                    aria-label="הקודם"
                  >
                    <ChevronLeft className="h-4 w-4 text-white/70" />
                  </button>
                )}
                {activeCarouselIdx > 0 && (
                  <button
                    onClick={() => {
                      const el = document.getElementById("job-carousel");
                      if (el) el.scrollBy({ left: 300, behavior: "smooth" });
                      setActiveCarouselIdx((i) => Math.max(i - 1, 0));
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
                    style={{
                      background: "oklch(0.18 0.025 265)",
                      border: "1px solid oklch(1 0 0 / 12%)",
                    }}
                    aria-label="הבא"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-180 text-white/70" />
                  </button>
                )}

                <div
                  id="job-carousel"
                  className="flex gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const cardWidth = el.scrollWidth / total;
                    const idx = Math.round(el.scrollLeft / cardWidth);
                    setActiveCarouselIdx(idx);
                  }}
                >
                  {allCarouselJobs.map(({ job, badge }) => (
                    <div key={`${badge}-${job.id}`} className="snap-start shrink-0 w-[78vw] max-w-[300px]">
                      <CarouselJobCard
                        job={{ ...job, salary: job.salary ?? null, businessName: job.businessName ?? null }}
                        badge={badge}
                        onLoginRequired={onLoginRequired}
                      />
                    </div>
                  ))}
                </div>

                {total > 1 && (
                  <div className="flex justify-center gap-1.5 mt-2">
                    {allCarouselJobs.map((_, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full transition-all duration-300"
                        style={{
                          width: i === activeCarouselIdx ? "16px" : "8px",
                          height: "8px",
                          background: i === activeCarouselIdx
                            ? "oklch(0.78 0.17 65)"
                            : "oklch(1 0 0 / 20%)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.section>
        );
      })()}

      {/* ── Wartime & Passover ───────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="max-w-2xl mx-auto px-4 pt-6"
      >
        <div
          className="rounded-3xl p-5"
          style={{
            background: "linear-gradient(135deg, oklch(0.18 0.04 285) 0%, oklch(0.15 0.03 295) 100%)",
            border: "1px solid oklch(1 0 0 / 10%)",
          }}
        >
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            🆘 סיוע בזמן חירום ועבודות לפסח
          </h2>
          <p className="text-sm text-white/50 mb-4">
            עבודות התנדבותיות ובתשלום לסיוע לקהילה, למשפחות מילואימניקים, ולקראת הפסח
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "emergency_support", label: "סיוע בזמן חירום", icon: "🆘", color: "oklch(0.62 0.22 280)" },
              { value: "reserve_families", label: "משפחות מילואימניקים", icon: "🪖", color: "oklch(0.62 0.22 280)" },
              { value: "passover_jobs", label: "עבודות לפסח", icon: "🫓", color: "oklch(0.78 0.17 65)" },
              { value: "volunteer", label: "התנדבות", icon: "💚", color: "oklch(0.65 0.22 160)" },
            ].map((cat) => (
              <motion.button
                key={cat.value}
                onClick={() => navigate(`/find-jobs?category=${cat.value}`)}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 p-3 rounded-2xl text-right transition-all"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                }}
              >
                <span className="text-2xl shrink-0">{cat.icon}</span>
                <p className="text-sm font-semibold text-white/80 leading-tight">{cat.label}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="max-w-2xl mx-auto px-4 py-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">חפש לפי קטגוריה</h2>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.value}
              onClick={() => navigate(`/find-jobs?category=${cat.value}`)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.3 }}
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 8%)",
              }}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-white/60 leading-tight">{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Nearby / Latest jobs ─────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {userLat ? (
              <><MapPin className="h-5 w-5 text-blue-400" />עבודות קרובות אליך</>
            ) : (
              <><TrendingUp className="h-5 w-5 text-blue-400" />משרות אחרונות</>
            )}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/find-jobs")}
            className="gap-1 text-white/50 hover:text-white text-xs"
          >
            כל המשרות
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {!userLat && !geoRequested && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 mb-4 text-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.16 0.04 255) 0%, oklch(0.14 0.03 265) 100%)",
              border: "1px solid oklch(0.62 0.22 255 / 0.25)",
            }}
          >
            <MapPin className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white mb-1">רוצה לראות עבודות קרובות אליך?</p>
            <p className="text-xs text-white/50 mb-3">אפשר גישה למיקום להצגת עבודות באזור שלך</p>
            <Button
              size="sm"
              onClick={requestGeo}
              className="gap-2"
              style={{
                background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                border: "none",
              }}
            >
              <MapPin className="h-4 w-4" />
              אפשר גישה למיקום
            </Button>
          </motion.div>
        )}

        {userLat && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-white/40">רדיוס:</span>
            {[1, 3, 5].map((km) => (
              <button
                key={km}
                onClick={() => setNearbyRadius(km)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: nearbyRadius === km ? "oklch(0.62 0.22 255)" : "oklch(1 0 0 / 6%)",
                  border: nearbyRadius === km ? "1px solid oklch(0.62 0.22 255)" : "1px solid oklch(1 0 0 / 12%)",
                  color: nearbyRadius === km ? "white" : "oklch(1 0 0 / 50%)",
                }}
              >
                {km} ק"מ
              </button>
            ))}
            <div className="mr-auto flex gap-1">
              <button
                onClick={() => setShowMap(false)}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  background: !showMap ? "oklch(0.62 0.22 255)" : "oklch(1 0 0 / 6%)",
                  border: !showMap ? "1px solid oklch(0.62 0.22 255)" : "1px solid oklch(1 0 0 / 12%)",
                }}
              >
                <List className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => setShowMap(true)}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  background: showMap ? "oklch(0.62 0.22 255)" : "oklch(1 0 0 / 6%)",
                  border: showMap ? "1px solid oklch(0.62 0.22 255)" : "1px solid oklch(1 0 0 / 12%)",
                }}
              >
                <Map className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/30" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין משרות בטווח {nearbyRadius} ק"מ</p>
            <p className="text-xs mt-1">נסה להרחיב את הרדיוס או לחפש בכל המשרות</p>
            <Button className="mt-4" onClick={() => navigate("/find-jobs")}>כל המשרות</Button>
          </div>
        ) : showMap && userLat ? (
          <NearbyJobsMap jobs={jobs} userLat={userLat} userLng={userLng!} />
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
              >
                <JobCard
                  job={{
                    ...job,
                    salary: job.salary ?? null,
                    businessName: job.businessName ?? null,
                    distance: "distance" in job ? (job as { distance: number }).distance : undefined,
                  }}
                  showDistance={!!userLat}
                  onLoginRequired={onLoginRequired}
                />
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && !showMap && jobs.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => navigate("/find-jobs")}
              className="gap-2"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 12%)",
                color: "oklch(1 0 0 / 70%)",
              }}
            >
              <Search className="h-4 w-4" />
              חפש עוד משרות
            </Button>
          </div>
        )}
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="border-y"
        style={{
          background: "oklch(0.13 0.02 265)",
          borderColor: "oklch(1 0 0 / 8%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h2 className="text-xl font-bold text-white mb-8 text-center">איך זה עובד?</h2>
          <div className="grid grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.62 0.22 255 / 0.2) 0%, oklch(0.55 0.25 280 / 0.1) 100%)",
                    border: "1px solid oklch(0.62 0.22 255 / 0.25)",
                  }}
                >
                  <Icon className="h-6 w-6 text-blue-400" />
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, oklch(0.78 0.17 65) 0%, oklch(0.68 0.22 50) 100%)" }}
                  >
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white mb-1">{title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Switch role ─────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-6 text-center">
        <p className="text-sm text-white/30 mb-2">גם מעסיק? עבור למצב מעסיק</p>
        <Button
          variant="outline"
          size="sm"
          onClick={resetUserMode}
          className="gap-2"
          style={{
            background: "oklch(1 0 0 / 5%)",
            border: "1px solid oklch(1 0 0 / 12%)",
            color: "oklch(1 0 0 / 50%)",
          }}
        >
          🔄 שנה תפקיד
        </Button>
      </section>

      {/* ── Info Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">
              {isAvailable ? "אתה מסומן כזמין כעת" : 'מה זה "סמן עצמך כזמין"?'}
            </DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              {isAvailable ? (
                <span>
                  מעסיקים באזורך רואים אותך ברשימת העובדים הזמינים ויכולים לפנות אליך ישירות.
                  הזמינות תתבטל אוטומטית לאחר {selectedDuration} שעות, או לחץ שוב על הכפתור לביטול מיידי.
                </span>
              ) : (
                <span>
                  לחיצה תוסיף אותך לרשימת העובדים הזמינים שמעסיקים רואים.
                  <br /><br />
                  כשתסמן זמינות:
                  <br />• המיקום שלך יישמר כדי שמעסיקים באזורך יראו אותך ראשון
                  <br />• תבחר כמה שעות אתה פנוי (2, 4, או 8 שעות)
                  <br />• מעסיקים יוכלו לפנות אליך ישירות דרך הטלפון
                  <br />• הזמינות תתבטל אוטומטית בסוף הזמן שבחרת
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-2">
            <Button onClick={() => setInfoOpen(false)} size="sm">סגור</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Duration Picker Dialog ───────────────────────────────────────── */}
      <Dialog open={durationOpen} onOpenChange={setDurationOpen}>
        <DialogContent dir="rtl" className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-right">כמה שעות אתה פנוי?</DialogTitle>
            <DialogDescription className="text-right">
              בחר את משך הזמינות. הזמינות תתבטל אוטומטית בסוף הזמן.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {([2, 4, 8] as const).map((h) => (
              <motion.button
                key={h}
                onClick={() => confirmAvailability(h)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center justify-center py-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all font-bold text-foreground"
              >
                <span className="text-2xl font-extrabold text-primary">{h}</span>
                <span className="text-xs text-muted-foreground mt-1">שעות</span>
              </motion.button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setDurationOpen(false)}>ביטול</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

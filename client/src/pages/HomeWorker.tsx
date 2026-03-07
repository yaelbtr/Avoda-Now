import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import {
  Search, MapPin, ChevronLeft, Zap,
  Map, List, ArrowLeft, TrendingUp, Star,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import CarouselJobCard from "@/components/CarouselJobCard";
import { JobCardSkeletonList, CarouselSkeletonRow } from "@/components/JobCardSkeleton";
import NearbyJobsMap from "@/components/NearbyJobsMap";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "מחפשים עבודה",
    desc: "עינו במגוון עבודות בסביבה הקרובה אלייך.",
    imgUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamn2qup2cLZLS0F7g_ak0WLTInI6W80vxhpKaOVS5LvEDl1LbNhdRUjazjOJujODYDKCCm0wVmr68y6wo4HiA7bPMUmFZ4hEQMndLqGlbGLjfLqtiqyD2AMY9TidSzS_hPgu5Ur5Z2MBpFBvusjARNnk7FNagj5vM5F9-d-Okq_vbnvzcmYLSObdJ9OJMzZZWzrsgw3HIN_x9coQBlKMfGlWR0eNLV0mX2VSSizcok2morIGRV6Ge2fGy_kA6s1H6jaOUll8DcA",
    reverse: false,
  },
  {
    step: "02",
    title: "סוגרים פרטים",
    desc: "שיחה קצרה עם המפרסמים בטלפון או בוואטסאפ.",
    imgUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAStrMaRfZDifQeV-VACZz7ZypB1K8qO0mfWH-7GKp9zP5N0IFSgQpYT8gGJfOxyxssudU0ma8TE9HYWViNqn1eNoc7_qkfar8L0c38K28sRu-_lwd2DFueAtvndwsNLlxCicO5asK-g-NFLhaSWhOxM5Lx7tQalZGYbZlc-cGOJHfX0VMMQvGKi69yA7_YyxYFmg51eaSrjgIb2kEHbOcTexFsWld1x3UCbPcBhX92Us5OHKPCI2Wbzy1VcqYfh8U6aCD_3lOdng",
    reverse: true,
  },
  {
    step: "03",
    title: "מתחילים להרוויח",
    desc: "ביצוע העבודה וקבלת תשלום מיידי בסיום.",
    imgUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmsOM6ool_591rxa3QrTQJ_siNP3M919Xa5n12iJHU9-myKDCxxkIXJLVpXND4AON1Q8eRBnMPtrBeggN_C4S0lJ5lumxRI4XROt9rXnjP5Krt1MAn8P4EnpBkn24bwAgR163Pw2pImLomXOGNpz-MCOZ8aI6DDwDbqiFoOBi2D-UsT1OV5mTJyv3BKGljWdOH2cGAdggVOjFgQ0oQ8lCPYfY4Fgpq2UzIf2KqNukQ6Z4NgQAXUPUyrHbEzkXWFccR4AfTBcUzbw",
    reverse: false,
  },
];

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
  const autoScrollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = React.useRef(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    autoScrollRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const el = document.getElementById("job-carousel");
      if (!el) return;
      const cardWidth = 288 + 16;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        setActiveCarouselIdx(0);
      } else {
        el.scrollBy({ left: -cardWidth, behavior: "smooth" });
        setActiveCarouselIdx((i) => i + 1);
      }
    }, 3000);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
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
          setAvailableMutation.mutate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, city: undefined, durationHours: hours });
        },
        () => {
          setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: hours });
        }
      );
    } else {
      setAvailableMutation.mutate({ latitude: 31.7683, longitude: 35.2137, durationHours: hours });
    }
  };

  const allCarouselJobs = [
    ...urgentJobs.map((j) => ({ job: j, badge: "urgent" as const })),
    ...todayJobs.filter((j) => !urgentJobs.some((u) => u.id === j.id)).map((j) => ({ job: j, badge: "today" as const })),
  ];
  const carouselTotal = allCarouselJobs.length;

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden relative" style={{ backgroundColor: "var(--page-bg)" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden" style={{ minHeight: "420px" }}>
        {/* Full background image */}
        <div className="absolute inset-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-workers-blue-sky_50074f55.jpg"
            alt=""
            className="w-full h-full object-cover object-top"
            aria-hidden="true"
            style={{ display: "block" }}
          />
          {/* Olive-green brand overlay — matches app palette */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, oklch(0.28 0.06 122 / 0.68) 0%, oklch(0.24 0.05 122 / 0.78) 55%, oklch(0.20 0.04 122 / 0.94) 100%)",
            }}
          />
          {/* Subtle amber highlight at top center */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.75 0.12 80 / 0.12) 0%, transparent 60%)",
            }}
          />
          {/* Bottom fade into page bg */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, var(--page-bg) 100%)",
            }}
          />
        </div>

        {/* Content — all white on dark background */}
        <div className="relative z-10 px-6 pt-14 pb-12 text-center max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
            style={{
              background: "oklch(1 0 0 / 0.12)",
              border: "1px solid oklch(1 0 0 / 0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--citrus)" }} />
            <span className="text-[11px] font-extrabold tracking-wide" style={{ color: "oklch(0.95 0.05 80)", letterSpacing: "0.06em" }}>
              הדרך המהירה למצוא עבודה
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[38px] leading-[1.12] font-black mb-4"
            style={{ color: "oklch(0.97 0.01 80)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 2px 12px oklch(0 0 0 / 0.4)" }}
          >
            עבודות מזדמנות<br />
            <span
              style={{
                background: "linear-gradient(135deg, var(--citrus) 0%, oklch(0.82 0.18 75) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 1px 4px oklch(0 0 0 / 0.3))",
              }}
            >
              מחכות לך עכשיו
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[15px] font-medium max-w-[300px] mx-auto leading-relaxed"
            style={{ color: "oklch(0.88 0.02 80)", textShadow: "0 1px 4px oklch(0 0 0 / 0.3)" }}
          >
            קשר ישיר עם מי שצריכים אותך — ללא עמלות ובהתאמה אישית
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-6 mt-8"
          >
            {[
              { value: "+500", label: "עבודות פעילות" },
              { value: "100%", label: "ללא עמלות" },
              { value: "24/7", label: "זמין תמיד" },
            ].map(({ value, label }, i) => (
              <div key={label} className="text-center">
                {i > 0 && (
                  <div className="absolute" style={{ display: "none" }} />
                )}
                <div className="text-[24px] font-black leading-none" style={{ color: "oklch(0.97 0.01 80)", textShadow: "0 1px 6px oklch(0 0 0 / 0.4)" }}>{value}</div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: "oklch(0.78 0.05 80)" }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="relative z-10 mx-6 mb-12 rounded-[28px] p-7 max-w-lg"
        style={{
          background: "white",
          boxShadow: "0 4px 24px oklch(0.38 0.07 125.0 / 0.10), 0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
          border: "1px solid oklch(0.89 0.05 84.0)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-7">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.75 0.12 76.7 / 0.15)" }}>
            <Star className="h-4 w-4" style={{ color: "var(--amber)" }} />
          </div>
          <h3 className="text-lg font-black" style={{ color: "var(--brand)" }}>איך זה עובד?</h3>
        </div>

        <div className="space-y-3 mb-8">
          {HOW_IT_WORKS.map(({ step, title, desc, imgUrl, reverse }, idx) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reverse ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className={"flex items-center gap-4 p-4 rounded-2xl overflow-hidden" + (reverse ? " flex-row-reverse" : "")}
              style={{
                background: "linear-gradient(135deg, oklch(0.97 0.015 122.3) 0%, oklch(0.95 0.02 91.6) 100%)",
                border: "1px solid oklch(0.89 0.05 84.0)",
              }}
            >
              <div
                className="flex-shrink-0 w-24 h-20 text-center text-[72px] font-black leading-none select-none flex items-center justify-center"
                style={{
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  backgroundImage: `url("${imgUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "saturate(1.4) contrast(1.1) brightness(0.85)",
                } as React.CSSProperties}
              >
                {step}
              </div>
              <div className="flex-1 text-right">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold mb-1.5" style={{ background: "oklch(0.75 0.12 76.7 / 0.15)", color: "var(--amber-dark)" }}>
                  שלב {idx + 1}
                </div>
                <h4 className="text-[15px] font-black mb-1" style={{ color: "var(--brand)" }}>{title}</h4>
                <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          onClick={() => navigate("/find-jobs")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-black transition-all"
          style={{
            background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)",
            color: "white",
            boxShadow: "0 4px 16px oklch(0.38 0.07 125.0 / 0.35)",
          }}
        >
          חיפוש עבודה מזדמנת
          <Search className="h-5 w-5" />
        </motion.button>
      </section>

      {/* ── Availability CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-6 mb-10 max-w-lg mx-auto relative z-10 space-y-4">
        {/* Live status badge */}
        <div className="flex justify-center">
          <div
            className="px-5 py-2 rounded-full flex items-center gap-2.5 shadow-sm"
            style={{
              background: isAvailable
                ? "oklch(0.65 0.22 160 / 0.10)"
                : "oklch(0.93 0.03 91.6)",
              border: isAvailable
                ? "1px solid oklch(0.65 0.22 160 / 0.30)"
                : "1px solid oklch(0.87 0.04 84.0)",
            }}
          >
            <div className="relative size-2.5">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: isAvailable ? "#22c55e" : "#94a3b8", opacity: 0.6 }} />
              <div className="relative size-full rounded-full" style={{ backgroundColor: isAvailable ? "#22c55e" : "#94a3b8" }} />
            </div>
            <span className="text-[12px] font-bold leading-none" style={{ color: isAvailable ? "oklch(0.52 0.22 150)" : "var(--text-muted)" }}>
              {isAvailable ? "במצב זמין כרגע" : "לא זמין כרגע"}
            </span>
          </div>
        </div>

        {/* Availability card button */}
        <motion.button
          onClick={handleAvailabilityToggle}
          whileTap={{ scale: 0.98 }}
          disabled={availabilityLoading}
          className="w-full rounded-3xl p-7 relative overflow-hidden flex items-center gap-5 text-right transition-transform"
          style={{
            background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)",
            boxShadow: "0 8px 24px oklch(0.38 0.07 125.0 / 0.40)",
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-12 -mt-12" style={{ background: "rgba(255,255,255,0.10)", filter: "blur(32px)" }} />
          <div className="size-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.20)", border: "1px solid rgba(255,255,255,0.20)" }}>
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <div className="relative z-10 flex-1">
            <h2 className="text-xl font-black tracking-tight mb-1 text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
              זמינות לעבודה עכשיו
            </h2>
            <p className="text-[13px] text-white font-semibold leading-snug" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
              הצטרפו לתוצאות החיפוש של עבודה בזמינות מיידית
            </p>
          </div>
          <ChevronLeft className="h-5 w-5 text-white/90 rotate-180" />
        </motion.button>

        {/* Profile link */}
        {isAuthenticated && (
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/worker-profile")}
              className="flex items-center gap-1 text-sm font-black hover:underline transition-colors"
              style={{ color: "var(--amber)" }}
            >
              כאן מעדכנים תחומי עניין לקבלת התראות מותאמות אישית
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* ── Location row ─────────────────────────────────────────────────── */}
      <section className="px-6 mb-10 max-w-lg mx-auto relative z-10">
        <div className="flex gap-3">
          <button
            onClick={requestGeo}
            className="flex-[3] bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-colors text-right"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="size-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--honey)" }}>
              <MapPin className="h-5 w-5" style={{ color: "var(--brand)" }} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black" style={{ color: "var(--brand)" }}>
                {userLat ? "מיקום עודכן ✓" : "עדכון מיקום"}
              </h4>
              <p className="text-[10px] font-bold" style={{ color: "var(--muted-foreground)" }}>חיפוש עבודות בסביבה</p>
            </div>
          </button>
          <button
            onClick={requestGeo}
            className="flex-1 bg-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm transition-all"
            style={{ border: "1.5px dashed var(--border)" }}
          >
            <Search className="h-5 w-5" style={{ color: "var(--amber)" }} />
            <span className="text-[10px] font-black" style={{ color: "var(--amber)" }}>זיהוי מיקום</span>
          </button>
        </div>
      </section>

      {/* ── Urgent / Today carousel ───────────────────────────────────────── */}
      {(allCarouselJobs.length > 0 || urgentQuery.isLoading || todayQuery.isLoading) && (
        <section className="mb-10 relative z-10">
          <div className="flex items-center justify-between px-6 mb-5 max-w-lg mx-auto">
            <h2 className="text-xl font-black" style={{ color: "var(--brand)" }}>עבודות בהתאמה אישית עבורך</h2>
            <button
              onClick={() => navigate("/find-jobs?urgent=1")}
              className="text-sm font-black px-4 py-1.5 rounded-full transition-colors"
              style={{ color: "var(--amber)", backgroundColor: "rgba(217,164,80,0.15)" }}
            >
              הכל
            </button>
          </div>

          {(urgentQuery.isLoading || todayQuery.isLoading) ? (
            <div className="px-6"><CarouselSkeletonRow count={3} /></div>
          ) : (
            <div className="relative">
              {activeCarouselIdx < carouselTotal - 1 && (
                <button
                  onClick={() => {
                    const el = document.getElementById("job-carousel");
                    if (el) el.scrollBy({ left: -300, behavior: "smooth" });
                    setActiveCarouselIdx((i) => Math.min(i + 1, carouselTotal - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-110"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label="הקודם"
                >
                  <ChevronLeft className="h-4 w-4" style={{ color: "var(--brand)" }} />
                </button>
              )}
              {activeCarouselIdx > 0 && (
                <button
                  onClick={() => {
                    const el = document.getElementById("job-carousel");
                    if (el) el.scrollBy({ left: 300, behavior: "smooth" });
                    setActiveCarouselIdx((i) => Math.max(i - 1, 0));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-110"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label="הבא"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" style={{ color: "var(--brand)" }} />
                </button>
              )}
              <div
                id="job-carousel"
                className="flex gap-4 overflow-x-auto pb-4 px-6 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => { isPausedRef.current = false; }}
                onTouchStart={() => { isPausedRef.current = true; }}
                onTouchEnd={() => { setTimeout(() => { isPausedRef.current = false; }, 2000); }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const cardWidth = el.scrollWidth / carouselTotal;
                  const idx = Math.round(el.scrollLeft / cardWidth);
                  setActiveCarouselIdx(idx);
                }}
              >
                {allCarouselJobs.map(({ job, badge }) => (
                  <div key={`${badge}-${job.id}`} className="snap-start shrink-0 w-72">
                    <CarouselJobCard
                      job={{ ...job, isUrgent: badge === "urgent" }}
                      badge={badge}
                      onLoginRequired={onLoginRequired}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── חדש בסביבה / Latest jobs ─────────────────────────────────────── */}
      <section className="px-6 mb-8 max-w-lg mx-auto relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: "var(--brand)" }}>
            <TrendingUp className="h-5 w-5" style={{ color: "var(--amber)" }} />
            חדש בסביבה
          </h2>
          <button
            onClick={() => navigate("/find-jobs")}
            className="text-sm font-black px-4 py-1.5 rounded-full transition-colors"
            style={{ color: "var(--amber)", backgroundColor: "rgba(217,164,80,0.15)" }}
          >
            הכל
          </button>
        </div>

        {userLat && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>רדיוס:</span>
            {[1, 3, 5].map((km) => (
              <button
                key={km}
                onClick={() => setNearbyRadius(km)}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: nearbyRadius === km ? "var(--brand)" : "white",
                  border: nearbyRadius === km ? "1px solid var(--brand)" : "1px solid var(--border)",
                  color: nearbyRadius === km ? "white" : "var(--muted-foreground)",
                }}
              >
                {km} ק"מ
              </button>
            ))}
            <div className="mr-auto flex gap-1">
              <button
                onClick={() => setShowMap(false)}
                className="p-1.5 rounded-lg transition-all"
                style={{ background: !showMap ? "var(--brand)" : "white", border: !showMap ? "1px solid var(--brand)" : "1px solid var(--border)" }}
              >
                <List className="h-4 w-4" style={{ color: !showMap ? "white" : "var(--muted-foreground)" }} />
              </button>
              <button
                onClick={() => setShowMap(true)}
                className="p-1.5 rounded-lg transition-all"
                style={{ background: showMap ? "var(--brand)" : "white", border: showMap ? "1px solid var(--brand)" : "1px solid var(--border)" }}
              >
                <Map className="h-4 w-4" style={{ color: showMap ? "white" : "var(--muted-foreground)" }} />
              </button>
            </div>
          </div>
        )}

        {!userLat && !geoRequested && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 mb-4 text-center bg-white shadow-sm"
            style={{ border: "1.5px solid var(--honey)" }}
          >
            <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--brand)" }} />
            <p className="text-sm font-black mb-1" style={{ color: "var(--brand)" }}>רוצה לראות עבודות קרובות אליך?</p>
            <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>אפשר גישה למיקום להצגת עבודות באזור שלך</p>
            <AppButton variant="brand" size="sm" onClick={requestGeo}>
              <MapPin className="h-4 w-4" />
              אפשר גישה למיקום
            </AppButton>
          </motion.div>
        )}

        {isLoading ? (
          <JobCardSkeletonList count={3} />
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: "var(--brand)" }} />
            <p className="font-black" style={{ color: "var(--brand)" }}>אין משרות בטווח {nearbyRadius} ק"מ</p>
            <p className="text-xs mt-1 font-bold" style={{ color: "var(--muted-foreground)" }}>נסה להרחיב את הרדיוס או לחפש בכל המשרות</p>
            <AppButton variant="brand" size="sm" className="mt-4" onClick={() => navigate("/find-jobs")}>כל המשרות</AppButton>
          </div>
        ) : showMap && userLat ? (
          <NearbyJobsMap jobs={jobs} userLat={userLat} userLng={userLng!} />
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35 }}>
                <div onClick={() => navigate(`/jobs/${job.id}`)} className="cursor-pointer">
                  <JobCard
                    job={job}
                    onLoginRequired={onLoginRequired}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Not found CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-12 text-center relative z-10"
        style={{
          background: "linear-gradient(180deg, oklch(0.96 0.02 122.3) 0%, oklch(0.93 0.03 91.6) 100%)",
          borderTop: "1px solid oklch(0.89 0.05 84.0)",
        }}
      >
        <div className="mb-6 max-w-lg mx-auto">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "white", boxShadow: "0 4px 16px oklch(0.38 0.07 125.0 / 0.12)", border: "1px solid oklch(0.89 0.05 84.0)" }}
          >
            <Search className="h-7 w-7" style={{ color: "var(--brand)" }} />
          </div>
          <h3 className="text-xl font-black mb-2" style={{ color: "var(--brand)" }}>לא מצאתם את מה שחיפשתם?</h3>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            כדאי לנסות את החיפוש המורחב לתוצאות מדויקות יותר
          </p>
        </div>
        <motion.button
          onClick={() => navigate("/find-jobs")}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="px-8 py-3 rounded-2xl font-black transition-all shadow-sm"
          style={{
            border: "2px solid var(--brand)",
            color: "var(--brand)",
            background: "white",
            boxShadow: "0 2px 10px oklch(0.38 0.07 125.0 / 0.12)",
          }}
        >
          לחיפוש מתקדם
        </motion.button>
      </section>

      {/* ── Employer CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="px-6 pt-4 pb-16 text-center relative z-10"
        style={{
          background: "linear-gradient(180deg, oklch(0.93 0.03 91.6) 0%, oklch(0.96 0.02 122.3) 100%)",
        }}
      >
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl cursor-pointer transition-all"
          style={{
            background: "white",
            border: "1.5px solid oklch(0.75 0.12 76.7 / 0.35)",
            boxShadow: "0 2px 10px oklch(0.75 0.12 76.7 / 0.12)",
          }}
          onClick={resetUserMode}
        >
          <span className="text-[15px] font-black" style={{ color: "var(--brand)" }}>מחפשים עובדים?</span>
          <span
            className="text-[15px] font-black"
            style={{ color: "var(--amber)" }}
          >
            לחצו לפרסום עבודה →
          </span>
        </div>
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
            <AppButton variant="brand" size="sm" onClick={() => setInfoOpen(false)}>סגור</AppButton>
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
                className="flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all font-bold"
                style={{ borderColor: "var(--border)", color: "var(--brand)" }}
              >
                <span className="text-2xl font-extrabold" style={{ color: "var(--amber)" }}>{h}</span>
                <span className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>שעות</span>
              </motion.button>
            ))}
          </div>
          <AppButton variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setDurationOpen(false)}>ביטול</AppButton>
        </DialogContent>
      </Dialog>
    </div>
  );
}

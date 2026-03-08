import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import {
  Search, MapPin, ChevronLeft, Zap,
  Map, List, ArrowLeft, TrendingUp, Star,
  Briefcase, BadgePercent, Clock,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import CarouselJobCard from "@/components/CarouselJobCard";
import { JobCardSkeletonList, CarouselSkeletonRow } from "@/components/JobCardSkeleton";
import NearbyJobsMap from "@/components/NearbyJobsMap";

// Hook: counts DOWN from startValue to endValue over duration ms
function useCountDown(startValue: number, endValue: number, duration: number, triggered: boolean) {
  const [current, setCurrent] = useState(startValue);
  useEffect(() => {
    if (!triggered) return;
    const steps = 40;
    const stepTime = duration / steps;
    const delta = (startValue - endValue) / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const next = Math.round(startValue - delta * step);
      setCurrent(step >= steps ? endValue : next);
      if (step >= steps) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [triggered]);
  return current;
}

function StatsRow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const jobs = useCountDown(750, 500, 1400, inView);
  const pct = useCountDown(150, 100, 1200, inView);
  const statsData = [
    { display: `+${jobs}`, label: "עבודות פעילות", Icon: Briefcase },
    { display: `${pct}%`, label: "ללא עמלות", Icon: BadgePercent },
    { display: "24/7", label: "זמין תמיד", Icon: Clock },
  ];
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
      dir="rtl"
      className="flex items-stretch justify-between gap-0 mt-8 rounded-2xl px-2 py-3 w-full max-w-[300px]"
      style={{
        background: "oklch(0.32 0.08 122 / 0.82)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        border: "1px solid oklch(0.55 0.09 122 / 0.40)",
        boxShadow: "0 4px 24px oklch(0.28 0.06 122 / 0.30), inset 0 1px 0 oklch(0.70 0.06 122 / 0.20)",
      }}
    >
      {statsData.map(({ display, label, Icon }, i) => (
        <React.Fragment key={label}>
          {i > 0 && (
            <div
              key={`divider-${i}`}
              style={{
                width: "1px",
                height: "44px",
                flexShrink: 0,
                background: "linear-gradient(to bottom, transparent 0%, oklch(0.60 0.06 122 / 0.35) 30%, oklch(0.60 0.06 122 / 0.35) 70%, transparent 100%)",
              }}
            />
          )}
          <div key={label} className="text-center flex-1 flex flex-col items-center gap-0.5 py-1 px-2">
            <Icon
              size={15}
              style={{ color: "oklch(0.97 0.12 80.8)" }}
            />
            <div
              className="text-[20px] font-black leading-none tabular-nums"
              style={{ color: "oklch(0.97 0.02 91)" }}
            >{display}</div>
            <div
              className="text-[10px] font-semibold"
              style={{ color: "oklch(0.97 0.02 91)" }}
            >{label}</div>
          </div>
        </React.Fragment>
      ))}
    </motion.div>
  );
}

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
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  // Touch swipe state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartScrollRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);

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

      {/* ── MOBILE Hero (< md): image on top, text below ── */}
      <section className="relative z-10 overflow-hidden md:hidden">
        {/* Full image with text at top + woman visible in center */}
        <div className="relative w-full" style={{ height: "480px" }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-worker-v2_dd81e8e7.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "60% 35%" }}
          />
          {/* Top gradient for text readability */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none"
            style={{ height: "55%", background: "linear-gradient(to bottom, oklch(0.97 0.02 91 / 0.82) 0%, transparent 100%)" }}
          />
          {/* Bottom fade into page - smooth multi-stop gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{ height: "180px", background: "linear-gradient(to bottom, transparent 0%, oklch(0.97 0.02 91 / 0.3) 30%, oklch(0.97 0.02 91 / 0.7) 60%, oklch(0.97 0.02 91 / 0.92) 80%, var(--page-bg) 100%)" }}
          />

          {/* StatsRow overlaid at bottom of image */}
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-5">
            <StatsRow />
          </div>

          {/* Badge + heading + description at top of image */}
          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center text-center px-5 pt-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{
                background: "oklch(0.32 0.07 122)",
                border: "1px solid oklch(0.45 0.09 122 / 0.5)",
                boxShadow: "0 2px 10px oklch(0.28 0.06 122 / 0.30)",
              }}
            >
              <Zap className="h-3 w-3" style={{ color: "oklch(0.85 0.16 80)" }} />
              <span className="text-[11px] font-bold tracking-wide" style={{ color: "oklch(0.92 0.04 80)", letterSpacing: "0.05em" }}>
                הדרך המהירה למצוא עבודה
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-[34px] leading-[1.15] font-black mb-2"
              style={{ color: "oklch(0.12 0.06 122)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
            >
              עבודות מזדמנות<br />
              <span style={{ color: "oklch(0.68 0.14 80.8)" }}>מחכות לך עכשיו</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[13px] font-semibold leading-relaxed"
              style={{ color: "oklch(0.22 0.06 122)", maxWidth: "270px" }}
            >
              קשר ישיר עם מי שצריכים אותך — ללא עמלות ובהתאמה אישית
            </motion.p>
          </div>
        </div>

        {/* CTA below image on clean background */}
        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-4 pb-10" style={{ backgroundColor: "var(--page-bg)" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-5 w-full"
          >
            <motion.button
              onClick={() => navigate("/find-jobs")}
              className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-[15px] overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                color: "oklch(0.96 0.04 80)",
                boxShadow: "0 4px 24px oklch(0.28 0.06 122 / 0.45)",
              }}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 28px oklch(0.28 0.06 122 / 0.55)" }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Search size={15} />
              חפש עבודה עכשיו
              <ChevronLeft size={15} style={{ opacity: 0.65 }} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── DESKTOP Hero (≥ md): full-bleed image with text overlay ── */}
      <section
        className="relative z-10 overflow-hidden hidden md:block"
        style={{ minHeight: "540px" }}
      >
        {/* Full-bleed background image */}
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-worker-v2_dd81e8e7.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "70% 60%" }}
        />

        {/* Directional overlay: very light on left only */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, oklch(0.95 0.03 91.6 / 0.20) 0%, oklch(0.95 0.03 91.6 / 0.08) 25%, transparent 45%)",
          }}
        />
        {/* Bottom fade to page bg */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: "120px", background: "linear-gradient(to bottom, transparent 0%, oklch(0.95 0.03 91.6) 100%)" }}
        />

        {/* Content — text on LEFT side (RTL: visually left side of screen), woman visible on RIGHT */}
        <div className="relative z-10 flex flex-col justify-center items-start text-right px-6 pt-14 pb-20" style={{ minHeight: "520px", maxWidth: "460px", marginRight: "auto" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              background: "oklch(0.32 0.07 122)",
              border: "1px solid oklch(0.45 0.09 122 / 0.5)",
              boxShadow: "0 2px 10px oklch(0.28 0.06 122 / 0.30)",
            }}
          >
            <Zap className="h-3 w-3" style={{ color: "oklch(0.85 0.16 80)" }} />
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "oklch(0.92 0.04 80)", letterSpacing: "0.05em" }}>
              הדרך המהירה למצוא עבודה
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[42px] leading-[1.1] font-black mb-4"
            style={{ color: "oklch(0.12 0.06 122)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 1px 12px oklch(0.97 0.02 91 / 0.80), 0 2px 20px oklch(0.97 0.02 91 / 0.60)" }}
          >
            עבודות מזדמנות<br />
            <span style={{ color: "oklch(0.68 0.14 80.8)", textShadow: "0 0 20px oklch(0.68 0.14 80.8 / 0.3)" }}>
              מחכות לך עכשיו
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[15px] font-semibold leading-relaxed mb-5 max-w-[280px]"
            style={{ color: "oklch(0.18 0.06 122)", textShadow: "0 1px 8px oklch(0.97 0.02 91 / 0.70), 0 2px 16px oklch(0.97 0.02 91 / 0.50)" }}
          >
            קשר ישיר עם מי שצריכים אותך — ללא עמלות ובהתאמה אישית
          </motion.p>

          <StatsRow />

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6"
          >
            <motion.button
              onClick={() => navigate("/find-jobs")}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-[15px] overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                color: "oklch(0.96 0.04 80)",
                boxShadow: "0 4px 24px oklch(0.28 0.06 122 / 0.45), 0 1px 4px oklch(0.28 0.06 122 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.10)",
              }}
              whileHover={{ scale: 1.03, y: -2, boxShadow: "0 10px 32px oklch(0.28 0.06 122 / 0.55), 0 2px 8px oklch(0.28 0.06 122 / 0.30), inset 0 1px 0 oklch(1 0 0 / 0.15)" }}
              whileTap={{ scale: 0.96, y: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Search size={15} />
              חפש עבודה עכשיו
              <ChevronLeft size={15} style={{ opacity: 0.65 }} />
            </motion.button>
          </motion.div>
        </div>

        {/* Wave SVG divider */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{ lineHeight: 0, marginBottom: "-1px" }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 390 48" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "48px" }}>
            <path d="M0,48 L0,28 C65,8 130,44 195,22 C260,0 325,38 390,16 L390,48 Z" fill="var(--page-bg)" />
          </svg>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────────── */}
      <section
        className="relative z-10 mx-6 mb-12 rounded-[28px] p-7 max-w-lg"
        style={{
          background: "white",
          boxShadow: "0 4px 24px oklch(0.38 0.07 125.0 / 0.10), 0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
          border: "none",
          marginTop: "-4px",
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
          whileHover={{ scale: 1.01, backgroundColor: "oklch(0.96 0.02 122.3)" }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3 px-10 py-3.5 rounded-2xl text-[14px] font-bold transition-all"
          style={{
            background: "white",
            color: "oklch(0.35 0.08 122)",
            border: "1.5px solid oklch(0.82 0.06 122 / 0.5)",
            boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.08)",
          }}
        >
          <Search className="h-4 w-4" style={{ color: "oklch(0.35 0.08 122)" }} />
          חיפוש עבודה מזדמנת
        </motion.button>
      </section>

      {/* ── Availability + Location ─────────────────────────────────────────────── */}
      <section className="px-6 mb-10 max-w-lg mx-auto relative z-10" dir="rtl">

        {/* Availability row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold" style={{ color: "oklch(0.42 0.04 122)" }}>זמינות לעבודה</span>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center" style={{ width: 14, height: 14 }}>
              {/* outer slow pulse ring — only when available */}
              {isAvailable && (
                <span
                  className="absolute rounded-full"
                  style={{
                    inset: -4,
                    background: "oklch(0.55 0.22 150 / 0.20)",
                    animation: "pulse-ring-slow 2.2s ease-in-out infinite",
                  }}
                />
              )}
              {/* inner ping ring */}
              {isAvailable && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: "#22c55e",
                    opacity: 0.45,
                    animation: "ping 1.6s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
              )}
              {/* core dot */}
              <span
                className="relative rounded-full block"
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: isAvailable ? "#22c55e" : "#94a3b8",
                  boxShadow: isAvailable ? "0 0 0 2px oklch(0.55 0.22 150 / 0.25)" : "none",
                }}
              />
            </div>
            <span className="text-[12px] font-semibold" style={{ color: isAvailable ? "oklch(0.48 0.18 150)" : "oklch(0.55 0.02 91)" }}>
              {isAvailable ? "זמין כרגע" : "לא זמין"}
            </span>
          </div>
        </div>

        <motion.button
          onClick={handleAvailabilityToggle}
          whileTap={{ scale: 0.985 }}
          whileHover={{ boxShadow: isAvailable
            ? "0 6px 20px oklch(0.45 0.18 150 / 0.25)"
            : "0 6px 20px oklch(0.35 0.08 122 / 0.25)"
          }}
          disabled={availabilityLoading}
          className="w-full rounded-2xl px-5 py-4 flex items-center gap-4 transition-all mb-3"
          style={{
            background: isAvailable
              ? "linear-gradient(135deg, oklch(0.42 0.18 150) 0%, oklch(0.36 0.16 155) 100%)"
              : "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
            boxShadow: isAvailable
              ? "0 4px 16px oklch(0.42 0.18 150 / 0.30)"
              : "0 4px 16px oklch(0.28 0.06 122 / 0.25)",
          }}
        >
          <div
            className="size-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            {isAvailable
              ? <MapPin className="h-5 w-5 text-white" />
              : <MapPin className="h-5 w-5 text-white/80" />
            }
          </div>
          <div className="flex-1 text-right">
            <p className="text-[15px] font-black text-white leading-tight">
              {isAvailable ? "סמן עצמך כלא זמין" : "סמן עצמך כזמין"}
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
              {isAvailable ? "הסר אותך מרשימת הזמינים" : "הופע בחיפושי מעסיקים באזורך"}
            </p>
          </div>
          {availabilityLoading
            ? <div className="size-5 rounded-full border-2 border-white/40 border-t-white animate-spin flex-shrink-0" />
            : <ChevronLeft className="h-4 w-4 text-white/70 rotate-180 flex-shrink-0" />
          }
        </motion.button>

        {/* Location + Profile row */}
        <div className="flex gap-2.5">
          <button
            onClick={requestGeo}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right"
            style={{
              background: userLat ? "oklch(0.96 0.02 122.3)" : "white",
              border: userLat ? "1px solid oklch(0.82 0.06 122 / 0.5)" : "1px solid oklch(0.91 0.03 91.6)",
            }}
          >
            <div
              className="size-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: userLat ? "oklch(0.35 0.08 122 / 0.12)" : "oklch(0.93 0.03 91.6)" }}
            >
              <MapPin className="h-4 w-4" style={{ color: userLat ? "oklch(0.35 0.08 122)" : "oklch(0.55 0.04 91)" }} />
            </div>
            <div>
              <p className="text-[12px] font-black" style={{ color: userLat ? "oklch(0.35 0.08 122)" : "oklch(0.35 0.04 91)" }}>
                {userLat ? "מיקום פעיל ✓" : "זהה מיקום"}
              </p>
              <p className="text-[10px]" style={{ color: "oklch(0.58 0.03 91)" }}>עבודות בסביבה</p>
            </div>
          </button>

          {isAuthenticated && (
            <button
              onClick={() => navigate("/worker-profile")}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right"
              style={{
                background: "white",
                border: "1px solid oklch(0.91 0.03 91.6)",
              }}
            >
              <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.93 0.04 84.0)" }}>
                <Star className="h-4 w-4" style={{ color: "var(--amber)" }} />
              </div>
              <div>
                <p className="text-[12px] font-black" style={{ color: "oklch(0.35 0.04 91)" }}>העדפות</p>
                <p className="text-[10px]" style={{ color: "oklch(0.58 0.03 91)" }}>התאמה אישית</p>
              </div>
            </button>
          )}
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
                onTouchStart={(e) => {
                  isPausedRef.current = true;
                  touchStartXRef.current = e.touches[0].clientX;
                  touchStartScrollRef.current = e.currentTarget.scrollLeft;
                  touchStartTimeRef.current = Date.now();
                }}
                onTouchMove={(e) => {
                  if (touchStartXRef.current === null) return;
                  const dx = touchStartXRef.current - e.touches[0].clientX;
                  e.currentTarget.scrollLeft = touchStartScrollRef.current + dx;
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget;
                  const dx = (touchStartXRef.current ?? 0) - (e.changedTouches[0]?.clientX ?? 0);
                  const dt = Date.now() - touchStartTimeRef.current;
                  const velocity = Math.abs(dx) / dt; // px/ms
                  const cardWidth = 288 + 16;
                  // Snap: flick (velocity > 0.3) or drag > half card
                  if (velocity > 0.3 || Math.abs(dx) > cardWidth / 2) {
                    const direction = dx > 0 ? 1 : -1; // 1 = scroll right (RTL: next), -1 = scroll left (RTL: prev)
                    const targetIdx = Math.max(0, Math.min(carouselTotal - 1, activeCarouselIdx + direction));
                    el.scrollTo({ left: targetIdx * cardWidth, behavior: "smooth" });
                    setActiveCarouselIdx(targetIdx);
                  } else {
                    // Snap back to nearest
                    const nearest = Math.round(el.scrollLeft / cardWidth);
                    el.scrollTo({ left: nearest * cardWidth, behavior: "smooth" });
                    setActiveCarouselIdx(nearest);
                  }
                  touchStartXRef.current = null;
                  setTimeout(() => { isPausedRef.current = false; }, 2000);
                }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const cardWidth = el.scrollWidth / carouselTotal;
                  const idx = Math.round(el.scrollLeft / cardWidth);
                  setActiveCarouselIdx(idx);
                }}
              >
                {allCarouselJobs.map(({ job, badge }) => (
                  <div key={`${badge}-${job.id}`} className="snap-start shrink-0" style={{ width: 220 }}>
                    <CarouselJobCard
                      job={{ ...job, isUrgent: badge === "urgent" }}
                      badge={badge}
                      onLoginRequired={onLoginRequired}
                    />
                  </div>
                ))}
              </div>

              {/* ── Navigation dots ── */}
              {carouselTotal > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                    paddingTop: 12,
                    paddingBottom: 4,
                  }}
                >
                  {allCarouselJobs.map((_, i) => {
                    const isActive = i === activeCarouselIdx;
                    return (
                      <button
                        key={i}
                        aria-label={`עבור לכרטיס ${i + 1}`}
                        onClick={() => {
                          const el = document.getElementById("job-carousel");
                          if (!el) return;
                          const cardWidth = el.scrollWidth / carouselTotal;
                          el.scrollTo({ left: i * cardWidth, behavior: "smooth" });
                          setActiveCarouselIdx(i);
                        }}
                        style={{
                          width: isActive ? 22 : 8,
                          height: 8,
                          borderRadius: 99,
                          background: isActive ? "#4F583B" : "#c8c2b0",
                          border: "none",
                          outline: "none",
                          cursor: "pointer",
                          padding: 0,
                          transition: "width 0.25s ease, background 0.25s ease",
                          flexShrink: 0,
                        }}
                      />
                    );
                  })}
                </div>
              )}
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

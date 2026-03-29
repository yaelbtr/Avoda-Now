import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { motion, useInView } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useWorkerJobs } from "@/contexts/WorkerJobsContext";
import { AppButton } from "@/components/ui";
import { JobCard } from "@/components/JobCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import {
  Search, MapPin, ChevronLeft, Zap, Flame,
  Map, List, ArrowLeft, TrendingUp, Star,
  Briefcase, BadgePercent, Clock,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
// CarouselJobCard replaced by unified JobCard
import JobBottomSheet from "@/components/JobBottomSheet";
import { JobCardSkeletonList, CarouselSkeletonRow } from "@/components/JobCardSkeleton";
import NearbyJobsMap from "@/components/NearbyJobsMap";
import { WorkerRegionBanner } from "@/components/WorkerRegionBanner";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import BelowFold from "@/components/BelowFold";
import { toast } from "sonner";
import { isMinor } from "@shared/ageUtils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useCountdown } from "@/hooks/useCountdown";

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

  // Fetch real counts for conditional display
  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const hs = heroStatsQuery.data;

  // Determine the dynamic stat (priority order)
  const dynamicStat: { display: string; label: string; Icon: typeof Briefcase } | null = (() => {
    if (!hs) return null;
    if (hs.activeJobs > 50)           return { display: `+${hs.activeJobs}`, label: "משרות פעילות", Icon: Briefcase };
    if (hs.closedJobs > 50)           return { display: `+${hs.closedJobs}`, label: "משרות שנסגרו", Icon: Briefcase };
    if (hs.registeredWorkers > 100)   return { display: `+${hs.registeredWorkers}`, label: "עובדים רשומים", Icon: Briefcase };
    return null;
  })();

  const statsData = [
    ...(dynamicStat ? [dynamicStat] : []),
    { display: "100%", label: "ללא עמלות", Icon: BadgePercent },
    { display: "24/7", label: "זמין תמיד", Icon: Clock },
  ];
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5, delay: 0.1 }}
      dir="rtl"
      style={{ display: "flex", gap: 6, marginTop: 0, marginBottom: 12, direction: "rtl", width: "100%", alignSelf: "stretch" }}
    >
      {statsData.map(({ display, label, Icon }, i) => (
        <React.Fragment key={label}>
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "12px 4px",
              borderRadius: 14,
              background: "oklch(0.97 0.02 122)",
              border: "1px solid oklch(0.88 0.05 122)",
              boxShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.10)",
            }}
          >
            <Icon style={{ width: 18, height: 18, color: "oklch(0.42 0.10 122)", flexShrink: 0 }} />
            <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: "oklch(0.22 0.06 122)", letterSpacing: "-0.3px" }}>{display}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "oklch(0.45 0.07 122)", textAlign: "center", lineHeight: 1.2, wordBreak: "keep-all" }}>{label}</span>
          </motion.div>
        </React.Fragment>
      ))}
    </motion.div>
  );
}

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "הגדר זמינות",
    desc: "לחץ על \"זמין עכשיו\" כדי שמעסיקים באזור שלך יוכלו לראות שאתה זמין לעבודה.",
    imgUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/how-it-works-step1_3045eee6.webp",
    reverse: false,
  },
  {
    step: "02",
    title: "קבל הצעות עבודה ממעסיקים",
    desc: "מעסיקים שמחפשים עובדים באזור שלך רואים שאתה זמין ושולחים לך הצעת עבודה — אתה מחליט אם לאשר.",
    imgUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/how-it-works-step2_64b352ff.webp",
    reverse: true,
  },
  {
    step: "03",
    title: "אשר את ההצעה בכדי שהמעסיק יוכל ליצור איתך קשר",
    desc: "תוכל לדבר איתו ישירות, לסגור פרטים ולהתחיל לעבוד.",
    imgUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/how-it-works-step3_76fe12ce.webp",
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
  const authQuery = useAuthQuery();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  // nearbyRadius and setLocation are managed by the shared WorkerJobsContext
  const {
    urgentJobs: urgentJobsFromCtx,
    todayJobs: todayJobsFromCtx,
    nearbyJobs: nearbyJobsFromCtx,
    latestJobs: latestJobsFromCtx,
    isLoading: dashboardLoading,
    isFallback: nearbyIsFallback,
    nearbyRadius,
    setNearbyRadius,
    setLocation: setWorkerLocation,
    savedIds,
    toggleSave,
  } = useWorkerJobs();
  const [showMap, setShowMap] = useState(false);
  const [geoRequested, setGeoRequested] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(4);
  const [customHours, setCustomHours] = useState<string>("");
  const [quickAvailOpen, setQuickAvailOpen] = useState(false);
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);
  const [bottomSheetJob, setBottomSheetJob] = useState<null | { id: number; title: string; category: string; address: string; city?: string | null; salary?: string | null; salaryType: string; contactPhone: string | null; businessName?: string | null; startTime: string; startDateTime?: Date | string | null; isUrgent?: boolean | null; workersNeeded: number; createdAt: Date | string; expiresAt?: Date | string | null; distance?: number; description?: string | null }>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handlePrimaryCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
    navigate("/find-jobs");
  };
  useSEO({
    title: "AvodaNow — עבודות זמניות בישראל",
    description: "מצא עבודות זמניות, עבודה מיידית ומשרות לסטודנטים באזור שלך בלי עמלות. הגדר זמינות, קבל עבודה קרוב אליך, התחבר ישירות למעסיקים.",
    keywords: "עבודה זמנית, עבודה מיידית, משרות זמניות, עבודות לסטודנטים, עבודה לנוער, עבודות מזדמנות, פרסום משרה, חיפוש עבודה בישראל",
    canonical: "/",
  });

  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  // Touch swipe state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartScrollRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          // Propagate location to the shared service so the nearby panel fetches
          setWorkerLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {}
      );
    }
  }, [setWorkerLocation]);

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

  // Redirect new workers who haven't completed signup yet
  const profileQuery = trpc.user.getProfile.useQuery(undefined, authQuery());
  useEffect(() => {
    if (profileQuery.data && profileQuery.data.signupCompleted === false) {
      navigate("/worker-profile");
    }
  }, [profileQuery.data, navigate]);

  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const activeJobCount = heroStatsQuery.data?.activeJobs ?? null;
  // ── Job data now comes from the shared WorkerJobsContext (single server call) ──
  const workerStatusQuery = trpc.workers.myStatus.useQuery(undefined, authQuery());
  // Age-gate: fetch birth date info to warn minors about late availability
  const birthDateInfoQuery = trpc.user.getBirthDateInfo.useQuery(undefined, authQuery({ staleTime: 5 * 60 * 1000 }));
  const workerIsMinor = birthDateInfoQuery.data?.isMinor === true;
  // savedIds + save/unsave come from WorkerJobsContext (DRY — shared with FindJobs)
  const utils = trpc.useUtils();
  // Applied job IDs (from myApplications)
  const myApplicationsQuery = trpc.jobs.myApplications.useQuery(undefined, authQuery());
  const appliedJobIds = useMemo(
    () => new Set((myApplicationsQuery.data ?? []).map((a: { jobId: number }) => a.jobId)),
    [myApplicationsQuery.data]
  );
  const applyMutation = trpc.jobs.applyToJob.useMutation({
    onSuccess: () => { utils.jobs.myApplications.invalidate(); toast.success("מועמדות הוגשה בהצלחה!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const handleApply = (jobId: number, message: string | undefined, origin: string) => {
    if (!isAuthenticated) { onLoginRequired("כדי להגיש מועמדות יש להתחבר"); return; }
    applyMutation.mutate({ jobId, message, origin });
  };
  const handleSaveToggle = (jobId: number, save: boolean) => {
    toggleSave(jobId, !save, onLoginRequired);
  };
  const setAvailableMutation = trpc.workers.setAvailable.useMutation({
    onSuccess: () => {
      workerStatusQuery.refetch();
      setAvailabilityLoading(false);
      const h = selectedDuration;
      const label = h === 1 ? "שעה אחת" : h < 11 ? `${h} שעות` : `${h} שעות`;
      toast.success(`✓ אתה מסומן כזמין ל-${label}`, {
        description: "מעסיקים יכולים לראות אותך עכשיו",
        duration: 4000,
      });
    },
    onError: (e) => {
      setAvailabilityLoading(false);
      toast.error("לא הצלחנו לעדכן את הזמינות", {
        description: (e as { message?: string }).message ?? "אנא נסה שוב",
      });
    },
  });
  const setUnavailableMutation = trpc.workers.setUnavailable.useMutation({
    onSuccess: () => {
      workerStatusQuery.refetch();
      setAvailabilityLoading(false);
      toast.success("סומנת כלא זמין", { duration: 3000 });
    },
    onError: (e) => {
      setAvailabilityLoading(false);
      toast.error("לא הצלחנו לעדכן את הזמינות", {
        description: (e as { message?: string }).message ?? "אנא נסה שוב",
      });
    },
  });
  const quickAvailMutation = trpc.user.quickUpdateAvailability.useMutation({
    onSuccess: () => { profileQuery.refetch(); toast.success("סטאטוס זמינות עודכן!"); setQuickAvailOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  // Derive panel arrays from the shared context (client-side only, O(1))
  type JobItem = { id: number; title: string; category: string; address: string; city?: string | null; salary?: string | null; salaryType: string; contactPhone: null; businessName?: string | null; startTime: string; startDateTime?: Date | string | null; isUrgent?: boolean | null; workersNeeded: number; createdAt: Date | string; expiresAt?: Date | string | null; distance?: number; description?: string | null; latitude?: number | string | null; longitude?: number | string | null; workingHours?: string | null; jobDate?: string | null; images?: string[] | null };
  const urgentJobs = urgentJobsFromCtx as unknown as JobItem[];
  const todayJobs = todayJobsFromCtx as unknown as JobItem[];
  const jobs = (userLat ? nearbyJobsFromCtx : latestJobsFromCtx) as unknown as JobItem[];
  const isLoading = dashboardLoading;
  const isAvailable = !!workerStatusQuery.data;
  // availableUntil is a Date returned by the server via superjson
  const availableUntil = (workerStatusQuery.data as { availableUntil?: Date } | null)?.availableUntil ?? null;
  const countdown = useCountdown(availableUntil);

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

  const confirmAvailability = (hours: number) => {
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

  // Step 7 (perf skill): memoize carousel job list — filter+map on every render is O(n²)
  // due to the .some() inner loop. Recompute only when urgentJobs or todayJobs change.
  const allCarouselJobs = useMemo(() => [
    ...urgentJobs.map((j) => ({ job: j, badge: "urgent" as const })),
    ...todayJobs.filter((j) => !urgentJobs.some((u) => u.id === j.id)).map((j) => ({ job: j, badge: "today" as const })),
  ], [urgentJobs, todayJobs]);
  const carouselTotal = allCarouselJobs.length;

  return (
    <div dir="rtl" data-testid="home-worker" className="min-h-screen overflow-x-hidden relative" style={{ backgroundColor: "var(--page-bg)" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}

      {/* ── MOBILE Hero (< md): image at original size, stats+CTA below with glass continuation ── */}
      <section className="relative overflow-hidden md:hidden">

        {/* Image block — fixed 380px, badge + headline overlaid at bottom */}
        <div className="relative w-full" style={{ height: 440 }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/worker_hero_new_380ae5da.webp"
            alt="עובד צעיר מחזיק מטאטא במטבח"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "50% 15%" }}
          />
          {/* Gradient: dark band in middle for text readability, fades to page-bg at bottom */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                "linear-gradient(to bottom,",
                "  oklch(0.10 0.06 122 / 0.55) 0%,",
                "  oklch(0.10 0.06 122 / 0.60) 22%,",
                "  oklch(0.10 0.06 122 / 0.05) 36%,",
                "  oklch(0.10 0.06 122 / 0.00) 46%,",
                "  oklch(0.10 0.06 122 / 0.55) 54%,",
                "  oklch(0.10 0.06 122 / 0.65) 66%,",
                "  oklch(0.10 0.06 122 / 0.20) 74%,",
                "  oklch(0.95 0.03 91.6 / 0.80) 88%,",
                "  oklch(0.95 0.03 91.6) 100%)",
              ].join(" "),
            }}
          />
          {/* Badge — top center, above head — only shown when 10+ active jobs */}
          {(activeJobCount === null || activeJobCount >= 10) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
              className="absolute top-5 left-1/2 z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{
                transform: "translateX(-50%)",
                background: "oklch(1 0 0 / 0.14)",
                border: "1px solid oklch(1 0 0 / 0.30)",
                boxShadow: "0 2px 10px oklch(0.10 0.06 122 / 0.20)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span className="animate-pulse">
                <Clock className="h-3 w-3" style={{ color: "oklch(0.95 0.04 80)" }} />
              </span>
              <span className="text-[11px] font-bold" style={{ color: "oklch(0.98 0.01 80)" }}>
                {activeJobCount !== null ? `${activeJobCount} עבודות זמינות עכשיו` : "עבודות זמינות עכשיו"}
              </span>
            </motion.div>
          )}
          {/* White headline — above the worker's head */}
          <div className="absolute inset-x-0 z-10 flex flex-col items-center text-center px-5" style={{ top: "18%" }}>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-[30px] leading-[1.15] font-black"
              style={{ color: "oklch(0.98 0.01 80)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 2px 12px oklch(0.10 0.06 122 / 0.80)" }}
            >
              מחפש עבודה זמנית?
            </motion.h1>
          </div>
          {/* Yellow headline + subtitle — below the worker's head */}
          <div className="absolute inset-x-0 z-10 flex flex-col items-center text-center px-5" style={{ top: "56%" }}>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-[30px] leading-[1.15] font-black mb-2"
              style={{ color: "oklch(0.88 0.13 70)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 0 16px oklch(0.68 0.10 80.8 / 0.40)" }}
            >
              מצא אחת תוך דקות
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[13px] font-semibold leading-relaxed"
              style={{ color: "oklch(0.95 0.02 80 / 0.85)", maxWidth: "280px", textShadow: "0 1px 8px oklch(0.10 0.06 122 / 0.60)" }}
            >
              ניקיון, אירועים, תיקונים ועוד — מעסיקים יפנו אליך ישירות
            </motion.p>
          </div>
        </div>

        {/* Stats + CTAs — on page-bg, seamlessly below the faded image */}
        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-3 pb-6">
          <StatsRow />
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="w-full flex flex-col gap-3 mt-3"
          >
            <motion.button
              onClick={handlePrimaryCtaClick}
              className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-[15px] overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                color: "oklch(0.96 0.04 80)",
                boxShadow: "0 4px 24px oklch(0.28 0.06 122 / 0.45)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Search size={15} />
              מצא עבודה עכשיו
              <motion.span
                animate={{ x: [0, -5, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                <ChevronLeft size={16} style={{ opacity: 0.9 }} />
              </motion.span>
              {ripples.map(r => (
                <motion.span
                  key={r.id}
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: r.x,
                    top: r.y,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "oklch(1 0 0 / 0.3)",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                />
              ))}
            </motion.button>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={handleAvailabilityToggle}
                  aria-label="הגדר זמינות עכשיו — מעסיקים רואים רק עובדים זמינים, הגדר עכשיו וקבל פניות היום"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-[14px]"
                  style={{
                    background: "white",
                    border: "1px solid oklch(0.89 0.05 84.0)",
                    color: "oklch(0.35 0.08 122)",
                    boxShadow: "0 2px 8px oklch(0.38 0.07 125.0 / 0.08)",
                  }}
                  animate={{
                    boxShadow: [
                      "0 2px 8px oklch(0.38 0.07 125.0 / 0.06)",
                      "0 0 0 3px oklch(0.78 0.13 84 / 0.22), 0 2px 8px oklch(0.38 0.07 125.0 / 0.06)",
                      "0 2px 8px oklch(0.38 0.07 125.0 / 0.06)",
                    ],
                  }}
                  transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Zap size={14} />
                  {isAvailable ? "סמן כלא זמין" : "הגדר זמינות עכשיו"}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={10}
                className="max-w-[220px] text-center leading-relaxed px-4 py-2.5 rounded-xl text-[13px] backdrop-blur-md"
                style={{
                  background: "oklch(0.96 0.10 84 / 0.92)",
                  color: "oklch(0.28 0.05 84)",
                  border: "1px solid oklch(0.82 0.14 84 / 0.60)",
                  boxShadow: "0 8px 32px oklch(0.75 0.18 84 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.60)",
                }}
              >
                <span style={{ color: "oklch(0.32 0.06 84)" }}>מעסיקים רואים רק עובדים זמינים —</span>
                <br />
                <span style={{ color: "oklch(0.38 0.12 60)", fontWeight: 700 }}>הגדר עכשיו וקבל פניות היום</span>
              </TooltipContent>
            </Tooltip>
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
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/worker_hero_new_380ae5da.webp"
          alt="עובד צעיר מחזיק מטאטא במטבח"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1440}
          height={540}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 15%" }}
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
              עבודות בית ואירועים — תוך דקות
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[42px] leading-[1.1] font-black mb-4"
            style={{ color: "oklch(0.12 0.06 122)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 1px 12px oklch(0.97 0.02 91 / 0.80), 0 2px 20px oklch(0.97 0.02 91 / 0.60)" }}
          >
            הגדר זמינות —<br />
            <span style={{ color: "oklch(0.68 0.14 80.8)", textShadow: "0 0 20px oklch(0.68 0.14 80.8 / 0.3)" }}>
              קבל פניות ממעסיקים
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[15px] font-semibold leading-relaxed mb-5 max-w-[280px]"
            style={{ color: "oklch(0.18 0.06 122)", textShadow: "0 1px 8px oklch(0.97 0.02 91 / 0.70), 0 2px 16px oklch(0.97 0.02 91 / 0.50)" }}
          >
            ניקיון, אירועים, תיקונים ועוד — מעסיקים יפנו אליך ישירות
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
              {isAvailable ? "סמן כלא זמין" : "הגדר זמינות עכשיו"}
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

      {/* ── Today Jobs Banner ──────────────────────────────────────────────────── */}
      {(dashboardLoading || (todayJobs.length > 0)) && (
        <motion.button
          dir="rtl"
          onClick={() => navigate("/find-jobs?filter=today")}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          whileHover={{ scale: 1.015, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="relative z-10 mx-4 mb-6 w-[calc(100%-2rem)] max-w-lg flex items-center gap-3 px-5 py-3.5 rounded-2xl overflow-hidden text-right"
          style={{
            background: "linear-gradient(135deg, oklch(0.30 0.08 28) 0%, oklch(0.38 0.12 30) 100%)",
            boxShadow: "0 4px 20px oklch(0.35 0.12 28 / 0.35), 0 1px 4px oklch(0.35 0.12 28 / 0.20)",
          }}
        >
          {/* Animated glow pulse */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.0, 0.12, 0.0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "oklch(0.85 0.18 55)" }}
          />
          {/* Flame icon */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.50 0.15 30 / 0.40)", border: "1px solid oklch(0.65 0.18 45 / 0.35)" }}
          >
            <Flame className="h-4.5 w-4.5" style={{ color: "oklch(0.88 0.18 70)" }} />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            {dashboardLoading ? (
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-40 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 0.18)" }} />
                <div className="h-2.5 w-24 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 0.12)" }} />
              </div>
            ) : (
              <>
                <p className="text-[13px] font-black leading-tight" style={{ color: "oklch(0.97 0.03 80)" }}>
                  <span
                    className="text-[17px] font-black"
                    style={{ color: "oklch(0.88 0.18 70)", fontFamily: "'Heebo', sans-serif" }}
                  >
                    {todayJobs.length}
                  </span>
                  {" "}משרות זמינות להיום
                </p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: "oklch(0.85 0.06 80 / 0.75)" }}>
                  לחץ לצפייה בעבודות דחופות שמחכות לך עכשיו
                </p>
              </>
            )}
          </div>
          {/* Arrow */}
          <ChevronLeft className="h-4 w-4 flex-shrink-0" style={{ color: "oklch(0.85 0.08 80 / 0.70)", transform: "rotate(180deg)" }} />
        </motion.button>
      )}

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
          <div>
            <h2 className="text-lg font-black" style={{ color: "var(--brand)" }}>איך זה עובד</h2>
            <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>מצא עבודה זמנית בשלושה צעדים פשוטים</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {HOW_IT_WORKS.map(({ step, title, desc, imgUrl, reverse }, idx) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reverse ? -24 : 24, y: 12 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: idx * 0.12, duration: 0.45, ease: "easeOut" }}
              whileHover={{ y: -3, boxShadow: "0 8px 28px oklch(0.38 0.07 125.0 / 0.18), 0 2px 8px oklch(0.38 0.07 125.0 / 0.10)" }}
              whileTap={{ scale: 0.98 }}
              className={"flex items-center gap-4 p-4 rounded-2xl overflow-hidden cursor-pointer" + (reverse ? " flex-row-reverse" : "")}
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
                <h4 className="text-[15px] font-black mb-1" style={{ color: "var(--brand)" }}>{title}</h4>
                <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[12px] font-medium mb-6" style={{ color: "var(--text-secondary)" }}>
          התשלום מתבצע ישירות בינך לבין המעסיק.
        </p>

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
      <section
        dir="rtl"
        className="mb-10 relative z-10"
        style={{
          background: "oklch(0.97 0.012 100)",
          borderTop: "1px solid oklch(0.92 0.02 100)",
          borderBottom: "1px solid oklch(0.92 0.02 100)",
          padding: "20px 24px",
          maxWidth: "100%",
        }}
      >
        <div style={{ maxWidth: 512, margin: "0 auto" }}>

        {/* Availability row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div style={{ width: 4, height: 24, borderRadius: 4, background: "#4F583B" }} />
            <span className="text-[17px] font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>זמינות לעבודה</span>
          </div>
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
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[12px] font-semibold" style={{ color: isAvailable ? "oklch(0.48 0.18 150)" : "oklch(0.55 0.02 91)" }}>
                {isAvailable ? "זמין כרגע" : "לא זמין"}
              </span>
              {isAvailable && countdown && (
                <span
                  className="text-[10px] font-mono font-bold tabular-nums"
                  style={{ color: "oklch(0.42 0.16 150)", letterSpacing: "0.5px" }}
                  title="זמן שנותר לזמינות"
                >
                  {countdown}
                </span>
              )}
            </div>
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
              {isAvailable
                ? countdown
                  ? <span className="flex items-center gap-1.5">נשאר <span className="font-mono font-bold tabular-nums text-white">{countdown}</span></span>
                  : "הסר אותך מרשימת הזמינים"
                : "הופע בחיפושי מעסיקים באזורך"
              }
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
            onClick={() => navigate("/find-jobs?filter=nearby")}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right"
            style={{
              background: "white",
              border: "1px solid oklch(0.91 0.03 91.6)",
            }}
          >
            <div
              className="size-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.93 0.03 91.6)" }}
            >
              <MapPin className="h-4 w-4" style={{ color: "oklch(0.55 0.04 91)" }} />
            </div>
            <div>
              <p className="text-[12px] font-black" style={{ color: "oklch(0.35 0.04 91)" }}>
                זהה מיקום
              </p>
              <p className="text-[10px]" style={{ color: "oklch(0.42 0.03 91)" }}>עבודות בסביבה</p>
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
                <p className="text-[10px]" style={{ color: "oklch(0.42 0.03 91)" }}>התאמה אישית</p>
              </div>
            </button>
          )}
        </div>
        </div>
      </section>
      {/* ── Complete Profile Banner ─────────────────────────────────────────────────────────────────── */}
      {isAuthenticated && profileQuery.data &&
        (!profileQuery.data.preferredCategories?.length ||
          (!profileQuery.data.preferredCity && !profileQuery.data.workerLatitude)) && (
        <div className="relative z-10 px-4 mb-5">
          <div
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl"
            style={{ background: "oklch(0.97 0.02 95)", border: "1px solid oklch(0.88 0.05 90)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.88 0.08 85)" }}
              >
                <span className="text-base">💼</span>
              </div>
              <div>
                <p className="text-[13px] font-black" style={{ color: "oklch(0.35 0.05 91)" }}>השלם את הפרופיל שלך</p>
                <p className="text-[11px]" style={{ color: "oklch(0.55 0.04 91)" }}>הוסף קטגוריות ומיקום כדי לקבל הצעות מתאימות</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/worker-profile")}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "oklch(0.45 0.12 90)", color: "white" }}
            >
              עדכן עכשיו
            </button>
          </div>
        </div>
      )}
      {/* ── Inactive region banner ─────────────────────────────────────────── */}
      {isAuthenticated && (
        <div className="relative z-10 px-4 mb-4">
          <WorkerRegionBanner />
        </div>
      )}
      {/* ── Push Notification Banner ──────────────────────────────────────────── */}
      {isAuthenticated && (
        <div className="relative z-10 px-4 mb-4">
          <PushNotificationBanner
            category={profileQuery.data?.preferredCategories?.[0] ?? null}
            city={profileQuery.data?.preferredCity ?? null}
            compact
          />
        </div>
      )}

      {/* ── Urgent / Today carousel ───────────────────────────────────────────────────────────────────── */}
      {(allCarouselJobs.length > 0 || dashboardLoading) && (
        <section className="mb-10 relative z-10">
          <motion.div
            className="flex items-center justify-between px-6 mb-5 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2">
              <div style={{ width: 4, height: 24, borderRadius: 4, background: "#4F583B" }} />
              <h2 className="text-[17px] font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>דחוף להיום</h2>
            </div>
            <button
              onClick={() => navigate("/find-jobs?urgent=1")}
              className="text-sm font-black px-4 py-1.5 rounded-full transition-colors"
              style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
            >
              הכל
            </button>
          </motion.div>

          {dashboardLoading ? (
            <div className="px-6"><CarouselSkeletonRow count={3} /></div>
          ) : (
            <div className="relative" style={{ overflow: "hidden" }}>
              {/* Left fade mask */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 32,
                  background: "linear-gradient(to right, var(--page-bg, #f5f5f0) 0%, transparent 100%)",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              />
              {/* Right fade mask */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 32,
                  background: "linear-gradient(to left, var(--page-bg, #f5f5f0) 0%, transparent 100%)",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              />
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
              <motion.div
                id="job-carousel"
                className="flex gap-4 overflow-x-auto pb-4 px-6 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
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
                  <motion.div
                    key={`${badge}-${job.id}`}
                    layoutId={`carousel-card-${job.id}`}
                    className="snap-start shrink-0"
                    variants={{
                      hidden: { opacity: 0, y: 32, scale: 0.93 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: "spring", stiffness: 280, damping: 24 },
                      },
                    }}
                  >
                    <JobCard
                      job={{ ...job, isUrgent: badge === "urgent", contactPhone: job.contactPhone ?? null }}
                      variant="compact"
                      onLoginRequired={onLoginRequired}
                      onCardClick={(j) => { setBottomSheetJob(j as any); setBottomSheetOpen(true); }}
                      onApply={handleApply}
                      isApplied={appliedJobIds.has(job.id)}
                      isApplyPending={applyMutation.isPending && applyMutation.variables?.jobId === job.id}
                    />
                  </motion.div>
                ))}
              </motion.div>

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

       {/* ── חדש בסביבה / Latest jobs ─────────────────────────────────── */}
      <section
        className="mb-8 relative z-10"
        style={{
          background: "oklch(0.97 0.012 100)",
          borderTop: "1px solid oklch(0.92 0.02 100)",
          borderBottom: "1px solid oklch(0.92 0.02 100)",
          padding: "20px 24px",
        }}
      >
        <div style={{ maxWidth: 512, margin: "0 auto" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div style={{ width: 4, height: 24, borderRadius: 4, background: "#4F583B" }} />
            <h2 className="text-[17px] font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>חדש בסביבה</h2>
          </div>
          <button
            onClick={() => navigate("/find-jobs")}
            className="text-sm font-black px-4 py-1.5 rounded-full transition-colors"
            style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
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
            {jobs.slice(0, 8).map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35 }}>
                <JobCard
                    job={job}
                    onLoginRequired={onLoginRequired}
                    isSaved={savedIds.has(job.id)}
                    onSaveToggle={handleSaveToggle}
                    onCardClick={(j) => { setBottomSheetJob(j as any); setBottomSheetOpen(true); }}
                    onApply={handleApply}
                    isApplied={appliedJobIds.has(job.id)}
                    isApplyPending={applyMutation.isPending && applyMutation.variables?.jobId === job.id}
                  />
              </motion.div>
            ))}
            {jobs.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <button
                  onClick={() => navigate("/find-jobs")}
                  className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: "oklch(0.96 0.02 100)",
                    border: "1.5px dashed oklch(0.80 0.06 84)",
                    color: "oklch(0.42 0.10 88)",
                  }}
                >
                  ראה את כל המשרות
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </div>
        )}
        </div>
      </section>

      {/* ── Not found CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="relative z-10"
        dir="rtl"
        style={{ borderTop: "1px solid oklch(0.89 0.05 84.0)" }}
      >
        {/* Image top half - man with magnifying glass */}
        <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/not-found-bg_dd65b318.jpg"
            alt="אין משרות זמינות באזור זה כרגע"
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 15%",
            }}
          />
          {/* Bottom fade into content */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: "linear-gradient(to bottom, transparent, white)",
          }} />
        </div>
        {/* Content below image */}
        <div className="px-6 pb-10 text-center" style={{ background: "white" }}>
          <h3 className="text-xl font-black mb-2" style={{ color: "var(--brand)" }}>לא מצאתם את מה שחיפשתם?</h3>
          <p className="text-sm font-medium mb-6" style={{ color: "var(--text-secondary)" }}>
            כדאי לנסות את החיפוש המורחב לתוצאות מדויקות יותר
          </p>
          <motion.button
            onClick={() => navigate("/find-jobs")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 transition-all"
            style={{
              border: "1.5px solid oklch(0.82 0.06 84.0)",
              color: "var(--brand)",
              background: "white",
              borderRadius: 999,
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: "0 1px 6px oklch(0.38 0.07 125.0 / 0.08)",
            }}
          >
            <Search size={16} style={{ color: "var(--brand)" }} />
            חיפוש עבודות
          </motion.button>
        </div>
      </section>

      {/* ── Region Landing Pages CTA + SEO sections (deferred — below fold) ─── */}
      <BelowFold minHeight="120px" rootMargin="400px 0px">
      <section
        dir="rtl"
        className="relative z-10 px-5 py-8"
        style={{ background: "oklch(0.97 0.012 100)", borderTop: "1px solid oklch(0.92 0.02 100)" }}
      >
        <h3 className="text-base font-black mb-1" style={{ color: "var(--brand)" }}>
          הצטרף לעובדים באזורך
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          האזורים שלהלן נפתחים בקרוב למעסיקים. הצטרף עכשיו ותהיה הראשון לקבל הצעות.
        </p>
        <div className="flex flex-wrap gap-2">
          {([
            { slug: "tel-aviv", name: "תל אביב" },
            { slug: "jerusalem", name: "ירושלים" },
            { slug: "haifa", name: "חיפה" },
            { slug: "bnei-brak", name: "בני ברק" },
            { slug: "ashdod", name: "אשדוד" },
            { slug: "beer-sheva", name: "באר שבע" },
            { slug: "netanya", name: "נתניה" },
            { slug: "rishon-lezion", name: "ראשון לציון" },
          ] as const).map(({ slug, name }) => (
            <a
              key={slug}
              href={`/work/${slug}`}
              className="city-chip"
            >
              {name}
            </a>
          ))}
        </div>
      </section>

      {/* ── שירותי בית וניקיון — SEO internal links ─────────────────────────── */}
      <section
        dir="rtl"
        className="relative z-10"
        style={{
          background: "oklch(0.98 0.008 100)",
          borderTop: "1px solid oklch(0.92 0.02 100)",
          padding: "20px 16px 24px",
        }}
      >
        <div className="max-w-lg mx-auto">
          <p className="text-[13px] font-black mb-3" style={{ color: "var(--brand)" }}>🧹 שירותי בית וניקיון</p>
          <div className="flex flex-wrap gap-2">
            {([
              { label: "מנקה לבית", href: "/מנקה-לבית" },
              { label: "עוזרת בית", href: "/עוזרת-בית" },
              { label: "דרושה מנקה מהיום", href: "/דרושה-מנקה-מהיום" },
              { label: "כמה עולה עוזרת בית?", href: "/כמה-עולה-עוזרת-בית" },
              { label: "מנקה לבית חד פעמי", href: "/מנקה-לבית-חד-פעמי" },
            ] as const).map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1 rounded-full text-[12px] font-semibold px-3 py-1.5 transition-all"
                style={{
                  background: "oklch(0.93 0.03 122)",
                  color: "var(--brand)",
                  border: "1px solid oklch(0.87 0.05 122)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "oklch(0.88 0.06 122)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "oklch(0.93 0.03 122)"; }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Employer CTA ────────────────────────────────────────────────────────────────────────────────── */}
      <section
        dir="rtl"
        className="relative z-10 cursor-pointer"
        style={{
          background: "linear-gradient(160deg, oklch(0.91 0.04 91.6) 0%, oklch(0.94 0.025 122.3) 100%)",
          borderTop: "1px solid oklch(0.85 0.06 84.0 / 0.5)",
        }}
        onClick={resetUserMode}   onMouseEnter={(e) => {
          const bar = e.currentTarget.querySelector<HTMLElement>('[data-accent-bar]');
          if (bar) bar.style.borderRightWidth = '8px';
          const arrow = e.currentTarget.querySelector<HTMLElement>('[data-arrow-btn]');
          if (arrow) { arrow.style.transform = 'scale(1.12)'; arrow.style.boxShadow = '0 4px 12px oklch(0.75 0.18 80.8 / 0.35)'; }
        }}
        onMouseLeave={(e) => {
          const bar = e.currentTarget.querySelector<HTMLElement>('[data-accent-bar]');
          if (bar) bar.style.borderRightWidth = '4px';
          const arrow = e.currentTarget.querySelector<HTMLElement>('[data-arrow-btn]');
          if (arrow) { arrow.style.transform = 'scale(1)'; arrow.style.boxShadow = 'none'; }
        }}
      >
        <div
          data-accent-bar
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderRight: "4px solid var(--amber)",
            transition: "border-right-width 0.2s ease",
          }}
        >
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-black" style={{ color: "var(--brand)" }}>מחפשים עובדים?</p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--amber)" }}>לחצו לפרסום עבודה</p>
          </div>
          <div
            data-arrow-btn
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 36,
              height: 36,
              background: "var(--amber)",
              color: "white",
              fontSize: 18,
              fontWeight: 700,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            ←
          </div>
        </div>
      </section>

        </BelowFold>

      {/* ── Info Dialog ──────────────────────────────────────────── */}
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
                  {countdown
                    ? <> זמן שנותר: <strong className="font-mono">{countdown}</strong>.</>  
                    : " הזמינות עומדת לפוג בקרוב."
                  }
                  {" "}לחץ שוב על הכפתור לביטול מיידי.
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
          {/* Minor warning: shown when any duration option would cross 22:00 */}
          {workerIsMinor && (() => {
            const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
            const wouldCross = [2, 4, 8].some(h => nowMins + h * 60 > 22 * 60);
            if (!wouldCross) return null;
            return (
              <div className="flex items-start gap-2 rounded-lg p-3 text-sm mb-2"
                style={{ backgroundColor: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.4)" }}>
                <span className="text-base mt-0.5">⚠️</span>
                <p className="text-right leading-snug" style={{ color: "var(--amber)" }}>
                  כקטין/ה, אסור לעבוד לאחר 22:00 לפי חוק עבודת נוער. בחר/י משך שאינו חוצה את השעה 22:00.
                </p>
              </div>
            );
          })()}
          {/* Preset quick-select buttons */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {([2, 4, 8, 12, 24, 48, 72] as const).map((h) => {
              const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
              const crossesCutoff = workerIsMinor && (nowMins + h * 60 > 22 * 60);
              return (
              <motion.button
                key={h}
                onClick={() => { setCustomHours(""); confirmAvailability(h); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all font-bold relative"
                style={{
                  borderColor: crossesCutoff ? "rgba(251,191,36,0.6)" : "var(--border)",
                  color: "var(--brand)",
                  opacity: crossesCutoff ? 0.7 : 1,
                }}
              >
                {crossesCutoff && (
                  <span className="absolute top-1 left-1 text-xs" title="חוצה 22:00">⚠️</span>
                )}
                <span className="text-xl font-extrabold" style={{ color: crossesCutoff ? "rgba(251,191,36,0.7)" : "var(--amber)" }}>{h}</span>
                <span className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>שע'</span>
              </motion.button>
              );
            })}
          </div>

          {/* Custom hours input */}
          <div className="mt-3">
            <p className="text-xs text-right mb-1.5" style={{ color: "var(--muted-foreground)" }}>או הזן מספר שעות חופשי (1–72):</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={72}
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                placeholder="למשל: 36"
                className="flex-1 rounded-lg border px-3 py-2 text-right text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                  outline: "none",
                }}
                dir="rtl"
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const h = parseInt(customHours, 10);
                  if (!isNaN(h) && h >= 1 && h <= 72) {
                    setCustomHours("");
                    confirmAvailability(h);
                  }
                }}
                disabled={!customHours || parseInt(customHours, 10) < 1 || parseInt(customHours, 10) > 72}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: customHours && parseInt(customHours, 10) >= 1 && parseInt(customHours, 10) <= 72
                    ? "var(--brand)"
                    : "var(--muted)",
                  color: customHours && parseInt(customHours, 10) >= 1 && parseInt(customHours, 10) <= 72
                    ? "var(--brand-foreground)"
                    : "var(--muted-foreground)",
                  cursor: customHours && parseInt(customHours, 10) >= 1 && parseInt(customHours, 10) <= 72 ? "pointer" : "not-allowed",
                }}
              >
                אשר
              </motion.button>
            </div>
            {customHours && (parseInt(customHours, 10) < 1 || parseInt(customHours, 10) > 72) && (
              <p className="text-xs mt-1 text-right" style={{ color: "oklch(0.55 0.2 25)" }}>יש להזין מספר בין 1 ל-72</p>
            )}
          </div>

          <AppButton variant="ghost" size="sm" className="mt-1 w-full" onClick={() => { setCustomHours(""); setDurationOpen(false); }}>ביטול</AppButton>
        </DialogContent>
      </Dialog>

      {/* ── Quick Availability Dialog ─────────────────────────────────── */}
      <Dialog open={quickAvailOpen} onOpenChange={setQuickAvailOpen}>
        <DialogContent dir="rtl" className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-right">עדכן סטאטוס זמינות</DialogTitle>
            <DialogDescription className="text-right">
              בחר את סטאטוס הזמינות שלך לעבודה
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {([
              { value: "available_now", label: "זמין עכשיו", emoji: "🟢", desc: "פנוי מיידית" },
              { value: "available_today", label: "זמין היום", emoji: "🟡", desc: "פנוי להיום" },
              { value: "available_hours", label: "שעות מסוימות", emoji: "🕐", desc: "פנוי בשעות ספציפיות" },
              { value: "not_available", label: "לא זמין", emoji: "🔴", desc: "לא פנוי כרגע" },
            ] as const).map(({ value, label, emoji, desc }) => (
              <motion.button
                key={value}
                onClick={() => quickAvailMutation.mutate({ availabilityStatus: value })}
                disabled={quickAvailMutation.isPending}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all"
                style={{
                  borderColor: profileQuery.data?.availabilityStatus === value ? "var(--brand)" : "var(--border)",
                  background: profileQuery.data?.availabilityStatus === value ? "oklch(0.95 0.03 122)" : "white",
                }}
              >
                <span className="text-2xl mb-1">{emoji}</span>
                <span className="text-xs font-black" style={{ color: "var(--brand)" }}>{label}</span>
                <span className="text-[10px] mt-0.5 text-center" style={{ color: "var(--muted-foreground)" }}>{desc}</span>
              </motion.button>
            ))}
          </div>
          <AppButton variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setQuickAvailOpen(false)}>ביטול</AppButton>
        </DialogContent>
      </Dialog>
      {/* ── Job Bottom Sheet ───────────────────────────────────────────────────── */}
      <JobBottomSheet
        job={bottomSheetJob}
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onLoginRequired={onLoginRequired}
        isAuthenticated={isAuthenticated}
        layoutId={bottomSheetJob ? `carousel-card-${bottomSheetJob.id}` : undefined}
      />

    </div>
  );
}

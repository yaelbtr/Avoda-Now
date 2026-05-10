import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import TextMarquee from "@/components/ui/text-marque";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import {
  ChevronLeft, Zap, Search,
  Briefcase, BadgePercent, Clock, UserPlus, Lock, Bell,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { NavPill } from "@/components/ui/NavPill";
import { AnimatedBorderButton } from "@/components/ui/button-border";
import { WorkerRegionBanner } from "@/components/WorkerRegionBanner";
import BelowFold from "@/components/BelowFold";
import { toast } from "sonner";
import { useCountdown } from "@/hooks/useCountdown";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import workerHeroCollage from "@/assets/homeWork2.png";
// סקציות חדשות - שלב collecting workers
import { HowItWorksSimple } from "@/components/home/HowItWorksSimple";
// Lazy: נטען רק אחרי גלילה
const StickyBottomCta = lazy(() =>
  import("@/components/home/StickyBottomCta").then((m) => ({ default: m.StickyBottomCta }))
);
const STICKY_CTA_SCROLL_THRESHOLD = 200;

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

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}


const editorial = {
  primary: "var(--editorial-primary)",
  primaryContainer: "var(--editorial-primary-container)",
  primaryFixed: "var(--editorial-primary-fixed)",
  secondary: "var(--editorial-secondary)",
  secondaryContainer: "var(--editorial-secondary-container)",
  secondaryFixed: "var(--editorial-secondary-fixed)",
  onSecondaryFixed: "var(--editorial-on-secondary-fixed)",
  tertiary: "var(--editorial-tertiary)",
  tertiaryFixed: "var(--editorial-tertiary-fixed)",
  onTertiaryFixed: "var(--editorial-on-tertiary-fixed)",
  error: "var(--editorial-error)",
  errorContainer: "var(--editorial-error-container)",
  onErrorContainer: "var(--editorial-on-error-container)",
  background: "var(--editorial-background)",
  surface: "var(--editorial-surface)",
  surfaceContainer: "var(--editorial-surface-container)",
  surfaceLow: "var(--editorial-surface-container-low)",
  outlineGhost: "var(--editorial-outline-ghost)",
  onSurface: "var(--editorial-on-surface)",
  onSurfaceVariant: "var(--editorial-on-surface-variant)",
  shadow: "var(--editorial-shadow)",
  ctaGradient: "var(--editorial-cta-gradient)",
  displayFont: "var(--font-editorial-display)",
  headlineFont: "var(--font-editorial-headline)",
  uiFont: "var(--font-editorial-ui)",
};

function renderHighlightedSubtitle(text: string) {
  return text.split(/(עכשיו|ללא עמלות|ללא עמלה|חינם)/g).map((part, index) => {
    const isHighlight = part === "עכשיו" || part === "ללא עמלות" || part === "ללא עמלה" || part === "חינם";
    if (!isHighlight) return part;

    return (
      <span
        key={`${part}-${index}`}
        style={{
          color: "oklch(0.91 0.21 98.84 / 0.98)",
          fontWeight: 700,
          fontSize:"19px",
          // textDecoration: "underline",
          // textDecorationColor: "rgb(122 62 6 / 0.50)",
          textDecorationThickness: 2,
        //    textUnderlineOffset: 3,
          // textShadow: "0 1px 6px rgb(255 255 255 / 0.90)",
          // background: "rgb(184 105 20 / 0.11)",
          borderRadius: 4,
          padding: "0 3px",
        }}
      >
        {part}
      </span>
    );
  });
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

  const dynamicNum = dynamicStat ? parseInt(dynamicStat.display.replace(/\D/g, ""), 10) : 0;
  const countDynamic = useCountUp(dynamicNum);
  const count100 = useCountUp(100);

  const statsData = [
    ...(dynamicStat ? [dynamicStat] : []),
    { display: "100%", label: "ללא עמלות", Icon: BadgePercent },
    { display: "24/7", label: "זמין תמיד", Icon: Clock },
  ];
  return (
    <motion.div
      ref={ref}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.10 } } }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      dir="rtl"
      style={{ display: "flex", gap: "10px", padding: "12px 0", width: "100%", fontFamily: editorial.uiFont }}
    >
      {statsData.map(({ display, label, Icon }, i) => (
        <motion.div
          key={label}
          variants={{
            hidden: { opacity: 0, y: 18, scale: 0.90 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 26 } },
          }}
          whileHover={{ y: -4, scale: 1.02, boxShadow: editorial.shadow, transition: { type: "spring", stiffness: 360, damping: 24 } }}
          whileTap={{ scale: 0.94 }}
          style={{
            flex: "1 1 0",
            minWidth: 0,
            background: "linear-gradient(145deg, rgb(255 255 255 / 0.40), rgb(255 255 255 / 0.18))",
            backdropFilter: "blur(16px) saturate(1.3)",
            WebkitBackdropFilter: "blur(16px) saturate(1.3)",
            borderRadius: "24px",
            border: "1px solid rgb(255 255 255 / 0.60)",
            boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.72), 0 18px 34px rgb(27 28 26 / 0.06)",
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "92px",
            cursor: "default",
          }}
        >
          <div style={{
            width: "34px", height: "34px", borderRadius: "12px",
            background: editorial.primaryFixed,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "8px",
          }}>
            <Icon style={{ width: "15px", height: "15px", color: editorial.primary }} />
          </div>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "rgb(27 28 26 / 0.78)", lineHeight: 1, letterSpacing: 0 }}>
            {label === "ללא עמלות" ? `${count100}%` : label === "זמין תמיד" ? "24/7" : `+${countDynamic}`}
          </span>
          <span style={{ fontSize: "10px", fontWeight: 500, color: "rgb(77 78 69 / 0.68)", marginTop: "4px", whiteSpace: "nowrap" }}>{label}</span>
        </motion.div>
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
    desc: "מעסיקים שמחפשים עובדים באזור שלך רואים שאתה זמין ושולחים לך הצעת עבודה - אתה מחליט אם לאשר.",
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

const WORKER_HOME_HERO_ALT =
  "עובדת עומדת ברחוב ובודקת עבודות זמינות בטלפון";

interface HomeWorkerProps {
  onLoginRequired: (msg: string) => void;
}

export default function HomeWorker({ onLoginRequired }: HomeWorkerProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resetUserMode } = useUserMode();
  const authQuery = useAuthQuery();
  // ── State (רק מה ש-Hero + Dialogs + Banners צריכים) ──
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(4);
  const [customHours, setCustomHours] = useState<string>("");
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [ctaHovered, setCtaHovered] = useState(false);
  // Sticky CTA - נטען רק אחרי גלילה כדי לחסוך באנדל
  const [showStickyCta, setShowStickyCta] = useState(false);
  // כותרת משנית מתחלפת
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const heroSubtitles = [
    "הרשמו חינם - קבלו הצעות ישירות לנייד",
    "ניקיון, אירועים, תיקונים ועוד",
    "ללא עמלה • 100% מהכסף אליכם",
    "מאות מעסיקים מחפשים עובדים עכשיו",
    "בחרו תחום ואזור - ומעסיקים ימצאו אתכם",
  ];

  const handlePrimaryCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
    if (!isAuthenticated) {
      onLoginRequired("כדי ליצור פרופיל יש להתחבר תחילה");
      return;
    }
    navigate("/worker-profile");
  };
  useSEO({
    title: "AvodaGo - עבודות זמניות בישראל",
    description: "הצטרפו לאלפי עובדים שכבר רשומים. בחרו תחומים ואזור - וקבלו הצעות ממעסיקים ישירות. ללא עמלות.",
    keywords: "עבודה זמנית, עבודה מיידית, משרות זמניות, עבודות לסטודנטים, עבודה לנוער, עבודות מזדמנות, פרסום משרה, חיפוש עבודה בישראל",
    canonical: "/",
  });

  // ── Sticky CTA scroll detection - ההורה שולט מתי לטעון את הצ'אנק ──
  useEffect(() => {
    if (showStickyCta) return;
    const onScroll = () => {
      if (window.scrollY > STICKY_CTA_SCROLL_THRESHOLD) {
        setShowStickyCta(true);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showStickyCta]);

  useEffect(() => {
    const id = setTimeout(
      () => setSubtitleIndex((i) => (i + 1) % heroSubtitles.length),
      2800
    );
    return () => clearTimeout(id);
  }, [subtitleIndex, heroSubtitles.length]);

  const profileQuery = trpc.user.getProfile.useQuery(undefined, authQuery());
  const pushNotifications = usePushNotifications();

  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const registeredWorkersCount = heroStatsQuery.data?.registeredWorkers ?? null;
  const animatedRegisteredWorkers = useCountUp(registeredWorkersCount ?? 679, 1200);
  const animatedCommissionPercent = useCountUp(100, 1000);
  const workerStatusQuery = trpc.workers.myStatus.useQuery(undefined, authQuery());
  // Age-gate: fetch birth date info to warn minors about late availability (Duration Picker)
  const birthDateInfoQuery = trpc.user.getBirthDateInfo.useQuery(undefined, authQuery({ staleTime: 5 * 60 * 1000 }));
  const workerIsMinor = birthDateInfoQuery.data?.isMinor === true;

  const setAvailableMutation = trpc.workers.setAvailable.useMutation({
    onSuccess: () => {
      workerStatusQuery.refetch();
      setAvailabilityLoading(false);
      const h = selectedDuration;
      const label = h === 1 ? "שעה אחת" : `${h} שעות`;
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

  const isAvailable = !!workerStatusQuery.data;
  const availableUntil = (workerStatusQuery.data as { availableUntil?: Date } | null)?.availableUntil ?? null;
  const countdown = useCountdown(availableUntil);

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

  return (
    <div dir="rtl" data-testid="home-worker" className="min-h-screen overflow-x-hidden relative" style={{ backgroundColor: editorial.background, fontFamily: editorial.uiFont, color: editorial.onSurface }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}

      {/* ── MOBILE Hero (< md): new layout with floating stats ── */}
      <section className="relative overflow-hidden md:hidden" style={{ background: editorial.background, minHeight: 432 }}>

        {/* ── אזור הטקסט ── */}
        <div style={{ position: "relative", zIndex: 10, padding: "28px 24px 238px", direction: "rtl", textAlign: "center" }}>

          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{
              fontSize: 34, lineHeight: 1.04, fontWeight: 800,
              color: "white",
              fontFamily: editorial.displayFont,
              letterSpacing: 0,
              textShadow: "rgb(0 0 0) 0px 2px 18px",

            }}
          >
            <span style={{ opacity: 0.75, fontWeight: 800 }}>מעסיקים באזורך</span><br />
            <span style={{ color: "white", fontWeight: 950, fontSize: 36, textShadow: "0 2px 14px rgb(0 0 0 / 0.38)" }}>מחפשים אותך</span>
          </motion.h1>

          <div style={{ height: 46, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={subtitleIndex}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.38, ease: "easeInOut" }}
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "rgb(27 28 26 / 0.94)",
                  fontFamily: editorial.uiFont,
                  lineHeight: 1.55,
                  maxWidth: 300,
                  margin: 0,
                  textAlign: "center",
                  textShadow: "0 2px 12px rgb(255 255 255 / 0.72)",

                }}
              >
                {renderHighlightedSubtitle(heroSubtitles[subtitleIndex])}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Image + floating stats ── */}
        <div style={{ position: "absolute", top: -76, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <img
            src={workerHeroCollage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1456}
            height={816}
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center 32%",
              filter: "brightness(0.74) saturate(0.82) blur(2.8px)",
              transform: "scale(1.024)",
            }}
          />
          {/* <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "rgb(27 28 26 / 0.07)",
            zIndex: 1,
            pointerEvents: "none",
          }} />
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, rgb(27 28 26 / 0.18) 0%, rgb(27 28 26 / 0.06) 20%, transparent 38%, transparent 62%, rgb(27 28 26 / 0.08) 80%, rgb(27 28 26 / 0.20) 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }} />   */}
          {/* <div aria-hidden style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "46%",
            background: "linear-gradient(to right, rgb(27 28 26 / 0.30) 0%, rgb(27 28 26 / 0.16) 42%, transparent 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }} /> */}
          {/* <div aria-hidden style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "34%",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            maskImage: "linear-gradient(to left, black 20%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, black 20%, transparent 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }} /> */}
          <img
            src={workerHeroCollage}
            alt={WORKER_HOME_HERO_ALT}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1456}
            height={816}
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center 32%",
              zIndex: 3,
              WebkitMaskImage: "radial-gradient(47% 55% at 50% 54%, rgb(250 249 245) 0px, rgb(0 0 0) 58%, rgb(0 0 0 / 84%) 68%, #0000003b 83%)",
              maskImage: "radial-gradient(47% 55% at 50% 54%, rgb(250 249 245) 0px, rgb(0 0 0) 58%, rgb(0 0 0 / 84%) 68%, #0000003b 83%)",
            }}
          />
          {/* <div aria-hidden style={{
            position: "absolute",
            left: "18%", top: "28%",
            width: "58%", height: "34%",
            background: "radial-gradient(ellipse at center, rgb(255 246 224 / 0.22) 0%, rgb(220 232 179 / 0.10) 42%, transparent 74%)",
            mixBlendMode: "soft-light",
            zIndex: 4,
            pointerEvents: "none",
          }} /> */}
          {/* Fade top of image into bg - מכסה את אזור הטקסט */}
          <div aria-hidden style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "35%",
            background: [
              "linear-gradient(rgb(250 249 245) 0%, rgb(250 249 245) 34%, rgb(250 249 245 / 0%) 100%), linear-gradient(rgba(250, 249, 245, 0.62) 0%, rgba(250, 249, 245, 0.26) 44%, #faf9f500 100%)",
            ].join(" "),
            zIndex: 5, pointerEvents: "none",
          }} />
          {/* Fade bottom of image into bg - מכסה את אזור הכפתורים */}
          <div aria-hidden style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "26%",
            background: [
              "linear-gradient(to top,",
              `${editorial.background} 0%,`,
              `${editorial.background} 34%,`,
              "rgb(250 249 245 / 0.82) 58%,",
              "transparent 100%)",
            ].join(" "),
            zIndex: 5, pointerEvents: "none",
          }} />

        </div>

        {/* ── כפתורי פעולה ── */}
        <div style={{ position: "relative", zIndex: 10, padding: "28px 14px 22px", direction: "rtl" }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="w-full flex flex-col  "
          >
            {/* ── טיקר נוסע ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              style={{
                width: "100%",
                marginBottom: 12,
              //  color: "rgb(255 255 255 / 0.90)",
                // border: "1px solid rgb(199 199 186 / 0.32)",
                // borderRadius: 12,
                overflow: "hidden",
                fontFamily: editorial.uiFont,
              }}
            >
              <div style={{
                color: "white",
                fontWeight: 900,
                fontSize:"22px",
                textDecorationColor: "rgb(122 62 6 / 0.50)",
                textDecorationThickness: 2,
                textUnderlineOffset: 3,
              //  . textShadow: "0 1px 6px rgb(255 255 255 / 0.90)",
              }}>
                <TextMarquee
                  baseVelocity={-3}
                  delay={400}
                  startFromRight
                  clasname="text-[17px] font-semibold tracking-normal leading-[34px]"
                >
                  <motion.span
                    style={{ display: "inline-block", transformOrigin: "top center" }}
                    animate={{ rotate: [0, -18, 18, -12, 12, -6, 6, 0], scale: [1, 1.15, 1.15, 1.1, 1.1, 1.05, 1.05, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
                  >🔔</motion.span>{" נרשמים עכשיו ומקבלים עדיפות לעבודות ראשונות "}<motion.span
                    style={{ display: "inline-block", transformOrigin: "top center" }}
                    animate={{ rotate: [0, -18, 18, -12, 12, -6, 6, 0], scale: [1, 1.15, 1.15, 1.1, 1.1, 1.05, 1.05, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut", delay: 1.4 }}
                  >🔔</motion.span>{" נשלח לך ברגע שעולה עבודה באזור שלך "}
                </TextMarquee>
              
              {/* <TextMarquee
                baseVelocity={2}
                delay={400}
                startFromRight
                clasname="text-[14px] font-medium   tracking-normal leading-[34px]"
              >
            </TextMarquee> */}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                width: "100%",
                marginBottom: 54,
                fontFamily: editorial.uiFont,
              }}
            >
              {[
                { Icon: Briefcase, value: `+${animatedRegisteredWorkers}`, label: "עובדים רשומים", description: null, featured: false, secure: false },
                { Icon: BadgePercent, value: `${animatedCommissionPercent}%`, label: "ללא עמלות", description: null, featured: true, secure: false },
                { Icon: Lock, value: "פרופיל", label: "מאובטח", description: "הטלפון מוסתר עד שתאשרו", featured: false, secure: true },
              ].map(({ Icon, value, label, description, featured, secure }) => (
                <div
                  key={label}
                  style={{
                    minWidth: 0,
                    minHeight: 66,
                    borderRadius: 16,
                    background: featured ? "rgb(220 232 179 / 0.52)" : "rgb(255 255 255 / 0.44)",
                    border: featured ? `1px solid rgb(49 59 21 / 0.28)` : "1px solid rgb(199 199 186 / 0.22)",
                    boxShadow: featured ? "0 8px 18px rgb(49 59 21 / 0.07)" : "none",
                    opacity: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: "8px 6px",
                  }}
                >
                  <Icon size={secure ? 16 : 15} strokeWidth={2.1} style={{ color: featured ? editorial.primary : "rgb(55 56 48 / 0.82)" }} />
                  <span style={{ fontSize: description ? 14 : 17, fontWeight: featured ? 850 : 700, color: featured ? editorial.onSurface : "rgb(27 28 26 / 0.92)", lineHeight: 1.05, letterSpacing: 0 }}>
                    {value}
                  </span>
                  <span style={{ fontSize: secure ? 10 : 9.5, fontWeight: featured ? 700 : 600, color: featured ? editorial.primary : "rgb(55 56 48 / 0.78)", lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                  {description && (
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: "rgb(44 45 38 / 0.82)", lineHeight: 1.3, textAlign: "center", maxWidth: 86 }}>
                      {description}
                    </span>
                  )}
                </div>
              ))}
            </motion.div>

            <AnimatedBorderButton
              onClick={handlePrimaryCtaClick}
              onHoverStart={() => setCtaHovered(true)}
              onHoverEnd={() => setCtaHovered(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                width: "92%", height: 57,
                margin: "0 auto",
                background: "#B86914",
                color: "white",
                borderRadius: 22, fontSize: 14, fontWeight: 700,
                border: "none",
                // boxShadow: "0 12px 32px rgba(184,105,20,0.35)",
                cursor: "pointer", letterSpacing: "-0.2px",
                fontFamily: editorial.uiFont,
                transform: "translateY(0)",
              }}
              whileHover={{ scale: 1.02, backgroundColor: "#d2d81c", y: -1 }}
              whileTap={{ scale: 0.95, y: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <motion.span
                aria-hidden
                animate={{ x: ctaHovered ? "220%" : "-110%", opacity: ctaHovered ? 1 : 0 }}
                transition={{ duration: 0.58, ease: "easeInOut" }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(105deg, transparent 28%, yellow 50%, transparent 72%)", pointerEvents: "none", zIndex: 1 }}
              />
              <UserPlus size={14} />
              צור פרופיל והתפרסם
              {ripples.map(r => (
                <motion.span
                  key={r.id}
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  style={{ position: "absolute", left: r.x, top: r.y, width: 40, height: 40, borderRadius: "50%", background: "rgb(255 255 255 / 0.30)", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 1 }}
                />
              ))}
            </AnimatedBorderButton>
          </motion.div>
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -12,
            height: 128,
            background: ` linear-gradient(to top, rgb(250 249 245) 0%, rgb(250 249 245) 70%, rgba(0, 0, 0, 0) 100%)   `,
            zIndex: 6,
            pointerEvents: "none",
          }}
        />
      </section>

      {/* ── DESKTOP Hero (≥ md): full-bleed image with text overlay ── */}
      <section
        className="relative z-10 overflow-hidden hidden md:block"
        style={{ minHeight: "540px", background: editorial.background }}
      >
        {/* Full-bleed background image */}
        <img
          src={workerHeroCollage}
          alt={WORKER_HOME_HERO_ALT}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1456}
          height={816}
          className="absolute right-6 top-1/2 z-0 w-[520px] max-w-[44vw] -translate-y-1/2 object-cover xl:right-12 xl:w-[620px]"
          style={{
            objectPosition: "50% 50%",
            borderRadius: 24,
            border: `1px solid ${editorial.outlineGhost}`,
            background: "rgb(255 255 255 / 0.80)",
            boxShadow: editorial.shadow,
          }}
        />

        {/* Directional overlay: very light on left only */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(180deg,",
              "  var(--editorial-background) 0%,",
              "  var(--editorial-surface-container-low) 58%,",
              "  var(--editorial-surface-container) 100%)",
            ].join(" "),
          }}
        />
        {/* Bottom fade to page bg */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: "120px", background: "linear-gradient(to bottom, transparent 0%, var(--editorial-surface-container) 100%)" }}
        />

        {/* Content - text on LEFT side (RTL: visually left side of screen), woman visible on RIGHT */}
        <div className="relative z-10 flex flex-col justify-center items-start text-right px-6 pt-14 pb-20" style={{ minHeight: "520px", maxWidth: "460px", marginRight: "auto" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: editorial.primaryFixed,
              border: "none",
              opacity: 0.78,
            }}
          >
            <Zap className="h-3 w-3" style={{ color: editorial.primary }} />
            <span className="text-[11px] font-bold" style={{ color: editorial.primary, letterSpacing: 0, fontFamily: editorial.uiFont }}>
              עבודות בית ואירועים - תוך דקות
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[46px] leading-[1.05] font-black mb-5"
            style={{
              color: editorial.onSurface,
              fontFamily: editorial.displayFont,
              fontWeight: 900,
              letterSpacing: 0,
              textShadow: "0 1px 0 rgb(255 255 255 / 0.90), 0 14px 30px rgb(27 28 26 / 0.18)",
            }}
          >
            הגדר זמינות -<br />
            <span style={{ color: editorial.primary, textShadow: "0 1px 0 rgb(255 255 255 / 0.80), 0 12px 26px rgb(49 59 21 / 0.22)" }}>
              קבל פניות ממעסיקים
            </span>
          </motion.h1>

          <div className="mb-8" style={{ height: 48, display: "flex", alignItems: "center", overflow: "hidden", maxWidth: 310 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={subtitleIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.38, ease: "easeInOut" }}
                className="text-[15px] font-bold leading-relaxed m-0"
                style={{
                  color: "rgb(27 28 26 / 0.94)",
                  fontFamily: editorial.uiFont,
                  textShadow: "0 1px 0 rgb(255 255 255 / 0.88)",
                }}
              >
                {renderHighlightedSubtitle(heroSubtitles[subtitleIndex])}
              </motion.p>
            </AnimatePresence>
          </div>

          <StatsRow />

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8"
          >
            <motion.button
              onClick={() => navigate("/find-jobs")}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 font-bold text-[15px] overflow-hidden relative"
              style={{
                background: editorial.ctaGradient,
                color: "white",
                borderRadius: 24,
                boxShadow: "0 14px 28px rgb(27 28 26 / 0.08)",
                fontFamily: editorial.uiFont,
              }}
              whileHover={{ scale: 1.03, y: -2, boxShadow: editorial.shadow }}
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
            <path d="M0,48 L0,28 C65,8 130,44 195,22 C260,0 325,38 390,16 L390,48 Z" fill="var(--editorial-background)" />
          </svg>
        </div>
      </section>



      {/* ── How it works ────────────── */}
      <HowItWorksSimple />

      {/* ── Worker action tiles ─────────────────────────────────────────────────────────────────── */}
      {isAuthenticated && profileQuery.data && (
        <div className="relative z-10 px-4 mb-5">
          <div className="grid grid-cols-2 gap-3">
            {(!profileQuery.data.preferredCategories?.length ||
              (!profileQuery.data.preferredCity && !profileQuery.data.workerLatitude)) && (
              <button
                onClick={() => navigate("/worker-profile")}
                className="flex flex-col items-center justify-center text-center"
                style={{
                  minHeight: 146,
                  background: "var(--editorial-surface-container-lowest)",
                  border: "1px solid rgb(199 199 186 / 0.20)",
                  borderRadius: 24,
                  boxShadow: "0 14px 28px rgb(27 28 26 / 0.06)",
                  fontFamily: editorial.uiFont,
                  padding: 16,
                }}
              >
                <span className="flex items-center justify-center mb-3" style={{ width: 46, height: 46, background: editorial.primaryFixed, borderRadius: 16 }}>
                  <Briefcase className="h-5 w-5" style={{ color: editorial.primary }} />
                </span>
                <span className="text-[15px] font-semibold" style={{ color: editorial.onSurface, letterSpacing: 0 }}>השלם את הפרופיל שלך</span>
                <span className="text-[11px]" style={{ color: editorial.onSurfaceVariant, lineHeight: 1.45, marginTop: 5 }}>הוסף קטגוריות ומיקום כדי לקבל הצעות מתאימות</span>
                <span className="mt-3 px-4 py-2 text-xs font-semibold" style={{ background: editorial.ctaGradient, color: "white", borderRadius: 999, boxShadow: "0 10px 20px rgb(49 59 21 / 0.12)" }}>עדכן עכשיו</span>
              </button>
            )}

            {pushNotifications.isSupported && !pushNotifications.isSubscribed && pushNotifications.permission !== "denied" && (
              <button
                onClick={pushNotifications.subscribe}
                disabled={pushNotifications.isLoading}
                className="flex flex-col items-center justify-center text-center disabled:opacity-60"
                style={{
                  minHeight: 146,
                  background: "var(--editorial-surface-container-lowest)",
                  border: "1px solid rgb(199 199 186 / 0.20)",
                  borderRadius: 24,
                  boxShadow: "0 14px 28px rgb(27 28 26 / 0.06)",
                  fontFamily: editorial.uiFont,
                  padding: 16,
                }}
              >
                <span className="flex items-center justify-center mb-3" style={{ width: 46, height: 46, background: "oklch(0.91 0.21 98.84 / 0.98)", borderRadius: 16 }}>
                  <Bell className="h-5 w-5" style={{ color: editorial.primary }} />
                </span>
                <span className="text-[15px] font-semibold" style={{ color: editorial.onSurface, letterSpacing: 0 }}>הפעל התראות משרות</span>
                <span className="text-[11px]" style={{ color: editorial.onSurfaceVariant, lineHeight: 1.45, marginTop: 5 }}>קבל התראה מיידית על משרות מתאימות</span>
                <span className="mt-3 px-4 py-2 text-xs font-semibold" style={{ background: "oklch(0.91 0.21 98.84 / 0.98)", color: editorial.primary, borderRadius: 999, boxShadow: "0 10px 20px rgb(49 59 21 / 0.12)" }}>{pushNotifications.isLoading ? "..." : "הפעל"}</span>
              </button>
            )}
          </div>
        </div>
      )}
      {/* ── Inactive region banner ─────────────────────────────────────────── */}
      {isAuthenticated && (
        <div className="relative z-10 px-4 mb-4">
          <WorkerRegionBanner />
        </div>
      )}
       {/* ── חדש בסביבה / Latest jobs ─────────────────────────────────── */}


      {/* ── Region Landing Pages CTA + SEO sections (deferred - below fold) ─── */}
      <BelowFold minHeight="120px" rootMargin="400px 0px">
      <section
        dir="rtl"
        className="relative z-10 px-5 py-8"
        style={{ background: editorial.surfaceContainer, paddingTop: 0, display: "none" }}
      >
        <h3 className="" style={{ fontSize: "17px", fontWeight: 600, marginBottom: "6px", color: editorial.primary, fontFamily: editorial.headlineFont }}>
          הצטרף לעובדים באזורך
        </h3>
        <p className="" style={{ fontSize: "13px", color: editorial.onSurfaceVariant, lineHeight: 1.5, maxWidth: "280px", margin: "0 auto 12px" }}>
          האזורים שלהלן נפתחים בקרוב למעסיקים. הצטרף עכשיו ותהיה הראשון לקבל הצעות.
        </p>
        <div style={{ display: "flex", flexDirection: "row", overflowX: "auto", flexWrap: "nowrap", gap: "8px", paddingBottom: "4px", scrollbarWidth: "none" } as React.CSSProperties}>
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
            <NavPill key={slug} href={`/work/${slug}`} className="flex-shrink-0" icon={<svg width="10" height="13" viewBox="0 0 10 13" fill="none"><path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 5 3.5a1.5 1.5 0 0 1 0 3z" fill="currentColor" opacity="0.7" /></svg>}>
              {name}
            </NavPill>
          ))}
        </div>
      </section>

      {/* ── Employer CTA ────────────────────────────────────────────────────────────────────────────────── */}
      <section
        dir="rtl"
        className="relative z-10"
        style={{
          margin: "0 16px 22px",
          fontFamily: editorial.uiFont,
        }}
      >
        <motion.button
          onClick={resetUserMode}
          className="mx-auto flex items-center justify-center gap-2.5 overflow-hidden relative"
          style={{
            width: "92%",
            height: 44,
            background: "transparent",
            color: "rgb(73 46 73 / 0.78)",
            border: "1.5px solid rgb(73 46 73 / 0.34)",
            borderRadius: 24,
            boxShadow: "none",
            cursor: "pointer",
            fontFamily: editorial.uiFont,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 0,
          }}
          whileHover={{ scale: 1.02, backgroundColor: "rgb(254 214 250 / 0.22)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          מחפשים עובדים? לחצו לפרסום עבודה
          <ChevronLeft size={15} style={{ opacity: 0.65 }} />
        </motion.button>
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
              <div className="flex items-start gap-2 p-3 text-sm mb-2"
                style={{ backgroundColor: editorial.secondaryFixed, border: `1px solid ${editorial.outlineGhost}`, borderRadius: 12 }}>
                <span className="text-base mt-0.5">⚠️</span>
                <p className="text-right leading-snug" style={{ color: editorial.onSecondaryFixed }}>
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
                className="flex flex-col items-center justify-center py-3 transition-all font-bold relative"
                style={{
                  background: editorial.surfaceLow,
                  border: `1px solid ${editorial.outlineGhost}`,
                  borderRadius: 12,
                  color: editorial.primary,
                  opacity: crossesCutoff ? 0.7 : 1,
                }}
              >
                {crossesCutoff && (
                  <span className="absolute top-1 left-1 text-xs" title="חוצה 22:00">⚠️</span>
                )}
                <span className="text-xl font-extrabold" style={{ color: crossesCutoff ? editorial.secondary : editorial.primary }}>{h}</span>
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
                className="flex-1 px-3 py-2 text-right text-sm"
                style={{
                  border: "none",
                  borderBottom: `2px solid ${editorial.primary}`,
                  borderRadius: 12,
                  backgroundColor: editorial.surfaceLow,
                  color: editorial.onSurface,
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
                className="px-4 py-2 text-sm font-bold transition-all"
                style={{
                  background: customHours && parseInt(customHours, 10) >= 1 && parseInt(customHours, 10) <= 72
                    ? editorial.ctaGradient
                    : editorial.surfaceLow,
                  color: customHours && parseInt(customHours, 10) >= 1 && parseInt(customHours, 10) <= 72
                    ? "white"
                    : "var(--muted-foreground)",
                  borderRadius: 24,
                  cursor: customHours && parseInt(customHours, 10) >= 1 && parseInt(customHours, 10) <= 72 ? "pointer" : "not-allowed",
                }}
              >
                אשר
              </motion.button>
            </div>
            {customHours && (parseInt(customHours, 10) < 1 || parseInt(customHours, 10) > 72) && (
              <p className="text-xs mt-1 text-right" style={{ color: editorial.error }}>יש להזין מספר בין 1 ל-72</p>
            )}
          </div>

          <AppButton variant="ghost" size="sm" className="mt-1 w-full" onClick={() => { setCustomHours(""); setDurationOpen(false); }}>ביטול</AppButton>
        </DialogContent>
      </Dialog>

      {/* ── Related Articles (AEO internal linking) ──────────────────────────────────────────── */}
      <section dir="rtl" className="px-4 py-8" style={{ background: editorial.background }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#332a2c", fontFamily: editorial.headlineFont, letterSpacing: 0, marginBottom: 12 }}>מדריכים שימושיים</h2>
        <ul className="flex flex-col gap-2">
          <li><a href="/questions/איך-למצוא-עובד-זמני" className="text-[14px] underline-offset-2 hover:underline" style={{ color: editorial.primary }}>איך למצוא עובד זמני בישראל?</a></li>
          <li><a href="/guide/איך-לגייס-עובד-תוך-שעה" className="text-[14px] underline-offset-2 hover:underline" style={{ color: editorial.primary }}>איך לגייס עובד תוך שעה?</a></li>
          <li><a href="/for/סטודנטים" className="text-[14px] underline-offset-2 hover:underline" style={{ color: editorial.primary }}>עבודות זמניות לסטודנטים</a></li>
          <li><a href="/for/נוער" className="text-[14px] underline-offset-2 hover:underline" style={{ color: editorial.primary }}>עבודות זמניות לנוער</a></li>
        </ul>
      </section>

      {/* ── Sticky bottom CTA (lazy: chunk נטען רק אחרי גלילה) ────────── */}
      {showStickyCta && (
        <Suspense fallback={null}>
          <StickyBottomCta onLoginRequired={onLoginRequired} />
        </Suspense>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/ui";
import { ShinyButton } from "@/components/ui/shiny-button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import {
  ChevronLeft, Zap, Search,
  Briefcase, BadgePercent, Clock, UserPlus, ReceiptText, Bell,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { NavPill } from "@/components/ui/NavPill";
import { WorkerRegionBanner } from "@/components/WorkerRegionBanner";
import BelowFold from "@/components/BelowFold";
import { toast } from "sonner";
import { useCountdown } from "@/hooks/useCountdown";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import workerHeroCollage from "@/assets/homeWork2.png";
// סקציות חדשות - שלב collecting workers
import { HowItWorksSimple } from "@/components/home/HowItWorksSimple";
import { TrustGrid } from "@/components/home/TrustGrid";
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
          color: "oklch(0.59 0.18 55)",
          fontWeight: 700,
          fontSize:"15px",
          textDecorationThickness: 2,
          borderRadius: 4,
          padding: "0 3px",
        }}
      >
        {part}
      </span>
    );
  });
}

function renderHighlightedSubtitleLight(text: string) {
  return text.split(/(עכשיו|ללא עמלות|ללא עמלה|חינם)/g).map((part, index) => {
    const isHighlight = part === "עכשיו" || part === "ללא עמלות" || part === "ללא עמלה" || part === "חינם";
    if (!isHighlight) return part;
    return (
      <span key={`${part}-${index}`} style={{ color: "oklch(0.91 0.21 98.84)", fontWeight: 900 }}>
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

  const handlePrimaryCtaClick = () => {
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

      {/* ── MOBILE Hero (< md): redesigned ── */}
      <section
        className="relative overflow-hidden md:hidden"
        style={{
          height: "min(calc(100svh - 76px), 150vw)",
          minHeight: 560,
          maxHeight: 650,
          background: editorial.background,
        }}
      >

        {/* אזור תמונה עם overlay */}
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src={workerHeroCollage}
            alt={WORKER_HOME_HERO_ALT}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              bottom: -4,
              left: -2,
              width: "calc(100% + 4px)",
              height: "calc(100% + 6px)",
              objectFit: "cover",
              objectPosition: "center 46%",
            }}
          />
          {/* warm light overlay למעלה — רקע בהיר/חמים לטקסט כהה */}
          <div aria-hidden style={{
            position: "absolute",
            inset: 0,
            background: [
              "linear-gradient(to bottom,",
              "rgb(132 111 84 / 0.58) 0%,",
              "rgb(183 155 116 / 0.38) 20%,",
              "rgb(238 221 195 / 0.08) 45%,",
              "transparent 62%)",
            ].join(" "),
            zIndex: 1,
          }} />
          {/* fade לכיוון הקרם בתחתית */}
          <div aria-hidden style={{
            position: "absolute",
            bottom: -6, left: 0, right: 0, height: "64%",
            background: [
              "linear-gradient(to top,",
              "var(--editorial-background) 0%,",
              "var(--editorial-background) 12%,",
              "rgb(250 249 245 / 0.96) 28%,",
              "rgb(250 249 245 / 0.56) 62%,",
              "transparent 100%)",
            ].join(" "),
            zIndex: 2,
          }} />
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -8,
              height: 34,
              background: editorial.background,
              zIndex: 3,
              pointerEvents: "none",
            }}
          />

          {/* כותרת ובדג' */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
            padding: "20px 18px 0",
            direction: "rtl", textAlign: "center",
          }}>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ margin: 0 }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: editorial.displayFont,
                  fontSize: "35px",
                  fontWeight: 800,
                  lineHeight: 1.0,
                  color: "#ffffffbf",
                  letterSpacing: 0,
                }}
              >
                מעסיקים באזור
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 0,
                  fontFamily: editorial.displayFont,
                  fontSize: "45px",
                  fontWeight: 800,
                  lineHeight: 1.0,
                  color: "#ffffff",
                  textShadow: "0 5px 20px rgb(42 30 18 / 0.20)",
                  letterSpacing: 0,
                }}
              >
                מחפשים אותך
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 10,
                padding: "5px 12px",
                background: "oklch(0.99 0 0 / 0.77)",
                borderRadius: 100,
                // border: "1px solid rgb(255 255 255 / 0.72)",
                boxShadow: "0 12px 30px rgb(42 30 18 / 0.12)",
                minWidth: "min(292px, calc(100vw - 44px))",
                justifyContent: "center",
              }}
            >
             
              <div style={{ height: 20, overflow: "hidden", display: "flex", alignItems: "center" }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={subtitleIndex}
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -9 }}
                    transition={{ duration: 0.32, ease: "easeInOut" }}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "rgb(35 32 28 / 0.92)",
                      fontFamily: editorial.uiFont,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {renderHighlightedSubtitle(heroSubtitles[subtitleIndex])}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* חלק תחתון - כרטיסי סטטיסטיקות ו-CTA */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 12,
            padding: "0 18px max(12px, env(safe-area-inset-bottom))",
            direction: "rtl",
          }}
        >

          {/* כרטיסי נתונים */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, staggerChildren: 0.08 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              alignItems: "stretch",
              gap: 9,
              marginBottom: 20,
              fontFamily: editorial.uiFont,
            }}
          >
            {/* עובדים ממתינים */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.34 }}
              style={{
              background: "oklch(0.995 0.004 84 / 0.95)",
              backdropFilter: "blur(12px) saturate(1.08)",
              WebkitBackdropFilter: "blur(12px) saturate(1.08)",
              borderRadius: 19,
              padding: "10px 6px 9px",
              display: "grid",
              gridTemplateRows: "22px 28px 34px",
              justifyItems: "center",
              alignItems: "center",
              boxShadow: "0 12px 24px rgb(48 34 18 / 0.11)",
              height: 110,
              minHeight: 110,
            }}>
              <Briefcase size={16} strokeWidth={1.9} style={{ color: "rgb(42 42 36 / 0.84)" }} />
              <span dir="ltr" style={{ display: "block", fontSize: "18px", fontWeight: 800, color: "rgb(58 73 28)", lineHeight: 0.94, fontFamily: editorial.displayFont }}>
                {animatedRegisteredWorkers}+
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "rgb(58 73 28)", lineHeight: 1.22, textAlign: "center", maxWidth: 82 }}>
                עובדים כבר מחכים לעבודות הראשונות
              </span>
            </motion.div>

            {/* 100% ללא עמלה - מודגש */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 24, delay: 0.42 }}
              style={{
              background: "oklch(0.91 0.065 119 / 0.70)",
              border: "1px solid oklch(0.48 0.08 120 / 0.20)",
              backdropFilter: "blur(14px) saturate(1.12)",
              WebkitBackdropFilter: "blur(14px) saturate(1.12)",
              borderRadius: 19,
              padding: "10px 6px 9px",
              display: "grid",
              gridTemplateRows: "22px 28px 34px",
              justifyItems: "center",
              alignItems: "center",
              height: 110,
              minHeight: 110,
              boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.50), 0 14px 26px rgb(48 34 18 / 0.10)",
            }}>
              <BadgePercent size={16} strokeWidth={1.9} style={{ color: "rgb(58 73 28)" }} />
              <span dir="ltr" style={{ display: "block", fontSize: "18px", fontWeight: 800, color: "rgb(58 73 28)", lineHeight: 0.92, fontFamily: editorial.displayFont }}>
                {animatedCommissionPercent}%
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "oklch(0.30 0.06 118)", lineHeight: 1.08, textAlign: "center" }}>
                ללא עמלה
              </span>
            </motion.div>

            {/* ללא דמי רישום */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.5 }}
              style={{
              background: "oklch(0.995 0.004 84 / 0.95)",
              backdropFilter: "blur(12px) saturate(1.08)",
              WebkitBackdropFilter: "blur(12px) saturate(1.08)",
              borderRadius: 19,
              padding: "10px 6px 9px",
              display: "grid",
              gridTemplateRows: "22px 38px 22px",
              justifyItems: "center",
              alignItems: "center",
              boxShadow: "0 12px 24px rgb(48 34 18 / 0.11)",
              height: 110,
              minHeight: 110,
            }}>
              <ReceiptText size={18} strokeWidth={1.9} style={{ color: "rgb(58 73 28)" }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: "rgb(58 73 28)", lineHeight: 1.08, textAlign: "center", fontFamily: editorial.displayFont }}>
                ללא דמי<br />רישום
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgb(58 73 28 / 0.86)", lineHeight: 1.1, textAlign: "center", whiteSpace: "nowrap" }}>
                בלי אותיות קטנות
              </span>
            </motion.div>
          </motion.div>

          <ShinyButton
            onClick={handlePrimaryCtaClick}
            className="worker-jobs-cta"
            style={{     fontSize: 16,  height: 52, fontFamily: editorial.uiFont }}
          >
            <UserPlus size={21} strokeWidth={2.2} />
           אני רוצה לקבל עבודות ראשונות
          </ShinyButton>
        </div>
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

      {/* ── יתרונות לעובד ────────────── */}
      <TrustGrid />

      {/* ── Worker action tiles ─────────────────────────────────────────────────────────────────── */}
      {isAuthenticated && profileQuery.data && (
        <div className="relative z-10 px-4 mb-5">
          <div className="flex flex-col gap-3">
            {(!profileQuery.data.preferredCategories?.length ||
              (!profileQuery.data.preferredCity && !profileQuery.data.workerLatitude)) && (
              <button
                onClick={() => navigate("/worker-profile")}
                className="flex flex-row items-center gap-4 text-right"
                style={{
                  background: "var(--editorial-surface-container-lowest)",
                  border: "1px solid rgb(199 199 186 / 0.20)",
                  borderRadius: 24,
                  boxShadow: "0 14px 28px rgb(27 28 26 / 0.06)",
                  fontFamily: editorial.uiFont,
                  padding: "16px 20px",
                  width: "100%",
                }}
              >
                <span className="flex items-center justify-center flex-shrink-0" style={{ width: 46, height: 46, background: editorial.primaryFixed, borderRadius: 16 }}>
                  <Briefcase className="h-5 w-5" style={{ color: editorial.primary }} />
                </span>
                <div className="flex flex-col flex-1 gap-0.5">
                  <span className="text-[15px] font-semibold" style={{ color: editorial.onSurface, letterSpacing: 0 }}>השלם את הפרופיל שלך</span>
                  <span className="text-[11px]" style={{ color: editorial.onSurfaceVariant, lineHeight: 1.45 }}>הוסף קטגוריות ומיקום כדי לקבל הצעות מתאימות</span>
                </div>
                <span className="flex-shrink-0 px-4 py-2 text-xs font-semibold" style={{ background: editorial.ctaGradient, color: "white", borderRadius: 999, boxShadow: "0 10px 20px rgb(49 59 21 / 0.12)" }}>עדכן עכשיו</span>
              </button>
            )}

            {pushNotifications.isSupported && !pushNotifications.isSubscribed && pushNotifications.permission !== "denied" && (
              <button
                onClick={pushNotifications.subscribe}
                disabled={pushNotifications.isLoading}
                className="flex flex-row items-center gap-4 text-right disabled:opacity-60"
                style={{
                  background: "var(--editorial-surface-container-lowest)",
                  border: "1px solid rgb(199 199 186 / 0.20)",
                  borderRadius: 24,
                  boxShadow: "0 14px 28px rgb(27 28 26 / 0.06)",
                  fontFamily: editorial.uiFont,
                  padding: "16px 20px",
                  width: "100%",
                }}
              >
                <span className="flex items-center justify-center flex-shrink-0" style={{ width: 46, height: 46, background: "oklch(0.91 0.21 98.84 / 0.98)", borderRadius: 16 }}>
                  <Bell className="h-5 w-5" style={{ color: editorial.primary }} />
                </span>
                <div className="flex flex-col flex-1 gap-0.5">
                  <span className="text-[15px] font-semibold" style={{ color: editorial.onSurface, letterSpacing: 0 }}>הפעל התראות משרות</span>
                  <span className="text-[11px]" style={{ color: editorial.onSurfaceVariant, lineHeight: 1.45 }}>קבל התראה מיידית על משרות מתאימות</span>
                </div>
                <span className="flex-shrink-0 px-4 py-2 text-xs font-semibold" style={{ background: "oklch(0.91 0.21 98.84 / 0.98)", color: editorial.primary, borderRadius: 999, boxShadow: "0 10px 20px rgb(49 59 21 / 0.12)" }}>{pushNotifications.isLoading ? "..." : "הפעל"}</span>
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

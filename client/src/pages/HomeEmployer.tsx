import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import {
  Zap, Users, Briefcase, HardHat, ChevronLeft,
  Plus, CheckCircle2, Phone, MessageCircle, Eye, Pencil,
  Star, Clock, MapPin,
} from "lucide-react";
import WorkerCarouselCard from "@/components/WorkerCarouselCard";
import { CarouselSkeletonRow } from "@/components/JobCardSkeleton";

// Hook: counts UP from 0 to endValue over duration ms when triggered
function useCountUp(endValue: number, duration: number, triggered: boolean) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!triggered || endValue === 0) return;
    const steps = 40;
    const stepTime = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const next = Math.round((endValue / steps) * step);
      setCurrent(step >= steps ? endValue : next);
      if (step >= steps) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [triggered, endValue]);
  return current;
}

/* ── How it works steps ───────────────────────────────────────────── */
const HOW_IT_WORKS_EMPLOYER = [
  {
    step: "1", title: "פרסם משרה", icon: Plus,
    desc: "מלא פרטי המשרה — סוג עבודה, מיקום, שכר ושעות",
    imgUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&q=80",
    reverse: false,
  },
  {
    step: "2", title: "קבל פניות", icon: Phone,
    desc: "עובדים יצרו איתך קשר ישירות — ללא תיווך ועמלות",
    imgUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&q=80",
    reverse: true,
  },
  {
    step: "3", title: "בחר עובד", icon: CheckCircle2,
    desc: "בחר את המתאים ביותר ותתחיל לעבוד מיד",
    imgUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&q=80",
    reverse: false,
  },
];

/* ── Stats row ────────────────────────────────────────────────────── */
function StatsRow({ activeJobs, workers }: { activeJobs: number; workers: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const animJobs = useCountUp(activeJobs, 1200, inView);
  const animWorkers = useCountUp(workers, 1000, inView);
  const stats = [
    { label: "ללא עמלות", value: "100%", icon: CheckCircle2 },
    { label: "עובדים זמינים", value: workers > 0 ? `${animWorkers}+` : "1+", icon: Users },
    { label: "משרות פעילות", value: activeJobs > 0 ? String(animJobs) : "0", icon: Briefcase },
  ];
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ display: "flex", gap: 6, marginTop: 0, marginBottom: 12, direction: "rtl", width: "100%", alignSelf: "stretch" }}
    >
      {stats.map(({ label, value, icon: Icon }, i) => (
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
          <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: "oklch(0.22 0.06 122)", letterSpacing: "-0.3px" }}>{value}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "oklch(0.45 0.07 122)", textAlign: "center", lineHeight: 1.2, wordBreak: "keep-all" }}>{label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
export default function HomeEmployer() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resetUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [activeWorkerIdx, setActiveWorkerIdx] = useState(0);
  const workerAutoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerPausedRef = useRef(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  // Auto-scroll worker carousel
  useEffect(() => {
    workerAutoScrollRef.current = setInterval(() => {
      if (workerPausedRef.current) return;
      const el = document.getElementById("worker-carousel-home");
      if (!el) return;
      const cardWidth = 180 + 12;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        setActiveWorkerIdx(0);
      } else {
        el.scrollBy({ left: -cardWidth, behavior: "smooth" });
        setActiveWorkerIdx((i) => i + 1);
      }
    }, 3000);
    return () => { if (workerAutoScrollRef.current) clearInterval(workerAutoScrollRef.current); };
  }, []);

  const requireLogin = (msg: string) => { saveReturnPath(); setLoginMessage(msg); setLoginOpen(true); };

  const handlePostJob = () => {
    if (!isAuthenticated) { requireLogin("כדי לפרסם משרה יש להתחבר למערכת"); return; }
    navigate("/post-job");
  };

  const myJobsQuery = trpc.jobs.myJobs.useQuery(undefined, { enabled: isAuthenticated });
  const pendingAppsQuery = trpc.jobs.totalPendingApplications.useQuery(undefined, { enabled: isAuthenticated });
  const pendingCount = pendingAppsQuery.data?.total ?? 0;
  const workersQuery = trpc.workers.nearby.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm: 20, limit: 8 },
    { staleTime: 60_000 }
  );

  const myJobs = myJobsQuery.data ?? [];
  const workers = workersQuery.data ?? [];
  const activeJobs = myJobs.filter((j) => j.status === "active").length;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "var(--page-bg)" }}>

      {/* ── MOBILE Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden md:hidden" style={{ minHeight: "480px" }}>
        {/* Background image */}
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-employer_809b2625.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "55% 25%" }}
        />
        {/* Gradient overlay — lighter to show image better */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, oklch(0.12 0.06 122 / 0.35) 0%, oklch(0.12 0.06 122 / 0.65) 55%, oklch(0.95 0.03 91.6) 100%)",
          }}
        />

        {/* Content — centered */}
        <div className="relative z-10 flex flex-col justify-start items-center text-center px-5 pt-20 pb-8" style={{ minHeight: "480px" }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{
              background: "oklch(0.32 0.07 122 / 0.85)",
              border: "1px solid oklch(0.55 0.10 122 / 0.60)",
              boxShadow: "0 2px 10px oklch(0.28 0.06 122 / 0.30)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Zap className="h-3 w-3" style={{ color: "oklch(0.85 0.16 80)" }} />
            <span className="text-[11px] font-bold" style={{ color: "oklch(0.95 0.04 80)" }}>
              מצא עובד תוך דקות
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[32px] leading-[1.15] font-black mb-2"
            style={{ color: "oklch(0.98 0.01 80)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 2px 12px oklch(0.10 0.06 122 / 0.70)" }}
          >
            עובדים מקצועיים<br />
            <span style={{ color: "oklch(0.88 0.18 70)", textShadow: "0 0 20px oklch(0.68 0.14 80.8 / 0.4)" }}>מוכנים לעבוד עכשיו</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[13px] font-semibold leading-relaxed mb-5"
            style={{ color: "oklch(0.95 0.02 80 / 0.85)", maxWidth: "280px", textShadow: "0 1px 8px oklch(0.10 0.06 122 / 0.60)" }}
          >
            פרסם משרה דחופה ומצא עובדים זמינים באזורך — ללא עמלות, ללא תיווך
          </motion.p>

        </div>
      </section>

      {/* Mobile Stats + CTA */}
      <div className="relative z-10 flex flex-col items-center text-center px-5 pt-4 pb-6 md:hidden" style={{ backgroundColor: "var(--page-bg)" }}>
        <StatsRow activeJobs={activeJobs} workers={workers.length} />
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
          className="w-full flex flex-col gap-3"
        >
          <motion.button
            onClick={handlePostJob}
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
            <Zap size={15} />
            פרסם עבודה דחופה
            <ChevronLeft size={15} style={{ opacity: 0.65 }} />
          </motion.button>
          <motion.button
            onClick={() => navigate("/available-workers")}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-[14px]"
            style={{
              background: "white",
              border: "1px solid oklch(0.89 0.05 84.0)",
              color: "oklch(0.35 0.08 122)",
              boxShadow: "0 2px 8px oklch(0.38 0.07 125.0 / 0.08)",
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Users size={14} />
            עובדים זמינים עכשיו
          </motion.button>
        </motion.div>
      </div>

      {/* ── DESKTOP Hero ────────────────────────────────────────────── */}
      <section
        className="relative z-10 overflow-hidden hidden md:block"
        style={{ minHeight: "540px" }}
      >
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-employer_809b2625.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 25%" }}
        />
        {/* Overlay: light on right side (image), heavier on left (text) */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to left, oklch(0.95 0.03 91.6 / 0.10) 0%, oklch(0.95 0.03 91.6 / 0.08) 25%, oklch(0.12 0.06 122 / 0.75) 55%, oklch(0.12 0.06 122 / 0.88) 100%)",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: "120px", background: "linear-gradient(to bottom, transparent 0%, oklch(0.95 0.03 91.6) 100%)" }}
        />

        {/* Content — text on RIGHT side (RTL: visually right = start) */}
        <div className="relative z-10 flex flex-col justify-center items-end text-right px-8 pt-14 pb-20" style={{ minHeight: "520px", maxWidth: "500px", marginLeft: "auto" }}>
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
              מצא עובד תוך דקות
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[42px] leading-[1.1] font-black mb-4"
            style={{ color: "oklch(0.97 0.02 80)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 1px 12px oklch(0.12 0.06 122 / 0.60)" }}
          >
            עובדים מקצועיים<br />
            <span style={{ color: "oklch(0.88 0.18 70)", textShadow: "0 0 20px oklch(0.68 0.14 80.8 / 0.3)" }}>
              מוכנים לעבוד עכשיו
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[15px] font-semibold leading-relaxed mb-5 max-w-[300px]"
            style={{ color: "oklch(0.90 0.03 80 / 0.80)", textShadow: "0 1px 8px oklch(0.12 0.06 122 / 0.50)" }}
          >
            פרסם משרה דחופה ומצא עובדים זמינים באזורך — ללא עמלות, ללא תיווך
          </motion.p>

          <StatsRow activeJobs={activeJobs} workers={workers.length} />

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6 flex gap-3"
          >
            <motion.button
              onClick={handlePostJob}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-[15px] overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                color: "oklch(0.96 0.04 80)",
                boxShadow: "0 4px 24px oklch(0.28 0.06 122 / 0.45), inset 0 1px 0 oklch(1 0 0 / 0.10)",
              }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96, y: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Zap size={15} />
              פרסם עבודה דחופה
              <ChevronLeft size={15} style={{ opacity: 0.65 }} />
            </motion.button>
            <motion.button
              onClick={() => navigate("/available-workers")}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-[14px]"
              style={{
                background: "oklch(1 0 0 / 0.12)",
                border: "1px solid oklch(1 0 0 / 0.25)",
                color: "oklch(0.97 0.02 80)",
              }}
              whileHover={{ scale: 1.02, background: "oklch(1 0 0 / 0.18)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Users size={14} />
              עובדים זמינים
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

      {/* ── Pending Applications Banner ─────────────────────────────── */}
      {isAuthenticated && myJobs.length > 0 && (
        <motion.button
          dir="rtl"
          onClick={() => navigate("/my-jobs")}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          whileHover={{ scale: 1.015, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="relative z-10 mx-4 mb-6 w-[calc(100%-2rem)] max-w-lg flex items-center gap-3 px-5 py-3.5 rounded-2xl overflow-hidden text-right"
          style={{
            background: "linear-gradient(135deg, oklch(0.28 0.07 250) 0%, oklch(0.35 0.10 255) 100%)",
            boxShadow: "0 4px 20px oklch(0.30 0.10 250 / 0.35), 0 1px 4px oklch(0.30 0.10 250 / 0.20)",
          }}
        >
          {/* Animated glow pulse */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.0, 0.12, 0.0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "oklch(0.75 0.18 255)" }}
          />
          {/* Icon */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.45 0.12 255 / 0.40)", border: "1px solid oklch(0.65 0.15 255 / 0.35)" }}
          >
            <Briefcase className="h-4 w-4" style={{ color: "oklch(0.85 0.14 255)" }} />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-black leading-tight" style={{ color: "oklch(0.97 0.03 80)" }}>
                <span className="text-[17px] font-black" style={{ color: "oklch(0.85 0.14 255)", fontFamily: "'Heebo', sans-serif" }}>
                  {activeJobs}
                </span>
                {" "}משרות פעילות שלך
              </p>
              {pendingCount > 0 && (
                <span
                  className="inline-flex items-center justify-center text-[11px] font-black rounded-full px-2 py-0.5 leading-none"
                  style={{ background: "oklch(0.55 0.22 25)", color: "white", minWidth: 22, border: "1.5px solid oklch(0.70 0.18 25 / 0.40)" }}
                >
                  {pendingCount} חדש
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "oklch(0.85 0.06 80 / 0.75)" }}>
              {pendingCount > 0 ? `${pendingCount} מועמדויות ממתינות לסקירה` : "לחץ לניהול המשרות ומועמדויות"}
            </p>
          </div>
          <ChevronLeft className="h-4 w-4 flex-shrink-0" style={{ color: "oklch(0.85 0.08 80 / 0.70)", transform: "rotate(180deg)" }} />
        </motion.button>
      )}

      {/* ── Quick Action Card (mirrors HomeWorker availability card) ────────────── */}
      <section
        dir="rtl"
        className="mb-8 relative z-10"
        style={{
          background: "oklch(0.97 0.012 100)",
          borderTop: "1px solid oklch(0.92 0.02 100)",
          borderBottom: "1px solid oklch(0.92 0.02 100)",
          padding: "20px 24px",
          maxWidth: "100%",
        }}
      >
        <div style={{ maxWidth: 512, margin: "0 auto" }}>
          {/* Section title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div style={{ width: 4, height: 24, borderRadius: 4, background: "#4F583B" }} />
              <span className="text-[17px] font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>פרסום משרה</span>
            </div>
            {isAuthenticated && myJobs.length > 0 && (
              <button
                onClick={() => navigate("/my-jobs")}
                className="text-[12px] font-semibold px-3 py-1 rounded-full"
                style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
              >
                המשרות שלי
              </button>
            )}
          </div>

          {/* Main CTA button */}
          <motion.button
            onClick={handlePostJob}
            whileTap={{ scale: 0.985 }}
            whileHover={{ boxShadow: "0 6px 20px oklch(0.35 0.08 122 / 0.25)" }}
            className="w-full rounded-2xl px-5 py-4 flex items-center gap-4 transition-all mb-3"
            style={{
              background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
              boxShadow: "0 4px 16px oklch(0.28 0.06 122 / 0.25)",
            }}
          >
            <div
              className="size-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-[15px] font-black text-white leading-tight">פרסם משרה דחופה</p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
                עובדים יפנו אליך תוך דקות — ללא עמלות
              </p>
            </div>
            <ChevronLeft className="h-4 w-4 text-white/70 rotate-180 flex-shrink-0" />
          </motion.button>

          {/* Quick-action row */}
          <div className="flex gap-2.5">
            <button
              onClick={() => navigate("/available-workers")}
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
                <Users className="h-4 w-4" style={{ color: "oklch(0.55 0.04 91)" }} />
              </div>
              <div>
                <p className="text-[12px] font-black" style={{ color: "oklch(0.35 0.04 91)" }}>עובדים זמינים</p>
                <p className="text-[10px]" style={{ color: "oklch(0.58 0.03 91)" }}>באזורך עכשיו</p>
              </div>
            </button>

            {isAuthenticated && (
              <button
                onClick={() => navigate("/my-jobs")}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right"
                style={{
                  background: "white",
                  border: "1px solid oklch(0.91 0.03 91.6)",
                }}
              >
                <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.93 0.04 84.0)" }}>
                  <Briefcase className="h-4 w-4" style={{ color: "var(--amber)" }} />
                </div>
                <div>
                  <p className="text-[12px] font-black" style={{ color: "oklch(0.35 0.04 91)" }}>המשרות שלי</p>
                  <p className="text-[10px]" style={{ color: "oklch(0.58 0.03 91)" }}>ניהול ומועמדויות</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Available Workers Carousel ──────────────────────────────────────────────── */}
      {(workersQuery.isLoading || workers.length > 0) && (
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
              <h2 className="text-[17px] font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>עובדים זמינים עכשיו</h2>
            </div>
            <button
              onClick={() => navigate("/available-workers")}
              className="text-sm font-black px-4 py-1.5 rounded-full transition-colors"
              style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
            >
              הכל
            </button>
          </motion.div>

          {workersQuery.isLoading ? (
            <div className="px-6"><CarouselSkeletonRow count={3} /></div>
          ) : (
            <div className="relative" style={{ overflow: "hidden" }}>
              {/* Left fade mask */}
              <div
                style={{
                  position: "absolute", top: 0, left: 0, bottom: 0, width: 32,
                  background: "linear-gradient(to right, var(--page-bg, #f5f5f0) 0%, transparent 100%)",
                  zIndex: 5, pointerEvents: "none",
                }}
              />
              {/* Right fade mask */}
              <div
                style={{
                  position: "absolute", top: 0, right: 0, bottom: 0, width: 32,
                  background: "linear-gradient(to left, var(--page-bg, #f5f5f0) 0%, transparent 100%)",
                  zIndex: 5, pointerEvents: "none",
                }}
              />
              {activeWorkerIdx < workers.length - 1 && (
                <button
                  onClick={() => {
                    const el = document.getElementById("worker-carousel-home");
                    if (el) el.scrollBy({ left: -200, behavior: "smooth" });
                    setActiveWorkerIdx((i) => Math.min(i + 1, workers.length - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-110"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label="הקודם"
                >
                  <ChevronLeft className="h-4 w-4" style={{ color: "var(--brand)" }} />
                </button>
              )}
              {activeWorkerIdx > 0 && (
                <button
                  onClick={() => {
                    const el = document.getElementById("worker-carousel-home");
                    if (el) el.scrollBy({ left: 200, behavior: "smooth" });
                    setActiveWorkerIdx((i) => Math.max(i - 1, 0));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-110"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label="הבא"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" style={{ color: "var(--brand)" }} />
                </button>
              )}
              <div
                id="worker-carousel-home"
                className="flex gap-4 overflow-x-auto pb-4 px-6 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                onMouseEnter={() => { workerPausedRef.current = true; }}
                onMouseLeave={() => { workerPausedRef.current = false; }}
                onTouchStart={() => { workerPausedRef.current = true; }}
                onTouchEnd={() => { setTimeout(() => { workerPausedRef.current = false; }, 2000); }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const cardWidth = el.scrollWidth / workers.length;
                  const idx = Math.round(el.scrollLeft / cardWidth);
                  setActiveWorkerIdx(idx);
                }}
              >
                {workers.map((worker, i) => (
                  <motion.div
                    key={worker.userId}
                    className="snap-start shrink-0 w-[58vw] max-w-[200px]"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
                  >
                    <WorkerCarouselCard worker={worker} index={i} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── My Active Jobs (authenticated) ──────────────────── */}
      {isAuthenticated && (
        <section className="mb-10 relative z-10" style={{ background: "oklch(0.96 0.03 91.6)", borderRadius: "1.5rem", margin: "0 1rem 2.5rem", padding: "1.5rem 0 1.75rem", border: "1px solid oklch(0.90 0.04 91.6)" }}>
          <motion.div
            className="flex items-center justify-between px-6 mb-5 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2">
              <div style={{ width: 4, height: 24, borderRadius: 4, background: "#4F583B" }} />
              <h2 className="text-[17px] font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>המשרות שלי</h2>
            </div>
            <button
              onClick={() => navigate("/my-jobs")}
              className="text-sm font-black px-4 py-1.5 rounded-full transition-colors"
              style={{ color: "#4F583B", backgroundColor: "rgba(79,88,59,0.10)", border: "1px solid rgba(79,88,59,0.18)" }}
            >
              הכל
            </button>
          </motion.div>

          <div className="px-4 max-w-lg mx-auto">
            {myJobsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "oklch(0.95 0.02 91.6)" }} />
                ))}
              </div>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "oklch(0.92 0.05 122 / 0.20)", border: "1px solid oklch(0.80 0.08 122 / 0.25)" }}
                >
                  <Briefcase className="h-7 w-7" style={{ color: "oklch(0.45 0.08 122)" }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.28 0.06 122)" }}>עדיין לא פרסמת משרות</p>
                <p className="text-xs mb-4" style={{ color: "oklch(0.58 0.03 100)" }}>פרסם משרה ראשונה וקבל מועמדים תוך דקות</p>
                <motion.button
                  onClick={handlePostJob}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-[13px]"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                    color: "oklch(0.96 0.04 80)",
                    boxShadow: "0 4px 14px oklch(0.28 0.06 122 / 0.30)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus size={14} />
                  פרסם משרה ראשונה
                </motion.button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myJobs.slice(0, 3).map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    className="rounded-2xl p-3.5 flex items-center gap-3"
                    style={{
                      background: "white",
                      border: "1px solid oklch(0.91 0.04 91.6)",
                      boxShadow: "0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
                    }}
                  >
                    {/* Job icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: job.status === "active"
                          ? "oklch(0.92 0.08 145 / 0.25)"
                          : job.status === "closed"
                          ? "oklch(0.93 0.02 100 / 0.5)"
                          : "oklch(0.93 0.08 30 / 0.25)",
                        border: `1px solid ${job.status === "active" ? "oklch(0.80 0.12 145 / 0.3)" : job.status === "closed" ? "oklch(0.75 0.02 100 / 0.3)" : "oklch(0.75 0.10 30 / 0.3)"}`,
                      }}
                    >
                      <Briefcase
                        className="h-4 w-4"
                        style={{
                          color: job.status === "active" ? "oklch(0.38 0.15 145)" : job.status === "closed" ? "oklch(0.50 0.02 100)" : "oklch(0.45 0.12 30)",
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-[13px] truncate" style={{ color: "oklch(0.22 0.06 122)" }}>{job.title}</p>
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: job.status === "active" ? "oklch(0.90 0.10 145)" : job.status === "closed" ? "oklch(0.91 0.02 100)" : "oklch(0.93 0.08 30)",
                            color: job.status === "active" ? "oklch(0.30 0.15 145)" : job.status === "closed" ? "oklch(0.42 0.02 100)" : "oklch(0.40 0.12 30)",
                          }}
                        >
                          {job.status === "active" ? "פעיל" : job.status === "closed" ? "סגור" : "פג תוקף"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: "oklch(0.55 0.03 100)" }}>
                        {job.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={9} />{job.city}
                          </span>
                        )}
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <Clock size={9} />₪{job.salary}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: "oklch(0.96 0.02 91.6)", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.45 0.08 122)" }}
                        title="צפייה"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/edit-job/${job.id}`)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: "oklch(0.96 0.02 91.6)", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.45 0.08 122)" }}
                        title="עריכה"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {myJobs.length > 3 && (
                  <button
                    onClick={() => navigate("/my-jobs")}
                    className="w-full text-center text-[12px] py-2 font-semibold rounded-xl"
                    style={{
                      color: "oklch(0.45 0.08 122)",
                      background: "oklch(0.38 0.07 125.0 / 0.06)",
                      border: "1px dashed oklch(0.38 0.07 125.0 / 0.25)",
                    }}
                  >
                    + עוד {myJobs.length - 3} משרות
                  </button>
                )}

                <motion.button
                  onClick={handlePostJob}
                  className="mt-1 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-[13px]"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                    color: "oklch(0.96 0.04 80)",
                    boxShadow: "0 4px 14px oklch(0.28 0.06 122 / 0.25)",
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Plus size={14} />
                  פרסם משרה חדשה
                </motion.button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Worker CTA banner (mirrors HomeWorker's employer banner) ── */}
      <section
        dir="rtl"
        className="relative z-10 cursor-pointer"
        style={{
          background: "linear-gradient(160deg, oklch(0.91 0.04 91.6) 0%, oklch(0.94 0.025 122.3) 100%)",
          borderTop: "1px solid oklch(0.85 0.06 84.0 / 0.5)",
        }}
        onClick={resetUserMode}
        onMouseEnter={(e) => {
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
            <p className="text-[15px] font-black" style={{ color: "var(--brand)" }}>מחפשים עבודה?</p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--amber)" }}>לחצו לחיפוש עבודה</p>
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

            <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import {
  Zap, Users, Briefcase, HardHat, ChevronLeft,
  Plus, CheckCircle2, Phone, MessageCircle, Eye, Pencil,
  Star, Clock, MapPin, RefreshCw,
} from "lucide-react";
import WorkerCarouselCard from "@/components/WorkerCarouselCard";
import { CarouselSkeletonRow } from "@/components/JobCardSkeleton";

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
  const stats = [
    { label: "משרות פעילות", value: activeJobs > 0 ? String(activeJobs) : "0", icon: Briefcase },
    { label: "עובדים זמינים", value: workers > 0 ? `${workers}+` : "0", icon: Users },
    { label: "ללא עמלות", value: "100%", icon: CheckCircle2 },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex gap-3 mt-5"
    >
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl"
          style={{
            background: "oklch(0.32 0.07 122 / 0.55)",
            border: "1px solid oklch(0.50 0.09 122 / 0.30)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Icon className="h-4 w-4" style={{ color: "oklch(0.85 0.16 80)" }} />
          <span className="text-[17px] font-black leading-none" style={{ color: "oklch(0.97 0.03 80)" }}>{value}</span>
          <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "oklch(0.82 0.04 80 / 0.80)" }}>{label}</span>
        </div>
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

        {/* Content — RTL right-aligned */}
        <div className="relative z-10 flex flex-col justify-end items-end text-right px-5 pt-14 pb-8" style={{ minHeight: "480px" }}>
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

          <StatsRow activeJobs={activeJobs} workers={workers.length} />
        </div>
      </section>

      {/* Mobile CTA */}
      <div className="relative z-10 flex flex-col items-end text-right px-5 pt-4 pb-6 md:hidden" style={{ backgroundColor: "var(--page-bg)" }}>
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
            <p className="text-[13px] font-black leading-tight" style={{ color: "oklch(0.97 0.03 80)" }}>
              <span className="text-[17px] font-black" style={{ color: "oklch(0.85 0.14 255)", fontFamily: "'Heebo', sans-serif" }}>
                {activeJobs}
              </span>
              {" "}משרות פעילות שלך
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "oklch(0.85 0.06 80 / 0.75)" }}>
              לחץ לניהול המשרות ומועמדויות שהתקבלו
            </p>
          </div>
          <ChevronLeft className="h-4 w-4 flex-shrink-0" style={{ color: "oklch(0.85 0.08 80 / 0.70)", transform: "rotate(180deg)" }} />
        </motion.button>
      )}

      {/* ── How it works ────────────────────────────────────────────── */}
      <section
        className="relative z-10 mx-6 mb-8 rounded-[28px] p-7 max-w-lg"
        style={{
          background: "white",
          boxShadow: "0 4px 24px oklch(0.38 0.07 125.0 / 0.10), 0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
          marginTop: "-4px",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-7">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.75 0.12 76.7 / 0.15)" }}>
            <Star className="h-4 w-4" style={{ color: "oklch(0.68 0.14 80.8)" }} />
          </div>
          <h3 className="text-lg font-black" style={{ color: "oklch(0.35 0.08 122)" }}>איך מפרסמים משרה?</h3>
        </div>

        <div className="space-y-3 mb-8">
          {HOW_IT_WORKS_EMPLOYER.map(({ step, title, desc, imgUrl, reverse }, idx) => (
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
                className="flex-shrink-0 w-24 h-20 rounded-xl"
                style={{
                  backgroundImage: `url("${imgUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "saturate(1.2) contrast(1.05) brightness(0.9)",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)" }}
                  >
                    {step}
                  </span>
                  <h4 className="font-black text-[13px]" style={{ color: "oklch(0.22 0.06 122)" }}>{title}</h4>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.45 0.04 100)" }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Post job CTA inside card */}
        <motion.button
          onClick={handlePostJob}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-[14px] relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
            color: "oklch(0.96 0.04 80)",
            boxShadow: "0 4px 16px oklch(0.28 0.06 122 / 0.35)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Plus size={15} />
          פרסם משרה עכשיו
        </motion.button>
      </section>

      {/* ── Available Workers Carousel ───────────────────────────────── */}
      <section
        className="relative z-10 mx-6 mb-8 rounded-[28px] p-6 max-w-lg"
        style={{
          background: "white",
          boxShadow: "0 4px 24px oklch(0.38 0.07 125.0 / 0.10), 0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
        }}
      >
        <motion.div
          className="flex items-center justify-between mb-5"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.65 0.22 160 / 0.12)", border: "1px solid oklch(0.65 0.22 160 / 0.20)" }}>
              <Users className="h-4 w-4" style={{ color: "oklch(0.45 0.22 160)" }} />
            </div>
            <h3 className="text-[15px] font-black" style={{ color: "oklch(0.22 0.06 122)" }}>עובדים זמינים עכשיו</h3>
          </div>
          <button
            onClick={() => navigate("/available-workers")}
            className="flex items-center gap-1 text-[12px] font-semibold transition-colors"
            style={{ color: "oklch(0.45 0.08 122)" }}
          >
            כל העובדים
            <ChevronLeft className="h-3.5 w-3.5" style={{ transform: "rotate(180deg)" }} />
          </button>
        </motion.div>

        {workersQuery.isLoading ? (
          <div className="px-1 py-2">
            <CarouselSkeletonRow count={3} />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8">
            <HardHat className="h-10 w-10 mx-auto mb-2" style={{ color: "oklch(0.75 0.12 160 / 0.60)" }} />
            <p className="text-sm font-medium" style={{ color: "oklch(0.52 0.03 100)" }}>אין עובדים זמינים כרגע באזורך</p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.02 100)" }}>פרסם משרה ועובדים יפנו אליך</p>
          </div>
        ) : (
          <div className="relative">
            <div
              id="worker-carousel-home"
              className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory"
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
                  className="snap-start shrink-0 w-[52vw] max-w-[180px]"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
                >
                  <WorkerCarouselCard worker={worker} index={i} />
                </motion.div>
              ))}
            </div>

            {workers.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {workers.map((_, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full transition-all duration-300"
                    style={{
                      width: i === activeWorkerIdx ? "16px" : "8px",
                      height: "8px",
                      background: i === activeWorkerIdx ? "oklch(0.45 0.22 160)" : "oklch(0.89 0.05 84.0)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {workers.length > 0 && (
          <motion.button
            onClick={() => navigate("/available-workers")}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-[13px]"
            style={{
              background: "oklch(0.65 0.22 160 / 0.08)",
              border: "1px solid oklch(0.65 0.22 160 / 0.20)",
              color: "oklch(0.35 0.18 160)",
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Users size={13} />
            צפה בכל העובדים הזמינים
          </motion.button>
        )}
      </section>

      {/* ── My Active Jobs (authenticated) ──────────────────────────── */}
      {isAuthenticated && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 mx-6 mb-8 rounded-[28px] p-6 max-w-lg"
          style={{
            background: "white",
            boxShadow: "0 4px 24px oklch(0.38 0.07 125.0 / 0.10), 0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.38 0.07 125.0 / 0.10)", border: "1px solid oklch(0.38 0.07 125.0 / 0.18)" }}>
                <Briefcase className="h-4 w-4" style={{ color: "oklch(0.38 0.07 125.0)" }} />
              </div>
              <h3 className="text-[15px] font-black" style={{ color: "oklch(0.22 0.06 122)" }}>המשרות שלי</h3>
            </div>
            <button
              onClick={() => navigate("/my-jobs")}
              className="flex items-center gap-1 text-[12px] font-semibold"
              style={{ color: "oklch(0.45 0.08 122)" }}
            >
              כל המשרות
              <ChevronLeft className="h-3.5 w-3.5" style={{ transform: "rotate(180deg)" }} />
            </button>
          </div>

          {myJobsQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "oklch(0.95 0.02 91.6)" }} />
              ))}
            </div>
          ) : myJobs.length === 0 ? (
            <div className="text-center py-6">
              <Briefcase className="h-10 w-10 mx-auto mb-2" style={{ color: "oklch(0.75 0.10 125 / 0.50)" }} />
              <p className="text-sm font-medium mb-3" style={{ color: "oklch(0.52 0.03 100)" }}>עדיין לא פרסמת משרות</p>
              <motion.button
                onClick={handlePostJob}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                  color: "oklch(0.96 0.04 80)",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus size={13} />
                פרסם משרה ראשונה
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2">
              {myJobs.slice(0, 3).map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: "oklch(0.9904 0.0107 95.3)",
                    border: "1px solid oklch(0.89 0.05 84.0)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "oklch(0.22 0.06 122)" }}>{job.title}</p>
                    <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "oklch(0.52 0.03 100)" }}>
                      {job.city && <><MapPin size={10} />{job.city}</>}
                      {job.salary && <><Clock size={10} />₪{job.salary}</>}
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          background: job.status === "active" ? "oklch(0.90 0.10 145)" : job.status === "closed" ? "oklch(0.93 0.02 100)" : "oklch(0.93 0.08 30)",
                          color: job.status === "active" ? "oklch(0.35 0.15 145)" : job.status === "closed" ? "oklch(0.45 0.02 100)" : "oklch(0.45 0.12 30)",
                        }}
                      >
                        {job.status === "active" ? "פעיל" : job.status === "closed" ? "סגור" : "פג"}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => navigate(`/job/${job.id}`)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: "white", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.52 0.03 100)" }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/edit-job/${job.id}`)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: "white", border: "1px solid oklch(0.89 0.05 84.0)", color: "oklch(0.52 0.03 100)" }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
              {myJobs.length > 3 && (
                <button
                  onClick={() => navigate("/my-jobs")}
                  className="w-full text-center text-xs py-2 font-medium"
                  style={{ color: "oklch(0.45 0.08 122)" }}
                >
                  + עוד {myJobs.length - 3} משרות
                </button>
              )}
              <motion.button
                onClick={handlePostJob}
                className="mt-2 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-[13px]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                  color: "oklch(0.96 0.04 80)",
                  boxShadow: "0 3px 12px oklch(0.28 0.06 122 / 0.30)",
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Plus size={13} />
                פרסם משרה חדשה
              </motion.button>
            </div>
          )}
        </motion.section>
      )}

      {/* ── Switch role ──────────────────────────────────────────────── */}
      <section className="max-w-lg mx-auto px-6 pb-10 text-center">
        <p className="text-sm mb-3" style={{ color: "oklch(0.58 0.02 100)" }}>גם מחפש עבודה? עבור למצב עובד</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={resetUserMode}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: "white",
            border: "1px solid oklch(0.89 0.05 84.0)",
            color: "oklch(0.40 0.03 122.3)",
            boxShadow: "0 2px 8px oklch(0.38 0.07 125.0 / 0.06)",
          }}
        >
          <RefreshCw size={14} />
          שנה תפקיד
        </motion.button>
      </section>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </div>
  );
}

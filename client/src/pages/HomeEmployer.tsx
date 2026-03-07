import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import {
  Zap, Users, Briefcase, HardHat, ChevronLeft,
  Plus, CheckCircle2, Phone, MessageCircle, Eye, Pencil, TrendingUp, Sparkles,
} from "lucide-react";
import ActivityTicker from "@/components/ActivityTicker";
import LiveStats from "@/components/LiveStats";
import { JobCardSkeletonList, CarouselSkeletonRow } from "@/components/JobCardSkeleton";
import WorkerCarouselCard from "@/components/WorkerCarouselCard";
import {
  C_BRAND_HEX, C_BRAND_DARK_HEX, C_BORDER, C_PAGE_BG_HEX,
} from "@/lib/colors";

const HOW_IT_WORKS_EMPLOYER = [
  { icon: Plus, step: "1", title: "פרסם משרה", desc: "מלא פרטי המשרה — סוג עבודה, מיקום, שכר ושעות" },
  { icon: Phone, step: "2", title: "קבל פניות", desc: "עובדים יצרו איתך קשר ישירות — ללא תיווך" },
  { icon: CheckCircle2, step: "3", title: "בחר עובד", desc: "בחר את המתאים ביותר ותתחיל לעבוד מיד" },
];

export default function HomeEmployer() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resetUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [activeWorkerIdx, setActiveWorkerIdx] = useState(0);
  const workerAutoScrollRef = React.useRef<ReturnType<typeof setInterval> | null>(null); // eslint-disable-line
  const workerPausedRef = React.useRef(false); // eslint-disable-line

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  // Auto-scroll worker carousel every 3 seconds
  useEffect(() => {
    workerAutoScrollRef.current = setInterval(() => {
      if (workerPausedRef.current) return;
      const el = document.getElementById("worker-carousel");
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
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm: 20, limit: 6 },
    { staleTime: 60_000 }
  );

  const myJobs = myJobsQuery.data ?? [];
  const workers = workersQuery.data ?? [];

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: C_PAGE_BG_HEX }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, oklch(0.22 0.07 125.0) 0%, oklch(0.32 0.07 115) 50%, oklch(0.26 0.06 130) 100%)",
        }}
      >
        {/* Animated background blobs */}
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.12 76.7 / 0.15) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.22 160 / 0.12) 0%, transparent 70%)" }}
        />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-2xl mx-auto px-4 py-10 text-center">
          {/* Top pill badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-5"
            style={{
              background: "oklch(0.75 0.12 76.7 / 0.18)",
              border: "1px solid oklch(0.75 0.12 76.7 / 0.35)",
              color: "oklch(0.88 0.14 75)",
              letterSpacing: "0.04em",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            מצב מעסיק — מחפש עובדים
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-[32px] sm:text-[40px] font-black leading-tight mb-3"
            style={{
              color: "white",
              fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
              textShadow: "0 2px 12px oklch(0 0 0 / 0.3)",
              letterSpacing: "-0.02em",
            }}
          >
            מצא עובד תוך דקות
            <br />
            <span style={{ color: "var(--citrus)", textShadow: "0 0 20px oklch(0.82 0.15 80.8 / 0.4)" }}>– פרסם עכשיו</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[14px] mb-7 max-w-md mx-auto"
            style={{ color: "oklch(1 0 0 / 0.65)" }}
          >
            פרסם משרה דחופה ומצא עובדים זמינים באזורך — ללא עמלות, ללא תיווך
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-5"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[14px] relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--citrus) 0%, var(--amber) 100%)",
                color: "oklch(0.22 0.03 122.3)",
                boxShadow: "0 6px 20px oklch(0.82 0.15 80.8 / 0.40)",
              }}
              onClick={handlePostJob}
            >
              <motion.div
                className="absolute inset-0 -skew-x-12 pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.2) 50%, transparent 100%)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              />
              <Zap className="h-5 w-5 relative z-10" />
              <span className="relative z-10">פרסם עבודה דחופה</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[14px]"
              style={{
                background: "oklch(1 0 0 / 0.10)",
                border: "1px solid oklch(1 0 0 / 0.20)",
                color: "oklch(1 0 0 / 0.85)",
              }}
              onClick={() => navigate("/available-workers")}
            >
              <Users className="h-5 w-5" />
              עובדים זמינים
            </motion.button>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            onClick={() => {
              const message = encodeURIComponent(`שלום, אני רוצה לפרסם עבודה:\n\nשם העסק:\nסוג העבודה:\nמיקום:\nשכר:\nטלפון ליצירת קשר:`);
              window.open(`https://wa.me/?text=${message}`, "_blank");
            }}
            className="inline-flex items-center gap-2 text-xs font-medium transition-colors"
            style={{ color: "oklch(1 0 0 / 0.40)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.65 0.22 160)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(1 0 0 / 0.40)")}
          >
            <MessageCircle className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.22 160)" }} />
            פרסם עבודה דרך WhatsApp
          </motion.button>
        </div>
      </section>

      <ActivityTicker />
      <LiveStats mode="employer" />

      {/* ── My Active Jobs ───────────────────────────────────────────────── */}
      {isAuthenticated && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-2xl mx-auto px-4 pt-6"
        >
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{
              background: "white",
              border: "1px solid oklch(0.89 0.05 84.0)",
              boxShadow: "0 4px 16px oklch(0.38 0.07 125.0 / 0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-[17px] font-black flex items-center gap-2"
                style={{ color: "oklch(0.22 0.03 122.3)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "oklch(0.38 0.07 125.0 / 0.10)", border: "1px solid oklch(0.38 0.07 125.0 / 0.18)" }}
                >
                  <Briefcase className="h-3.5 w-3.5" style={{ color: "oklch(0.38 0.07 125.0)" }} />
                </div>
                המשרות שלי
              </h2>
              <AppButton
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-jobs")}
                className="gap-1 text-gray-400 hover:text-blue-600 text-xs"
              >
                כל המשרות
                <ChevronLeft className="h-3.5 w-3.5" />
              </AppButton>
            </div>

            {myJobsQuery.isLoading ? (
              <JobCardSkeletonList count={2} />
            ) : myJobs.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-10 w-10 mx-auto mb-2 text-blue-300" />
                <p className="text-sm text-gray-500 mb-3">עדיין לא פרסמת משרות</p>
                <AppButton
                  variant="brand"
                  size="sm"
                  className="gap-2"
                  onClick={handlePostJob}
                >
                  <Plus className="h-4 w-4" />
                  פרסם משרה ראשונה
                </AppButton>
              </div>
            ) : (
              <div className="space-y-2">
                {myJobs.slice(0, 3).map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="rounded-xl p-3 flex items-center gap-3 transition-all"
                    style={{
                      background: "oklch(0.9904 0.0107 95.3)",
                      border: "1px solid oklch(0.89 0.05 84.0)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "oklch(0.75 0.07 125.0)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "oklch(0.89 0.05 84.0)")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{job.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.city}
                        {job.salary ? ` · ₪${job.salary}` : ""}
                        <span className={`mr-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                          job.status === "active" ? "bg-green-100 text-green-700" :
                          job.status === "closed" ? "bg-gray-100 text-gray-500" :
                          job.status === "expired" ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {job.status === "active" ? "פעיל" : job.status === "closed" ? "סגור" : job.status === "expired" ? "פג" : "בבדיקה"}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="p-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all hover:scale-110 text-gray-400"
                        title="צפה"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/edit-job/${job.id}`)}
                        className="p-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all hover:scale-110 text-gray-400"
                        title="ערוך"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {myJobs.length > 3 && (
                  <button
                    onClick={() => navigate("/my-jobs")}
                    className="w-full text-center text-xs text-blue-500 hover:text-blue-700 py-2 font-medium transition-colors"
                  >
                    + עוד {myJobs.length - 3} משרות
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <AppButton
                variant="brand"
                size="sm"
                className="w-full gap-2 relative overflow-hidden"
                onClick={handlePostJob}
              >
                <Plus className="h-4 w-4" />
                פרסם משרה חדשה
              </AppButton>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Available Workers ────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="max-w-2xl mx-auto px-4 pt-4"
      >
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{
              background: "white",
              border: "1px solid oklch(0.89 0.05 84.0)",
              boxShadow: "0 4px 16px oklch(0.38 0.07 125.0 / 0.06)",
            }}
          >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[17px] font-black flex items-center gap-2"
              style={{ color: "oklch(0.22 0.03 122.3)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.65 0.22 160 / 0.10)", border: "1px solid oklch(0.65 0.22 160 / 0.18)" }}
              >
                <Users className="h-3.5 w-3.5" style={{ color: "oklch(0.55 0.22 160)" }} />
              </div>
              עובדים זמינים עכשיו
            </h2>
              <AppButton
                variant="ghost"
                size="sm"
                onClick={() => navigate("/available-workers")}
                className="gap-1 text-gray-400 hover:text-blue-600 text-xs"
              >
                כל העובדים
                <ChevronLeft className="h-3.5 w-3.5" />
              </AppButton>
          </div>

          {workersQuery.isLoading ? (
            <div className="px-1 py-2">
              <CarouselSkeletonRow count={3} />
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-6">
              <HardHat className="h-10 w-10 mx-auto mb-2 text-green-300" />
              <p className="text-sm text-gray-500">אין עובדים זמינים כרגע באזורך</p>
              <p className="text-xs text-gray-400 mt-1">פרסם משרה ועובדים יפנו אליך</p>
            </div>
          ) : (
            <div className="relative">
              <div
                id="worker-carousel"
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
                  <div key={worker.userId} className="snap-start shrink-0 w-[52vw] max-w-[180px]">
                    <WorkerCarouselCard worker={worker} index={i} />
                  </div>
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
                        background: i === activeWorkerIdx ? "#22c55e" : C_BORDER,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {workers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => navigate("/available-workers")}
                className="w-full gap-2 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                <TrendingUp className="h-4 w-4" />
                צפה בכל העובדים הזמינים
              </AppButton>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── How it works ─────────────────────────────────────────────────────────── */}
      <section
        className="mt-6"
        style={{
          background: "linear-gradient(180deg, oklch(0.96 0.02 122.3) 0%, oklch(0.93 0.03 91.6) 100%)",
          borderTop: "1px solid oklch(0.89 0.05 84.0)",
          borderBottom: "1px solid oklch(0.89 0.05 84.0)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h2
            className="text-[20px] font-black mb-8 text-center"
            style={{ color: "oklch(0.22 0.03 122.3)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
          >איך מפרסמים משרה?</h2>
          <div className="grid grid-cols-3 gap-4">
            {HOW_IT_WORKS_EMPLOYER.map(({ icon: Icon, step, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(251,146,60,0.05) 100%)",
                    border: "1px solid rgba(251,146,60,0.2)",
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: "oklch(0.38 0.07 125.0)" }} />
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${C_BRAND_HEX} 0%, ${C_BRAND_DARK_HEX} 100%)` }}
                  >
                    {step}
                  </span>
                </div>
                <h3
                  className="font-bold text-sm mb-1"
                  style={{ color: "oklch(0.22 0.03 122.3)" }}
                >{title}</h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "oklch(0.52 0.03 100)" }}
                >{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* ── Quick post CTA ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.22 0.07 125.0) 0%, oklch(0.32 0.07 115) 100%)",
            boxShadow: "0 8px 32px oklch(0.38 0.07 125.0 / 0.25)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <h2
            className="text-[22px] font-black mb-2 relative z-10"
            style={{
              color: "white",
              fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
              textShadow: "0 2px 8px oklch(0 0 0 / 0.25)",
            }}
          >צריך עובד עכשיו?</h2>
          <p
            className="mb-6 text-sm relative z-10"
            style={{ color: "oklch(1 0 0 / 0.60)" }}
          >פרסם משרה דחופה ומצא עובדים תוך דקות — ללא עמלות</p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-[15px] relative overflow-hidden z-10"
            style={{
              background: "linear-gradient(135deg, var(--citrus) 0%, var(--amber) 100%)",
              color: "oklch(0.22 0.03 122.3)",
              boxShadow: "0 6px 20px oklch(0.82 0.15 80.8 / 0.45)",
            }}
            onClick={handlePostJob}
          >
            <motion.div
              className="absolute inset-0 -skew-x-12 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.2) 50%, transparent 100%)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
            />
            <Zap className="h-5 w-5 relative z-10" />
            <span className="relative z-10">פרסם עבודה דחופה</span>
          </motion.button>
        </motion.div>
      </section>

      {/* ── Switch role ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-8 text-center">
        <p className="text-sm mb-3" style={{ color: "oklch(0.58 0.02 100)" }}>גם מחפש עבודה? עבור למצב עובד</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={resetUserMode}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "white",
            border: "1px solid oklch(0.89 0.05 84.0)",
            color: "oklch(0.40 0.03 122.3)",
            boxShadow: "0 2px 8px oklch(0.38 0.07 125.0 / 0.06)",
          }}
        >
          🔄 שנה תפקיד
        </motion.button>
      </section>   <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "@/components/LoginModal";
import {
  Zap, Users, Briefcase, HardHat, ChevronLeft, Loader2,
  Plus, CheckCircle2, Phone, MessageCircle, Eye, Pencil, TrendingUp,
} from "lucide-react";
import ActivityTicker from "@/components/ActivityTicker";
import LiveStats from "@/components/LiveStats";
import { JobCardSkeletonList, CarouselSkeletonRow } from "@/components/JobCardSkeleton";
import WorkerCarouselCard from "@/components/WorkerCarouselCard";

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
      const cardWidth = 180 + 12; // max-w-[180px] + gap-3
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

  const requireLogin = (msg: string) => { setLoginMessage(msg); setLoginOpen(true); };

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
    <div dir="rtl" style={{ background: "oklch(0.10 0.015 265)" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(160deg, oklch(0.14 0.03 30) 0%, oklch(0.12 0.025 265) 50%, oklch(0.10 0.015 265) 100%)",
          minHeight: "380px",
        }}
      >
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 25, 0], y: [0, -18, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.78 0.17 65 / 0.15) 0%, transparent 70%)" }}
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 25, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.62 0.22 255 / 0.12) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-5"
            style={{
              background: "oklch(1 0 0 / 8%)",
              border: "1px solid oklch(1 0 0 / 15%)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Briefcase className="h-4 w-4 text-amber-300" />
            מצב מעסיק — מחפש עובדים
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3"
          >
            מצא עובד תוך דקות
            <br />
            <span className="gradient-text text-glow">– פרסם עכשיו</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-base text-white/60 mb-7 max-w-md mx-auto"
          >
            פרסם משרה דחופה ומצא עובדים זמינים באזורך — ללא עמלות, ללא תיווך
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-5"
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
                onClick={handlePostJob}
              >
                <Zap className="h-5 w-5" />
                פרסם עבודה דחופה
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
                onClick={() => navigate("/available-workers")}
              >
                <Users className="h-5 w-5" />
                עובדים זמינים
              </Button>
            </motion.div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            onClick={() => {
              const message = encodeURIComponent(`שלום, אני רוצה לפרסם עבודה:\n\nשם העסק:\nסוג העבודה:\nמיקום:\nשכר:\nטלפון ליצירת קשר:`);
              window.open(`https://wa.me/?text=${message}`, "_blank");
            }}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs font-medium transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-green-400" />
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
            className="rounded-3xl p-5"
            style={{
              background: "linear-gradient(135deg, oklch(0.16 0.04 255) 0%, oklch(0.14 0.03 265) 100%)",
              border: "1px solid oklch(0.62 0.22 255 / 0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-400" />
                המשרות שלי
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-jobs")}
                className="gap-1 text-white/50 hover:text-white text-xs"
              >
                כל המשרות
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            {myJobsQuery.isLoading ? (
              <JobCardSkeletonList count={2} />
            ) : myJobs.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-10 w-10 mx-auto mb-2 text-blue-400/40" />
                <p className="text-sm text-white/50 mb-3">עדיין לא פרסמת משרות</p>
                <Button
                  size="sm"
                  onClick={handlePostJob}
                  className="gap-2"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                    border: "none",
                  }}
                >
                  <Plus className="h-4 w-4" />
                  פרסם משרה ראשונה
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myJobs.slice(0, 3).map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="rounded-2xl p-3 flex items-center gap-3"
                    style={{
                      background: "oklch(1 0 0 / 6%)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{job.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {job.city}
                        {job.salary ? ` · ₪${job.salary}` : ""}
                        <span className={`mr-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                          job.status === "active" ? "bg-green-500/20 text-green-400" :
                          job.status === "closed" ? "bg-white/10 text-white/40" :
                          job.status === "expired" ? "bg-red-500/20 text-red-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>
                          {job.status === "active" ? "פעיל" : job.status === "closed" ? "סגור" : job.status === "expired" ? "פג" : "בבדיקה"}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/job/${job.id}`)}
                        className="p-1.5 rounded-lg transition-all hover:scale-110"
                        style={{ background: "oklch(1 0 0 / 8%)", border: "1px solid oklch(1 0 0 / 10%)" }}
                        title="צפה"
                      >
                        <Eye className="h-3.5 w-3.5 text-white/50" />
                      </button>
                      <button
                        onClick={() => navigate(`/edit-job/${job.id}`)}
                        className="p-1.5 rounded-lg transition-all hover:scale-110"
                        style={{ background: "oklch(1 0 0 / 8%)", border: "1px solid oklch(1 0 0 / 10%)" }}
                        title="ערוך"
                      >
                        <Pencil className="h-3.5 w-3.5 text-white/50" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {myJobs.length > 3 && (
                  <button
                    onClick={() => navigate("/my-jobs")}
                    className="w-full text-center text-xs text-blue-400 hover:text-blue-300 py-2 font-medium transition-colors"
                  >
                    + עוד {myJobs.length - 3} משרות
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 pt-4" style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
              <Button
                size="sm"
                onClick={handlePostJob}
                className="w-full gap-2"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                  border: "none",
                  boxShadow: "0 4px 16px oklch(0.62 0.22 255 / 0.3)",
                }}
              >
                <Plus className="h-4 w-4" />
                פרסם משרה חדשה
              </Button>
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
          className="rounded-3xl p-5"
          style={{
            background: "linear-gradient(135deg, oklch(0.15 0.04 160) 0%, oklch(0.13 0.03 165) 100%)",
            border: "1px solid oklch(0.65 0.22 160 / 0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              עובדים זמינים עכשיו
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/available-workers")}
              className="gap-1 text-white/50 hover:text-white text-xs"
            >
              כל העובדים
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>

          {workersQuery.isLoading ? (
            <div className="px-1 py-2">
              <CarouselSkeletonRow count={3} />
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-6">
              <HardHat className="h-10 w-10 mx-auto mb-2 text-green-400/30" />
              <p className="text-sm text-white/40">אין עובדים זמינים כרגע באזורך</p>
              <p className="text-xs text-white/25 mt-1">פרסם משרה ועובדים יפנו אליך</p>
            </div>
          ) : (
            <div className="relative">
              {/* Carousel track */}
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

              {/* Dot indicators */}
              {workers.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {workers.map((_, i) => (
                    <span
                      key={i}
                      className="inline-block rounded-full transition-all duration-300"
                      style={{
                        width: i === activeWorkerIdx ? "16px" : "8px",
                        height: "8px",
                        background: i === activeWorkerIdx
                          ? "oklch(0.65 0.22 160)"
                          : "oklch(1 0 0 / 20%)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {workers.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/available-workers")}
                className="w-full gap-2"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  border: "1px solid oklch(0.65 0.22 160 / 0.3)",
                  color: "oklch(0.75 0.18 160)",
                }}
              >
                <TrendingUp className="h-4 w-4" />
                צפה בכל העובדים הזמינים
              </Button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="border-y mt-6"
        style={{
          background: "oklch(0.13 0.02 265)",
          borderColor: "oklch(1 0 0 / 8%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h2 className="text-xl font-bold text-white mb-8 text-center">איך מפרסמים משרה?</h2>
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
                    background: "linear-gradient(135deg, oklch(0.78 0.17 65 / 0.15) 0%, oklch(0.68 0.22 50 / 0.08) 100%)",
                    border: "1px solid oklch(0.78 0.17 65 / 0.2)",
                  }}
                >
                  <Icon className="h-6 w-6 text-amber-400" />
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)" }}
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

      {/* ── Quick post CTA ───────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="rounded-3xl p-8"
          style={{
            background: "linear-gradient(135deg, oklch(0.16 0.04 255) 0%, oklch(0.12 0.025 280) 100%)",
            border: "1px solid oklch(0.62 0.22 255 / 0.2)",
            boxShadow: "0 0 60px oklch(0.62 0.22 255 / 0.08)",
          }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">צריך עובד עכשיו?</h2>
          <p className="text-white/50 mb-6 text-sm">פרסם משרה דחופה ומצא עובדים תוך דקות — ללא עמלות</p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              onClick={handlePostJob}
              className="gap-2 px-8"
              style={{
                background: "linear-gradient(135deg, oklch(0.78 0.17 65) 0%, oklch(0.68 0.22 50) 100%)",
                color: "oklch(0.12 0.02 265)",
                border: "none",
                boxShadow: "0 8px 24px oklch(0.78 0.17 65 / 0.35)",
              }}
            >
              <Zap className="h-5 w-5" />
              פרסם עבודה דחופה
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Switch role ─────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-8 text-center">
        <p className="text-sm text-white/30 mb-2">גם מחפש עבודה? עבור למצב עובד</p>
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

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
    </div>
  );
}

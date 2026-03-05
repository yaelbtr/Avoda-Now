import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Briefcase, HardHat, Loader2, Zap, MapPin, Clock, Users, Star } from "lucide-react";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

export default function RoleSelectionScreen({ onSelected }: RoleSelectionScreenProps) {
  const [loading, setLoading] = useState<"worker" | "employer" | null>(null);
  const [exiting, setExiting] = useState(false);
  const [hovered, setHovered] = useState<"worker" | "employer" | null>(null);

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      setExiting(true);
      setTimeout(() => {
        onSelected(vars.mode);
      }, 500);
    },
    onSettled: () => setLoading(null),
  });

  const handleSelect = (mode: "worker" | "employer") => {
    if (loading || exiting) return;
    setLoading(mode);
    setModeMutation.mutate({ mode });
  };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="role-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-12 overflow-hidden"
          dir="rtl"
          style={{
            background: "linear-gradient(135deg, oklch(0.08 0.02 265) 0%, oklch(0.12 0.025 280) 50%, oklch(0.09 0.015 300) 100%)",
          }}
        >
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.62 0.22 255 / 0.15) 0%, transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.78 0.17 65 / 0.12) 0%, transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
              style={{ background: "radial-gradient(circle, oklch(0.65 0.20 300 / 0.08) 0%, transparent 70%)" }}
            />
          </div>

          {/* Logo / branding */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="mb-10 text-center relative z-10"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                boxShadow: "0 0 40px oklch(0.62 0.22 255 / 0.4), 0 20px 40px oklch(0 0 0 / 0.3)",
              }}
            >
              <Zap className="h-10 w-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              Job<span className="gradient-text">Now</span>
            </h1>
            <p className="text-white/60 text-base">בחר את תפקידך כדי להתחיל</p>
          </motion.div>

          {/* Role cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-lg relative z-10"
          >
            {/* Worker card */}
            <motion.button
              onClick={() => handleSelect("worker")}
              disabled={!!loading || exiting}
              onHoverStart={() => setHovered("worker")}
              onHoverEnd={() => setHovered(null)}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-3xl p-6 text-right overflow-hidden disabled:opacity-70 focus:outline-none"
              style={{
                background: hovered === "worker"
                  ? "linear-gradient(135deg, oklch(0.20 0.04 50) 0%, oklch(0.18 0.035 55) 100%)"
                  : "oklch(1 0 0 / 6%)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: hovered === "worker"
                  ? "1px solid oklch(0.78 0.17 65 / 0.5)"
                  : "1px solid oklch(1 0 0 / 12%)",
                boxShadow: hovered === "worker"
                  ? "0 20px 60px oklch(0.78 0.17 65 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.15)"
                  : "0 8px 32px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.08)",
                transition: "all 0.3s ease",
              }}
            >
              {loading === "worker" && (
                <div className="absolute top-4 left-4">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                </div>
              )}
              {/* Glow orb on hover */}
              <AnimatePresence>
                {hovered === "worker" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, oklch(0.78 0.17 65 / 0.3) 0%, transparent 70%)" }}
                  />
                )}
              </AnimatePresence>

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, oklch(0.78 0.17 65) 0%, oklch(0.70 0.20 50) 100%)",
                  boxShadow: "0 8px 20px oklch(0.78 0.17 65 / 0.35)",
                }}
              >
                <HardHat className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">אני מחפש עבודה</h2>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                מצא עבודות זמניות ודחופות באזורך וצור קשר עם מעסיקים ישירות
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: MapPin, label: "עבודות קרובות" },
                  { icon: Clock, label: "להיום" },
                  { icon: Zap, label: "דחוף" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "oklch(0.78 0.17 65 / 0.15)",
                      color: "oklch(0.88 0.14 75)",
                      border: "1px solid oklch(0.78 0.17 65 / 0.25)",
                    }}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </motion.button>

            {/* Employer card */}
            <motion.button
              onClick={() => handleSelect("employer")}
              disabled={!!loading || exiting}
              onHoverStart={() => setHovered("employer")}
              onHoverEnd={() => setHovered(null)}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-3xl p-6 text-right overflow-hidden disabled:opacity-70 focus:outline-none"
              style={{
                background: hovered === "employer"
                  ? "linear-gradient(135deg, oklch(0.16 0.04 255) 0%, oklch(0.14 0.035 270) 100%)"
                  : "oklch(1 0 0 / 6%)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: hovered === "employer"
                  ? "1px solid oklch(0.62 0.22 255 / 0.5)"
                  : "1px solid oklch(1 0 0 / 12%)",
                boxShadow: hovered === "employer"
                  ? "0 20px 60px oklch(0.62 0.22 255 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.15)"
                  : "0 8px 32px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.08)",
                transition: "all 0.3s ease",
              }}
            >
              {loading === "employer" && (
                <div className="absolute top-4 left-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              )}
              <AnimatePresence>
                {hovered === "employer" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, oklch(0.62 0.22 255 / 0.3) 0%, transparent 70%)" }}
                  />
                )}
              </AnimatePresence>

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                  boxShadow: "0 8px 20px oklch(0.62 0.22 255 / 0.35)",
                }}
              >
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">אני מחפש עובדים</h2>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                פרסם משרות דחופות, מצא עובדים זמינים באזורך, וסגור משרה תוך דקות
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: Users, label: "עובדים זמינים" },
                  { icon: Zap, label: "משרה דחופה" },
                  { icon: Star, label: "מהיר" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "oklch(0.62 0.22 255 / 0.15)",
                      color: "oklch(0.80 0.18 240)",
                      border: "1px solid oklch(0.62 0.22 255 / 0.25)",
                    }}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-white/30 mt-8 text-center relative z-10"
          >
            ניתן לשנות את הבחירה בכל עת מהתפריט
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

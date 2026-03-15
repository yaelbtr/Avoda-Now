import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import {
  C_BRAND, C_BRAND_DARK,
  C_TEXT_PRIMARY, C_TEXT_MUTED,
  C_PAGE_BG,
} from "@/lib/colors";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/login-hero-house_378bbdc3.jpg";

// Duration (ms) the greeting is shown before fading out
const GREETING_DISPLAY_MS = 1800;
const GREETING_FADE_MS = 500;

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

/** Full-screen greeting overlay shown briefly for returning authenticated users */
function WelcomeBackOverlay({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, GREETING_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const firstName = name.trim().split(/\s+/)[0] ?? name;

  return (
    <motion.div
      key="welcome-back"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: GREETING_FADE_MS / 1000, ease: "easeInOut" }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: C_PAGE_BG }}
      dir="rtl"
    >
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, oklch(0.96 0.02 122.3) 0%, oklch(0.93 0.03 91.6) 100%)`,
            boxShadow: `0 8px 32px ${C_BRAND}30`,
          }}
        >
          <Sparkles className="h-9 w-9" style={{ color: C_BRAND }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-1"
        >
          <p className="text-[15px] font-semibold" style={{ color: C_TEXT_MUTED }}>
            שמחים לראותך שוב
          </p>
          <h1
            className="text-[32px] font-black leading-tight"
            style={{ color: C_TEXT_PRIMARY, fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
          >
            ברוך הבא בחזרה,{" "}
            <span style={{ color: C_BRAND }}>{firstName}</span>!
          </h1>
        </motion.div>

        <motion.div
          className="flex gap-2 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: C_BRAND }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function RoleSelectionScreen({ onSelected }: RoleSelectionScreenProps) {
  const [loading, setLoading] = useState<"worker" | "employer" | null>(null);
  const { isAuthenticated, user } = useAuth();

  const shouldGreet = isAuthenticated && !!user?.name;
  const [showGreeting, setShowGreeting] = useState(shouldGreet);
  const [cardsVisible, setCardsVisible] = useState(!shouldGreet);

  const handleGreetingDone = () => {
    setShowGreeting(false);
    setTimeout(() => setCardsVisible(true), 150);
  };

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      onSelected(vars.mode);
    },
    onSettled: () => setLoading(null),
  });

  const handleSelect = (mode: "worker" | "employer") => {
    if (loading) return;
    if (!isAuthenticated) {
      onSelected(mode);
      return;
    }
    setLoading(mode);
    setModeMutation.mutate({ mode });
  };

  return (
    <motion.div
      key="role-selection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      dir="rtl"
      style={{ background: "#f8f6f6" }}
    >
      {/* Welcome-back greeting overlay */}
      <AnimatePresence>
        {showGreeting && user?.name && (
          <WelcomeBackOverlay name={user.name} onDone={handleGreetingDone} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cardsVisible && (
          <motion.div
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col min-h-screen"
          >
            {/* Header */}
            <div className="flex items-center p-4 pb-2 justify-between">
              <div className="w-12" />
              <h2
                className="text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center"
                style={{ color: C_BRAND }}
              >
                AvodaNow
              </h2>
              <div className="w-12" />
            </div>

            {/* Hero Image */}
            <div className="w-full">
              <div
                className="w-full bg-center bg-no-repeat bg-cover min-h-[280px] shadow-sm"
                style={{ backgroundImage: `url('${HERO_IMG}')` }}
              />
            </div>

            {/* Welcome Text */}
            <div className="px-6 pt-8 pb-4 text-center">
              <h1
                className="tracking-tight text-[32px] font-bold leading-tight pb-3"
                style={{ color: C_TEXT_PRIMARY, fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
              >
                ברוכים הבאים ל-AvodaNow
              </h1>
              <p
                className="text-lg font-normal leading-normal max-w-md mx-auto"
                style={{ color: "oklch(0.40 0.03 122.3)" }}
              >
                הדרך הפשוטה והמהירה ביותר למצוא את המשרה הבאה שלך ולנהל את הקריירה בביטחון.
              </p>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex justify-center pb-12">
              <div className="flex flex-1 gap-4 max-w-[480px] flex-col items-stretch px-6">
                {/* הרשמה — worker */}
                <button
                  onClick={() => handleSelect("worker")}
                  disabled={!!loading}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-lg transition-opacity disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${C_BRAND} 0%, ${C_BRAND_DARK} 100%)` }}
                >
                  {loading === "worker" ? (
                    <Loader2 className="h-5 w-5 animate-spin ml-2" />
                  ) : null}
                  <span className="truncate">הרשמה / כניסה כעובד</span>
                </button>

                {/* התחברות — employer */}
                <button
                  onClick={() => handleSelect("employer")}
                  disabled={!!loading}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 text-lg font-bold leading-normal tracking-[0.015em] w-full border disabled:opacity-60"
                  style={{
                    background: `${C_BRAND}1A`,
                    color: C_BRAND,
                    borderColor: `${C_BRAND}33`,
                  }}
                >
                  {loading === "employer" ? (
                    <Loader2 className="h-5 w-5 animate-spin ml-2" />
                  ) : null}
                  <span className="truncate">כניסה כמעסיק</span>
                </button>
              </div>
            </div>

            {/* Footer terms */}
            <div className="px-6 pb-6 text-center">
              <p className="text-xs" style={{ color: "oklch(0.50 0.02 100)" }}>
                בהמשך התהליך הינך מסכים ל
                <Link href="/terms" className="underline" style={{ color: C_BRAND }}>
                  תנאי השימוש
                </Link>
                {" "}ול
                <Link href="/privacy" className="underline" style={{ color: C_BRAND }}>
                  מדיניות הפרטיות
                </Link>
                {" "}שלנו.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

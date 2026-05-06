import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";

interface HeroPreLaunchProps {
  onLoginRequired: (msg: string) => void;
}

export function HeroPreLaunch({ onLoginRequired }: HeroPreLaunchProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const registeredWorkers = heroStatsQuery.data?.registeredWorkers ?? null;
  const showWorkerChip = registeredWorkers !== null && registeredWorkers >= 100;

  const handlePrimaryCta = () => {
    if (isAuthenticated) {
      navigate("/worker-profile");
      return;
    }
    onLoginRequired("הצטרפו עכשיו וקבלו עבודות באזורכם");
  };

  const handleSecondaryCta = () => {
    if (isAuthenticated) return;
    onLoginRequired("התחברו לחשבון הקיים");
  };

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden px-6 pt-10 pb-12 text-right"
      style={{ background: "var(--editorial-background)", fontFamily: "var(--font-editorial-ui)" }}
    >
      {showWorkerChip && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="inline-flex items-center gap-2 mb-5 rounded-full px-3 py-1.5"
          style={{
            background: "rgb(255 255 255 / 0.80)",
            border: "1px solid var(--editorial-outline-ghost)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.span
            aria-hidden="true"
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--editorial-primary)",
              boxShadow: "0 0 0 3px rgb(220 232 179 / 0.60)",
            }}
          />
          <span className="text-[12px] font-bold" style={{ color: "var(--editorial-primary)" }}>
            +{registeredWorkers} עובדים כבר רשומים
          </span>
        </motion.div>
      )}

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="leading-[1.1] mb-3"
        style={{
          fontFamily: "var(--font-editorial-display)",
          fontSize: "30px",
          fontWeight: 700,
          color: "var(--editorial-on-surface)",
          letterSpacing: 0,
        }}
      >
        העבודה הזמנית הבאה שלך -
        <br />
        <span style={{ color: "var(--editorial-primary)" }}>קרוב לבית.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-[15px] font-medium leading-relaxed mb-7 max-w-md"
        style={{ color: "var(--editorial-on-surface-variant)" }}
      >
        הצטרפו לאלפי עובדים שכבר מוכנים, והיו הראשונים לקבל הצעה ממעסיק באזורכם.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <motion.button
          onClick={handlePrimaryCta}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="w-full inline-flex items-center justify-center gap-2.5 font-bold text-[16px]"
          style={{
            background: "var(--editorial-cta-gradient)",
            color: "var(--editorial-on-primary)",
            height: 56,
            borderRadius: 24,
            boxShadow: "var(--editorial-shadow)",
          }}
        >
          {isAuthenticated ? "המשיכו לפרופיל" : "הצטרפו בחינם - 30 שניות"}
          <ArrowLeft size={18} strokeWidth={2.4} />
        </motion.button>

        {!isAuthenticated && (
          <button
            onClick={handleSecondaryCta}
            className="w-full text-[14px] font-semibold py-2"
            style={{ color: "var(--editorial-on-surface-variant)" }}
          >
            כבר רשומים?{" "}
            <span style={{ color: "var(--editorial-primary)", textDecoration: "underline", textUnderlineOffset: 4 }}>
              התחברו
            </span>
          </button>
        )}
      </motion.div>
    </section>
  );
}

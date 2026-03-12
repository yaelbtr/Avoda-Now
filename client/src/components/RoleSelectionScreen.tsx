import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, HardHat, Loader2, ArrowLeft, Zap, Users, Star, Shield, Sparkles } from "lucide-react";
import {
  C_BRAND, C_BRAND_DARK, C_BRAND_LIGHT, C_HONEY,
  C_TEXT_PRIMARY, C_TEXT_SECONDARY, C_TEXT_MUTED,
  C_PAGE_BG, S_BRAND_MD, S_BRAND_LG, S_CARD,
} from "@/lib/colors";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

const WORKER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCXZrKFndAo95eFwCh4AIII3H1E4Yu7Be02H1TRn5xaWhTNgB5AHDOdrQkXxe7wDOeZkg3vyRr4tjK3KrsuDX8NAVrioZsGEI0z4Bm-_ozdoQaCKpuOSWtQt7kU78geKlXTdq6S3_tym2woptkmRNCnOqmVsT8RxMCq58MbV3PANPZIJG7OtClCO021xREN6to9i8G4Z3V3BP9ox4F9U0c2OqkTa-9QGhYWV0k0sS-6iqkJu27MX-VnikcJwtaNtmD2Sy9r4km25g";
const EMPLOYER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVfysXcSHKuS_fZeUhXSL1eddN2CFaf5cM6GfP2K6-UlJNdRcasgKvnC-TrOiE6kCPfhJ7aKwMIo_24URtLV2InHHRAFLGwjItj3HOpz2c8RhJr9_o1SOwmZUP78nSpHL7aytS7SH1M62Lr1FazjB-ChdpvXwmhth5CWwYlHIlsGR6DBMIDsqdoR0oUtn2GmA4x618u39wjuu5ZiOGA1Be20pmJSL9q4nwBCIvwVDNkq8SaDRFYlPDiRu5i8_WfphQgd_-F6-mA";

// Duration (ms) the greeting is shown before fading out
const GREETING_DISPLAY_MS = 1800;
// Duration (ms) of the greeting fade-out transition
const GREETING_FADE_MS = 500;

interface RoleCardProps {
  role: "worker" | "employer";
  image: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  badge: string;
  badgeIcon: React.ReactNode;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
  delay: number;
  accentColor?: string;
}

function RoleCard({
  image,
  icon,
  title,
  subtitle,
  description,
  features,
  badge,
  badgeIcon,
  buttonLabel,
  loading,
  disabled,
  onSelect,
  delay,
}: RoleCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onSelect}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: "white",
        boxShadow: hovered
          ? `0 16px 48px oklch(0.38 0.07 125.0 / 0.18), 0 0 0 2px ${C_BRAND}`
          : "0 4px 20px oklch(0.38 0.07 125.0 / 0.08), 0 1px 4px oklch(0.38 0.07 125.0 / 0.05)",
        border: `1.5px solid ${hovered ? C_BRAND : "oklch(0.88 0.04 84.0)"}`,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      {/* Top image strip */}
      <div className="relative overflow-hidden" style={{ height: "140px" }}>
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${image}')` }}
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, oklch(0 0 0 / 0.0) 30%, oklch(0 0 0 / 0.55) 100%)",
          }}
        />
        {/* Badge overlay — hidden when badge is empty */}
        {badge && (
          <motion.div
            className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
            style={{
              background: "oklch(1 0 0 / 0.92)",
              color: C_BRAND,
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 8px oklch(0 0 0 / 0.15)",
            }}
            animate={{ y: hovered ? -2 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {badgeIcon}
            {badge}
          </motion.div>
        )}
        {/* Subtitle chip */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{
            background: "oklch(1 0 0 / 0.88)",
            color: C_BRAND,
            backdropFilter: "blur(8px)",
          }}
        >
          {icon}
          {subtitle}
        </div>
      </div>

      {/* Content area */}
      <div className="p-5" dir="rtl">
        <h2
          className="text-[18px] font-black mb-1.5 leading-snug"
          style={{ color: C_TEXT_PRIMARY, fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
        >
          {title}
        </h2>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: C_TEXT_SECONDARY }}>
          {description}
        </p>

        {/* Feature list */}
        <div className="space-y-1.5 mb-5">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-[12px]" style={{ color: C_TEXT_SECONDARY }}>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${C_BRAND}18`, border: `1px solid ${C_BRAND}30` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: C_BRAND }} />
              </div>
              {f}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          disabled={disabled}
          className="w-full py-3 rounded-xl font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-[14px]"
          style={{
            background: `linear-gradient(135deg, ${C_BRAND} 0%, ${C_BRAND_DARK} 100%)`,
            boxShadow: hovered
              ? `0 8px 24px oklch(0.38 0.07 125.0 / 0.40)`
              : `0 4px 14px oklch(0.38 0.07 125.0 / 0.28)`,
          }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          {buttonLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}

/** Full-screen greeting overlay shown briefly for returning authenticated users */
function WelcomeBackOverlay({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, GREETING_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  // Extract first name only
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
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-16 -right-16 w-72 h-72 rounded-full"
          style={{ background: "oklch(0.75 0.12 76.7 / 0.10)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full"
          style={{ background: "oklch(0.38 0.07 125.0 / 0.08)", filter: "blur(50px)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        {/* Animated sparkle icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${C_BRAND_LIGHT} 0%, oklch(0.93 0.03 91.6) 100%)`,
            boxShadow: `0 8px 32px ${C_BRAND}30`,
            border: `2px solid ${C_HONEY}`,
          }}
        >
          <Sparkles className="h-9 w-9" style={{ color: C_BRAND }} />
        </motion.div>

        {/* Greeting text */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-1"
        >
          <p
            className="text-[15px] font-semibold tracking-wide"
            style={{ color: C_TEXT_MUTED, letterSpacing: "0.04em" }}
          >
            שמחים לראותך שוב
          </p>
          <h1
            className="text-[32px] font-black leading-tight"
            style={{
              color: C_TEXT_PRIMARY,
              fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
            }}
          >
            ברוך הבא בחזרה,{" "}
            <span style={{ color: C_BRAND }}>{firstName}</span>!
          </h1>
        </motion.div>

        {/* Animated dots progress indicator */}
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
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
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

  // Show greeting only once per mount for authenticated users with a name
  const shouldGreet = isAuthenticated && !!user?.name;
  const [showGreeting, setShowGreeting] = useState(shouldGreet);
  const [cardsVisible, setCardsVisible] = useState(!shouldGreet);

  const handleGreetingDone = () => {
    setShowGreeting(false);
    // Small delay so the greeting fade-out completes before cards appear
    setTimeout(() => setCardsVisible(true), 150);
  };

  // Fetch real stats for the worker card badge (conditional display)
  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const hs = heroStatsQuery.data;
  // Determine badge text: active jobs if >50, else closed jobs if >50, else workers if >100, else null
  const workerBadge: string | null = (() => {
    if (!hs) return null;
    if (hs.activeJobs > 50)         return `${hs.activeJobs}+ משרות פעילות`;
    if (hs.closedJobs > 50)         return `${hs.closedJobs}+ משרות שנסגרו`;
    if (hs.registeredWorkers > 100) return `${hs.registeredWorkers}+ עובדים רשומים`;
    return null;
  })();

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      // Notify parent — parent will remove this component from DOM,
      // triggering the exit animation via parent's AnimatePresence.
      onSelected(vars.mode);
    },
    onSettled: () => setLoading(null),
  });

  const handleSelect = (mode: "worker" | "employer") => {
    if (loading) return;
    if (!isAuthenticated) {
      // Guest: notify parent immediately — parent AnimatePresence handles exit.
      onSelected(mode);
      return;
    }
    setLoading(mode);
    setModeMutation.mutate({ mode });
  };

  // This component is rendered inside an AnimatePresence in App.tsx.
  // The motion.div here responds to that parent AnimatePresence for exit animations.
  return (
        <motion.div
          key="role-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="w-full min-h-screen flex items-center justify-center relative overflow-hidden"
          dir="rtl"
          style={{ background: C_PAGE_BG }}
        >
          {/* Decorative background blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="absolute -top-16 -right-16 w-72 h-72 rounded-full"
              style={{ background: "oklch(0.75 0.12 76.7 / 0.08)", filter: "blur(60px)" }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full"
              style={{ background: "oklch(0.38 0.07 125.0 / 0.06)", filter: "blur(50px)" }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
              style={{ background: "oklch(0.96 0.02 122.3 / 0.5)", filter: "blur(80px)" }}
            />
          </div>

          {/* Welcome-back greeting overlay (authenticated users only) */}
          <AnimatePresence>
            {showGreeting && user?.name && (
              <WelcomeBackOverlay name={user.name} onDone={handleGreetingDone} />
            )}
          </AnimatePresence>

          {/* Role selection cards — shown after greeting (or immediately for guests) */}
          <AnimatePresence>
            {cardsVisible && (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center px-5 py-8 max-w-lg mx-auto w-full relative z-10"
              >
                {/* Welcome header */}
                <motion.header
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center mb-7 w-full"
                >
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold mb-4"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.96 0.02 122.3) 0%, oklch(0.93 0.03 91.6) 100%)",
                      color: C_BRAND,
                      border: `1px solid ${C_HONEY}`,
                      boxShadow: "0 2px 8px oklch(0.38 0.07 125.0 / 0.10)",
                      letterSpacing: "0.06em",
                    }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    <Zap className="h-3.5 w-3.5" style={{ color: "var(--amber)" }} />
                    פלטפורמת הגיוס המהירה בישראל
                  </motion.div>

                  <h1
                    className="text-[34px] font-black mb-2 tracking-tight"
                    style={{
                      color: C_TEXT_PRIMARY,
                      lineHeight: 1.12,
                      fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
                    }}
                  >
                    ברוכים הבאים ל-
                    <span style={{ color: C_TEXT_PRIMARY }}>Avoda</span><span style={{ color: C_BRAND }}>Now</span>
                  </h1>
                  <p className="text-[14px] font-medium" style={{ color: C_TEXT_MUTED }}>
                    בחרו את הדרך שלכם להתחיל
                  </p>
                </motion.header>

                {/* Cards */}
                <div className="flex flex-col gap-4 w-full">
                  <RoleCard
                    role="worker"
                    image={WORKER_IMG}
                    icon={<HardHat className="h-3.5 w-3.5" style={{ color: C_BRAND }} />}
                    title="אני מחפש עבודה"
                    subtitle="לעובדים"
                    description="מצא עבודה מזדמנת בקרבתך תוך דקות. קשר ישיר עם מעסיקים ללא עמלות."
                    features={[
                      "אלפי משרות פעילות בכל ישראל",
                      "קשר ישיר עם המעסיק",
                      "ללא עמלות ודמי תיווך",
                    ]}
                    badge={workerBadge ?? ""}
                    badgeIcon={workerBadge ? <Zap className="h-3 w-3" /> : null}
                    buttonLabel="המשך כעובד"
                    loading={loading === "worker"}
                    disabled={!!loading}
                    onSelect={() => handleSelect("worker")}
                    delay={0.15}
                  />

                  <RoleCard
                    role="employer"
                    image={EMPLOYER_IMG}
                    icon={<Briefcase className="h-3.5 w-3.5" style={{ color: C_BRAND }} />}
                    title="אני מחפש עובדים"
                    subtitle="למעסיקים"
                    description="פרסם משרה תוך דקות ומצא עובדים מתאימים בסביבתך במהירות."
                    features={[
                      "פרסום מהיר וקל",
                      "גישה לעובדים זמינים באזורך",
                      "ניהול מלא של המשרות שלך",
                    ]}
                    badge="עובדים זמינים"
                    badgeIcon={<Users className="h-3 w-3" />}
                    buttonLabel="המשך כמעסיק"
                    loading={loading === "employer"}
                    disabled={!!loading}
                    onSelect={() => handleSelect("employer")}
                    delay={0.25}
                  />
                </div>

                {/* Bottom trust line */}
                <motion.div
                  className="mt-6 flex items-center justify-center gap-4 text-xs"
                  style={{ color: C_TEXT_MUTED }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    מאובטח ומוגן
                  </span>
                  <span className="w-1 h-1 rounded-full" style={{ background: C_TEXT_MUTED }} />
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    ניתן לשנות בכל עת
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
  );
}

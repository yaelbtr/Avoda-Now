import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Briefcase, HardHat, Loader2, ArrowLeft, Zap, Users } from "lucide-react";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

const WORKER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCXZrKFndAo95eFwCh4AIII3H1E4Yu7Be02H1TRn5xaWhTNgB5AHDOdrQkXxe7wDOeZkg3vyRr4tjK3KrsuDX8NAVrioZsGEI0z4Bm-_ozdoQaCKpuOSWtQt7kU78geKlXTdq6S3_tym2woptkmRNCnOqmVsT8RxMCq58MbV3PANPZIJG7OtClCO021xREN6to9i8G4Z3V3BP9ox4F9U0c2OqkTa-9QGhYWV0k0sS-6iqkJu27MX-VnikcJwtaNtmD2Sy9r4km25g";
const EMPLOYER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVfysXcSHKuS_fZeUhXSL1eddN2CFaf5cM6GfP2K6-UlJNdRcasgKvnC-TrOiE6kCPfhJ7aKwMIo_24URtLV2InHHRAFLGwjItj3HOpz2c8RhJr9_o1SOwmZUP78nSpHL7aytS7SH1M62Lr1FazjB-ChdpvXwmhth5CWwYlHIlsGR6DBMIDsqdoR0oUtn2GmA4x618u39wjuu5ZiOGA1Be20pmJSL9q4nwBCIvwVDNkq8SaDRFYlPDiRu5i8_WfphQgd_-F6-mA";

const BLUE = "oklch(0.58 0.20 255)";
const BLUE_DARK = "oklch(0.48 0.22 255)";
const BLUE_LIGHT = "oklch(0.94 0.03 255)";
const TEXT_PRIMARY = "oklch(0.18 0.015 265)";
const TEXT_SECONDARY = "oklch(0.42 0.012 265)";
const TEXT_MUTED = "oklch(0.62 0.008 265)";
const BG = "oklch(0.97 0.006 247)";

interface RoleCardProps {
  role: "worker" | "employer";
  image: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeIcon: React.ReactNode;
  buttonLabel: string;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
  delay: number;
}

function RoleCard({
  role,
  image,
  icon,
  title,
  subtitle,
  description,
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
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onSelect}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: "oklch(1 0 0)",
        boxShadow: hovered
          ? `0 20px 60px oklch(0.58 0.20 255 / 0.18), 0 0 0 2px ${BLUE}`
          : "0 4px 24px oklch(0 0 0 / 0.08), 0 1px 4px oklch(0 0 0 / 0.04)",
        border: `1.5px solid ${hovered ? BLUE : "oklch(0.93 0.006 247)"}`,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Image with overlay */}
      <div className="relative w-full overflow-hidden" style={{ height: "180px" }}>
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${image}')` }}
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0 0 0 / 0.08) 0%, oklch(0 0 0 / 0.35) 100%)",
          }}
        />
        {/* Floating badge */}
        <motion.div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "oklch(1 0 0 / 0.92)",
            color: BLUE,
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px oklch(0 0 0 / 0.12)",
          }}
          animate={{ y: hovered ? -2 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {badgeIcon}
          {badge}
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col items-center text-center" dir="rtl">
        {/* Icon circle */}
        <motion.div
          className="flex items-center justify-center rounded-full mb-4 -mt-9 relative z-10"
          style={{
            width: 60,
            height: 60,
            background: "oklch(1 0 0)",
            boxShadow: `0 4px 16px oklch(0.58 0.20 255 / 0.25)`,
            border: `2px solid ${BLUE_LIGHT}`,
          }}
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>

        {/* Subtitle tag */}
        <span
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: BLUE, letterSpacing: "0.1em" }}
        >
          {subtitle}
        </span>

        <h2 className="text-xl font-bold mb-2" style={{ color: TEXT_PRIMARY, lineHeight: 1.3 }}>
          {title}
        </h2>
        <p className="mb-5 leading-relaxed text-sm" style={{ color: TEXT_SECONDARY, maxWidth: 280 }}>
          {description}
        </p>

        {/* CTA Button */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          disabled={disabled}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
            boxShadow: hovered
              ? `0 8px 24px oklch(0.58 0.20 255 / 0.45)`
              : `0 4px 14px oklch(0.58 0.20 255 / 0.30)`,
            fontSize: "0.95rem",
          }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 opacity-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, oklch(1 0 0 / 0.18) 50%, transparent 60%)",
            }}
            animate={hovered ? { opacity: 1, x: ["−100%", "200%"] } : { opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          {buttonLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function RoleSelectionScreen({ onSelected }: RoleSelectionScreenProps) {
  const [loading, setLoading] = useState<"worker" | "employer" | null>(null);
  const [exiting, setExiting] = useState(false);

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      setExiting(true);
      setTimeout(() => onSelected(vars.mode), 400);
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
      {!exiting && (
        <motion.div
          key="role-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="w-full"
          dir="rtl"
          style={{ background: BG }}
        >
          <div className="flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full">
            {/* Welcome header */}
            <motion.header
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-8"
            >
              {/* Top pill */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: BLUE_LIGHT,
                  color: BLUE,
                  border: `1px solid oklch(0.80 0.08 255)`,
                }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Zap className="h-3 w-3" />
                פלטפורמת הגיוס המהירה בישראל
              </motion.div>

              <h1
                className="text-4xl font-black mb-3 tracking-tight"
                style={{ color: TEXT_PRIMARY, lineHeight: 1.15 }}
              >
                ברוכים הבאים ל-
                <span style={{ color: BLUE }}>AvodaNow</span>
              </h1>
              <p style={{ color: TEXT_MUTED }} className="text-base">
                איך נוכל לעזור לך היום?
              </p>
            </motion.header>

            {/* Cards */}
            <div className="grid grid-cols-1 gap-5 w-full">
              <RoleCard
                role="worker"
                image={WORKER_IMG}
                icon={<HardHat className="h-7 w-7" style={{ color: BLUE }} />}
                title="אני מחפש עבודה"
                subtitle="לעובדים"
                description="מציאת עבודה בקלות ובמהירות. הגש מועמדות למשרות המבטיחות ביותר בלחיצת כפתור אחת."
                badge="אלפי משרות פתוחות"
                badgeIcon={<Zap className="h-3 w-3" />}
                buttonLabel="המשך כעובד"
                loading={loading === "worker"}
                disabled={!!loading || exiting}
                onSelect={() => handleSelect("worker")}
                delay={0.15}
              />

              <RoleCard
                role="employer"
                image={EMPLOYER_IMG}
                icon={<Briefcase className="h-7 w-7" style={{ color: BLUE }} />}
                title="אני מחפש עובדים"
                subtitle="למעסיקים"
                description="גיוס יעיל והתאמה מהירה. מצא את המועמדים המושלמים לעסק שלך תוך זמן קצר."
                badge="עובדים זמינים עכשיו"
                badgeIcon={<Users className="h-3 w-3" />}
                buttonLabel="המשך כמעסיק"
                loading={loading === "employer"}
                disabled={!!loading || exiting}
                onSelect={() => handleSelect("employer")}
                delay={0.25}
              />
            </div>

            {/* Bottom trust line */}
            <motion.p
              className="mt-6 text-xs text-center"
              style={{ color: TEXT_MUTED }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              🔒 מאובטח ומוגן · ניתן לשנות בכל עת
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

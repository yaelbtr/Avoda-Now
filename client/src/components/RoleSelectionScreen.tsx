import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Briefcase, HardHat, Loader2, ArrowLeft, Zap, Users } from "lucide-react";
import {
  C_BRAND, C_BRAND_DARK, C_BRAND_LIGHT,
  C_TEXT_PRIMARY, C_TEXT_SECONDARY, C_TEXT_MUTED,
  C_PAGE_BG, S_BRAND_MD, S_BRAND_LG,
} from "@/lib/colors";

interface RoleSelectionScreenProps {
  onSelected: (mode: "worker" | "employer") => void;
}

const WORKER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCXZrKFndAo95eFwCh4AIII3H1E4Yu7Be02H1TRn5xaWhTNgB5AHDOdrQkXxe7wDOeZkg3vyRr4tjK3KrsuDX8NAVrioZsGEI0z4Bm-_ozdoQaCKpuOSWtQt7kU78geKlXTdq6S3_tym2woptkmRNCnOqmVsT8RxMCq58MbV3PANPZIJG7OtClCO021xREN6to9i8G4Z3V3BP9ox4F9U0c2OqkTa-9QGhYWV0k0sS-6iqkJu27MX-VnikcJwtaNtmD2Sy9r4km25g";
const EMPLOYER_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBCVfysXcSHKuS_fZeUhXSL1eddN2CFaf5cM6GfP2K6-UlJNdRcasgKvnC-TrOiE6kCPfhJ7aKwMIo_24URtLV2InHHRAFLGwjItj3HOpz2c8RhJr9_o1SOwmZUP78nSpHL7aytS7SH1M62Lr1FazjB-ChdpvXwmhth5CWwYlHIlsGR6DBMIDsqdoR0oUtn2GmA4x618u39wjuu5ZiOGA1Be20pmJSL9q4nwBCIvwVDNkq8SaDRFYlPDiRu5i8_WfphQgd_-F6-mA";

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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onSelect}
      className="group relative rounded-2xl overflow-hidden cursor-pointer flex"
      style={{
        background: "oklch(1 0 0)",
        boxShadow: hovered
          ? `0 12px 40px oklch(0.58 0.20 255 / 0.18), 0 0 0 2px ${C_BRAND}`
          : "0 2px 12px oklch(0 0 0 / 0.07), 0 1px 3px oklch(0 0 0 / 0.04)",
        border: `1.5px solid ${hovered ? C_BRAND : "oklch(0.93 0.006 247)"}`,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        minHeight: 0,
      }}
    >
      {/* Left: image strip */}
      <div className="relative overflow-hidden shrink-0" style={{ width: "110px" }}>
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${image}')` }}
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, oklch(0 0 0 / 0.0) 60%, oklch(0 0 0 / 0.15) 100%)",
          }}
        />
        {/* Floating badge */}
        <motion.div
          className="absolute bottom-3 right-0 left-0 mx-auto flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{
            background: "oklch(1 0 0 / 0.92)",
            color: C_BRAND,
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px oklch(0 0 0 / 0.12)",
            width: "fit-content",
            maxWidth: "90px",
            whiteSpace: "nowrap",
          }}
          animate={{ y: hovered ? -2 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {badgeIcon}
          {badge}
        </motion.div>
      </div>

      {/* Right: content */}
      <div className="flex-1 p-4 flex flex-col justify-between" dir="rtl">
        <div>
          {/* Icon + subtitle row */}
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 36,
                height: 36,
                background: C_BRAND_LIGHT,
                border: `1.5px solid oklch(0.80 0.08 255)`,
              }}
            >
              {icon}
            </div>
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: C_BRAND }}
            >
              {subtitle}
            </span>
          </div>

          <h2 className="text-base font-bold mb-1 leading-snug" style={{ color: C_TEXT_PRIMARY }}>
            {title}
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: C_TEXT_SECONDARY }}>
            {description}
          </p>
        </div>

        {/* CTA Button */}
        <motion.button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          disabled={disabled}
          className="mt-3 w-full py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 relative overflow-hidden text-sm"
          style={{
            background: `linear-gradient(135deg, ${C_BRAND} 0%, ${C_BRAND_DARK} 100%)`,
            boxShadow: hovered ? S_BRAND_LG : S_BRAND_MD,
          }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
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
          className="w-full min-h-screen flex items-center justify-center"
          dir="rtl"
          style={{ background: C_PAGE_BG }}
        >
          <div className="flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
            {/* Welcome header */}
            <motion.header
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-5 w-full"
            >
              <motion.div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                style={{
                  background: C_BRAND_LIGHT,
                  color: C_BRAND,
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
                className="text-3xl font-black mb-1.5 tracking-tight"
                style={{ color: C_TEXT_PRIMARY, lineHeight: 1.15 }}
              >
                ברוכים הבאים ל-
                <span style={{ color: C_BRAND }}>AvodaNow</span>
              </h1>
              <p style={{ color: C_TEXT_MUTED }} className="text-sm">
                איך נוכל לעזור לך היום?
              </p>
            </motion.header>

            {/* Cards */}
            <div className="flex flex-col gap-3 w-full">
              <RoleCard
                role="worker"
                image={WORKER_IMG}
                icon={<HardHat className="h-5 w-5" style={{ color: C_BRAND }} />}
                title="אני מחפש עבודה"
                subtitle="לעובדים"
                description="מציאת עבודה בקלות ובמהירות. הגש מועמדות למשרות המבטיחות ביותר בלחיצת כפתור."
                badge="אלפי משרות"
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
                icon={<Briefcase className="h-5 w-5" style={{ color: C_BRAND }} />}
                title="אני מחפש עובדים"
                subtitle="למעסיקים"
                description="גיוס יעיל והתאמה מהירה. מצא את המועמדים המושלמים לעסק שלך תוך זמן קצר."
                badge="עובדים זמינים"
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
              className="mt-4 text-xs text-center"
              style={{ color: C_TEXT_MUTED }}
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

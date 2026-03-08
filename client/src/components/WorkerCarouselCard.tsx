import { motion } from "framer-motion";
import { HardHat, MapPin, Clock, CheckCircle2 } from "lucide-react";

interface WorkerCarouselCardProps {
  worker: {
    userId: number;
    userName?: string | null;
    city?: string | null;
    note?: string | null;
    availableUntil?: Date | string | null;
    userPhone?: string | null;
  };
  index?: number;
}

function timeUntil(date: Date | string | null | undefined): string {
  if (!date) return "זמין";
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return "זמין";
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs > 0) return `זמין עוד ${hrs} שע'`;
  return `זמין עוד ${mins} דק'`;
}

// Deterministic avatar gradient based on userId
function getAvatarColors(userId: number) {
  const palettes = [
    { from: "oklch(0.45 0.18 160)", to: "oklch(0.38 0.15 155)", bg: "oklch(0.92 0.08 160 / 0.18)", border: "oklch(0.75 0.15 160 / 0.30)" },
    { from: "oklch(0.52 0.14 76.7)", to: "oklch(0.44 0.13 76.7)", bg: "oklch(0.94 0.06 76.7 / 0.18)", border: "oklch(0.78 0.12 76.7 / 0.30)" },
    { from: "oklch(0.52 0.20 25)",  to: "oklch(0.44 0.18 30)",  bg: "oklch(0.94 0.08 25 / 0.18)",  border: "oklch(0.78 0.16 25 / 0.30)"  },
    { from: "oklch(0.52 0.20 300)", to: "oklch(0.44 0.18 305)", bg: "oklch(0.94 0.08 300 / 0.18)", border: "oklch(0.78 0.16 300 / 0.30)" },
    { from: "oklch(0.52 0.18 65)",  to: "oklch(0.44 0.16 70)",  bg: "oklch(0.94 0.07 65 / 0.18)",  border: "oklch(0.78 0.14 65 / 0.30)"  },
  ];
  return palettes[userId % palettes.length];
}

export default function WorkerCarouselCard({ worker, index = 0 }: WorkerCarouselCardProps) {
  const colors = getAvatarColors(worker.userId);
  const initials = (worker.userName ?? "ע")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ scale: 1.03, y: -3 }}
      className="w-full text-right rounded-2xl overflow-hidden relative"
      style={{
        background: "white",
        border: `1px solid oklch(0.91 0.04 91.6)`,
        boxShadow: "0 2px 12px oklch(0.38 0.07 125.0 / 0.08), 0 1px 3px oklch(0 0 0 / 0.04)",
      }}
    >
      {/* Colored top accent bar */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${colors.from} 0%, ${colors.to} 100%)` }}
      />

      <div className="p-3">
        {/* Avatar + status badge */}
        <div className="flex items-start justify-between mb-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{
              background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
              boxShadow: `0 3px 10px ${colors.from}55`,
            }}
          >
            {initials || <HardHat className="h-4 w-4" />}
          </div>
          <span
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.90 0.12 145 / 0.25)",
              color: "oklch(0.35 0.15 145)",
              border: "1px solid oklch(0.80 0.14 145 / 0.35)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "oklch(0.50 0.18 145)" }}
            />
            זמין
          </span>
        </div>

        {/* Name */}
        <h3
          className="font-black text-[13px] leading-snug mb-1 line-clamp-1"
          style={{ color: "oklch(0.22 0.06 122)" }}
        >
          {worker.userName ?? "עובד זמין"}
        </h3>

        {/* Location */}
        {worker.city && (
          <p
            className="flex items-center gap-1 text-[11px] mb-1"
            style={{ color: "oklch(0.55 0.03 100)" }}
          >
            <MapPin className="h-3 w-3 shrink-0" style={{ color: "oklch(0.55 0.08 122)" }} />
            {worker.city}
          </p>
        )}

        {/* Note */}
        {worker.note && (
          <p
            className="text-[11px] line-clamp-1 mb-1"
            style={{ color: "oklch(0.60 0.03 100)" }}
          >
            {worker.note}
          </p>
        )}

        {/* Time remaining */}
        <div
          className="flex items-center gap-1 text-[11px] mt-1.5 pt-1.5"
          style={{
            borderTop: "1px solid oklch(0.93 0.03 91.6)",
            color: "oklch(0.45 0.12 145)",
          }}
        >
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span className="font-semibold">{timeUntil(worker.availableUntil)}</span>
        </div>
      </div>
    </motion.div>
  );
}

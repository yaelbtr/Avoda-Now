import { motion } from "framer-motion";
import { HardHat, MapPin, Clock } from "lucide-react";

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

// Deterministic avatar color based on userId
function getAvatarColors(userId: number) {
  const palettes = [
    { from: "oklch(0.55 0.22 160)", to: "oklch(0.45 0.20 155)", text: "oklch(0.75 0.18 160)" },
    { from: "oklch(0.55 0.12 76.7)", to: "oklch(0.45 0.13 76.7)", text: "oklch(0.75 0.12 76.7)" },
    { from: "oklch(0.60 0.22 25)",  to: "oklch(0.50 0.20 30)",  text: "oklch(0.80 0.18 25)"  },
    { from: "oklch(0.58 0.22 300)", to: "oklch(0.48 0.20 305)", text: "oklch(0.78 0.18 300)" },
    { from: "oklch(0.62 0.20 65)",  to: "oklch(0.52 0.18 70)",  text: "oklch(0.82 0.16 65)"  },
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ scale: 1.03, y: -3 }}
      className="w-full text-right rounded-2xl p-3 overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, oklch(0.14 0.03 165) 0%, oklch(0.12 0.025 175) 100%)",
        border: `1px solid oklch(0.65 0.22 160 / 0.25)`,
        boxShadow: "0 4px 20px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.06)",
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute -top-5 -right-5 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.22 160 / 0.15) 0%, transparent 70%)" }}
      />

      {/* Avatar + status badge */}
      <div className="flex items-start justify-between mb-2 relative">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
            boxShadow: `0 0 12px ${colors.from}55`,
          }}
        >
          {initials || <HardHat className="h-4 w-4" />}
        </div>
        <span
          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.65 0.22 160 / 0.18)",
            color: "oklch(0.75 0.18 160)",
            border: "1px solid oklch(0.65 0.22 160 / 0.3)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "oklch(0.75 0.18 160)" }}
          />
          זמין
        </span>
      </div>

      {/* Name */}
      <h3 className="font-bold text-sm text-white leading-snug mb-0.5 line-clamp-1">
        {worker.userName ?? "עובד זמין"}
      </h3>

      {/* Location */}
      {worker.city && (
        <p className="flex items-center gap-1 text-xs text-white/45 mb-1.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {worker.city}
        </p>
      )}

      {/* Note */}
      {worker.note && (
        <p className="text-xs text-white/35 line-clamp-1 mb-1.5">
          {worker.note}
        </p>
      )}

      {/* Time remaining */}
      <p className="flex items-center gap-1 text-xs mt-1" style={{ color: colors.text }}>
        <Clock className="h-3 w-3 shrink-0" />
        {timeUntil(worker.availableUntil)}
      </p>
    </motion.div>
  );
}

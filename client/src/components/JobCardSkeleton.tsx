import { motion } from "framer-motion";

// ── Design tokens (mirrors JobCard) ──────────────────────────────────────────
const C_BORDER = "oklch(0.87 0.04 84.0 / 0.5)";
const C_SURFACE = "#ffffff";
const S_CARD = "0 1px 4px rgba(0,0,0,0.06)";
const C_SHIMMER_BASE = "oklch(0.93 0.02 122)";

// ── Shimmer block ─────────────────────────────────────────────────────────────
function Shimmer({
  width = "100%",
  height = 14,
  rounded = "0.5rem",
  className = "",
  delay = 0,
  style = {},
}: {
  width?: string | number;
  height?: number;
  rounded?: string;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: rounded,
        background: C_SHIMMER_BASE,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        ...style,
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.55) 65%, transparent 100%)",
          backgroundSize: "300% 100%",
        }}
        animate={{ backgroundPosition: ["300% 0", "-300% 0"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay }}
      />
    </div>
  );
}

// ── Full JobCard skeleton — mirrors the "default" card variant (new 2×2 design) ──
export default function JobCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
      className="rounded-2xl relative overflow-hidden"
      style={{
        background: C_SURFACE,
        border: `1px solid ${C_BORDER}`,
        boxShadow: S_CARD,
      }}
      dir="rtl"
    >
      <div className="p-5 flex flex-col gap-4">
        {/* ── Row 1: Header — title + badges + action icons ── */}
        <div className="flex items-start justify-between gap-3">
          {/* Right: title + badge row */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Badge row inline with title */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Title */}
              <Shimmer width="55%" height={20} rounded="0.4rem" delay={delay} />
              {/* One status badge */}
              <Shimmer width={52} height={20} rounded="9999px" delay={delay} />
            </div>
            {/* Business name */}
            <Shimmer width="38%" height={13} rounded="0.35rem" delay={delay} />
          </div>

          {/* Left: bookmark + share icon buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Shimmer width={32} height={32} rounded="9999px" delay={delay} />
            <Shimmer width={32} height={32} rounded="9999px" delay={delay} />
          </div>
        </div>

        {/* ── Row 2: Details grid 2×2 ── */}
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
          {/* Location */}
          <div className="flex items-center gap-1.5">
            <Shimmer width={16} height={16} rounded="9999px" delay={delay} />
            <Shimmer width="70%" height={13} rounded="0.35rem" delay={delay} />
          </div>
          {/* Salary */}
          <div className="flex items-center gap-1.5">
            <Shimmer width={16} height={16} rounded="9999px" delay={delay} />
            <Shimmer width="65%" height={13} rounded="0.35rem" delay={delay} />
          </div>
          {/* Date */}
          <div className="flex items-center gap-1.5">
            <Shimmer width={16} height={16} rounded="9999px" delay={delay} />
            <Shimmer width="55%" height={13} rounded="0.35rem" delay={delay} />
          </div>
          {/* Time slot */}
          <div className="flex items-center gap-1.5">
            <Shimmer width={16} height={16} rounded="9999px" delay={delay} />
            <Shimmer width="60%" height={13} rounded="0.35rem" delay={delay} />
          </div>
        </div>

        {/* ── Footer: full-width apply button ── */}
        <Shimmer
          width="100%"
          height={48}
          rounded="0.75rem"
          delay={delay}
          style={{ background: "oklch(0.88 0.04 100)" }}
        />
      </div>
    </motion.div>
  );
}

// ── Carousel tile skeleton ────────────────────────────────────────────────────
export function CarouselJobCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
      style={{
        background: "#ffffff",
        border: "1px solid oklch(0.87 0.04 84.0)",
        borderRadius: "1rem",
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        width: 210,
        flexShrink: 0,
      }}
      dir="rtl"
    >
      {/* Image area */}
      <Shimmer width="100%" height={110} rounded="0" delay={delay} />

      {/* Content area */}
      <div style={{ padding: "12px" }}>
        <Shimmer width={80} height={18} rounded="9999px" className="mb-2" delay={delay} />
        <Shimmer width="85%" height={14} className="mb-1" delay={delay} />
        <Shimmer width="60%" height={14} className="mb-3" delay={delay} />
        <Shimmer width="70%" height={12} className="mb-3" delay={delay} />
        <div className="flex items-center justify-between">
          <Shimmer width={60} height={30} rounded="0.75rem" delay={delay} />
          <Shimmer width={30} height={30} rounded="0.75rem" delay={delay} />
        </div>
      </div>
    </motion.div>
  );
}

// ── List of N skeletons with staggered entrance ───────────────────────────────
export function JobCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <JobCardSkeleton key={i} delay={i * 0.07} />
      ))}
    </div>
  );
}

// ── Carousel row of N skeletons ───────────────────────────────────────────────
export function CarouselSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <CarouselJobCardSkeleton key={i} delay={i * 0.07} />
      ))}
    </div>
  );
}

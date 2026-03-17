import { motion } from "framer-motion";

// ── Design tokens (mirrors JobCard) ──────────────────────────────────────────
const C_BORDER = "oklch(0.87 0.04 84.0)";
const C_SURFACE = "#ffffff";
const S_CARD = "0 1px 4px oklch(0.38 0.07 125.0 / 0.06)";

// ── Shimmer block ─────────────────────────────────────────────────────────────
// Each block has its own shimmer sweep so they all animate in sync.
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
        background: "oklch(0.93 0.02 122)",
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

// ── Full JobCard skeleton — mirrors the "default" card variant ────────────────
export default function JobCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: C_SURFACE,
        border: `1px solid ${C_BORDER}`,
        boxShadow: S_CARD,
      }}
      dir="rtl"
    >
      {/* ── Header: category icon + title/badges + salary ── */}
      <div className="flex items-start justify-between gap-3 mb-2">
        {/* Category icon placeholder */}
        <Shimmer width={44} height={44} rounded="0.75rem" delay={delay} />

        {/* Title + badge row */}
        <div className="flex-1 min-w-0 space-y-2">
          <Shimmer width="62%" height={15} delay={delay} />
          {/* Badges row */}
          <div className="flex gap-1.5">
            <Shimmer width={52} height={18} rounded="9999px" delay={delay} />
            <Shimmer width={64} height={18} rounded="9999px" delay={delay} />
          </div>
        </div>

        {/* Salary placeholder */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <Shimmer width={70} height={16} delay={delay} />
          <Shimmer width={50} height={11} delay={delay} />
        </div>
      </div>

      {/* ── Meta chips row (location · category · time · date) ── */}
      <div
        className="flex flex-wrap gap-x-3 gap-y-1.5 py-2 mb-2"
        style={{
          borderTop: "1px solid oklch(0.93 0.03 91.6)",
          borderBottom: "1px solid oklch(0.93 0.03 91.6)",
        }}
      >
        <Shimmer width={90} height={14} delay={delay} />
        <Shimmer width={60} height={18} rounded="9999px" delay={delay} />
        <Shimmer width={70} height={14} delay={delay} />
        <Shimmer width={56} height={18} rounded="9999px" delay={delay} />
      </div>

      {/* ── Time row ── */}
      <div className="flex items-center justify-between mb-3">
        <Shimmer width={80} height={11} delay={delay} />
      </div>

      {/* ── Action buttons row ── */}
      <div className="flex items-center gap-2 w-full">
        <Shimmer width={80} height={34} rounded="9999px" delay={delay} />
        <Shimmer width={36} height={34} rounded="0.75rem" delay={delay} />
        <Shimmer width={36} height={34} rounded="0.75rem" delay={delay} />
        <div className="flex-1" />
        <Shimmer width={36} height={34} rounded="0.75rem" delay={delay} />
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

import { motion } from "framer-motion";
import { C_BORDER, C_SURFACE_HEX, S_CARD } from "@/lib/colors";

// ── Shimmer block ─────────────────────────────────────────────────────────────
// Each block has its own shimmer sweep so they all animate in sync.
function Shimmer({
  width = "100%",
  height = 14,
  rounded = "0.5rem",
  className = "",
  delay = 0,
}: {
  width?: string | number;
  height?: number;
  rounded?: string;
  className?: string;
  delay?: number;
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

// ── Full JobCard skeleton ─────────────────────────────────────────────────────
export default function JobCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
      style={{
        background: C_SURFACE_HEX,
        border: `1px solid ${C_BORDER}`,
        borderRadius: "1rem",
        padding: "1rem",
        boxShadow: S_CARD,
      }}
      dir="rtl"
    >
      {/* Top row: icon + title + badge */}
      <div className="flex items-start gap-3 mb-3">
        {/* Category icon placeholder */}
        <Shimmer width={44} height={44} rounded="0.75rem" delay={delay} />

        <div className="flex-1 space-y-2">
          {/* Title */}
          <Shimmer width="62%" height={16} delay={delay} />
          {/* Business name */}
          <Shimmer width="38%" height={12} delay={delay} />
          {/* Badges row */}
          <div className="flex gap-2 pt-1">
            <Shimmer width={64} height={20} rounded="9999px" delay={delay} />
            <Shimmer width={52} height={20} rounded="9999px" delay={delay} />
          </div>
        </div>

        {/* Urgent badge placeholder */}
        <Shimmer width={56} height={22} rounded="9999px" delay={delay} />
      </div>

      {/* Info chips grid: location, time, salary, workers */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Shimmer height={38} rounded="0.75rem" delay={delay} />
        <Shimmer height={38} rounded="0.75rem" delay={delay} />
        <Shimmer height={38} rounded="0.75rem" delay={delay} />
        <Shimmer height={38} rounded="0.75rem" delay={delay} />
      </div>

      {/* Description lines */}
      <div className="space-y-2 mb-4">
        <Shimmer width="100%" height={11} delay={delay} />
        <Shimmer width="75%" height={11} delay={delay} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Shimmer width="50%" height={38} rounded="0.75rem" delay={delay} />
        <Shimmer width="25%" height={38} rounded="0.75rem" delay={delay} />
        <Shimmer width="25%" height={38} rounded="0.75rem" delay={delay} />
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

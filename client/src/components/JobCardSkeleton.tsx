import { motion } from "framer-motion";
import { C_BORDER, C_SHIMMER_BASE, C_SURFACE_HEX, S_CARD } from "@/lib/colors";

// ── Shimmer block (light theme) ───────────────────────────────────────────────
function Shimmer({
  width = "100%",
  height = 14,
  rounded = "0.5rem",
  className = "",
}: {
  width?: string | number;
  height?: number;
  rounded?: string;
  className?: string;
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
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 60%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ── Full JobCard skeleton ─────────────────────────────────────────────────────
export default function JobCardSkeleton() {
  return (
    <div
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
        <Shimmer width={44} height={44} rounded="0.75rem" />

        <div className="flex-1 space-y-2">
          {/* Title */}
          <Shimmer width="65%" height={16} />
          {/* Business name */}
          <Shimmer width="40%" height={12} />
          {/* Badges row */}
          <div className="flex gap-2 pt-1">
            <Shimmer width={64} height={20} rounded="9999px" />
            <Shimmer width={52} height={20} rounded="9999px" />
          </div>
        </div>

        {/* Urgent badge placeholder */}
        <Shimmer width={56} height={22} rounded="9999px" />
      </div>

      {/* Meta row: location, time, salary */}
      <div className="flex flex-wrap gap-3 mb-3">
        <Shimmer width={90} height={12} />
        <Shimmer width={70} height={12} />
        <Shimmer width={80} height={12} />
      </div>

      {/* Description lines */}
      <div className="space-y-2 mb-4">
        <Shimmer width="100%" height={11} />
        <Shimmer width="80%" height={11} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Shimmer width="50%" height={36} rounded="0.75rem" />
        <Shimmer width="25%" height={36} rounded="0.75rem" />
        <Shimmer width="25%" height={36} rounded="0.75rem" />
      </div>
    </div>
  );
}

// ── Carousel tile skeleton (matches new CarouselJobCard design) ───────────────
export function CarouselJobCardSkeleton() {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e8e8e8",
        borderRadius: "1rem",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -6px rgba(0,0,0,0.05)",
        width: 288,
        flexShrink: 0,
      }}
      dir="rtl"
    >
      {/* Image area */}
      <Shimmer width="100%" height={200} rounded="0" />

      {/* Content area */}
      <div style={{ padding: "0 20px 20px", position: "relative", paddingTop: 44 }}>
        {/* Floating icon placeholder */}
        <div
          style={{
            position: "absolute",
            top: -36,
            right: 20,
            width: 72,
            height: 72,
            borderRadius: "0.75rem",
            background: "#ffffff",
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            border: "1px solid #f0f0f0",
            overflow: "hidden",
          }}
        >
          <Shimmer width="100%" height={72} rounded="0" />
        </div>

        {/* Title */}
        <Shimmer width="75%" height={20} className="mb-2" />
        <Shimmer width="50%" height={14} className="mb-4" />

        {/* Divider */}
        <div style={{ borderTop: "1px solid #f0f0f0", marginBottom: 16 }} />

        {/* Time + salary row */}
        <div className="flex items-center justify-between mb-4">
          <Shimmer width={90} height={34} rounded="0.5rem" />
          <Shimmer width={70} height={22} />
        </div>

        {/* CTA button */}
        <Shimmer width="100%" height={48} rounded="0.75rem" />
      </div>
    </div>
  );
}

// ── List of N skeletons ───────────────────────────────────────────────────────
export function JobCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <JobCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function CarouselSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07, duration: 0.3 }}
        >
          <CarouselJobCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

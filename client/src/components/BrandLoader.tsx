import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { C_BRAND, C_BRAND_LIGHT, C_BRAND_MID, C_PAGE_BG } from "@/lib/colors";

const BLUE = C_BRAND;
const BLUE_LIGHT = C_BRAND_LIGHT;
const BLUE_MID = C_BRAND_MID;

interface BrandLoaderProps {
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Show label text below */
  label?: string;
  /** Full-page overlay mode */
  fullPage?: boolean;
}

/**
 * Branded YallaAvoda loading indicator.
 * - sm: inline spinner replacement (32px)
 * - md: section loader (56px) — default
 * - lg: full-page loader (80px)
 */
export default function BrandLoader({ size = "md", label, fullPage = false }: BrandLoaderProps) {
  const dim = size === "xs" ? 14 : size === "sm" ? 32 : size === "lg" ? 80 : 56;
  const iconSize = size === "xs" ? 6 : size === "sm" ? 14 : size === "lg" ? 32 : 22;
  const ringWidth = size === "xs" ? 1.5 : size === "sm" ? 2.5 : size === "lg" ? 4 : 3;

  const inner = (
    <div className="flex flex-col items-center gap-3">
      {/* Outer shimmer ring */}
      <div className="relative" style={{ width: dim, height: dim }}>
        {/* Pulsing background glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: BLUE_LIGHT }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning arc */}
        <svg
          className="absolute inset-0"
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={dim / 2 - ringWidth - 2}
            fill="none"
            stroke={BLUE_LIGHT}
            strokeWidth={ringWidth}
          />
          {/* Animated arc */}
          <motion.circle
            cx={dim / 2}
            cy={dim / 2}
            r={dim / 2 - ringWidth - 2}
            fill="none"
            stroke={BLUE}
            strokeWidth={ringWidth}
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * (dim - 2 * ringWidth - 4) * 0.65} ${Math.PI * (dim - 2 * ringWidth - 4)}`}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${dim / 2}px ${dim / 2}px` }}
          />
        </svg>

        {/* Center icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{ background: "oklch(1 0 0)", margin: ringWidth + 4 }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Briefcase style={{ width: iconSize, height: iconSize, color: BLUE }} />
        </motion.div>
      </div>

      {/* Shimmer label */}
      {label && (
        <motion.div
          className="relative overflow-hidden rounded-full px-4 py-1"
          style={{
            background: BLUE_LIGHT,
            fontSize: size === "sm" ? "0.7rem" : "0.82rem",
            color: BLUE,
            fontWeight: 600,
          }}
        >
          {label}
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, oklch(1 0 0 / 0.55) 50%, transparent 70%)",
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
          />
        </motion.div>
      )}

      {/* Dot trail */}
      {!label && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: size === "sm" ? 4 : 5,
                height: size === "sm" ? 4 : 5,
                background: BLUE_MID,
              }}
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: C_PAGE_BG }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {inner}
      </motion.div>
    );
  }

  return inner;
}

/** Convenience: centered section loader */
export function SectionLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 w-full">
      <BrandLoader size="md" label={label ?? "טוען..."} />
    </div>
  );
}

/** Convenience: full-page loader with AnimatePresence support */
export function PageLoader({ label }: { label?: string }) {
  return <BrandLoader size="lg" label={label ?? "טוען..."} fullPage />;
}
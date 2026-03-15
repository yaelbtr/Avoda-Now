import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";

/**
 * AvodaNow Logo — two variants:
 *
 * "dark"  → for dark backgrounds (Navbar, dark sections)
 *   - Icon box: dark olive gradient (oklch 0.50→0.36)
 *   - "Avoda" text: var(--header-fg) / near-white
 *   - "Now" text: var(--citrus) gold
 *   - Tagline: near-white 40% opacity
 *
 * "light" → for light/cream backgrounds (modals, cards, login sheets, white pages)
 *   - Icon box: same olive gradient (consistent brand)
 *   - "Avoda" text: dark olive #3d4a28
 *   - "Now" text: var(--citrus) gold
 *   - Tagline: dark olive 55% opacity
 */

interface AppLogoProps {
  /** "dark" for dark nav/section backgrounds; "light" for cream/white backgrounds */
  variant?: "dark" | "light";
  /** "sm" for modal headers; "md" for Navbar / default */
  size?: "sm" | "md";
  /** Whether to animate the icon on hover */
  animated?: boolean;
  className?: string;
}

export function AppLogo({
  variant = "dark",
  size = "md",
  animated = true,
  className = "",
}: AppLogoProps) {
  const isSm = size === "sm";
  const isLight = variant === "light";

  // ── Color tokens ──────────────────────────────────────────────
  const textColor  = isLight ? "#3d4a28"                        : "var(--header-fg, #e8eae5)";
  const tagColor   = isLight ? "oklch(0.38 0.08 122 / 0.55)"   : "oklch(0.9904 0.0107 95.3 / 0.40)";
  const shadowBox  = isLight
    ? "0 2px 10px oklch(0 0 0 / 0.18), inset 0 1px 0 oklch(1 0 0 / 0.15)"
    : "0 2px 10px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)";

  // ── Icon box ──────────────────────────────────────────────────
  const iconBox = (
    <div
      className={`${isSm ? "w-7 h-7" : "w-8 h-8"} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{
        background: "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
        boxShadow: shadowBox,
      }}
    >
      <Briefcase
        className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"}
        style={{ color: "var(--citrus, #c8a84b)" }}
      />
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {animated ? (
        <motion.div
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {iconBox}
        </motion.div>
      ) : (
        iconBox
      )}

      <div className="flex flex-col leading-none">
        <span
          lang="en"
          className={`font-black tracking-tight ${isSm ? "text-[15px]" : "text-[17px]"}`}
          style={{
            color: textColor,
            fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
            letterSpacing: "-0.03em",
          }}
        >
          Avoda<span style={{ color: "var(--citrus, #c8a84b)" }}>Now</span>
        </span>
        <span
          className={`font-bold tracking-widest uppercase ${isSm ? "text-[6px]" : "text-[7px]"}`}
          style={{ color: tagColor, letterSpacing: "0.14em" }}
        >
          עבודה עכשיו
        </span>
      </div>
    </div>
  );
}

export default AppLogo;

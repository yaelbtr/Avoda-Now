import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";

interface AppLogoProps {
  /** Size variant — "sm" for modal headers, "md" for default Navbar size */
  size?: "sm" | "md";
  /** Whether to animate the icon on hover */
  animated?: boolean;
  className?: string;
}

/**
 * Shared AvodaNow logo component.
 * Matches the Navbar logo exactly: briefcase icon + "AvodaNow" text + "עבודה עכשיו" tagline.
 *
 * Usage:
 *   <AppLogo />                  — default (md) size, animated
 *   <AppLogo size="sm" />        — compact size for modal headers
 *   <AppLogo animated={false} /> — static (no hover animation)
 */
export function AppLogo({ size = "md", animated = true, className = "" }: AppLogoProps) {
  const isSm = size === "sm";

  const iconBox = (
    <div
      className={`${isSm ? "w-7 h-7" : "w-8 h-8"} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{
        background: "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
        boxShadow: "0 2px 10px oklch(0 0 0 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.15)",
      }}
    >
      <Briefcase className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} style={{ color: "var(--citrus, #c8a84b)" }} />
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
            color: "#556b2f",
            fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
            letterSpacing: "-0.03em",
          }}
        >
          Avoda<span style={{ color: "var(--citrus, #c8a84b)" }}>Now</span>
        </span>
        <span
          className={`font-bold tracking-widest uppercase ${isSm ? "text-[6px]" : "text-[7px]"}`}
          style={{ color: "oklch(0.45 0.08 122 / 0.65)", letterSpacing: "0.14em" }}
        >
          עבודה עכשיו
        </span>
      </div>
    </div>
  );
}

export default AppLogo;

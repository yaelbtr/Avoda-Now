import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

type AnimatedBorderButtonProps = React.ComponentProps<typeof motion.button> & {
  borderRadius?: number;
  glowColor?: string;
};

export function AnimatedBorderButton({
  children,
  className,
  borderRadius = 24,
  glowColor = "var(--citrus)",
  ...props
}: AnimatedBorderButtonProps) {
  return (
    <motion.button
      className={cn("relative inline-flex items-center justify-center", className)}
      {...props}
    >
      {/* גבול אנימציה רץ על שפת הכפתור */}
      <div
        className="pointer-events-none absolute -inset-px border-2 border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
        style={{ borderRadius: borderRadius + 2 }}
      >
        <motion.div
          className="absolute aspect-square"
          style={{
            width: 32,
            background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
            offsetPath: `rect(0 auto auto 0 round ${borderRadius}px)`,
          }}
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />
      </div>
      {children}
    </motion.button>
  );
}

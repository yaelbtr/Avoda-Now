import { motion } from "framer-motion";
import LogoLight from "@/assets/logo-light.svg";

interface AppLogoProps {
  variant?: "dark" | "light";
  size?: "xs" | "sm" | "md";
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { width: 150, height: 26 },
  sm: { width: 178, height: 32 },
  md: { width: 220, height: 40 },
} as const;

export function AppLogo({
  variant = "dark",
  size = "md",
  animated = true,
  className = "",
}: AppLogoProps) {
  const dimensions = SIZE_MAP[size];
  const filter = variant === "light"
    ? "brightness(0) saturate(100%)"
    : undefined;
  const image = (
    <div
      className="relative overflow-hidden"
      style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px`, maxWidth: "100%" }}
    >
      <img
        src={LogoLight}
        alt="AvodaGo"
        className="absolute inset-0 h-full w-full select-none object-contain"
        style={{
          objectPosition: "center center",
          transformOrigin: "center center",
          filter,
        }}
        data-variant={variant}
        draggable={false}
      />
    </div>
  );

  return (
    <div className={`flex items-center justify-center flex-shrink-0 ${className}`}>
      {animated ? (
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="flex items-center justify-center"
        >
          {image}
        </motion.div>
      ) : (
        <div className="flex items-center justify-center">
          {image}
        </div>
      )}
    </div>
  );
}

export default AppLogo;

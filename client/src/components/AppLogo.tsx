import { motion } from "framer-motion";
import FullLogo from "@/assets/full logo1.svg";

interface AppLogoProps {
  variant?: "dark" | "light";
  size?: "xs" | "sm" | "md";
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { width: 150, height: 34, scale: 1.55 },
  sm: { width: 178, height: 38, scale: 1.65 },
  md: { width: 230, height: 48, scale: 1.55 },
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
        src={FullLogo}
        alt="AvodaGo"
        className="absolute inset-0 h-full w-full select-none object-contain"
        style={{
          objectPosition: "center center",
          transformOrigin: "center center",
          transform: `scale(${dimensions.scale})`,
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

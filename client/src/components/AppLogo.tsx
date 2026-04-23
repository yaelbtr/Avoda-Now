import { motion } from "framer-motion";
import yallaAvodaLogo from "@/assets/לוגו - source.svg";

interface AppLogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md";
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { width: 400, height: 47 },
  md: { width: 250, height: 58 },
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
        src={yallaAvodaLogo}
        alt="Yalla Avoda"
        className="absolute inset-0 h-full w-full select-none object-cover"
        style={{
          objectPosition: "center center",
          transform: "scale(1.27)",
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

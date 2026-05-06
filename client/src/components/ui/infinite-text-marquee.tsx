import * as React from "react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type InfiniteTextMarqueeProps = {
  text?: string;
  href?: string;
  speed?: number;
  showTooltip?: boolean;
  tooltipText?: string;
  fontSize?: string;
  textColor?: string;
  hoverColor?: string;
};

export const InfiniteTextMarquee: React.FC<InfiniteTextMarqueeProps> = ({
  text = "Let's Get Started",
  href,
  speed = 30,
  showTooltip = true,
  tooltipText = "Time to Flex 💪",
  fontSize = "8rem",
  textColor = "",
  hoverColor = "",
}) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);
  const maxRotation = 8;

  useEffect(() => {
    if (!showTooltip) return;
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      const midpoint = window.innerWidth / 2;
      const distance = Math.abs(e.clientX - midpoint);
      const rot = (distance / midpoint) * maxRotation;
      setRotation(e.clientX > midpoint ? rot : -rot);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [showTooltip]);

  const repeatedText = Array(10).fill(text).join(" - ") + " -";

  const inner = (
    <span
      style={{
        fontSize,
        color: textColor || undefined,
        cursor: href ? "pointer" : "default",
      }}
      className={`font-bold tracking-tight py-10 m-0 transition-colors ${
        !textColor ? "text-black dark:text-white" : ""
      }`}
      onMouseEnter={() => hoverColor && (document.body.style.setProperty("--marquee-hover", hoverColor))}
    >
      {repeatedText}
    </span>
  );

  return (
    <>
      {showTooltip && (
        <div
          className={`fixed z-[99] pointer-events-none transition-opacity duration-300 font-bold px-12 py-6 rounded-3xl whitespace-nowrap bg-primary text-primary-foreground ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          style={{
            top: cursorPosition.y,
            left: cursorPosition.x,
            transform: `rotateZ(${rotation}deg) translate(-50%, -140%)`,
          }}
        >
          {tooltipText}
        </div>
      )}

      <div className="relative overflow-hidden w-full">
        <motion.div
          className="whitespace-nowrap"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: speed, ease: "linear" }}
        >
          {href ? (
            <a href={href} style={{ textDecoration: "none" }}>
              {inner}
            </a>
          ) : (
            inner
          )}
        </motion.div>
      </div>
    </>
  );
};

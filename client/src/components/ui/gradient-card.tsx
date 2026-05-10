'use client'
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface GradientCardProps {
  Icon: LucideIcon;
  title: string;
  desc: string;
}

export function GradientCard({ Icon, title, desc }: GradientCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotation({
      x: -(y / rect.height) * 6,
      y: (x / rect.width) * 6,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative rounded-[18px] overflow-hidden w-full"
      style={{
        minHeight: 160,
        transformStyle: "preserve-3d",
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        border: "1px solid rgba(255, 255, 255, 0.70)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80), 0 8px 24px rgba(49, 59, 21, 0.08)",
      }}
      animate={{
        y: isHovered ? -4 : 0,
        rotateX: rotation.x,
        rotateY: rotation.y,
        boxShadow: isHovered
          ? "inset 0 1px 0 rgba(255,255,255,0.90), 0 16px 36px rgba(49, 59, 21, 0.13)"
          : "inset 0 1px 0 rgba(255,255,255,0.80), 0 8px 24px rgba(49, 59, 21, 0.08)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* הילה עליונה-שמאלית */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.30) 0%, transparent 55%)",
          zIndex: 1,
        }}
      />

      {/* תוכן */}
      <div
        className="relative flex flex-col items-center justify-center gap-3 p-5 text-center h-full"
        style={{ zIndex: 10 }}
      >
        <motion.div
          animate={{ y: isHovered ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 22 }}
        >
          <Icon size={24} strokeWidth={2.2} style={{ color: "oklch(0.42 0.08 130)" }} />
        </motion.div>

        <div className="flex flex-col items-center gap-1">
          <h3
            className="text-base font-semibold leading-tight"
            style={{ color: "#1b1c1a", fontFamily: "var(--font-editorial-ui)" }}
          >
            {title}
          </h3>
          <p
            className="text-sm leading-snug"
            style={{ color: "rgba(70, 72, 61, 0.80)" }}
          >
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

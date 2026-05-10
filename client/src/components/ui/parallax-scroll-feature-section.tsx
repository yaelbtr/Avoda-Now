import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParallaxFeatureItem {
  id: number;
  stepLabel: string;
  title: string;
  description: string;
  imageUrl: string;
  reverse: boolean;
}

// קומפוננט נפרד לכל שלב - פותר את בעיית hooks בתוך לולאה
function ParallaxStep({ item }: { item: ParallaxFeatureItem }) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 1]);
  const clipPath = useTransform(
    scrollYProgress,
    [0, 0.5],
    ["inset(0 80% 0 0)", "inset(0 0% 0 0)"]
  );
  const y = useTransform(scrollYProgress, [0, 1], [-30, 0]);

  return (
    <div
      ref={ref}
      dir="rtl"
      className={cn(
        "min-h-[70vh] flex items-center justify-center gap-10 md:gap-24 px-6 md:px-16",
        item.reverse ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* טקסט */}
      <motion.div style={{ y }} className="flex flex-col gap-4 max-w-xs">
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: "var(--citrus-on-light)" }}
        >
          שלב {item.stepLabel}
        </span>
        <h3
          className="text-2xl md:text-3xl font-bold leading-snug"
          style={{ color: "var(--olive)", fontFamily: "var(--font-editorial-headline)" }}
        >
          {item.title}
        </h3>
        <p
          className="text-base leading-relaxed"
          style={{ color: "var(--editorial-on-surface-variant)" }}
        >
          {item.description}
        </p>
      </motion.div>

      {/* תמונה עם אנימציית reveal */}
      <motion.div
        style={{ opacity, clipPath }}
        className="shrink-0"
      >
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-44 h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 object-cover rounded-2xl shadow-lg"
        />
      </motion.div>
    </div>
  );
}

interface ParallaxScrollFeatureSectionProps {
  items: ParallaxFeatureItem[];
  className?: string;
}

export function ParallaxScrollFeatureSection({
  items,
  className,
}: ParallaxScrollFeatureSectionProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item) => (
        <ParallaxStep key={item.id} item={item} />
      ))}
    </div>
  );
}

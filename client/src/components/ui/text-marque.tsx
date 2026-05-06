import { useRef, useEffect, forwardRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useAnimationFrame,
  useMotionValue,
} from "framer-motion";
import { wrap } from "@motionone/utils";
import { cn } from "@/lib/utils";

interface TextMarqueeProps {
  children: ReactNode;
  baseVelocity: number;
  clasname?: string;
  scrollDependent?: boolean;
  delay?: number;
  startFromRight?: boolean;
}

const TextMarquee = forwardRef<HTMLDivElement, TextMarqueeProps>(({
  children,
  baseVelocity = -5,
  clasname,
  scrollDependent = false,
  delay = 0,
  startFromRight = false,
}, ref) => {
  const baseX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLSpanElement>(null);
  const [loopWidth, setLoopWidth] = useState(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 2], {
    clamp: false,
  });

  const x = useTransform(baseX, (v) => {
    if (!startFromRight) {
      return `${wrap(-20, -45, v)}%`;
    }

    if (loopWidth <= 0) {
      return "0px";
    }

    const loopDistance = (((Math.abs(v) % loopWidth) + loopWidth) % loopWidth);
    if (baseVelocity > 0) {
      return `${loopDistance - loopWidth}px`;
    }

    return `-${loopDistance}px`;
  });

  const directionFactor = useRef<number>(1);
  const hasStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      hasStarted.current = true;
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!startFromRight) return;

    const measureLoopWidth = () => {
      const container = containerRef.current;
      const track = trackRef.current;
      const firstItem = firstItemRef.current;
      if (!container || !track || !firstItem) return;

      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      setLoopWidth(Math.max(container.offsetWidth, firstItem.scrollWidth) + gap);
    };

    measureLoopWidth();

    const observer = new ResizeObserver(measureLoopWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    if (firstItemRef.current) observer.observe(firstItemRef.current);

    return () => observer.disconnect();
  }, [startFromRight]);

  useAnimationFrame((_t, delta) => {
    if (!hasStarted.current) return;

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (startFromRight) {
      moveBy *= 10;
    }

    if (scrollDependent) {
      if (velocityFactor.get() < 0) {
        directionFactor.current = -1;
      } else if (velocityFactor.get() > 0) {
        directionFactor.current = 1;
      }
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      dir="ltr"
      className="overflow-hidden whitespace-nowrap flex flex-nowrap"
    >
      <motion.div
        ref={trackRef}
        className="flex whitespace-nowrap gap-10 flex-nowrap"
        style={{ x }}
      >
        <span
          ref={firstItemRef}
          dir="rtl"
          className={cn("block shrink-0 text-[8vw]", startFromRight && "min-w-full text-right", clasname)}
        >
          {children}
        </span>
        <span dir="rtl" className={cn("block shrink-0 text-[8vw]", startFromRight && "min-w-full text-right", clasname)}>{children}</span>
        <span dir="rtl" className={cn("block shrink-0 text-[8vw]", startFromRight && "min-w-full text-right", clasname)}>{children}</span>
        <span dir="rtl" className={cn("block shrink-0 text-[8vw]", startFromRight && "min-w-full text-right", clasname)}>{children}</span>
      </motion.div>
    </div>
  );
});

TextMarquee.displayName = "TextMarquee";

export default TextMarquee;

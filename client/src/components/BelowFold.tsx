/**
 * BelowFold — deferred hydration for below-the-fold sections.
 *
 * Strategy (Step 6 + 7 of react-performance-optimization skill):
 *   1. Uses IntersectionObserver to detect when the section enters the viewport.
 *   2. On first intersection, schedules render via requestIdleCallback so it
 *      never competes with the critical rendering path.
 *   3. Until then, renders a lightweight placeholder (skeleton height) so the
 *      layout doesn't shift when content appears.
 *
 * Usage:
 *   <BelowFold minHeight="200px" skeleton={<MySkeleton />}>
 *     <HeavySection />
 *   </BelowFold>
 *
 * DRY note: this is the single shared implementation — do not duplicate
 * IntersectionObserver + requestIdleCallback patterns elsewhere.
 */
import { useEffect, useRef, useState } from "react";

interface BelowFoldProps {
  children: React.ReactNode;
  /** Minimum height to reserve before content loads (prevents layout shift). */
  minHeight?: string;
  /** Optional skeleton shown while waiting for intersection. */
  skeleton?: React.ReactNode;
  /** IntersectionObserver rootMargin — how far before viewport to trigger. */
  rootMargin?: string;
}

// Polyfill for Safari which lacks requestIdleCallback
const scheduleIdle: (cb: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) =>
        (
          window as Window & {
            requestIdleCallback: (cb: () => void) => void;
          }
        ).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 100);

export default function BelowFold({
  children,
  minHeight = "100px",
  skeleton,
  rootMargin = "200px 0px",
}: BelowFoldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If the element is already in view on mount (e.g. short pages), render immediately
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Defer actual render to idle time so it doesn't block paint
          scheduleIdle(() => setShouldRender(true));
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (shouldRender) {
    return <>{children}</>;
  }

  return (
    <div
      ref={ref}
      style={{ minHeight }}
      aria-hidden="true"
    >
      {skeleton ?? null}
    </div>
  );
}

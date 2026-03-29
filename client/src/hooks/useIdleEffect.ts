/**
 * useIdleEffect — runs a side-effect when the browser is idle.
 *
 * Step 6 of react-performance-optimization skill: deferred hydration.
 * Use this instead of useEffect for non-critical initializations that
 * should not compete with the critical rendering path.
 *
 * @example
 *   useIdleEffect(() => {
 *     initHeavyLibrary();
 *   }, []);
 */
import { useEffect } from "react";

type Cleanup = (() => void) | void;

const scheduleIdle: (cb: () => void) => ReturnType<typeof setTimeout> =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) =>
        (
          window as Window & {
            requestIdleCallback: (cb: () => void) => number;
          }
        ).requestIdleCallback(cb) as unknown as ReturnType<typeof setTimeout>
    : (cb) => setTimeout(cb, 100);

const cancelIdle: (id: ReturnType<typeof setTimeout>) => void =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? (id) =>
        (
          window as Window & { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback(id as unknown as number)
    : (id) => clearTimeout(id);

export function useIdleEffect(
  effect: () => Cleanup,
  deps: React.DependencyList
): void {
  useEffect(() => {
    let cleanup: Cleanup;
    const id = scheduleIdle(() => {
      cleanup = effect();
    });
    return () => {
      cancelIdle(id);
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

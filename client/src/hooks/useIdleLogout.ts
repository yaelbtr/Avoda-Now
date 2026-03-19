/**
 * useIdleLogout
 *
 * Tracks user activity (mouse, keyboard, touch, scroll).
 * After IDLE_MS of inactivity:
 *   - At WARN_BEFORE_MS before logout → calls onWarning(secondsLeft)
 *   - At 0 → calls onLogout()
 *
 * The hook resets the timer on any user activity.
 * It is disabled when `enabled` is false (e.g. user not logged in).
 */

import { useEffect, useRef, useCallback } from "react";

const IDLE_MS = 20 * 60 * 1000;        // 20 minutes total idle time
const WARN_BEFORE_MS = 2 * 60 * 1000;  // show warning 2 minutes before logout
const TICK_MS = 1000;                   // countdown tick interval

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

interface UseIdleLogoutOptions {
  /** Whether the hook is active. Pass `false` when user is not logged in. */
  enabled: boolean;
  /** Called every second during the warning window with remaining seconds. */
  onWarning: (secondsLeft: number) => void;
  /** Called when the idle timeout expires — perform the actual logout here. */
  onLogout: () => void;
  /** Called when the user becomes active again during the warning window. */
  onResume?: () => void;
}

export function useIdleLogout({
  enabled,
  onWarning,
  onLogout,
  onResume,
}: UseIdleLogoutOptions) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const isWarning = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearInterval(warnTimer.current);
    idleTimer.current = null;
    warnTimer.current = null;
  }, []);

  const startWarningCountdown = useCallback(() => {
    isWarning.current = true;
    let secondsLeft = Math.round(WARN_BEFORE_MS / 1000);
    onWarning(secondsLeft);

    warnTimer.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearTimers();
        isWarning.current = false;
        onLogout();
      } else {
        onWarning(secondsLeft);
      }
    }, TICK_MS);
  }, [onWarning, onLogout, clearTimers]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    lastActivity.current = Date.now();

    // If we were in warning mode, resume and notify
    if (isWarning.current) {
      isWarning.current = false;
      clearTimers();
      onResume?.();
    } else {
      clearTimers();
    }

    // Schedule the warning to fire at (IDLE_MS - WARN_BEFORE_MS)
    idleTimer.current = setTimeout(() => {
      startWarningCountdown();
    }, IDLE_MS - WARN_BEFORE_MS);
  }, [enabled, clearTimers, startWarningCountdown, onResume]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Start the timer immediately
    resetTimer();

    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [enabled, resetTimer, clearTimers]);
}

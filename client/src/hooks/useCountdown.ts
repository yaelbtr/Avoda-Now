/**
 * useCountdown — returns a live countdown string (HH:MM:SS) for a future Date.
 * Updates every second. Returns null when targetDate is null/undefined or in the past.
 *
 * Usage:
 *   const remaining = useCountdown(availableUntil);
 *   // "02:45:30"  or  null
 */
import { useState, useEffect } from "react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function useCountdown(targetDate: Date | string | null | undefined): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setRemaining(null);
      return;
    }

    const target = targetDate instanceof Date ? targetDate : new Date(targetDate);

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(null);
      } else {
        setRemaining(formatCountdown(diff));
      }
    };

    tick(); // immediate first render
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate instanceof Date ? targetDate.getTime() : targetDate]);

  return remaining;
}

/**
 * Returns a human-readable Hebrew label for the remaining time.
 * e.g. "זמין עוד 2:45 שעות" / "זמין עוד 45 דקות"
 */
export function useCountdownLabel(targetDate: Date | string | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setLabel(null);
      return;
    }

    const target = targetDate instanceof Date ? targetDate : new Date(targetDate);

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setLabel(null);
        return;
      }
      const totalMinutes = Math.floor(diff / 60_000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours >= 1) {
        setLabel(`זמין עוד ${hours}:${String(minutes).padStart(2, "0")} שעות`);
      } else if (totalMinutes > 0) {
        setLabel(`זמין עוד ${totalMinutes} דקות`);
      } else {
        const secs = Math.floor(diff / 1000);
        setLabel(`זמין עוד ${secs} שניות`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate instanceof Date ? targetDate.getTime() : targetDate]);

  return label;
}

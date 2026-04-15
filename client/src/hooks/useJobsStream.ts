import { useEffect } from "react";
import { notifyNewJob, type CachedJob } from "@/services/jobsStore";

// ── SSE subscription hook ────────────────────────────────────────────────────
// Singleton — חיבור אחד לכל האפליקציה, מותקן פעם אחת ב-App.tsx.
// מאזין ל-/api/jobs/stream ומעדכן את jobsStore כאשר נכנסת משרה חדשה.

export function useJobsStream(): void {
  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      source = new EventSource("/api/jobs/stream");

      source.addEventListener("new_job", (event: MessageEvent) => {
        try {
          const job = JSON.parse(event.data) as CachedJob;
          notifyNewJob(job);
        } catch {
          // נתונים שגויים — מדלגים
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (!destroyed) {
          // מתחבר מחדש אחרי 5 שניות
          reconnectTimer = setTimeout(connect, 5_000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, []); // רץ פעם אחת בלבד
}

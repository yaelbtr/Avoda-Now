import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatSalary } from "@shared/categories";

type FeedItem = {
  type: "job" | "worker";
  id: number;
  title?: string;
  city?: string | null;
  salary?: string | null;
  salaryType?: string;
  isUrgent?: boolean | null;
  category?: string;
  note?: string | null;
  createdAt: Date | string;
};

function buildMessage(item: FeedItem): string {
  if (item.type === "job") {
    const loc = item.city ? ` ב${item.city}` : "";
    const salary =
      item.salaryType === "volunteer"
        ? " — התנדבות"
        : item.salary
        ? ` — ${formatSalary(item.salary, item.salaryType ?? "hourly")}`
        : "";
    const prefix = item.isUrgent ? "⚡ דרוש עובד דחוף" : "📢 עבודה חדשה";
    return `${prefix}: ${item.title}${loc}${salary}`;
  } else {
    const loc = item.city ? ` ב${item.city}` : "";
    return `👷 עובד פנוי עכשיו${loc}${item.note ? ` — ${item.note}` : ""}`;
  }
}

const FALLBACK_MESSAGES = [
  "📢 עבודה חדשה: שליחויות בתל אביב — 60₪ לשעה",
  "⚡ דרוש עובד למחסן היום בפתח תקווה",
  "👷 עובד פנוי עכשיו ברמת גן",
  "📢 עבודה חדשה: עוזר מטבח בירושלים — 55₪ לשעה",
  "🆘 סיוע דחוף: חלוקת מזון בבאר שבע",
  "👷 עובד פנוי עכשיו בחיפה",
  "📢 עבודה חדשה: ניקיון לפסח בנתניה — 70₪ לשעה",
  "⚡ דרוש שליח דחוף בתל אביב",
];

export default function ActivityTicker() {
  const feedQuery = trpc.live.feed.useQuery(
    { limit: 20 },
    { refetchInterval: 60_000, staleTime: 30_000 }
  );

  const messages: string[] = feedQuery.data?.length
    ? feedQuery.data.map(buildMessage)
    : FALLBACK_MESSAGES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 400);
    }, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [messages.length]);

  const displayMsg = messages[currentIndex] ?? messages[0];

  return (
    <div
      dir="rtl"
      style={{
        height: "36px",
        background: "oklch(0.14 0.025 265)",
        borderBottom: "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center gap-3">
        {/* Live indicator */}
        <span
          className="flex items-center gap-1.5 shrink-0 text-xs font-bold"
          style={{ color: "oklch(0.75 0.18 160)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: "oklch(0.65 0.22 160)",
              boxShadow: "0 0 6px oklch(0.65 0.22 160 / 0.6)",
              animation: "pulse-ring 2s infinite",
            }}
          />
          פעילות חיה
        </span>
        <span
          className="w-px h-4 shrink-0"
          style={{ background: "oklch(1 0 0 / 12%)" }}
        />
        {/* Rotating message */}
        <div className="flex-1 overflow-hidden">
          <p
            className="text-sm font-medium whitespace-nowrap truncate"
            style={{
              color: "oklch(1 0 0 / 65%)",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(-4px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            {displayMsg}
          </p>
        </div>
        {/* Counter */}
        <span
          className="shrink-0 text-xs"
          style={{ color: "oklch(1 0 0 / 25%)" }}
        >
          {currentIndex + 1}/{messages.length}
        </span>
      </div>
    </div>
  );
}

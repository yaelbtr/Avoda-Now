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

// Fallback messages when no live data
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

  // Duplicate messages for seamless loop
  const allMessages = [...messages, ...messages];

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
      className="bg-primary/95 text-primary-foreground overflow-hidden"
      dir="rtl"
      style={{ height: "36px" }}
    >
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center gap-3">
        {/* Live indicator */}
        <span className="flex items-center gap-1.5 shrink-0 text-xs font-bold opacity-90">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          פעילות חיה
        </span>
        <span className="w-px h-4 bg-white/30 shrink-0" />
        {/* Rotating message */}
        <div className="flex-1 overflow-hidden">
          <p
            className={`text-sm font-medium whitespace-nowrap truncate transition-all duration-400 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
            style={{ transition: "opacity 0.4s ease, transform 0.4s ease" }}
          >
            {displayMsg}
          </p>
        </div>
        {/* Counter */}
        <span className="shrink-0 text-xs opacity-60">
          {currentIndex + 1}/{messages.length}
        </span>
      </div>
    </div>
  );
}

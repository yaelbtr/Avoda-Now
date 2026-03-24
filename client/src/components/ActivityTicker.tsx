import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatSalary } from "@shared/categories";
import {
  C_DARK_BG as DARK_BG, C_SUCCESS as SUCCESS_GREEN,
  C_TEXT_ON_DARK_MID as TEXT_MID, C_TEXT_ON_DARK_FAINT as TEXT_FAINT,
  C_DARK_CARD as DARK_CARD, C_DARK_CARD_BORDER as DARK_CARD_BORDER,
} from "@/lib/colors";

type FeedItem = {
  type: "job" | "worker";
  id: number;
  title?: string;
  city?: string | null;
  salary?: string | null;
  salaryType?: string;
  hourlyRate?: string | null;
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
        : (item.salary || item.hourlyRate)
        ? ` — ${formatSalary(item.salary ?? null, item.salaryType ?? "hourly", item.hourlyRate ?? null)}`
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
        background: DARK_BG,
        borderBottom: `1px solid ${DARK_CARD_BORDER}`,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center gap-3">
        {/* Live indicator */}
        <span
          className="flex items-center gap-1.5 shrink-0 text-xs font-bold"
          style={{ color: SUCCESS_GREEN }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: SUCCESS_GREEN,
              boxShadow: `0 0 6px ${SUCCESS_GREEN}99`,
              animation: "pulse-ring 2s infinite",
            }}
          />
          פעילות חיה
        </span>
        <span
          className="w-px h-4 shrink-0"
          style={{ background: DARK_CARD }}
        />
        {/* Rotating message */}
        <div className="flex-1 overflow-hidden">
          <p
            className="text-sm font-medium whitespace-nowrap truncate"
            style={{
              color: TEXT_MID,
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
          style={{ color: TEXT_FAINT }}
        >
          {currentIndex + 1}/{messages.length}
        </span>
      </div>
    </div>
  );
}

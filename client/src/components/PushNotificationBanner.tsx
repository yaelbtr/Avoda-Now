/**
 * PushNotificationBanner — reusable banner that prompts workers to enable
 * Web Push notifications for new job alerts.
 *
 * Usage:
 *   <PushNotificationBanner category="food" city="תל אביב" />
 *
 * Props:
 *   category  — optional category label shown in the prompt text
 *   city      — optional city label shown in the prompt text
 *   compact   — render a smaller inline variant (default: false)
 *   className — additional CSS classes
 */
import { Bell, BellOff, X } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

interface PushNotificationBannerProps {
  category?: string | null;
  city?: string | null;
  compact?: boolean;
  className?: string;
}

const LS_DISMISSED_KEY = "pushBannerDismissed";

export function PushNotificationBanner({
  category,
  city,
  compact = false,
  className = "",
}: PushNotificationBannerProps) {
  const { isAuthenticated } = useAuth();
  const push = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(LS_DISMISSED_KEY) === "1"
  );

  // Only show for authenticated workers who haven't subscribed yet and haven't dismissed
  if (
    !isAuthenticated ||
    !push.isSupported ||
    push.isSubscribed ||
    push.permission === "denied" ||
    dismissed
  ) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(LS_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  // Build contextual description
  const contextParts: string[] = [];
  if (category) contextParts.push(category);
  if (city) contextParts.push(`ב${city}`);
  const contextText =
    contextParts.length > 0
      ? `קבל התראה מיידית על משרות ${contextParts.join(" ")}`
      : "קבל התראה מיידית כשמשרה חדשה תואמת לפרופיל שלך";

  if (compact) {
    return (
      <div
        dir="rtl"
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${className}`}
        style={{
          background: "oklch(0.96 0.04 122)",
          border: "1.5px dashed oklch(0.70 0.12 122 / 0.5)",
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.35 0.08 122)" }}
        >
          <Bell className="h-4 w-4" style={{ color: "oklch(0.96 0.04 80)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: "oklch(0.22 0.03 122.3)" }}>
            הפעל התראות משרות
          </p>
          <p className="text-xs truncate" style={{ color: "oklch(0.45 0.05 122)" }}>
            {contextText}
          </p>
        </div>
        <button
          onClick={push.subscribe}
          disabled={push.isLoading}
          className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: "oklch(0.35 0.08 122)",
            color: "oklch(0.96 0.04 80)",
          }}
        >
          {push.isLoading ? "..." : "הפעל"}
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
          aria-label="סגור"
        >
          <X className="h-3.5 w-3.5" style={{ color: "oklch(0.55 0.04 122)" }} />
        </button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, oklch(0.94 0.06 122) 0%, oklch(0.97 0.03 100) 100%)",
        border: "1.5px solid oklch(0.80 0.08 122 / 0.4)",
        boxShadow: "0 4px 20px oklch(0.35 0.08 122 / 0.10)",
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 left-3 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="סגור"
      >
        <X className="h-4 w-4" style={{ color: "oklch(0.55 0.04 122)" }} />
      </button>

      <div className="flex items-start gap-4 px-5 py-4 pr-5 pl-10">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
            boxShadow: "0 4px 12px oklch(0.28 0.06 122 / 0.30)",
          }}
        >
          <Bell className="h-6 w-6" style={{ color: "oklch(0.96 0.04 80)" }} />
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="text-sm font-black mb-0.5" style={{ color: "oklch(0.22 0.03 122.3)" }}>
            הפעל התראות משרות חדשות
          </p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "oklch(0.45 0.05 122)" }}>
            {contextText}
          </p>

          {push.error && (
            <p className="text-xs mb-2 font-medium" style={{ color: "oklch(0.50 0.20 25)" }}>
              {push.error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={push.subscribe}
              disabled={push.isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                color: "oklch(0.96 0.04 80)",
                boxShadow: "0 2px 8px oklch(0.28 0.06 122 / 0.25)",
              }}
            >
              <Bell className="h-4 w-4" />
              {push.isLoading ? "מאשר..." : "הפעל התראות"}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-black/5"
              style={{ color: "oklch(0.55 0.04 122)" }}
            >
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PushNotificationToggle — a compact icon button to toggle push subscription.
 * Used in page headers / toolbars.
 */
export function PushNotificationToggle({ className = "" }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const push = usePushNotifications();

  if (!isAuthenticated || !push.isSupported) return null;

  return (
    <button
      onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
      disabled={push.isLoading}
      title={push.isSubscribed ? "בטל התראות משרות" : "הפעל התראות משרות"}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${className}`}
      style={
        push.isSubscribed
          ? {
              background: "oklch(0.65 0.22 160 / 0.15)",
              color: "oklch(0.35 0.18 160)",
              border: "1px solid oklch(0.65 0.22 160 / 0.30)",
            }
          : {
              background: "oklch(0.35 0.08 122 / 0.10)",
              color: "oklch(0.35 0.08 122)",
              border: "1px solid oklch(0.35 0.08 122 / 0.25)",
            }
      }
    >
      {push.isSubscribed ? (
        <>
          <Bell className="h-3.5 w-3.5" />
          <span>התראות פעילות</span>
        </>
      ) : (
        <>
          <BellOff className="h-3.5 w-3.5" />
          <span>הפעל התראות</span>
        </>
      )}
    </button>
  );
}

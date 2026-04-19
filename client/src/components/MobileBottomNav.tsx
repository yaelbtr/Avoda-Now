import { Link, useLocation } from "wouter";
import { Search, Flame, FileText, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { useUserMode } from "@/contexts/UserModeContext";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

const NAV_ITEMS = [
  { href: "/find-jobs", label: "חיפוש עבודה", icon: Search },
  { href: "/find-jobs?filter=today", label: "עבודות להיום", icon: Flame },
  { href: "/my-applications", label: "המועמדויות שלי", icon: FileText },
  { href: "/", label: "מסך הבית", icon: Home },
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const { userMode } = useUserMode();

  const lastSeenAt = useMemo(() => {
    if (typeof window === "undefined") return new Date(0);
    const stored = localStorage.getItem("myApplicationsLastSeen");
    return stored ? new Date(stored) : new Date(0);
  }, []);

  const { data: unreadCount } = trpc.jobs.unreadApplicationsCount.useQuery(
    { lastSeenAt },
    {
      ...authQuery({ enabled: userMode === "worker" }),
      refetchInterval: 60_000,
      staleTime: 30_000,
    }
  );
  const hasUnread = (unreadCount ?? 0) > 0;

  // Only show for workers (or guests browsing as worker)
  if (userMode === "employer") return null;
  return (
    <nav
      className="md:hidden fixed bottom-0 z-50 w-full"
      dir="rtl"
      aria-label="ניווט תחתון"
      style={{
        height: 64,
        background: "var(--header-bg)",
        borderTop: "1px solid oklch(0.42 0.07 124.9)",
        boxShadow: "0 -4px 20px oklch(0 0 0 / 0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <ul className="flex items-center justify-around h-full list-none m-0 p-0">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/find-jobs?filter=today"
            ? location === "/find-jobs" && typeof window !== "undefined" && window.location.search.includes("filter=today")
            : item.href === "/find-jobs"
            ? location === "/find-jobs" && (typeof window === "undefined" || !window.location.search.includes("filter=today"))
            : location === item.href;

        const Icon = item.icon;

        return (
          <li key={item.href}>
          <Link href={item.href}>
            <button
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all relative"
              style={{
                minWidth: 60,
                color: isActive ? "var(--citrus)" : "oklch(0.9904 0.0107 95.3 / 0.55)",
              }}
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(10);
                }
              }}
            >
              <span className="relative">
                <Icon
                  className="h-5 w-5 transition-transform"
                  style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
                />
                {item.href === "/my-applications" && hasUnread && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ background: "oklch(0.60 0.22 25)" }}
                  />
                )}
              </span>
              <span
                className="text-[10px] font-semibold leading-tight text-center"
                style={{
                  color: isActive ? "var(--citrus)" : "oklch(0.9904 0.0107 95.3 / 0.55)",
                  maxWidth: 64,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                  style={{ background: "var(--citrus)" }}
                />
              )}
            </button>
          </Link>
          </li>
        );
      })}
      </ul>
    </nav>
  );
}

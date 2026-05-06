import { useLocation } from "wouter";
import { Search, Flame, FileText, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { useUserMode } from "@/contexts/UserModeContext";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { Dock } from "@/components/ui/dock";

const NAV_ITEMS = [
  { href: "/", label: "מסך הבית", icon: Home },
  { href: "/find-jobs", label: "חיפוש עבודה", icon: Search },
  { href: "/find-jobs?filter=today", label: "עבודות להיום", icon: Flame },
  { href: "/my-applications", label: "המועמדויות שלי", icon: FileText },
];

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
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

  if (userMode === "employer") return null;

  const isItemActive = (href: string) => {
    if (href === "/find-jobs?filter=today") {
      return (
        location === "/find-jobs" &&
        typeof window !== "undefined" &&
        window.location.search.includes("filter=today")
      );
    }
    if (href === "/find-jobs") {
      return (
        location === "/find-jobs" &&
        (typeof window === "undefined" ||
          !window.location.search.includes("filter=today"))
      );
    }
    return location === href;
  };

  const dockItems = NAV_ITEMS.map((item) => ({
    icon: item.icon,
    label: item.label,
    isActive: isItemActive(item.href),
    badge: item.href === "/my-applications" && hasUnread,
    onClick: () => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
      navigate(item.href);
    },
  }));

  return (
    <nav
      className="md:hidden fixed z-50"
      dir="rtl"
      aria-label="ניווט תחתון"
      style={{
        bottom: "max(16px, calc(env(safe-area-inset-bottom) + 8px))",
        left: "12px",
        right: "12px",
      }}
    >
      <Dock items={dockItems} />
    </nav>
  );
}

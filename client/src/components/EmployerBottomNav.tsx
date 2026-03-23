import { Link, useLocation } from "wouter";
import { Home, PlusSquare, Briefcase, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useUserMode } from "@/contexts/UserModeContext";

const NAV_ITEMS = [
  { href: "/",                  label: "מסך הבית",      icon: Home },
  { href: "/post-job",          label: "פרסם משרה",     icon: PlusSquare },
  { href: "/my-jobs",           label: "המשרות שלי",    icon: Briefcase },
  { href: "/available-workers", label: "עובדים זמינים", icon: Users },
] as const;

/** Animated pulse ring — shown only on the active /post-job tab */
function PulseRing() {
  return (
    <>
      {[0, 0.5, 1].map((delay) => (
        <motion.span
          key={delay}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: "1.5px solid var(--citrus)" }}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            delay,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

export default function EmployerBottomNav() {
  const [location] = useLocation();
  const { userMode } = useUserMode();

  if (userMode !== "employer") return null;
  // PostJob has its own sticky bottom nav — hide the global one to avoid overlap
  if (location === "/post-job") return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 z-50 w-full"
      dir="rtl"
      aria-label="ניווט תחתון למעסיקים"
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
          const isActive = location === item.href;
          const isPostJob = item.href === "/post-job";
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
                    color: isActive
                      ? "var(--citrus)"
                      : "oklch(0.9904 0.0107 95.3 / 0.55)",
                  }}
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(10);
                    }
                  }}
                >
                  {/* Icon wrapper — pulse rings live here when on /post-job */}
                  <span className="relative flex items-center justify-center w-6 h-6">
                    {isPostJob && isActive && <PulseRing />}
                    <motion.span
                      animate={
                        isPostJob && isActive
                          ? { scale: [1, 1.18, 1], rotate: [0, 8, -8, 0] }
                          : { scale: isActive ? 1.15 : 1, rotate: 0 }
                      }
                      transition={
                        isPostJob && isActive
                          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                          : { type: "spring", stiffness: 400, damping: 20 }
                      }
                      className="flex items-center justify-center"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.span>
                  </span>

                  <span
                    className="text-[10px] font-semibold leading-tight text-center"
                    style={{
                      color: isActive
                        ? "var(--citrus)"
                        : "oklch(0.9904 0.0107 95.3 / 0.55)",
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

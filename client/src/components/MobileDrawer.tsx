import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Flame, Briefcase, Bookmark, User, PlusCircle, Users,
  RefreshCw, RotateCcw, Shield, LogOut, X, Mail, FileText, ShieldCheck, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onLoginOpen: () => void;
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "oklch(0.9904 0.0107 95.3 / 0.35)",
  paddingInline: "0.75rem",
  paddingBlock: "0.4rem 0.2rem",
};

const ITEM_BASE = "flex items-center gap-3 w-full text-right px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer hover:bg-white/5 active:scale-95 active:bg-white/10";
const ITEM_SECONDARY = "flex items-center gap-3 w-full text-right px-3 py-1 rounded-xl text-xs font-normal transition-all cursor-pointer hover:bg-white/5 active:scale-95 active:bg-white/10 opacity-70";

export default function MobileDrawer({ open, onClose, onLoginOpen }: MobileDrawerProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { userMode, setUserMode, resetUserMode } = useUserMode();

  const lastSeenAt = useMemo(() => {
    if (typeof window === "undefined") return new Date(0);
    const stored = localStorage.getItem("myApplicationsLastSeen");
    return stored ? new Date(stored) : new Date(0);
  }, []);

  const { data: profileData } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const profilePhoto = profileData?.profilePhoto ?? null;

  const { data: savedIdsData } = trpc.savedJobs.getSavedIds.useQuery(undefined, {
    enabled: isAuthenticated && userMode === "worker",
    staleTime: 30_000,
  });
  const savedJobsCount = savedIdsData?.ids?.length ?? 0;

  const { data: unreadCount } = trpc.jobs.unreadApplicationsCount.useQuery(
    { lastSeenAt },
    {
      enabled: isAuthenticated && userMode === "worker",
      refetchInterval: 60_000,
      staleTime: 30_000,
    }
  );

  const handleLink = () => setTimeout(onClose, 150);

  const navItem = (
    hrefOrClick: string | (() => void),
    icon: React.ElementType,
    label: string,
    badge?: number | boolean,
    color?: string,
    extraClass?: string,
    secondary?: boolean,
  ) => {
    const Icon = icon;
    const isLink = typeof hrefOrClick === "string";
    const isActive = isLink && location === hrefOrClick;
    const itemColor = color ?? (isActive ? "var(--citrus)" : "#e8eae5");
    const itemStyle: React.CSSProperties = {
      background: isActive ? "oklch(0.42 0.07 124.9)" : "transparent",
      color: itemColor,
      border: isActive ? "1px solid oklch(0.50 0.07 124.9)" : "1px solid transparent",
      borderRadius: "0.75rem",
    };
    const baseClass = secondary ? ITEM_SECONDARY : ITEM_BASE;
    const inner = (
      <>
        <Icon className={secondary ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        <span className="flex-1">{label}</span>
        {badge && typeof badge === "number" && badge > 0 && (
          <span
            style={{
              background: "oklch(0.55 0.18 145)",
              color: "white",
              fontSize: "0.6rem",
              fontWeight: 700,
              borderRadius: "9999px",
              padding: "0.1rem 0.4rem",
              minWidth: "1.2rem",
              textAlign: "center",
            }}
          >
            {badge}
          </span>
        )}
        {badge === true && (
          <span
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "9999px",
              background: "oklch(0.55 0.18 145)",
              flexShrink: 0,
            }}
          />
        )}
      </>
    );
    if (isLink) {
      return (
        <Link href={hrefOrClick} key={hrefOrClick} className="block">
          <span className={`${baseClass}${extraClass ? " " + extraClass : ""}`} style={itemStyle} onClick={handleLink}>
            {inner}
          </span>
        </Link>
      );
    }
    return (
      <button
        key={label}
        onClick={() => { (hrefOrClick as () => void)(); }}
        className={`${baseClass}${extraClass ? " " + extraClass : ""}`}
        style={itemStyle}
      >
        {inner}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50"
            style={{ background: "oklch(0 0 0 / 0.55)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="md:hidden fixed top-0 right-0 bottom-0 z-50 flex flex-col"
            dir="rtl"
            style={{
              width: "min(85vw, 320px)",
              background: "var(--header-bg)",
              borderLeft: "1px solid oklch(0.42 0.07 124.9)",
              boxShadow: "-8px 0 32px oklch(0 0 0 / 0.35)",
              overflowY: "hidden",
            }}
          >
            {/* Header — close button only, no title */}
            <div
              className="flex items-center justify-end px-4 pt-3 pb-1 shrink-0"
            >
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ color: "#e8eae5", background: "oklch(0.42 0.07 124.9 / 0.5)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

              {/* Guest login block — large centered icon at the very top */}
            {!isAuthenticated && (
              <button
                onClick={() => { onLoginOpen(); onClose(); }}
                className="flex flex-col items-center gap-2 w-full py-3 shrink-0 transition-all hover:opacity-80 active:scale-95"
                style={{
                  background: "transparent",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    background: "oklch(0.35 0.05 124.9)",
                    border: "2px solid oklch(0.55 0.10 85 / 0.5)",
                  }}
                >
                  <User className="h-7 w-7" style={{ color: "oklch(0.88 0.10 85)" }} />
                </div>
                <span className="text-base font-bold" style={{ color: "oklch(0.88 0.10 85)" }}>
                  התחברות
                </span>
              </button>
            )}

            {/* Authenticated user card — no border, no background */}
            {isAuthenticated && (
              <div className="mx-4 mt-0 mb-1 shrink-0 flex flex-col gap-4">
                {/* Top row: avatar first on right (RTL), name+link to its left */}
                <div className="flex items-center gap-3" dir="rtl">
                  {/* Avatar — first in RTL = rightmost */}
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 font-bold text-base overflow-hidden"
                    style={{
                      width: "2.8rem",
                      height: "2.8rem",
                      background: "oklch(0.60 0.18 40)",
                      color: "#fff",
                    }}
                  >
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="פרופיל"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      (user?.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Name + אזור אישי — flows to the left */}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span
                      className="font-bold text-base leading-tight truncate"
                      style={{ color: "#e8eae5" }}
                    >
                      {user?.name || "משתמש"}
                    </span>
                    <Link href={userMode === "employer" ? "/my-jobs" : "/worker-profile"} onClick={onClose}>
                      <span
                        className="text-xs cursor-pointer"
                        style={{ color: "oklch(0.75 0.12 85)" }}
                      >
                        אזור אישי
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Role badge — centered below */}
                {userMode && (
                  <div className="flex justify-center">
                    <div
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
                      style={{
                        background: "transparent",
                        color: "oklch(0.88 0.10 85)",
                        border: "1px solid oklch(0.55 0.10 85 / 0.7)",
                      }}
                    >
                      <span>{userMode === "worker" ? "👷" : "💼"}</span>
                      <span>{userMode === "worker" ? "מחפש עבודה" : "מעסיק"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable area: nav + footer together, no gap between them */}
            <div className="flex-1 flex flex-col" style={{ overflowY: "auto", minHeight: 0 }}>
            <div className="px-2 py-1 flex flex-col gap-0.5">
              {/* worker nav */}
              {userMode === "worker" && navItem("/find-jobs", MapPin, "חיפוש עבודה")}
              {userMode === "worker" && navItem("/find-jobs?filter=today", Flame, "עבודות להיום")}
              {userMode === "worker" && navItem("/my-applications", Briefcase, "המועמדויות שלי", (unreadCount ?? 0) > 0 ? true : undefined)}

              {/* employer nav */}
              {userMode === "employer" && navItem("/post-job", PlusCircle, "פרסם משרה")}
              {userMode === "employer" && navItem("/my-jobs", Briefcase, "המשרות שלי")}
              {userMode === "employer" && navItem("/available-workers", Users, "עובדים זמינים")}

              {/* personal — worker */}
              {isAuthenticated && userMode === "worker" && navItem("/my-applications?tab=saved", Bookmark, "משרות ששמרתי", savedJobsCount > 0 ? savedJobsCount : undefined)}

              {/* system — authenticated */}
              {isAuthenticated && navItem(() => { setUserMode(userMode === "worker" ? "employer" : "worker"); setTimeout(onClose, 150); }, RefreshCw, userMode === "worker" ? "מעבר למצב מעסיק" : "מעבר למצב עובד", undefined, undefined, undefined, true)}
              {isAuthenticated && navItem(() => { resetUserMode(); setTimeout(onClose, 150); }, RotateCcw, "אפס בחירת תפקיד", undefined, undefined, undefined, true)}
              {isAuthenticated && user?.role === "admin" && navItem("/admin", Shield, "פאנל ניהול", undefined, "var(--citrus)", undefined, true)}
              {isAuthenticated && navItem(() => { logout(); setTimeout(onClose, 150); }, LogOut, "התנתק", undefined, undefined, "text-red-400 hover:text-red-300 hover:bg-red-500/10", true)}

              {/* system — guest with userMode */}
              {!isAuthenticated && userMode && navItem(() => { setUserMode(userMode === "worker" ? "employer" : "worker"); setTimeout(onClose, 150); }, RefreshCw, userMode === "worker" ? "מעבר למצב מעסיק" : "מעבר למצב עובד", undefined, undefined, undefined, true)}
              {!isAuthenticated && userMode && navItem(() => { resetUserMode(); setTimeout(onClose, 150); }, RotateCcw, "אפס בחירת תפקיד", undefined, undefined, undefined, true)}
            </div>

            {/* Legal & Contact footer — always visible at bottom, never scrolls under nav */}
            <div
              className="shrink-0 px-3 pb-4 pt-0"
            >
              <div className="flex flex-col gap-0.5 mb-2">
                <Link href="/terms">
                  <span
                    className={ITEM_BASE}
                    style={{ color: "oklch(0.9904 0.0107 95.3 / 0.5)" }}
                    onClick={handleLink}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">תנאי שימוש</span>
                  </span>
                </Link>
                <Link href="/privacy">
                  <span
                    className={ITEM_BASE}
                    style={{ color: "oklch(0.9904 0.0107 95.3 / 0.5)" }}
                    onClick={handleLink}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">מדיניות פרטיות</span>
                  </span>
                </Link>
              </div>
              <div className="flex gap-2">
                <a
                  href="mailto:info@avodanow.co.il"
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                  style={{
                    color: "oklch(0.9904 0.0107 95.3 / 0.55)",
                    background: "oklch(0.42 0.07 124.9 / 0.3)",
                    border: "1px solid oklch(0.42 0.07 124.9 / 0.4)",
                    textDecoration: "none",
                  }}
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--citrus)" }} />
                  <span>info@avodanow.co.il</span>
                </a>
                <a
                  href={`mailto:info@avodanow.co.il?subject=${encodeURIComponent('דיווח על בעיה ב-AvodaNow')}&body=${encodeURIComponent('שלום,\n\nאני רוצה לדווח על בעיה הבאה:\n\n[תאר את הבעיה כאן]\n\nתודה,')}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                  style={{
                    color: "oklch(0.75 0.12 35 / 0.85)",
                    background: "oklch(0.35 0.06 35 / 0.25)",
                    border: "1px solid oklch(0.45 0.08 35 / 0.4)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>דווח בעיה</span>
                </a>
              </div>
              <p
                className="text-center mt-2"
                style={{ fontSize: "0.65rem", color: "oklch(0.9904 0.0107 95.3 / 0.25)" }}
              >
                © AvodaNow 2026 · כל הזכויות שמורות
              </p>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

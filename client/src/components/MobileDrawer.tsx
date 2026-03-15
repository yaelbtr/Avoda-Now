import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Flame, Briefcase, Bookmark, User, PlusCircle, Users,
  RefreshCw, RotateCcw, Shield, LogOut, X, Mail, FileText, ShieldCheck, AlertTriangle, Accessibility,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { BrandName } from "@/components/ui";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onLoginOpen: () => void;
}

// ─── Shared style constants ───────────────────────────────────────────────────
const COLOR = "#e8eae5";
const COLOR_DIM = "oklch(0.9904 0.0107 95.3 / 0.45)";
const COLOR_MUTED = "oklch(0.9904 0.0107 95.3 / 0.25)";
const DIVIDER: React.CSSProperties = {
  height: "1px",
  background: "oklch(0.42 0.07 124.9 / 0.35)",
  margin: "4px 12px",
};

// Single nav item style — py-1.5 keeps items compact but tappable
const ITEM = "flex items-center gap-3 w-full text-right px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer hover:bg-white/5 active:scale-95 active:bg-white/10";

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

  const close = () => setTimeout(onClose, 150);

  // ─── navItem factory ──────────────────────────────────────────────────────
  const navItem = (
    hrefOrClick: string | (() => void),
    icon: React.ElementType,
    label: string,
    badge?: number | boolean,
    color?: string,
    extraClass?: string,
  ) => {
    const Icon = icon;
    const isLink = typeof hrefOrClick === "string";
    const isActive = isLink && location === hrefOrClick;
    const itemColor = color ?? (isActive ? "var(--citrus)" : COLOR);
    const itemStyle: React.CSSProperties = {
      background: isActive ? "oklch(0.42 0.07 124.9)" : "transparent",
      color: itemColor,
      border: isActive ? "1px solid oklch(0.50 0.07 124.9)" : "1px solid transparent",
      borderRadius: "0.75rem",
    };
    const inner = (
      <>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{label}</span>
        {badge && typeof badge === "number" && badge > 0 && (
          <span style={{
            background: "oklch(0.55 0.18 145)", color: "white",
            fontSize: "0.6rem", fontWeight: 700, borderRadius: "9999px",
            padding: "0.1rem 0.4rem", minWidth: "1.2rem", textAlign: "center",
          }}>{badge}</span>
        )}
        {badge === true && (
          <span style={{
            width: "0.45rem", height: "0.45rem", borderRadius: "9999px",
            background: "oklch(0.55 0.18 145)", flexShrink: 0,
          }} />
        )}
      </>
    );
    if (isLink) {
      return (
        <li key={hrefOrClick}>
          <Link href={hrefOrClick} className="block">
            <span
              className={`${ITEM}${extraClass ? " " + extraClass : ""}`}
              style={itemStyle}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setTimeout(onClose, 150)}
            >
              {inner}
            </span>
          </Link>
        </li>
      );
    }
    return (
      <li key={label}>
        <button onClick={() => { (hrefOrClick as () => void)(); }}
          className={`${ITEM}${extraClass ? " " + extraClass : ""}`} style={itemStyle}>
          {inner}
        </button>
      </li>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50"
            style={{ background: "oklch(0 0 0 / 0.55)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            id="mobile-drawer"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="md:hidden fixed top-0 right-0 z-50 flex flex-col"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="תפריט נייד"
            style={{
              bottom: 64,
              width: "min(85vw, 300px)",
              background: "var(--header-bg)",
              borderLeft: "1px solid oklch(0.42 0.07 124.9)",
              boxShadow: "-8px 0 32px oklch(0 0 0 / 0.35)",
              overflowY: "auto",
            }}
          >

            {/* ── Section 1: Header row (close btn + user identity) ─────────── */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
              {/* Identity: avatar + name */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 font-bold text-sm overflow-hidden"
                    style={{ width: "2.2rem", height: "2.2rem", background: "oklch(0.60 0.18 40)", color: "#fff" }}
                  >
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="פרופיל" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      (user?.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Name + role */}
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold truncate max-w-[120px]" style={{ color: COLOR }}>
                      {user?.name || "משתמש"}
                    </span>
                    {userMode && (
                      <span className="text-xs" style={{ color: "oklch(0.75 0.12 85)" }}>
                        {userMode === "worker" ? "👷 מחפש עבודה" : "💼 מעסיק"}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { onLoginOpen(); onClose(); }}
                  className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-95"
                >
                  <div
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: "2.2rem", height: "2.2rem", background: "oklch(0.35 0.05 124.9)", border: "1.5px solid oklch(0.55 0.10 85 / 0.5)" }}
                  >
                    <User className="h-4 w-4" style={{ color: "oklch(0.88 0.10 85)" }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: "oklch(0.88 0.10 85)" }}>התחברות</span>
                </button>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="סגור תפריט"
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
                style={{ color: COLOR, background: "oklch(0.42 0.07 124.9 / 0.5)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div style={DIVIDER} />

            {/* ── Nav + account — scrollable, pushes footer down ─────────── */}
            <div className="flex-1 overflow-y-auto" role="navigation" aria-label="תפריט ניווט נייד">

            {/* ── Section 2: Main navigation ────────────────────────────────── */}
            <ul className="px-2 py-1 flex flex-col gap-0.5 list-none m-0 p-0" aria-label="קישורי ניווט ראשיים">
              {userMode === "worker" && navItem("/find-jobs", MapPin, "חיפוש עבודה")}
              {userMode === "worker" && navItem("/find-jobs?filter=today", Flame, "עבודות להיום")}
              {userMode === "worker" && navItem("/my-applications", Briefcase, "המועמדויות שלי", (unreadCount ?? 0) > 0 ? true : undefined)}
              {isAuthenticated && userMode === "worker" && navItem("/my-applications?tab=saved", Bookmark, "משרות ששמרתי", savedJobsCount > 0 ? savedJobsCount : undefined)}

              {userMode === "employer" && navItem("/post-job", PlusCircle, "פרסם משרה")}
              {userMode === "employer" && navItem("/my-jobs", Briefcase, "המשרות שלי")}
              {userMode === "employer" && navItem("/available-workers", Users, "עובדים זמינים")}
            </ul>

            {/* ── Section 3: Account actions (only when relevant) ───────────── */}
            {(isAuthenticated || userMode) && (
              <>
                <div style={DIVIDER} />
                <ul className="px-2 py-1 flex flex-col gap-0.5 list-none m-0 p-0" aria-label="פעולות חשבון">
                  {isAuthenticated && (
                    <li>
                    <Link href={userMode === "employer" ? "/my-jobs" : "/worker-profile"} className="block">
                      <span className={ITEM} style={{ color: COLOR, border: "1px solid transparent", borderRadius: "0.75rem" }} onClick={() => setTimeout(onClose, 150)}>
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1">אזור אישי</span>
                      </span>
                    </Link>
                    </li>
                  )}
                  {navItem(
                    () => { setUserMode(userMode === "worker" ? "employer" : "worker"); close(); },
                    RefreshCw,
                    userMode === "worker" ? "מעבר למצב מעסיק" : "מעבר למצב עובד",
                  )}
                  {navItem(() => { resetUserMode(); close(); }, RotateCcw, "אפס בחירת תפקיד")}
                  {isAuthenticated && user?.role === "admin" && navItem("/admin", Shield, "פאנל ניהול", undefined, "var(--citrus)")}
                  {isAuthenticated && navItem(
                    () => { logout(); close(); },
                    LogOut, "התנתק", undefined, undefined,
                    "text-red-400 hover:text-red-300 hover:bg-red-500/10",
                  )}
                </ul>
              </>
            )}

            </div>{/* end scrollable nav+account */}

            {/* ── Section 4: Footer — pinned to bottom ──────────────────────── */}
            <div style={DIVIDER} />
            <div className="px-2 py-1.5 shrink-0">
              {/* Legal links — inline row */}
              <div className="flex gap-1 mb-1.5">
                <Link href="/terms" className="flex-1">
                  <span className={ITEM} style={{ color: COLOR_DIM, border: "1px solid transparent", borderRadius: "0.75rem", justifyContent: "center" }} onClick={() => setTimeout(onClose, 150)}>
                    <FileText className="h-3 w-3 shrink-0" />
                    <span>תנאי שימוש</span>
                  </span>
                </Link>
                <Link href="/privacy" className="flex-1">
                  <span className={ITEM} style={{ color: COLOR_DIM, border: "1px solid transparent", borderRadius: "0.75rem", justifyContent: "center" }} onClick={() => setTimeout(onClose, 150)}>
                    <ShieldCheck className="h-3 w-3 shrink-0" />
                    <span>פרטיות</span>
                  </span>
                </Link>
                <Link href="/accessibility" className="flex-1">
                  <span className={ITEM} style={{ color: COLOR_DIM, border: "1px solid transparent", borderRadius: "0.75rem", justifyContent: "center" }} onClick={() => setTimeout(onClose, 150)}>
                    <Accessibility className="h-3 w-3 shrink-0" />
                    <span>נגישות</span>
                  </span>
                </Link>
              </div>

              {/* Contact row */}
              <div className="flex gap-1.5">
                <a
                  href="mailto:info@avodanow.co.il"
                  className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all"
                  style={{ color: COLOR_DIM, background: "oklch(0.42 0.07 124.9 / 0.25)", border: "1px solid oklch(0.42 0.07 124.9 / 0.35)", textDecoration: "none" }}
                >
                  <Mail className="h-3 w-3 shrink-0" style={{ color: "var(--citrus)" }} />
                  <span className="truncate" lang="en">info@avodanow.co.il</span>
                </a>
                <a
                  href={`mailto:info@avodanow.co.il?subject=${encodeURIComponent('דיווח על בעיה ב-AvodaNow')}&body=${encodeURIComponent('שלום,\n\nאני רוצה לדווח על בעיה הבאה:\n\n[תאר את הבעיה כאן]\n\nתודה,')}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all"
                  style={{ color: "oklch(0.75 0.12 35 / 0.85)", background: "oklch(0.35 0.06 35 / 0.25)", border: "1px solid oklch(0.45 0.08 35 / 0.4)", textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>דווח בעיה</span>
                </a>
              </div>

                <p className="text-center mt-1.5" style={{ fontSize: "0.6rem", color: COLOR_MUTED }}>
                © <BrandName /> 2026 · כל הזכויות שמורות
              </p>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

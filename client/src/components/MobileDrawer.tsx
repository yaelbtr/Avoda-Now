import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Flame, Briefcase, Bookmark, User, PlusCircle, Users,
  RefreshCw, RotateCcw, Shield, LogOut, X, Mail, FileText, ShieldCheck, CheckCircle2, AlertTriangle, Gift,
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

const ITEM_BASE = "flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer";

export default function MobileDrawer({ open, onClose, onLoginOpen }: MobileDrawerProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { userMode, setUserMode, resetUserMode } = useUserMode();

  const lastSeenAt = useMemo(() => {
    if (typeof window === "undefined") return new Date(0);
    const stored = localStorage.getItem("myApplicationsLastSeen");
    return stored ? new Date(stored) : new Date(0);
  }, []);

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

  const handleLink = () => onClose();

  const navItem = (href: string, icon: React.ElementType, label: string, badge?: number | boolean) => {
    const Icon = icon;
    const isActive = location === href;
    return (
      <Link href={href} key={href}>
        <span
          className={ITEM_BASE}
          style={{
            background: isActive ? "oklch(0.42 0.07 124.9)" : "transparent",
            color: isActive ? "var(--citrus)" : "#e8eae5",
            border: isActive ? "1px solid oklch(0.50 0.07 124.9)" : "1px solid transparent",
          }}
          onClick={handleLink}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{label}</span>
          {badge && typeof badge === "number" && badge > 0 && (
            <span
              style={{
                background: "oklch(0.55 0.18 145)",
                color: "white",
                fontSize: "0.6rem",
                fontWeight: 700,
                borderRadius: "9999px",
                minWidth: "1.1rem",
                height: "1.1rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 0.3rem",
              }}
            >
              {badge}
            </span>
          )}
          {badge === true && (
            <span className="w-2 h-2 rounded-full" style={{ background: "oklch(0.60 0.22 25)" }} />
          )}
        </span>
      </Link>
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
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid oklch(0.42 0.07 124.9)" }}
            >
              <span className="text-sm font-bold" style={{ color: "var(--citrus)" }}>
                תפריט
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ color: "#e8eae5", background: "oklch(0.42 0.07 124.9 / 0.5)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User indicator */}
            {isAuthenticated && userMode && (
              <div
                className="mx-3 mt-3 px-3 py-2 rounded-xl text-xs flex items-center gap-2"
                style={{
                  background: "oklch(0.42 0.07 124.9)",
                  color: "oklch(0.9904 0.0107 95.3 / 0.7)",
                  border: "1px solid oklch(0.50 0.07 124.9)",
                }}
              >
                <span className="text-base">{userMode === "worker" ? "👷" : "💼"}</span>
                <span>מחובר כ: {userMode === "worker" ? "מחפש עבודה" : "מעסיק"}</span>
              </div>
            )}

            <nav className="flex-1 px-2 py-3 pb-20 flex flex-col gap-0.5" style={{ overflowY: "auto", minHeight: 0 }}>
              {/* Section: ניווט */}
              {userMode === "worker" && (
                <>
                  <p style={SECTION_LABEL_STYLE}>ניווט</p>
                  {navItem("/find-jobs", MapPin, "חיפוש עבודה")}
                  {navItem("/find-jobs?filter=today", Flame, "עבודות להיום")}
                  {navItem("/my-applications", Briefcase, "המועמדויות שלי", (unreadCount ?? 0) > 0 ? true : undefined)}
                </>
              )}

              {userMode === "employer" && (
                <>
                  <p style={SECTION_LABEL_STYLE}>ניווט</p>
                  {navItem("/post-job", PlusCircle, "פרסם משרה")}
                  {navItem("/my-jobs", Briefcase, "המשרות שלי")}
                  {navItem("/available-workers", Users, "עובדים זמינים")}
                </>
              )}

              {/* Section: האזור האישי */}
              {isAuthenticated && userMode === "worker" && (
                <>
                  <p style={{ ...SECTION_LABEL_STYLE, marginTop: "0.75rem" }}>האזור האישי</p>
                  {navItem("/my-applications?tab=saved", Bookmark, "משרות ששמרתי", savedJobsCount > 0 ? savedJobsCount : undefined)}
                  {navItem("/worker-profile", User, "הפרופיל שלי")}
                  {navItem("/my-referrals", Gift, "הפניות שלי")}
                </>
              )}

              {/* Section: מערכת */}
              {isAuthenticated && (
                <>
                  <p style={{ ...SECTION_LABEL_STYLE, marginTop: "0.75rem" }}>מערכת</p>

                  <button
                    onClick={() => { setUserMode(userMode === "worker" ? "employer" : "worker"); onClose(); }}
                    className={ITEM_BASE}
                    style={{ color: "#e8eae5" }}
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    {userMode === "worker" ? "מעבר למצב מעסיק" : "מעבר למצב עובד"}
                  </button>

                  <button
                    onClick={() => { resetUserMode(); onClose(); }}
                    className={ITEM_BASE}
                    style={{ color: "#e8eae5" }}
                  >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    אפס בחירת תפקיד
                  </button>

                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <span
                        className={ITEM_BASE}
                        style={{ color: "var(--citrus)" }}
                        onClick={handleLink}
                      >
                        <Shield className="h-4 w-4 shrink-0" />
                        פאנל ניהול
                      </span>
                    </Link>
                  )}

                  <button
                    onClick={() => { logout(); onClose(); }}
                    className={ITEM_BASE + " text-red-400 hover:text-red-300 hover:bg-red-500/10"}
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    התנתק
                  </button>
                </>
              )}

              {!isAuthenticated && userMode && (
                <>
                  <p style={{ ...SECTION_LABEL_STYLE, marginTop: "0.75rem" }}>מערכת</p>
                  <button
                    onClick={() => { setUserMode(userMode === "worker" ? "employer" : "worker"); onClose(); }}
                    className={ITEM_BASE}
                    style={{ color: "#e8eae5" }}
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    {userMode === "worker" ? "מעבר למצב מעסיק" : "מעבר למצב עובד"}
                  </button>
                  <button
                    onClick={() => { resetUserMode(); onClose(); }}
                    className={ITEM_BASE}
                    style={{ color: "#e8eae5" }}
                  >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    אפס בחירת תפקיד
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <>
                  <div style={{ borderTop: "1px solid oklch(0.42 0.07 124.9 / 0.4)", marginTop: "0.75rem", marginBottom: "0.25rem" }} />
                  <button
                    onClick={() => { onLoginOpen(); onClose(); }}
                    className={ITEM_BASE + " hover:bg-white/5 active:scale-95"}
                    style={{ color: "oklch(0.88 0.10 85)", fontWeight: 600 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: "2rem",
                        height: "2rem",
                        background: "oklch(0.35 0.05 124.9)",
                        border: "1.5px solid oklch(0.55 0.10 85 / 0.5)",
                      }}
                    >
                      <User className="h-4 w-4" style={{ color: "oklch(0.88 0.10 85)" }} />
                    </div>
                    התחברות
                  </button>
                </>
              )}
              {/* Legal & Contact footer — inside scroll so it's always reachable */}
              <div
                className="px-1 pb-4 pt-2 mt-2"
                style={{ borderTop: "1px solid oklch(0.42 0.07 124.9 / 0.5)" }}
              >
              {/* Legal links */}
              <p style={SECTION_LABEL_STYLE}>מידע משפטי</p>
              <div className="flex flex-col gap-0.5 mb-3">
                <Link href="/terms">
                  <span
                    className={ITEM_BASE}
                    style={{ color: "oklch(0.9904 0.0107 95.3 / 0.6)", fontSize: "0.8rem" }}
                    onClick={handleLink}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">תנאי שימוש</span>
                  </span>
                </Link>
                <Link href="/privacy">
                  <span
                    className={ITEM_BASE}
                    style={{ color: "oklch(0.9904 0.0107 95.3 / 0.6)", fontSize: "0.8rem" }}
                    onClick={handleLink}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">מדיניות פרטיות</span>
                  </span>
                </Link>
                <div
                  className={ITEM_BASE}
                  style={{ color: "oklch(0.65 0.14 145)", fontSize: "0.8rem", cursor: "default" }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">מאובטח ומוגן</span>
                </div>
              </div>

              {/* Email + Report row */}
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

              {/* Copyright */}
              <p
                className="text-center mt-2.5"
                style={{ fontSize: "0.65rem", color: "oklch(0.9904 0.0107 95.3 / 0.25)" }}
              >
                © AvodaNow 2026 · כל הזכויות שמורות
              </p>
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

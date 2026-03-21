import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { trpc } from "@/lib/trpc";
import LoginModal from "./LoginModal";
import MobileDrawer from "./MobileDrawer";
import { AppButton } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase, User, LogOut, PlusCircle, Menu, X, Shield,
  HardHat, MapPin, Flame, Users, RefreshCw, RotateCcw, ChevronDown, Bookmark, Gift,
  Moon, Sun, AlertTriangle,
} from "lucide-react";
import ReportProblemModal from "./ReportProblemModal";
import CompleteProfileModal from "./CompleteProfileModal";

import {
  C_BRAND as BLUE, C_BRAND_LIGHT as BLUE_BG,
  C_SURFACE as BG, C_BORDER_OKLCH as BORDER,
  C_TEXT_PRIMARY as TEXT_PRIMARY, C_TEXT_MUTED as TEXT_MUTED,
  C_BRAND_ACTIVE_BORDER as BLUE_ACTIVE_BORDER,
} from "@/lib/colors";

const HEADER_DIVIDER = "oklch(0.42 0.07 124.9)";
const ACTIVE_BG = "oklch(0.42 0.07 124.9)";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();
  const { userMode, setUserMode, resetUserMode } = useUserMode();
  const { employerLock } = usePlatformSettings();
  const [loginOpen, setLoginOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Auto-show profile completion for Google users with no phone
  // Use a session flag so it only prompts once per browser session (not on every render)
  const [completeProfileOpen, setCompleteProfileOpen] = useState(false);
  const completeProfileShown = useRef(false);

  useEffect(() => {
    if (
      !completeProfileShown.current &&
      isAuthenticated &&
      user?.loginMethod === "google_oauth" &&
      !user?.phone
    ) {
      completeProfileShown.current = true;
      // Small delay so the page finishes loading before the modal appears
      const t = setTimeout(() => setCompleteProfileOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, user?.loginMethod, user?.phone]);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const lastScrollY = useRef(0);

  // Glass effect on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close drawer when user scrolls down ≥ 60px
  useEffect(() => {
    if (!mobileOpen) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY - lastScrollY.current > 60) {
        setMobileOpen(false);
      }
      lastScrollY.current = currentY;
    };
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  // ── Unread applications badge ────────────────────────────────────────────
  // lastSeenAt is stored in localStorage when worker visits /my-applications
  const lastSeenAt = useMemo(() => {
    if (typeof window === "undefined") return new Date(0);
    const stored = localStorage.getItem("myApplicationsLastSeen");
    return stored ? new Date(stored) : new Date(0);
  }, []);

  const { data: profileData } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated && userMode === "worker",
    staleTime: 60_000,
  });
  const profilePhoto = profileData?.profilePhoto ?? null;

  const { data: unreadCount } = trpc.jobs.unreadApplicationsCount.useQuery(
    { lastSeenAt },
    {
      enabled: isAuthenticated && userMode === "worker",
      refetchInterval: 60_000, // re-check every minute
      staleTime: 30_000,
    }
  );
  const hasUnread = (unreadCount ?? 0) > 0;

  const { data: savedIdsData } = trpc.savedJobs.getSavedIds.useQuery(undefined, {
    enabled: isAuthenticated && userMode === "worker",
    staleTime: 30_000,
  });
  const savedJobsCount = savedIdsData?.ids?.length ?? 0;

  const workerLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: MapPin },
    { href: "/find-jobs?filter=today", label: "עבודות להיום", icon: Flame },
    { href: "/my-applications", label: "מועמדויות", icon: Briefcase },
    { href: "/my-applications?tab=saved", label: "משרות ששמרתי", icon: Bookmark },
    { href: "/worker-profile", label: "פרופיל", icon: User },
  ];

  const employerLinks = [
    { href: "/post-job", label: "פרסם משרה", icon: PlusCircle },
    { href: "/my-jobs", label: "המשרות שלי", icon: Briefcase },
    { href: "/available-workers", label: "עובדים זמינים", icon: Users },
    { href: "/employer-profile", label: "פרופיל", icon: User },
  ];

  const guestLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: MapPin },
    { href: "/post-job", label: "פרסם משרה", icon: PlusCircle },
  ];

  // For guests with a saved session role, show role-specific links
  const navLinks = !isAuthenticated
    ? userMode === "worker"
      ? workerLinks.filter(l => l.href === "/find-jobs" || l.href === "/find-jobs?filter=today")
      : userMode === "employer"
      ? employerLinks.filter(l => l.href === "/post-job")
      : guestLinks
    : userMode === "worker"
    ? workerLinks
    : userMode === "employer"
    ? employerLinks
    : guestLinks;

  const roleBadge =
    userMode === "worker" ? (
      <span
        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide"
        style={{
          background: "oklch(0.75 0.12 76.7 / 0.18)",
          color: "oklch(0.82 0.15 80.8)",
          border: "1px solid oklch(0.75 0.12 76.7 / 0.35)",
        }}
      >
        <HardHat className="h-2.5 w-2.5" />
        עובד
      </span>
    ) : userMode === "employer" ? (
      <span
        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide"
        style={{
          background: "oklch(0.82 0.15 80.8 / 0.18)",
          color: "oklch(0.82 0.15 80.8)",
          border: "1px solid oklch(0.82 0.15 80.8 / 0.35)",
        }}
      >
        <Briefcase className="h-2.5 w-2.5" />
        מעסיק
      </span>
    ) : null;

  return (
    <>
      <header
        className="sticky top-0 z-50"
        dir="rtl"
        aria-label="כותרת האתר"
        style={{
          background: scrolled
            ? "oklch(0.3329 0.0694 124.9 / 0.82)"
            : "var(--header-bg)",
          borderBottom: `1px solid ${HEADER_DIVIDER}`,
          boxShadow: scrolled
            ? "0 4px 24px oklch(0 0 0 / 0.22), 0 1px 0 oklch(1 0 0 / 0.06) inset"
            : "0 4px 24px oklch(0 0 0 / 0.28), 0 1px 0 oklch(1 0 0 / 0.06) inset",
          backdropFilter: scrolled ? "blur(20px) saturate(1.6)" : "blur(12px)",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.6)" : "blur(12px)",
          transition: "background 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <div className="w-full px-4">
          {/* ── Mobile header (3-column RTL layout) ── */}
          <div className="flex items-center h-16">
            {/* Right side: hamburger + user icon */}
            <div className="flex items-center gap-1">
              {/* Hamburger */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{
                  background: mobileOpen ? ACTIVE_BG : "transparent",
                  color: "#e8eae5",
                  border: `1px solid ${mobileOpen ? "oklch(0.50 0.07 124.9)" : "transparent"}`,
                }}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="תפריט נייד"
                aria-expanded={mobileOpen}
                aria-controls="mobile-drawer"
              >
                <AnimatePresence mode="wait">
                  {mobileOpen ? (
                    <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              {/* User icon — always visible; opens login for guests, navigates for auth users */}
              {isAuthenticated ? (
                <Link href={userMode === "worker" ? "/worker-profile" : "/employer-profile"}>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{
                      background: (location === "/worker-profile" || location === "/employer-profile") ? ACTIVE_BG : "transparent",
                      color: (location === "/worker-profile" || location === "/employer-profile") ? "var(--citrus)" : "#e8eae5",
                      border: `1px solid ${(location === "/worker-profile" || location === "/employer-profile") ? "oklch(0.50 0.07 124.9)" : "transparent"}`,
                    }}
                    aria-label="הפרופיל שלי"
                  >
                    <User className="h-5 w-5" />
                  </motion.button>
                </Link>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setLoginOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{
                    background: "transparent",
                    color: "#e8eae5",
                    border: "1px solid transparent",
                  }}
                  aria-label="כניסה"
                >
                  <User className="h-5 w-5" />
                </motion.button>
              )}
            </div>

            {/* Center: Logo */}
            <Link href="/" className="flex-1 flex items-center justify-center gap-2 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
                  boxShadow: "0 2px 10px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)",
                }}
              >
                <Briefcase className="h-4 w-4" style={{ color: "var(--citrus)" }} />
              </motion.div>
              <div className="flex flex-col leading-none">
                <span lang="en" className="font-black text-[17px] tracking-tight" style={{ color: "var(--header-fg)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", letterSpacing: "-0.03em" }}>
                  Avoda<span style={{ color: "var(--citrus)" }}>Now</span>
                </span>
                <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "oklch(0.9904 0.0107 95.3 / 0.70)", letterSpacing: "0.14em" }}>עבודה עכשיו</span>
              </div>
            </Link>

            {/* Left side: applications + saved jobs (worker only) */}
            <div className="flex items-center gap-1">
              {isAuthenticated && userMode === "worker" && (
                <>
                  {/* My Applications */}
                  <Link href="/my-applications">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="relative w-9 h-9 flex items-center justify-center rounded-xl"
                      style={{
                        background: location.startsWith("/my-applications") && !location.includes("saved") ? ACTIVE_BG : "transparent",
                        color: location.startsWith("/my-applications") && !location.includes("saved") ? "var(--citrus)" : "#e8eae5",
                        border: `1px solid ${location.startsWith("/my-applications") && !location.includes("saved") ? "oklch(0.50 0.07 124.9)" : "transparent"}`,
                      }}
                      aria-label="המועמדויות שלי"
                    >
                      <Briefcase className="h-5 w-5" />
                      {hasUnread && (
                        <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </motion.button>
                  </Link>
                  {/* Saved Jobs */}
                  <Link href="/my-applications?tab=saved">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="relative w-9 h-9 flex items-center justify-center rounded-xl"
                      style={{
                        background: location.includes("saved") ? ACTIVE_BG : "transparent",
                        color: location.includes("saved") ? "var(--citrus)" : "#e8eae5",
                        border: `1px solid ${location.includes("saved") ? "oklch(0.50 0.07 124.9)" : "transparent"}`,
                      }}
                      aria-label="משרות ששמרתי"
                    >
                      <Bookmark className="h-5 w-5" />
                      {savedJobsCount > 0 && (
                        <span
                          className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-0.5"
                          style={{ background: "var(--citrus)", color: "oklch(0.22 0.03 122.3)" }}
                        >
                          {savedJobsCount > 9 ? "9+" : savedJobsCount}
                        </span>
                      )}
                    </motion.button>
                  </Link>
                </>
              )}
              {/* Guest login handled by user icon in the right side of the header */}
            </div>
          </div>

          {/* ── Desktop header ── */}
          <div className="hidden items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center relative"
                style={{
                  background: "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
                  boxShadow: "0 2px 10px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)",
                }}
              >
                <Briefcase className="h-4.5 w-4.5" style={{ color: "var(--citrus)" }} />
              </motion.div>
              <div className="flex flex-col leading-none">
                <span
                  className="font-black text-[19px] tracking-tight"
                  style={{
                    color: "var(--header-fg)",
                    fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
                    letterSpacing: "-0.03em",
                    textShadow: "0 1px 3px oklch(0 0 0 / 0.2)",
                  }}
                >
                  <span lang="en">Avoda<span style={{ color: "var(--citrus)", textShadow: "0 0 12px oklch(0.82 0.15 80.8 / 0.4)" }}>Now</span></span>
                </span>
                <span
                  className="text-[8px] font-bold tracking-widest uppercase"
                  style={{ color: "oklch(0.9904 0.0107 95.3 / 0.40)", letterSpacing: "0.14em" }}
                >
                  עבודה עכשיו
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5" aria-label="ניווט ראשי">
              <ul className="flex items-center gap-0.5 list-none m-0 p-0">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <li key={link.href}>
                  <Link href={link.href}>
                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      aria-current={isActive ? "page" : undefined}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                      style={{
                        background: isActive ? ACTIVE_BG : "transparent",
                        color: isActive ? "var(--citrus)" : "#e8eae5",
                        border: isActive ? `1px solid oklch(0.50 0.07 124.9)` : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.color = "#e8eae5";
                      }}
                    >
                      <link.icon className="h-3.5 w-3.5 shrink-0" />
                      {link.label}
                      {link.href === "/my-applications" && hasUnread && (
                        <span
                          style={{
                            background: "oklch(0.60 0.22 25)",
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
                          {unreadCount}
                        </span>
                      )}
                      {link.href === "/my-applications?tab=saved" && savedJobsCount > 0 && (
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
                          {savedJobsCount}
                        </span>
                      )}
                    </motion.span>
                  </Link>
                  </li>
                );
              })}
              </ul>
            </nav>

            {/* Auth actions */}
            <div className="flex items-center gap-2">
              {/* Dark/Light mode toggle */}
              {switchable && toggleTheme && (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleTheme}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                  style={{
                    background: "oklch(0.42 0.07 124.9)",
                    border: "1px solid oklch(0.50 0.07 124.9)",
                    color: "var(--citrus)",
                  }}
                  aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
                  title={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </motion.button>
              )}
              {isAuthenticated ? (
                <div className="hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                      style={{
                        background: "oklch(0.42 0.07 124.9)",
                        border: "1px solid oklch(0.50 0.07 124.9)",
                        color: "var(--header-fg)",
                      }}
                    >
                        <div
                        className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ background: "oklch(0.50 0.07 124.9)" }}
                      >
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="פרופיל" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-3.5 w-3.5" style={{ color: "var(--citrus)" }} />
                        )}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium max-w-[80px] truncate">
                        {user?.name ?? user?.phone ?? "פרופיל"}
                      </span>
                      {roleBadge && <span className="hidden sm:flex">{roleBadge}</span>}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52"
                    style={{
                      direction: "rtl",
                      textAlign: "right",
                      background: "white",
                      border: "1px solid oklch(0.87 0.04 84.0)",
                      boxShadow: "0 12px 40px oklch(0 0 0 / 0.14), 0 2px 8px oklch(0 0 0 / 0.08)",
                      borderRadius: "16px",
                    }}
                  >
                    {userMode && (
                      <>
                        <div
                          className="px-3 py-2 text-xs rounded-t-[14px]"
                          style={{
                            color: TEXT_MUTED,
                            background: "oklch(0.96 0.02 122.3)",
                            borderBottom: "1px solid oklch(0.87 0.04 84.0)",
                          }}
                        >
                          מחובר כ: {userMode === "worker" ? "מחפש עבודה 👷" : "מעסיק 💼"}
                        </div>
                      </>
                    )}

                    <DropdownMenuSeparator style={{ background: "oklch(0.87 0.04 84.0)" }} />

                    {/* Hide mode switch to employer when employer lock is active */}
                    {!(employerLock && userMode === "worker") && (
                    <DropdownMenuItem
                      onClick={() => setUserMode(userMode === "worker" ? "employer" : "worker")}
                      className="flex items-center gap-2"
                      style={{ color: TEXT_MUTED }}
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      <span>{userMode === "worker" ? "עבור למצב מעסיק" : "עבור למצב עובד"}</span>
                    </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={resetUserMode}
                      className="flex items-center gap-2"
                      style={{ color: TEXT_MUTED }}
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" />
                      <span>אפס בחירת תפקיד</span>
                    </DropdownMenuItem>

                    {user?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: BLUE }}>
                          <Shield className="h-4 w-4 shrink-0" />
                          <span>פאנל ניהול</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {userMode === "worker" && (
                      <DropdownMenuItem asChild>
                        <Link href="/worker-profile" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_MUTED }}>
                          <User className="h-4 w-4 shrink-0" />
                          <span>הפרופיל שלי</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {userMode === "employer" && (
                      <DropdownMenuItem asChild>
                        <Link href="/employer-profile" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_MUTED }}>
                          <User className="h-4 w-4 shrink-0" />
                          <span>הפרופיל שלי</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/my-referrals" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_MUTED }}>
                        <Gift className="h-4 w-4 shrink-0" />
                        <span>הפניות שלי</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setReportOpen(true)}
                      className="flex items-center gap-2"
                      style={{ color: TEXT_MUTED }}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>דווח על בעיה</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator style={{ background: "oklch(0.87 0.04 84.0)" }} />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-2 text-red-500 focus:text-red-600 rounded-b-[14px]"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>התנתק</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Guest role badge + switch button */}
                  {userMode && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => resetUserMode()}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                      style={{
                        background: "oklch(0.42 0.07 124.9)",
                        border: "1px solid oklch(0.50 0.07 124.9)",
                        color: "#e8eae5",
                      }}
                      title="שנה תפקיד"
                    >
                      {userMode === "worker" ? <HardHat className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                      {userMode === "worker" ? "עובד" : "מעסיק"}
                      <RefreshCw className="h-3 w-3 opacity-60" />
                    </motion.button>
                  )}
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <button
                      onClick={() => setLoginOpen(true)}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: "linear-gradient(135deg, var(--citrus) 0%, var(--amber) 100%)",
                        color: "oklch(0.22 0.03 122.3)",
                        boxShadow: "0 2px 10px oklch(0.82 0.15 80.8 / 0.4)",
                      }}
                    >
                      כניסה
                    </button>
                  </motion.div>
                </div>
              )}

            </div>
          </div>
        </div>

      </header>

      {/* Mobile drawer - replaces inline mobile nav */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLoginOpen={() => setLoginOpen(true)}
        onReportOpen={() => setReportOpen(true)}
      />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ReportProblemModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <CompleteProfileModal
        open={completeProfileOpen}
        onClose={() => setCompleteProfileOpen(false)}
      />
    </>
  );
}

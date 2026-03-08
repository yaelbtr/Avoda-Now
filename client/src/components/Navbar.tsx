import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "./LoginModal";
import { AppButton } from "@/components/AppButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase, User, LogOut, PlusCircle, Menu, X, Shield,
  HardHat, MapPin, Flame, Users, RefreshCw, RotateCcw, ChevronDown,
} from "lucide-react";

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
  const { userMode, setUserMode, resetUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const workerLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: MapPin },
    { href: "/jobs-today", label: "עבודות להיום", icon: Flame },
    { href: "/my-applications", label: "מועמדויות", icon: Briefcase },
    { href: "/worker-profile", label: "פרופיל", icon: User },
  ];

  const employerLinks = [
    { href: "/post-job", label: "פרסם משרה", icon: PlusCircle },
    { href: "/my-jobs", label: "המשרות שלי", icon: Briefcase },
    { href: "/available-workers", label: "עובדים זמינים", icon: Users },
  ];

  const guestLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: MapPin },
    { href: "/post-job", label: "פרסם משרה", icon: PlusCircle },
  ];

  const navLinks = !isAuthenticated
    ? guestLinks
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
        style={{
          background: "var(--header-bg)",
          borderBottom: `1px solid ${HEADER_DIVIDER}`,
          boxShadow: "0 4px 24px oklch(0 0 0 / 0.28), 0 1px 0 oklch(1 0 0 / 0.06) inset",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
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
                  Avoda<span style={{ color: "var(--citrus)", textShadow: "0 0 12px oklch(0.82 0.15 80.8 / 0.4)" }}>Now</span>
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
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
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
                    </motion.span>
                  </Link>
                );
              })}
            </nav>

            {/* Auth actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
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
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: "oklch(0.50 0.07 124.9)" }}
                      >
                        <User className="h-3.5 w-3.5" style={{ color: "var(--citrus)" }} />
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

                    {userMode === "worker" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/find-jobs" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <MapPin className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                            <span>חפש עבודה</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/jobs-today" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <Flame className="h-4 w-4 shrink-0 text-orange-500" />
                            <span>עבודות להיום</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my-applications" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <Briefcase className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                            <span>המועמדויות שלי</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/worker-profile" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <User className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                            <span>הפרופיל שלי</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {userMode === "employer" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/post-job" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <PlusCircle className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                            <span>פרסם משרה</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/available-workers" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <Users className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                            <span>עובדים זמינים</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my-jobs" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <Briefcase className="h-4 w-4 shrink-0" style={{ color: BLUE }} />
                            <span>המשרות שלי</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator style={{ background: "oklch(0.87 0.04 84.0)" }} />

                    <DropdownMenuItem
                      onClick={() => setUserMode(userMode === "worker" ? "employer" : "worker")}
                      className="flex items-center gap-2"
                      style={{ color: TEXT_MUTED }}
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      <span>{userMode === "worker" ? "עבור למצב מעסיק" : "עבור למצב עובד"}</span>
                    </DropdownMenuItem>

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
              ) : (
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
              )}

              {/* Mobile menu toggle */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl"
                style={{
                  background: mobileOpen ? ACTIVE_BG : "transparent",
                  color: "#e8eae5",
                  border: `1px solid ${mobileOpen ? "oklch(0.50 0.07 124.9)" : "transparent"}`,
                }}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="תפריט"
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
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden"
              dir="rtl"
              style={{
                borderTop: `1px solid ${HEADER_DIVIDER}`,
                background: "var(--header-bg)",
              }}
            >
              <nav className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-1">
                {isAuthenticated && userMode && (
                  <div
                    className="px-3 py-2.5 text-xs rounded-xl mb-2 flex items-center gap-2"
                    style={{
                      color: "oklch(0.9904 0.0107 95.3 / 0.6)",
                      background: "oklch(0.42 0.07 124.9)",
                      border: `1px solid ${HEADER_DIVIDER}`,
                    }}
                  >
                    <span className="text-base">{userMode === "worker" ? "👷" : "💼"}</span>
                    מחובר כ: {userMode === "worker" ? "מחפש עבודה" : "מעסיק"}
                  </div>
                )}

                {navLinks.map((link, i) => {
                  const isActive = location === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link href={link.href}>
                        <span
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-right cursor-pointer"
                          style={{
                            background: isActive ? ACTIVE_BG : "transparent",
                            color: isActive ? "var(--citrus)" : "#e8eae5",
                            border: isActive ? `1px solid oklch(0.50 0.07 124.9)` : "1px solid transparent",
                          }}
                          onClick={() => setMobileOpen(false)}
                        >
                          <link.icon className="h-4 w-4 shrink-0" />
                          {link.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}

                {isAuthenticated && (
                  <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${HEADER_DIVIDER}` }}>
                    <button
                      onClick={() => { setUserMode(userMode === "worker" ? "employer" : "worker"); setMobileOpen(false); }}
                      className="flex items-center gap-2.5 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ color: "#e8eae5" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = ACTIVE_BG)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      {userMode === "worker" ? "עבור למצב מעסיק" : "עבור למצב עובד"}
                    </button>

                    <button
                      onClick={() => { resetUserMode(); setMobileOpen(false); }}
                      className="flex items-center gap-2.5 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ color: "#e8eae5" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = ACTIVE_BG)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" />
                      אפס בחירת תפקיד
                    </button>

                    {user?.role === "admin" && (
                      <Link href="/admin">
                        <span
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
                          style={{ color: "var(--citrus)" }}
                          onClick={() => setMobileOpen(false)}
                        >
                          <Shield className="h-4 w-4 shrink-0" />
                          פאנל ניהול
                        </span>
                      </Link>
                    )}

                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex items-center gap-2.5 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      התנתק
                    </button>
                  </div>
                )}

                {!isAuthenticated && (
                  <button
                    onClick={() => { setLoginOpen(true); setMobileOpen(false); }}
                    className="w-full mt-3 py-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, var(--citrus) 0%, var(--amber) 100%)",
                      color: "oklch(0.22 0.03 122.3)",
                      boxShadow: "0 2px 10px oklch(0.82 0.15 80.8 / 0.4)",
                    }}
                  >
                    כניסה
                  </button>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

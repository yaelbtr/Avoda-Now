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
  HardHat, MapPin, Flame, Users, RefreshCw, RotateCcw,
} from "lucide-react";

// Design tokens (light theme) — sourced from @/lib/colors
import {
  C_BRAND as BLUE, C_BRAND_LIGHT as BLUE_BG,
  C_SURFACE as BG, C_BORDER_OKLCH as BORDER,
  C_TEXT_PRIMARY as TEXT_PRIMARY, C_TEXT_MUTED as TEXT_MUTED,
  C_BRAND_ACTIVE_BORDER as BLUE_ACTIVE_BORDER,
} from "@/lib/colors";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { userMode, setUserMode, resetUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const workerLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: MapPin },
    { href: "/jobs-today", label: "עבודות להיום", icon: Flame },
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
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
        style={{
          background: "oklch(0.97 0.015 75)",
          color: "oklch(0.55 0.14 65)",
          border: "1px solid oklch(0.88 0.06 75)",
        }}
      >
        <HardHat className="h-3 w-3" />
        עובד
      </span>
    ) : userMode === "employer" ? (
      <span
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
        style={{
          background: BLUE_BG,
          color: BLUE,
          border: `1px solid ${BLUE_ACTIVE_BORDER}`,
        }}
      >
        <Briefcase className="h-3 w-3" />
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
          borderBottom: "1px solid oklch(0.40 0.07 124.9)",
          boxShadow: "0 2px 8px oklch(0 0 0 / 0.18)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.40 0.07 124.9)" }}
              >
                <Briefcase className="h-4 w-4" style={{ color: "var(--citrus)" }} />
              </motion.div>
              <span className="font-black text-lg" style={{ color: "var(--header-fg)" }}>
                Avoda<span style={{ color: "var(--citrus)" }}>Now</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all cursor-pointer inline-block"
                      style={{
                        background: isActive ? "oklch(0.40 0.07 124.9)" : "transparent",
                        color: isActive ? "var(--citrus)" : "oklch(0.85 0.03 95.3)",
                        border: isActive ? "1px solid oklch(0.50 0.07 124.9)" : "1px solid transparent",
                      }}
                    >
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
                    <AppButton
                      variant="ghost"
                      size="sm"
                    className="gap-2"
                    style={{ color: "var(--header-fg)", background: "transparent" }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "oklch(0.40 0.07 124.9)", border: "1px solid oklch(0.50 0.07 124.9)" }}
                      >
                        <User className="h-3.5 w-3.5" style={{ color: "var(--citrus)" }} />
                      </div>
                      <span className="hidden sm:inline text-sm">
                        {user?.name ?? user?.phone ?? "פרופיל"}
                      </span>
                      {roleBadge && <span className="hidden sm:flex">{roleBadge}</span>}
                    </AppButton>
                </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52"
                    style={{
                      direction: "rtl",
                      textAlign: "right",
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      boxShadow: "0 8px 24px oklch(0 0 0 / 0.10)",
                    }}
                  >
                    {userMode && (
                      <>
                        <div className="px-2 py-1.5 text-xs" style={{ color: TEXT_MUTED }}>
                          מחובר כ: {userMode === "worker" ? "מחפש עבודה 👷" : "מעסיק 💼"}
                        </div>
                        <DropdownMenuSeparator style={{ background: BORDER }} />
                      </>
                    )}

                    {userMode === "worker" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/find-jobs" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <MapPin className="h-4 w-4 shrink-0" />
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
                          <Link href="/worker-profile" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <User className="h-4 w-4 shrink-0" />
                            <span>הפרופיל שלי</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {userMode === "employer" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/post-job" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <PlusCircle className="h-4 w-4 shrink-0" />
                            <span>פרסם משרה</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/available-workers" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <Users className="h-4 w-4 shrink-0" />
                            <span>עובדים זמינים</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my-jobs" className="flex items-center gap-2 cursor-pointer w-full" style={{ color: TEXT_PRIMARY }}>
                            <Briefcase className="h-4 w-4 shrink-0" />
                            <span>המשרות שלי</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator style={{ background: BORDER }} />

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

                    <DropdownMenuSeparator style={{ background: BORDER }} />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-2 text-red-500 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>התנתק</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <AppButton
                    variant="brand"
                    size="sm"
                    onClick={() => setLoginOpen(true)}
                  >
                    כניסה
                  </AppButton>
                </motion.div>
              )}

              {/* Mobile menu toggle */}
              <AppButton
                variant="ghost"
                size="icon"
                className="md:hidden"
                style={{ color: "oklch(0.85 0.03 95.3)", background: "transparent" }}
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
              </AppButton>
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
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden"
              dir="rtl"
              style={{
                borderTop: "1px solid oklch(0.40 0.07 124.9)",
                background: "var(--header-bg)",
              }}
            >
              <nav className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-1">
                {isAuthenticated && userMode && (
                  <div className="px-3 py-2 text-xs border-b mb-1" style={{ color: "oklch(0.75 0.03 95.3)", borderColor: "oklch(0.40 0.07 124.9)" }}>
                    מחובר כ: {userMode === "worker" ? "👷 מחפש עבודה" : "💼 מעסיק"}
                  </div>
                )}

                {navLinks.map((link, i) => {
                  const isActive = location === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={link.href}>
                        <span
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-right cursor-pointer"
                          style={{
                            background: isActive ? "oklch(0.40 0.07 124.9)" : "transparent",
                            color: isActive ? "var(--citrus)" : "oklch(0.80 0.03 95.3)",
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
                  <>
                    <button
                      onClick={() => { setUserMode(userMode === "worker" ? "employer" : "worker"); setMobileOpen(false); }}
                      className="flex items-center gap-2 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[oklch(0.40_0.07_124.9)]"
                      style={{ color: "oklch(0.80 0.03 95.3)" }}
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      {userMode === "worker" ? "עבור למצב מעסיק" : "עבור למצב עובד"}
                    </button>

                    <button
                      onClick={() => { resetUserMode(); setMobileOpen(false); }}
                      className="flex items-center gap-2 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[oklch(0.40_0.07_124.9)]"
                      style={{ color: "oklch(0.80 0.03 95.3)" }}
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" />
                      אפס בחירת תפקיד
                    </button>

                    {user?.role === "admin" && (
                      <Link href="/admin">
                        <span
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-slate-50"
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
                      className="flex items-center gap-2 w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-red-50 text-red-500"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      התנתק
                    </button>
                  </>
                )}

                {!isAuthenticated && (
                  <button
                    onClick={() => { setLoginOpen(true); setMobileOpen(false); }}
                    className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: BLUE }}
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

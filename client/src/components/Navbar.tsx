import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import LoginModal from "./LoginModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  User,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Shield,
  HardHat,
  MapPin,
  Flame,
  Users,
  RefreshCw,
} from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { userMode, setUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Worker nav links
  const workerLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: "🔍" },
    { href: "/jobs-today", label: "עבודות להיום", icon: "🔥" },
  ];

  // Employer nav links
  const employerLinks = [
    { href: "/post-job", label: "פרסם משרה", icon: "➕" },
    { href: "/available-workers", label: "עובדים זמינים", icon: "👥" },
    { href: "/my-jobs", label: "המשרות שלי", icon: "📋" },
  ];

  // Guest / no-mode links
  const guestLinks = [
    { href: "/find-jobs", label: "חפש עבודה", icon: "🔍" },
    { href: "/post-job", label: "פרסם משרה", icon: "➕" },
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
      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
        <HardHat className="h-3 w-3" />
        עובד
      </span>
    ) : userMode === "employer" ? (
      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
        <Briefcase className="h-3 w-3" />
        מעסיק
      </span>
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm" dir="rtl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">Job-Now</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      location === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.icon} {link.label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Auth actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline text-sm">
                        {user?.name ?? user?.phone ?? "פרופיל"}
                      </span>
                      {roleBadge && <span className="hidden sm:flex">{roleBadge}</span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52" style={{ direction: "rtl", textAlign: "right" }}>
                    {/* Current role indicator */}
                    {userMode && (
                      <>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          מחובר כ: {userMode === "worker" ? "מחפש עבודה 👷" : "מעסיק 💼"}
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* Worker-specific items */}
                    {userMode === "worker" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/find-jobs" className="flex items-center gap-2 cursor-pointer w-full">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>חפש עבודה</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/jobs-today" className="flex items-center gap-2 cursor-pointer w-full">
                            <Flame className="h-4 w-4 shrink-0 text-orange-500" />
                            <span>עבודות להיום</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Employer-specific items */}
                    {userMode === "employer" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/post-job" className="flex items-center gap-2 cursor-pointer w-full">
                            <PlusCircle className="h-4 w-4 shrink-0" />
                            <span>פרסם משרה</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/available-workers" className="flex items-center gap-2 cursor-pointer w-full">
                            <Users className="h-4 w-4 shrink-0" />
                            <span>עובדים זמינים</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my-jobs" className="flex items-center gap-2 cursor-pointer w-full">
                            <Briefcase className="h-4 w-4 shrink-0" />
                            <span>המשרות שלי</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />

                    {/* Switch role */}
                    <DropdownMenuItem
                      onClick={() => setUserMode(userMode === "worker" ? "employer" : "worker")}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <RefreshCw className="h-4 w-4 shrink-0" />
                      <span>
                        {userMode === "worker" ? "עבור למצב מעסיק" : "עבור למצב עובד"}
                      </span>
                    </DropdownMenuItem>

                    {user?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer w-full">
                          <Shield className="h-4 w-4 shrink-0" />
                          <span>פאנל ניהול</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-destructive focus:text-destructive flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>התנתק</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" onClick={() => setLoginOpen(true)}>
                  כניסה
                </Button>
              )}

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="תפריט"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-white" dir="rtl">
            <nav className="max-w-2xl mx-auto px-4 py-2 flex flex-col gap-1">
              {/* Role badge in mobile */}
              {isAuthenticated && userMode && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
                  מחובר כ: {userMode === "worker" ? "👷 מחפש עבודה" : "💼 מעסיק"}
                </div>
              )}

              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-right ${
                      location === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.icon} {link.label}
                  </span>
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      setUserMode(userMode === "worker" ? "employer" : "worker");
                      setMobileOpen(false);
                    }}
                    className="block w-full text-right px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    🔄 {userMode === "worker" ? "עבור למצב מעסיק" : "עבור למצב עובד"}
                  </button>

                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <span
                        className="block px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 text-right"
                        onClick={() => setMobileOpen(false)}
                      >
                        🛡️ פאנל ניהול
                      </span>
                    </Link>
                  )}

                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="block w-full text-right px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    התנתק
                  </button>
                </>
              )}

              {!isAuthenticated && (
                <button
                  onClick={() => { setLoginOpen(true); setMobileOpen(false); }}
                  className="block w-full text-right px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  כניסה / הרשמה
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

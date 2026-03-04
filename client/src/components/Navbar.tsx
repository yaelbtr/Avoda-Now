import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "./LoginModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, User, LogOut, PlusCircle, Menu, X, Shield, Flame } from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "בית" },
    { href: "/find-jobs", label: "חפש עבודה" },
    { href: "/jobs-today", label: "🔥 להיום" },
    { href: "/post-job", label: "פרסם משרה" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm" dir="rtl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo — rightmost in RTL */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">Job-Now</span>
            </Link>

            {/* Desktop nav — center */}
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
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Auth actions — leftmost in RTL */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline text-sm">
                        {user?.name ?? user?.phone ?? "פרופיל"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48" style={{ direction: "rtl", textAlign: "right" }}>
                    <DropdownMenuItem asChild>
                      <Link href="/my-jobs" className="flex items-center gap-2 cursor-pointer w-full">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span>המשרות שלי</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/post-job" className="flex items-center gap-2 cursor-pointer w-full">
                        <PlusCircle className="h-4 w-4 shrink-0" />
                        <span>פרסם משרה</span>
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer w-full">
                          <Shield className="h-4 w-4 shrink-0" />
                          <span>פאנל ניהול</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
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
                    {link.label}
                  </span>
                </Link>
              ))}
              {isAuthenticated && (
                <Link href="/my-jobs">
                  <span
                    className="block px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted text-right"
                    onClick={() => setMobileOpen(false)}
                  >
                    המשרות שלי
                  </span>
                </Link>
              )}
              {isAuthenticated && user?.role === "admin" && (
                <Link href="/admin">
                  <span
                    className="block px-3 py-2.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 text-right"
                    onClick={() => setMobileOpen(false)}
                  >
                    פאנל ניהול
                  </span>
                </Link>
              )}
              {isAuthenticated && (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="block w-full text-right px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  התנתק
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

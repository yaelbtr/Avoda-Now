import { useState } from "react";
import { X, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "./LoginModal";
import { saveReturnPath } from "@/const";

/**
 * GuestLoginBanner
 * A slim, dismissible banner shown below the Navbar for unauthenticated users.
 * Encourages login with a short benefit message and a direct CTA.
 * Once dismissed it stays hidden for the current session (sessionStorage).
 */
const DISMISSED_KEY = "avodanow_banner_dismissed";

export default function GuestLoginBanner() {
  const { isAuthenticated, loading } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === "1"
  );
  const [loginOpen, setLoginOpen] = useState(false);

 
  return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const handleLogin = () => {
    saveReturnPath();
    setLoginOpen(true);
  };

  return (
    <>
      <div
        className="w-full z-30 flex items-center justify-between gap-3 px-4 py-2.5"
        style={{
          background: "linear-gradient(90deg, #d87a1d 0%, #389332 60%, #3b82f6 100%)",
          minHeight: 44,
        }}
        dir="rtl"
        role="banner"
        aria-label="הזמנה להתחברות"
      >
        {/* Message */}
        <p className="text-white text-sm font-medium leading-snug flex-1 text-right">
          <span className="hidden sm:inline">🔒 </span>
          התחבר כדי לראות מספרי טלפון ולפרסם משרות
        </p>

        {/* CTA button */}
        <button
          onClick={handleLogin}
          className="flex items-center gap-1.5 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shrink-0 shadow-sm"
          aria-label="כניסה / הרשמה"
        >
          <LogIn className="h-3.5 w-3.5" />
          כניסה / הרשמה
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white transition-colors shrink-0 p-0.5 rounded"
          aria-label="סגור באנר"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message="התחבר כדי לראות מספרי טלפון ולפרסם משרות"
      />
    </>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Home, Lock, ShieldCheck, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { saveReturnPath } from "@/const";
import LoginModal from "@/components/LoginModal";

/**
 * Global "coming soon" overlay — covers the entire app when FIND_JOBS_OPEN is false.
 * Rendered via createPortal at document.body level in App.tsx so it escapes all
 * stacking contexts and covers every page (Home, role selection, FindJobs, etc.).
 *
 * Mobile fix: uses a solid semi-transparent background as the primary layer so the
 * overlay is always visible even on browsers that don't support backdrop-filter
 * (older Android WebView, some iOS Safari versions). The blur is additive on top.
 *
 * Admin bypass: users with role === 'admin' see null — full page access for testing.
 */
export default function FindJobsComingSoonOverlay() {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  // Admins bypass the overlay entirely
  const isAdmin = isAuthenticated && user?.role === "admin";
  if (isAdmin) return null;

  // Hide overlay when user has navigated away from /find-jobs
  // (portal keeps the component mounted during exit animation)
  const isFindJobsRoute = location.startsWith("/find-jobs");
  if (!isFindJobsRoute) return null;

  const handleSetAlerts = () => {
    if (isAuthenticated) {
      navigate("/worker-profile?tab=settings");
    } else {
      saveReturnPath("/worker-profile?tab=settings");
      setLoginOpen(true);
    }
  };

  return (
    <>
    <motion.div
      key="find-jobs-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        /* Solid fallback — always visible on all browsers including mobile */
        background: "rgba(15, 22, 8, 0.72)",
        /* Frosted-glass enhancement for browsers that support it */
        backdropFilter: "blur(8px) saturate(0.6)",
        WebkitBackdropFilter: "blur(8px) saturate(0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        /* Block all pointer events on the page beneath */
        pointerEvents: "all",
        /* Prevent scroll on the body */
        overflowY: "auto",
      }}
      /* Prevent any click from reaching the page below */
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.06 }}
        style={{
          background: "#ffffff",
          borderRadius: 24,
          padding: "40px 28px 36px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)",
          border: "1px solid rgba(200,215,180,0.5)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: "oklch(0.94 0.04 122)",
            border: "2.5px solid oklch(0.78 0.09 122)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Lock size={30} color="oklch(0.32 0.08 122)" strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "oklch(0.25 0.07 122)",
            margin: "0 0 10px",
            lineHeight: 1.35,
          }}
        >
          בקרוב אצלכם!
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: 15,
            color: "#4a4a4a",
            lineHeight: 1.75,
            margin: "0 0 28px",
          }}
        >
          המערכת טרם נפתחה למעסיקים.
          <br />
          מומלץ להגדיר קבלת התראות,
          <br />
          על מנת שנוכל לשלוח לכם עבודות בקרוב.
          <br />
          <span style={{ color: "#888", fontSize: 13 }}>
            תודה על הסבלנות 🙏
          </span>
        </p>

        {/* Set alerts button */}
        <button
          onClick={handleSetAlerts}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "15px 0",
            borderRadius: 14,
            background: "oklch(0.35 0.08 122)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(60,80,30,0.30)",
            transition: "background 0.18s, transform 0.12s",
            WebkitTapHighlightColor: "transparent",
            marginBottom: 10,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "oklch(0.28 0.06 122)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "oklch(0.35 0.08 122)")
          }
          onTouchStart={(e) =>
            (e.currentTarget.style.background = "oklch(0.28 0.06 122)")
          }
          onTouchEnd={(e) =>
            (e.currentTarget.style.background = "oklch(0.35 0.08 122)")
          }
        >
          <Bell size={17} />
          הגדר התראות
        </button>

        {/* Back to home button — secondary style */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "13px 0",
            borderRadius: 14,
            background: "transparent",
            color: "oklch(0.35 0.08 122)",
            fontSize: 14,
            fontWeight: 700,
            border: "1.5px solid oklch(0.72 0.09 122)",
            cursor: "pointer",
            transition: "background 0.18s",
            WebkitTapHighlightColor: "transparent",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "oklch(0.96 0.03 122)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          onTouchStart={(e) =>
            (e.currentTarget.style.background = "oklch(0.96 0.03 122)")
          }
          onTouchEnd={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Home size={16} />
          חזרה לדף הבית
        </button>

        {/* Admin hint — shown only when logged in but not admin */}
        {isAuthenticated && !isAdmin && (
          <p
            style={{
              marginTop: 18,
              fontSize: 12,
              color: "#aaa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <ShieldCheck size={13} />
            גישת מנהל? התחבר עם חשבון אדמין לעקיפת המסך
          </p>
        )}
      </motion.div>
    </motion.div>

    {/* Login modal — opens when unauthenticated user clicks הגדר התראות */}
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

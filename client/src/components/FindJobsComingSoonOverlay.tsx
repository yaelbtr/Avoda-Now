import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Home, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Translucent "coming soon" overlay for FindJobs.
 * Rendered via createPortal at document.body level so it sits above
 * all page content without being trapped by stacking contexts.
 *
 * Visibility is controlled by the FIND_JOBS_OPEN flag in shared/const.ts.
 *
 * Admin bypass: users with role === 'admin' are never shown the overlay,
 * allowing them to access and test the page while it is still closed.
 */
export default function FindJobsComingSoonOverlay() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Admins bypass the overlay entirely — they can see and use the page
  const isAdmin = isAuthenticated && user?.role === "admin";
  if (isAdmin) return null;

  return (
    <motion.div
      key="find-jobs-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        /* frosted-glass effect — page content visible but blurred */
        backdropFilter: "blur(6px) saturate(0.7) brightness(0.55)",
        WebkitBackdropFilter: "blur(6px) saturate(0.7) brightness(0.55)",
        background: "rgba(20, 30, 10, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        /* block all pointer events on the page beneath */
        pointerEvents: "all",
      }}
      /* prevent any click from reaching the page below */
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.08 }}
        style={{
          background: "rgba(255, 255, 255, 0.97)",
          borderRadius: 24,
          padding: "40px 32px 36px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "oklch(0.95 0.03 122)",
            border: "2px solid oklch(0.82 0.08 122)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Lock size={28} color="oklch(0.35 0.08 122)" strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "oklch(0.28 0.06 122)",
            margin: "0 0 10px",
            lineHeight: 1.3,
          }}
        >
          חיפוש עבודה — בקרוב!
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: 15,
            color: "#555",
            lineHeight: 1.7,
            margin: "0 0 28px",
          }}
        >
          מסך חיפוש העבודה עדיין לא נפתח לציבור.
          <br />
          אנחנו עובדים על זה ונעדכן בקרוב.
          <br />
          <span style={{ color: "#888", fontSize: 13 }}>
            תודה על הסבלנות 🙏
          </span>
        </p>

        {/* Back to home button */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            background: "oklch(0.35 0.08 122)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(79,88,59,0.30)",
            transition: "background 0.18s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "oklch(0.28 0.06 122)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "oklch(0.35 0.08 122)")
          }
        >
          <Home size={17} />
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
  );
}

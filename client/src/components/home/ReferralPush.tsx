import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Gift } from "lucide-react";

export function ReferralPush() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <section
      dir="rtl"
      className="px-6 pb-10"
      style={{ background: "var(--editorial-background)", fontFamily: "var(--font-editorial-ui)" }}
    >
      <motion.button
        onClick={() => navigate("/my-referrals")}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="w-full text-right p-5 relative overflow-hidden flex items-center gap-4"
        style={{
          background: "var(--editorial-tertiary-fixed)",
          border: "1px solid var(--editorial-outline-ghost)",
          borderRadius: 24,
          boxShadow: "var(--editorial-shadow)",
        }}
      >
        <div
          className="flex items-center justify-center shrink-0 relative z-10"
          style={{
            width: 52,
            height: 52,
            background: "rgb(255 255 255 / 0.80)",
            border: "1px solid var(--editorial-outline-ghost)",
            borderRadius: 18,
          }}
        >
          <Gift size={24} strokeWidth={2.2} style={{ color: "var(--editorial-tertiary)" }} />
        </div>

        <div className="flex-1 min-w-0 relative z-10">
          <h3
            className="leading-tight mb-1"
            style={{ fontSize: 16, fontWeight: 600, color: "var(--editorial-on-tertiary-fixed)", fontFamily: "var(--font-editorial-ui)", letterSpacing: 0 }}
          >
            הזמינו חברים ותהיו ראשונים להצעות
          </h3>
          <p className="leading-snug" style={{ fontSize: 14, color: "var(--editorial-on-tertiary-fixed)" }}>
            כל חבר שמצטרף מקרב את האזור שלכם
          </p>
        </div>

        <div className="shrink-0 relative z-10" style={{ color: "var(--editorial-tertiary)" }}>
          <ArrowLeft size={20} strokeWidth={2.4} />
        </div>
      </motion.button>
    </section>
  );
}

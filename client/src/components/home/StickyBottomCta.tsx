import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { ArrowLeft } from "lucide-react";

interface StickyBottomCtaProps {
  onLoginRequired: (msg: string) => void;
}

export function StickyBottomCta({ onLoginRequired }: StickyBottomCtaProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();

  const profileQuery = trpc.user.getProfile.useQuery(undefined, authQuery());
  const profileComplete = isAuthenticated && profileQuery.data?.signupCompleted === true;

  if (profileComplete) return null;

  const handleClick = () => {
    if (isAuthenticated) {
      navigate("/worker-profile");
      return;
    }
    onLoginRequired("הצטרפו עכשיו וקבלו עבודות באזורכם");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-2 pointer-events-none"
      style={{
        background: "linear-gradient(to top, var(--editorial-background) 50%, transparent)",
        fontFamily: "var(--font-editorial-ui)",
      }}
      dir="rtl"
    >
      <button
        onClick={handleClick}
        className="w-full inline-flex items-center justify-center gap-2 font-bold text-[15px] pointer-events-auto"
        style={{
          background: "var(--editorial-cta-gradient)",
          color: "var(--editorial-on-primary)",
          height: 52,
          borderRadius: 24,
          boxShadow: "var(--editorial-shadow)",
        }}
      >
        {isAuthenticated ? "המשיכו לפרופיל" : "הצטרפו בחינם"}
        <ArrowLeft size={16} strokeWidth={2.4} />
      </button>
    </motion.div>
  );
}

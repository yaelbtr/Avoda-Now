import { motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

// ── Transition variants ───────────────────────────────────────────────────────
// A subtle fade + slight upward slide that feels native and fast.
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

const pageTransition: Transition = {
  duration: 0.22,
};

interface PageTransitionProps {
  children: ReactNode;
  /** Unique key that triggers the animation when the route changes */
  routeKey: string;
}

/**
 * Wraps page content in a Framer Motion div.
 * Must be rendered inside an AnimatePresence block (in App.tsx).
 */
export default function PageTransition({ children, routeKey }: PageTransitionProps) {
  return (
    <motion.div
      key={routeKey}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      // Ensure the wrapper doesn't break flex/grid layouts
      style={{ width: "100%", minHeight: "100%" }}
    >
      {children}
    </motion.div>
  );
}

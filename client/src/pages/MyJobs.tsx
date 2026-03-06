import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/LoginModal";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BrandLoader from "@/components/BrandLoader";
import { Briefcase, PlusCircle, Trash2, CheckCircle, XCircle,
  Clock, MapPin, Users, DollarSign, ChevronLeft, Eye, Zap,
} from "lucide-react";
import { getCategoryIcon, getCategoryLabel, formatSalary, getStartTimeLabel } from "@shared/categories";
import { toast } from "sonner";
import {
  C_BRAND as BRAND, C_BRAND_SUBTLE, C_SUCCESS as SUCCESS,
  C_WARNING as WARNING, C_DANGER, C_DARK_BG, C_DARK_CARD, C_DARK_CARD_BORDER,
  C_TEXT_ON_DARK as TEXT_BRIGHT, C_TEXT_ON_DARK_MID as TEXT_MID,
  C_TEXT_ON_DARK_FAINT as TEXT_FAINT, C_PAGE_BG_HEX,
} from "@/lib/colors";

// ── Glassmorphism helpers ─────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  background: C_DARK_CARD,
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: `1px solid ${C_DARK_CARD_BORDER}`,
  borderRadius: "1rem",
};

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Shimmer({ width = "100%", height = 14, rounded = "0.5rem" }: {
  width?: string | number; height?: number; rounded?: string;
}) {
  return (
    <div style={{ width, height, borderRadius: rounded, background: "oklch(1 0 0 / 7%)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <motion.div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 10%) 40%, oklch(1 0 0 / 18%) 50%, oklch(1 0 0 / 10%) 60%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function MyJobCardSkeleton() {
  return (
    <div style={{ ...glassCard, padding: "1rem" }} dir="rtl">
      <div className="flex items-start gap-3 mb-3">
        <Shimmer width={40} height={40} rounded="0.75rem" />
        <div className="flex-1 space-y-2">
          <Shimmer width="60%" height={15} />
          <Shimmer width="35%" height={11} />
        </div>
        <Shimmer width={56} height={22} rounded="9999px" />
      </div>
      <div className="flex gap-4 mb-3">
        <Shimmer width={80} height={11} />
        <Shimmer width={70} height={11} />
        <Shimmer width={60} height={11} />
      </div>
      <div className="flex gap-2">
        <Shimmer width={64} height={32} rounded="0.5rem" />
        <Shimmer width={80} height={32} rounded="0.5rem" />
        <Shimmer width={56} height={32} rounded="0.5rem" />
      </div>
    </div>
  );
}

// ── Animation variants ────────────────────────────────────────────────────────
const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -30, scale: 0.95, transition: { duration: 0.25 } },
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; glow?: string }> = {
  active: {
    label: "פעיל",
    bg: `${SUCCESS} / 0.12`,
    color: SUCCESS,
    border: `${SUCCESS} / 0.3`,
    glow: `0 0 10px ${SUCCESS} / 0.2`,
  },
  closed: {
    label: "סגור",
    bg: C_DARK_CARD,
    color: TEXT_FAINT,
    border: C_DARK_CARD_BORDER,
  },
  expired: {
    label: "פג תוקף",
    bg: `${WARNING} / 0.1`,
    color: WARNING,
    border: `${WARNING} / 0.25`,
  },
  under_review: {
    label: "בבדיקה",
    bg: `${BRAND} / 0.1`,
    color: C_BRAND_SUBTLE,
    border: `${BRAND} / 0.25`,
  },
};

export default function MyJobs() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: myJobs, isLoading } = trpc.jobs.myJobs.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => { utils.jobs.myJobs.invalidate(); toast.success("סטטוס עודכן"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteJob = trpc.jobs.delete.useMutation({
    onSuccess: () => { utils.jobs.myJobs.invalidate(); setDeleteId(null); toast.success("המשרה נמחקה"); },
    onError: (e) => toast.error(e.message),
  });

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C_PAGE_BG_HEX }}>
        <BrandLoader size="lg" label="טוען..." />
      </div>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: C_DARK_BG }}
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-sm w-full"
          style={{ ...glassCard, padding: "2.5rem 2rem" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${BRAND}1a`, border: `1px solid ${BRAND}33` }}
          >
            <Briefcase className="h-8 w-8" style={{ color: C_BRAND_SUBTLE }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: TEXT_BRIGHT }}>כניסה נדרשת</h2>
          <p className="text-sm mb-6" style={{ color: TEXT_MID }}>התחבר כדי לנהל את המשרות שלך</p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="w-full"
            style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, oklch(0.55 0.25 280) 100%)`,
              border: "none",
              boxShadow: `0 0 20px ${BRAND} / 0.25`,
            }}
          >
            כניסה / הרשמה
          </Button>
        </motion.div>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    );
  }

  const activeJobs = myJobs?.filter((j) => j.status === "active") ?? [];

  return (
    <div
      dir="rtl"
      className="min-h-screen"
      style={{ background: C_DARK_BG }}
    >
      {/* ── Floating background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400,
            top: -80, right: -80,
            background: `radial-gradient(circle, ${BRAND} / 0.06 0%, transparent 70%)`,

            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300, height: 300,
            bottom: 100, left: -60,
            background: `radial-gradient(circle, ${SUCCESS} / 0.05 0%, transparent 70%)`,

            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-black" style={{ color: TEXT_BRIGHT }}>
              המשרות שלי
            </h1>
            <p className="text-sm mt-0.5" style={{ color: TEXT_FAINT }}>
              {isLoading ? "טוען..." : `${activeJobs.length}/3 משרות פעילות`}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              onClick={() => navigate("/post-job")}
              size="sm"
              className="gap-2"
              style={{
                background: `linear-gradient(135deg, ${BRAND} 0%, oklch(0.55 0.25 280) 100%)`,
                border: "none",
                boxShadow: `0 0 16px ${BRAND} / 0.3`,
              }}
            >
              <PlusCircle className="h-4 w-4" />
              פרסם משרה
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Active limit bar ── */}
        <AnimatePresence>
          {!isLoading && activeJobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{ ...glassCard, padding: "1rem", marginBottom: "1.25rem" }}
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span style={{ color: TEXT_FAINT }}>{activeJobs.length} מתוך 3</span>
                <span className="font-semibold" style={{ color: TEXT_BRIGHT }}>משרות פעילות</span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 6, background: C_DARK_CARD }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(activeJobs.length / 3) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  style={{
                    height: "100%",
                    borderRadius: "9999px",
                    background: activeJobs.length >= 3
                      ? `linear-gradient(90deg, ${C_DANGER} 0%, oklch(0.65 0.22 15) 100%)`
                      : `linear-gradient(90deg, ${BRAND} 0%, ${SUCCESS} 100%)`,

                  }}
                />
              </div>
              {activeJobs.length >= 3 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs mt-2"
                  style={{ color: C_DANGER }}
                >
                  הגעת למגבלה — סגור משרה כדי לפרסם חדשה.
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content ── */}
        {isLoading ? (
          /* Skeleton list */
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
              >
                <MyJobCardSkeleton />
              </motion.div>
            ))}
          </div>
        ) : !myJobs || myJobs.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: `${BRAND}14`,
                border: `1px solid ${BRAND}26`,
              }}
            >
              <Briefcase className="h-10 w-10" style={{ color: `${BRAND}66` }} />
            </motion.div>
            <p className="font-bold text-lg mb-1" style={{ color: TEXT_BRIGHT }}>
              אין לך משרות עדיין
            </p>
            <p className="text-sm mb-6" style={{ color: TEXT_FAINT }}>
              פרסם את המשרה הראשונה שלך ומצא עובדים תוך דקות
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                onClick={() => navigate("/post-job")}
                className="gap-2"
                style={{
                  background: `linear-gradient(135deg, ${BRAND} 0%, oklch(0.55 0.25 280) 100%)`,
                  border: "none",
                  boxShadow: `0 0 20px ${BRAND} / 0.25`,
                }}
              >
                <PlusCircle className="h-4 w-4" />
                פרסם את המשרה הראשונה שלך
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          /* Job cards list */
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {myJobs.map((job) => {
                const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.active;
                const isVolunteer = job.salaryType === "volunteer";
                const expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
                const daysLeft = expiresAt
                  ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
                  : null;
                const isExpiringSoon = daysLeft !== null && daysLeft <= 1 && job.status === "active";

                return (
                  <motion.div
                    key={job.id}
                    variants={cardVariants}
                    layout
                    exit="exit"
                    whileHover={{ y: -2, boxShadow: "0 8px 32px oklch(0 0 0 / 0.3)" }}
                    style={{
                      ...glassCard,
                      padding: "1rem",
                      cursor: "default",
                      ...(isExpiringSoon ? { borderColor: "oklch(0.60 0.22 25 / 0.3)" } : {}),
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Category icon */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{
                            background: "linear-gradient(135deg, oklch(0.62 0.22 255 / 0.12) 0%, oklch(0.55 0.25 280 / 0.12) 100%)",
                            border: "1px solid oklch(0.62 0.22 255 / 0.18)",
                          }}
                        >
                          {getCategoryIcon(job.category)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="font-bold truncate"
                            style={{ color: "oklch(0.95 0.005 80)" }}
                          >
                            {job.title}
                          </h3>
                          <p className="text-xs" style={{ color: "oklch(1 0 0 / 40%)" }}>
                            {getCategoryLabel(job.category)}
                          </p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.border}`,
                          boxShadow: statusCfg.glow,
                        }}
                      >
                        {job.status === "active" && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "oklch(0.68 0.20 160)", boxShadow: "0 0 4px oklch(0.68 0.20 160)" }}
                          />
                        )}
                        {statusCfg.label}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs mb-3">
                      <span className="flex items-center gap-1" style={{ color: "oklch(1 0 0 / 45%)" }}>
                        <MapPin className="h-3 w-3" style={{ color: "oklch(0.72 0.22 240)" }} />
                        {job.address.split(",")[0]}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: "oklch(1 0 0 / 45%)" }}>
                        <Clock className="h-3 w-3" style={{ color: "oklch(0.72 0.22 240)" }} />
                        {getStartTimeLabel(job.startTime)}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: "oklch(1 0 0 / 45%)" }}>
                        <Users className="h-3 w-3" style={{ color: "oklch(0.72 0.22 240)" }} />
                        {job.workersNeeded} עובדים
                      </span>
                      <span
                        className="flex items-center gap-1 font-medium"
                        style={{ color: isVolunteer ? "oklch(0.68 0.20 160)" : "oklch(0.88 0.14 75)" }}
                      >
                        <DollarSign className="h-3 w-3" />
                        {isVolunteer ? "התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
                      </span>
                      {daysLeft !== null && job.status === "active" && (
                        <span
                          className="flex items-center gap-1 font-bold"
                          style={{ color: isExpiringSoon ? "oklch(0.65 0.22 25)" : "oklch(0.72 0.22 240)" }}
                        >
                          {isExpiringSoon && <Zap className="h-3 w-3" />}
                          <Clock className="h-3 w-3" />
                          {daysLeft === 0 ? "פג היום" : `${daysLeft} ימים נותרו`}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => navigate(`/job/${job.id}`)}
                          style={{
                            background: "oklch(0.62 0.22 255 / 0.08)",
                            border: "1px solid oklch(0.62 0.22 255 / 0.2)",
                            color: "oklch(0.72 0.22 240)",
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          צפה
                        </Button>
                      </motion.div>

                      {job.status === "active" ? (
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => updateStatus.mutate({ id: job.id, status: "closed" })}
                            disabled={updateStatus.isPending}
                            style={{
                              background: "oklch(1 0 0 / 4%)",
                              border: "1px solid oklch(1 0 0 / 12%)",
                              color: "oklch(1 0 0 / 45%)",
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            סגור משרה
                          </Button>
                        </motion.div>
                      ) : job.status === "closed" ? (
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => updateStatus.mutate({ id: job.id, status: "active" })}
                            disabled={updateStatus.isPending || activeJobs.length >= 3}
                            style={{
                              background: "oklch(0.65 0.22 160 / 0.08)",
                              border: "1px solid oklch(0.65 0.22 160 / 0.25)",
                              color: "oklch(0.68 0.20 160)",
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            הפעל מחדש
                          </Button>
                        </motion.div>
                      ) : null}

                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setDeleteId(job.id)}
                          style={{ color: C_DANGER }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          מחק
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת משרה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשרה? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:flex-row" dir="rtl">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteJob.mutate({ id: deleteId })}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

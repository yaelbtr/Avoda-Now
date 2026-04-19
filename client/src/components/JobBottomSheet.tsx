import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, Briefcase, Heart, Send, Calendar, Users, CheckCircle2, Loader2, Share2, Copy, Check } from "lucide-react";
import { getCategoryIcon, getCategoryLabel, formatSalary, getStartTimeLabel } from "@shared/categories";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { shareJobOnWhatsApp, copyJobLink } from "@/components/JobCard";
import { BirthDateModal } from "@/components/BirthDateModal";
import { useApplyWithAgeGate } from "@/hooks/useApplyWithAgeGate";

interface JobBottomSheetProps {
  job: {
    id: number;
    title: string;
    category: string;
    address: string;
    city?: string | null;
    salary?: string | null;
    salaryType: string;
    hourlyRate?: string | null;
    contactPhone: string | null | undefined;
    showPhone?: boolean | null;
    businessName?: string | null;
    startTime: string;
    startDateTime?: Date | string | null;
    isUrgent?: boolean | null;
    workersNeeded: number;
    createdAt: Date | string;
    expiresAt?: Date | string | null;
    description?: string | null;
    distance?: number;
  } | null;
  open: boolean;
  onClose: () => void;
  onLoginRequired?: (msg: string) => void;
  isAuthenticated: boolean;
  layoutId?: string;
}

const OLIVE = "#4F583B";

export default function JobBottomSheet({
  job,
  open,
  onClose,
  onLoginRequired,
  isAuthenticated,
  layoutId,
}: JobBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number>(0);
  const [applied, setApplied] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [showMessageInput, setShowMessageInput] = useState(false);

  // Check if user already applied
  const hasAppliedQuery = trpc.jobs.checkApplied.useQuery(
    { jobId: job?.id ?? 0 },
    { enabled: isAuthenticated && !!job && open }
  );

  // Age-gate aware apply hook (shows BirthDateModal when birthDate is missing)
  const {
    apply: applyWithAgeGate,
    isPending: isApplyPending,
    birthDateModalOpen,
    handleBirthDateSuccess,
    closeBirthDateModal,
  } = useApplyWithAgeGate({
    isAuthenticated,
    onLoginRequired,
    onSuccess: () => {
      setApplied(true);
      setShowMessageInput(false);
      toast.success("המועמדות נשלחה! המעסיק יקבל הודעה עם קישור לפרופיל שלך.");
    },
  });

  // Sync applied state from server
  useEffect(() => {
    if (hasAppliedQuery.data?.applied) {
      setApplied(true);
    } else {
      setApplied(false);
    }
  }, [hasAppliedQuery.data, job?.id]);

  // Reset state when job changes
  useEffect(() => {
    setShowMessageInput(false);
    setApplyMessage("");
  }, [job?.id]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Swipe-down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    currentYRef.current = dy;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (currentYRef.current > 100) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }
    startYRef.current = null;
    currentYRef.current = 0;
  };

  const handleApply = () => {
    if (!isAuthenticated) { onLoginRequired?.("כדי להגיש מועמדות יש להתחבר"); return; }
    if (applied) return;
    setShowMessageInput(true);
  };

  const handleSubmitApplication = () => {
    if (!job) return;
    applyWithAgeGate({
      jobId: job.id,
      message: applyMessage.trim() || undefined,
      origin: window.location.origin,
    });
  };

  if (!job) return null;

  const salaryStr = formatSalary(job.salary ?? null, job.salaryType, job.hourlyRate ?? null);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const isVolunteer = job.salaryType === "volunteer";
  const location = [job.businessName, job.city ?? job.address].filter(Boolean).join(", ");
  // showPhoneNumber removed — contactPhone stripped server-side

  return (
    <>
      <AnimatePresence>
      {open && (
      <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 50,
        }}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        ref={sheetRef}
        dir="rtl"
        layoutId={layoutId}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 32,
          mass: 0.9,
        }}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 51,
          background: "#ffffff",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "#d1cdc4" }} />
        </div>

        {/* Close button — must sit above the scrollable content div */}
        <button
          onClick={onClose}
          aria-label="סגור פרטי משרה"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#f5f2ec",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <X size={16} color="#666" />
        </button>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 20px 24px 20px" }}>

          {/* Header: icon + title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#f5f2ec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              {catIcon}
            </div>
            <div style={{ flex: 1 }}>
              {job.isUrgent && (
                <span
                  style={{
                    display: "inline-block",
                    background: "#E8521A",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 10px",
                    borderRadius: 20,
                    marginBottom: 4,
                  }}
                >
                  דחוף ביותר
                </span>
              )}
              <h2 style={{ color: OLIVE, fontSize: 20, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
                {job.title}
              </h2>
              <p style={{ color: "#888", fontSize: 13, margin: "4px 0 0 0" }}>{catLabel}</p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#f0ede6", marginBottom: 16 }} />

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {/* Location */}
            <InfoTile icon={<MapPin size={16} color={OLIVE} />} label="מיקום" value={location || "לא צוין"} />
            {/* Time */}
            <InfoTile icon={<Clock size={16} color={OLIVE} />} label="שעת התחלה" value={getStartTimeLabel(job.startTime)} />
            {/* Salary */}
            {!isVolunteer ? (
              <InfoTile
                icon={<Briefcase size={16} color={OLIVE} />}
                label="שכר"
                value={salaryStr || "לא צוין"}
              />
            ) : (
              <InfoTile
                icon={<Heart size={16} color="oklch(0.82 0.15 80.8)" />}
                label="סוג עבודה"
                value="התנדבות"
                valueColor="oklch(0.82 0.15 80.8)"
              />
            )}
            {/* Workers needed */}
            <InfoTile
              icon={<Users size={16} color={OLIVE} />}
              label="עובדים נדרשים"
              value={`${job.workersNeeded} עובדים`}
            />
          </div>

          {/* Description if available */}
          {job.description && (
            <div
              style={{
                background: "#f9f7f3",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <p style={{ color: "#555", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{job.description}</p>
            </div>
          )}

          {/* Phone number display removed — workers contact via application only */}

          {/* Apply message input (shown when user clicks apply) */}
          {showMessageInput && !applied && (
            <div
              style={{
                background: "#f9f7f3",
                borderRadius: 14,
                padding: "14px",
                marginBottom: 16,
                border: "1px solid #e8e4dc",
              }}
            >
              <p style={{ color: OLIVE, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                הוסף הודעה קצרה (אופציונלי)
              </p>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="לדוגמה: יש לי ניסיון רלוונטי ואני זמין/ה להתחיל מחר..."
                maxLength={500}
                rows={3}
                style={{
                  width: "100%",
                  border: "1px solid #d1cdc4",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 13,
                  color: "#333",
                  resize: "none",
                  fontFamily: "inherit",
                  direction: "rtl",
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ color: "#aaa", fontSize: 11, textAlign: "left", marginTop: 4 }}>
                {applyMessage.length}/500
              </p>
            </div>
          )}

          {/* Already applied notice */}
          {applied && (
            <div
              style={{
                background: "#f0f4eb",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} color={OLIVE} />
              <p style={{ color: OLIVE, fontSize: 13, fontWeight: 700, margin: 0 }}>
                הגשת מועמדות למשרה זו — המעסיק יצור קשר
              </p>
            </div>
          )}

          {/* Expiry notice */}
          {job.expiresAt && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#E8521A",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              <Calendar size={14} />
              <span>
                בתוקף עד:{" "}
                {new Date(job.expiresAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons — sticky at bottom */}
        <div
          style={{
            flexShrink: 0,
            padding: "12px 20px 28px 20px",
            borderTop: "1px solid #f0ede6",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Primary CTA */}
          {showMessageInput && !applied ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowMessageInput(false)}
                style={{
                  flex: 0,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "#f5f2ec",
                  color: "#666",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                ביטול
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={isApplyPending}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: 14,
                  background: OLIVE,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  border: "none",
                  outline: "none",
                  cursor: isApplyPending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: isApplyPending ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(79,88,59,0.3)",
                }}
              >
                {isApplyPending ? (
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Send size={16} />
                )}
                שלח מועמדות
              </button>
            </div>
          ) : applied ? (
            <button
              disabled
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                background: "#f0f4eb",
                color: OLIVE,
                fontSize: 15,
                fontWeight: 800,
                border: "2px solid #c8d4b8",
                outline: "none",
                cursor: "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} />
              מועמדות הוגשה
            </button>
          ) : (
            <button
              onClick={handleApply}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                background: OLIVE,
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                border: "none",
                outline: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(79,88,59,0.3)",
              }}
            >
              <Send size={16} />
              הגישו אותי להצעה זו
            </button>
          )}

          {/* Share row */}
          <ShareRow jobId={job.id} jobTitle={job.title} city={job.city} salary={job.salary} salaryType={job.salaryType} />

          {/* Legal notice — application */}
          {!applied && (
            <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0, lineHeight: 1.5 }} dir="rtl">
              בהגשת מועמדות אתה מאשר/ת שפרטייך ישתפו עם המעסיק. קרא/{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", textDecoration: "underline" }}>מדיניות הפרטיות</a>
              {" "}ו{" "}
              <a href="/safety-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", textDecoration: "underline" }}>כללי בטיחות</a>.
            </p>
          )}

          {/* Call/WhatsApp buttons removed — workers contact via application only */}
        </div>
      </motion.div>
      </>
      )}
    </AnimatePresence>

      {/* Age-gate modal — shown when user has no birthDate on record */}
      <BirthDateModal
        isOpen={birthDateModalOpen}
        onClose={closeBirthDateModal}
        onSuccess={handleBirthDateSuccess}
      />
    </>
  );
}
function ShareRow({
  jobId,
  jobTitle,
  city,
  salary,
  salaryType,
}: {
  jobId: number;
  jobTitle: string;
  city?: string | null;
  salary?: string | null;
  salaryType: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await copyJobLink(jobId, jobTitle, city);
      setCopied(true);
      toast.success("קישור המשרה הועתק ללוח");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("שגיאה בהעתקת הקישור");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
      <button
        onClick={() => shareJobOnWhatsApp(jobTitle, jobId, city, salary, salaryType)}
        aria-label="שתף ב-WhatsApp"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px 0",
          borderRadius: 12,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#16a34a",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        WhatsApp
      </button>
      <button
        onClick={handleCopy}
        aria-label="העתק קישור"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px 0",
          borderRadius: 12,
          background: copied ? "#f0fdf4" : "#f5f2ec",
          border: `1px solid ${copied ? "#bbf7d0" : "#e8e4dc"}`,
          color: copied ? "#16a34a" : "#555",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "הועתק!" : "העתק קישור"}
      </button>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#f9f7f3",
        borderRadius: 14,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon}
        <span style={{ color: "#999", fontSize: 11, fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ color: valueColor ?? OLIVE, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
    </div>
  );
}

import React from "react";
import { MapPin, Heart, Send, Navigation, Building2, Bookmark, BookmarkCheck, Loader2, CheckCircle, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  getCategoryIcon,
  getCategoryLabel,
  formatSalary,
  getStartTimeLabel,
} from "@shared/categories";
import { useAuth } from "@/contexts/AuthContext";
import { shareJobOnWhatsApp } from "@/components/JobCard";

interface SearchJob {
  id: number;
  title: string;
  category: string;
  address: string;
  city?: string | null;
  salary?: string | null;
  salaryType: string;
  contactPhone: string | null;
  businessName?: string | null;
  startTime: string;
  startDateTime?: Date | string | null;
  isUrgent?: boolean | null;
  workersNeeded: number;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  distance?: number;
  description?: string | null;
}

interface SearchJobCardProps {
  job: SearchJob;
  showDistance?: boolean;
  isSaved?: boolean;
  isApplied?: boolean;
  onSaveToggle?: (jobId: number, saved: boolean) => void;
  onLoginRequired?: (msg: string) => void;
  onCardClick?: (job: SearchJob) => void;
}

const CATEGORY_BG: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70&fit=crop",
  hospitality: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70&fit=crop",
  cleaning: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70&fit=crop",
  delivery: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=70&fit=crop",
  construction: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=70&fit=crop",
  security: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&q=70&fit=crop",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=70&fit=crop",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=70&fit=crop",
  events: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=70&fit=crop",
  childcare: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=70&fit=crop",
  eldercare: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=70&fit=crop",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70&fit=crop",
  other: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=70&fit=crop",
};

const OLIVE = "oklch(0.40 0.10 88)";

export default function SearchJobCard({ job, showDistance, isSaved, isApplied: isAppliedProp, onSaveToggle, onLoginRequired, onCardClick }: SearchJobCardProps) {
  const { isAuthenticated } = useAuth();
  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;
  const isVolunteer = job.salaryType === "volunteer";
  const bgImage = CATEGORY_BG[job.category] ?? CATEGORY_BG.other;
  const isExpired = job.expiresAt ? new Date(job.expiresAt).getTime() < Date.now() : false;

  const [showApplyPanel, setShowApplyPanel] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [appliedLocally, setAppliedLocally] = useState(false);
  const isApplied = isAppliedProp || appliedLocally;

  const applyMutation = trpc.jobs.applyToJob.useMutation({
    onSuccess: () => {
      setAppliedLocally(true);
      setShowApplyPanel(false);
      setApplyMessage("");
      toast.success("מועמדות הוגשה בהצלחה!");
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        setAppliedLocally(true);
        setShowApplyPanel(false);
        toast.info("כבר הגשת מועמדות למשרה זו");
      } else {
        toast.error(err.message || "שגיאה בהגשת מועמדות");
      }
    },
  });

  const handleApplySubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyMutation.mutate({ jobId: job.id, message: applyMessage || undefined, origin: window.location.origin });
  };

  return (
    <div
      dir="rtl"
      style={{
        borderRadius: 20,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        position: "relative",
        display: "flex",
        flexDirection: "row",
        height: 120,
      }}
      onClick={() => onCardClick?.(job)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.13)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
      }}
    >
      {/* ── Image (right side, square) ── */}
      <div
        style={{
          position: "relative",
          width: 120,
          flexShrink: 0,
          overflow: "hidden",
          order: 1,
        }}
      >
        <img
          src={bgImage}
          alt={catLabel}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
        {/* Fade to white on left edge */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to left, transparent 40%, rgba(255,255,255,0.5) 80%, #ffffff 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Urgent badge */}
        {job.isUrgent && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#E8521A",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 8px",
              borderRadius: 20,
              boxShadow: "0 2px 6px rgba(232,82,26,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            דחוף
          </div>
        )}
        {/* Category icon floating over boundary */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: -18,
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#ffffff",
            boxShadow: "0 3px 10px rgba(0,0,0,0.13)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            zIndex: 2,
          }}
        >
          {catIcon}
        </div>
      </div>

      {/* ── Content (left side) ── */}
      <div
        style={{
          flex: 1,
          padding: "12px 14px 12px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          order: 0,
          minWidth: 0,
        }}
      >
        {/* Top: title + location */}
        <div style={{ textAlign: "right" }}>
          <h3
            style={{
              color: OLIVE,
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.3,
              marginBottom: 4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              textAlign: "right",
            }}
          >
            {job.title}
          </h3>
          {job.businessName && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, color: `${OLIVE}99`, fontSize: 11, fontWeight: 500, marginBottom: 2, direction: "rtl" }}>
              <Building2 size={10} style={{ color: OLIVE, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.businessName}</span>
            </div>
          )}
          {location && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, color: `${OLIVE}99`, fontSize: 11, fontWeight: 500, direction: "rtl" }}>
              <MapPin size={10} style={{ color: OLIVE, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.city ?? job.address}</span>
              {showDistance && job.distance != null && (
                <span style={{ marginRight: 4, background: "#f0f4eb", color: OLIVE, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", gap: 2 }}>
                  <Navigation size={9} />
                  {job.distance < 1 ? `${Math.round(job.distance * 1000)}מ'` : `${job.distance.toFixed(1)}ק"מ`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom: time badge + salary / volunteer */}
        <div>
          {job.createdAt && (
            <div style={{ fontSize: 10, color: "#bbb", textAlign: "center", marginBottom: 4 }}>
              {(() => {
                const diff = Date.now() - new Date(job.createdAt).getTime();
                const mins = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                if (mins < 1) return "פורסם זה עתה";
                if (mins < 60) return `לפני ${mins} דקות`;
                if (hours < 24) return `לפני ${hours} שעות`;
                if (days === 1) return "לפני יום";
                return `לפני ${days} ימים`;
              })()}
            </div>
          )}
          <div style={{ height: 1, background: "#f0ede6", marginBottom: 8 }} />
          {isVolunteer ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Heart size={14} style={{ color: "oklch(0.82 0.15 80.8)", fill: "oklch(0.82 0.15 80.8)" }} />
              <span style={{ color: "oklch(0.82 0.15 80.8)", fontSize: 13, fontWeight: 800 }}>התנדבות</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  background: job.startTime === "today" ? "#FFF3E0" : "#F5F0E4",
                  color: job.startTime === "today" ? "#E65100" : OLIVE,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 20,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  border: job.startTime === "today" ? "1px solid #FFCC80" : "none",
                }}
              >
                {job.startTime === "today" && <span style={{ fontSize: 11 }}>🔥</span>}
                {job.startTime === "today" ? "להיום" : getStartTimeLabel(job.startTime)}
              </div>
              {job.salary && !isVolunteer ? (
                <span style={{ color: OLIVE, fontSize: 13, fontWeight: 700 }}>{salaryStr}</span>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Heart size={12} style={{ color: "oklch(0.82 0.15 80.8)", fill: "oklch(0.82 0.15 80.8)", flexShrink: 0 }} />
                  <span style={{ color: "oklch(0.82 0.15 80.8)", fontSize: 12, fontWeight: 800 }}>התנדבות</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bookmark button ── */}
      {onSaveToggle && (
        <button
          onClick={(e) => { e.stopPropagation(); onSaveToggle(job.id, !isSaved); }}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: isSaved ? "oklch(0.92 0.06 88)" : "rgba(255,255,255,0.85)",
            border: isSaved ? "1px solid oklch(0.75 0.08 88)" : "1px solid #e8e0d0",
            borderRadius: 8,
            padding: "4px 6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
            transition: "all 0.15s ease",
          }}
          title={isSaved ? "בטל שמירה" : "שמור עבודה"}
        >
          {isSaved
            ? <BookmarkCheck size={14} style={{ color: OLIVE, fill: OLIVE }} />
            : <Bookmark size={14} style={{ color: OLIVE }} />}
        </button>
      )}

      {/* ── Inline apply panel ── */}
      <AnimatePresence>
        {showApplyPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0ede6", padding: "10px 12px", zIndex: 10 }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: OLIVE, marginBottom: 6 }}>הוסף הודעה קצרה (אופציונלי)</p>
            <textarea
              value={applyMessage}
              onChange={e => setApplyMessage(e.target.value)}
              placeholder="לדוגמא: יש לי ניסיון רלוונטי..."
              maxLength={500}
              rows={2}
              dir="rtl"
              style={{ width: "100%", fontSize: 11, borderRadius: 8, padding: "6px 8px", border: "1px solid #e8e2d6", background: "white", resize: "none", outline: "none", fontFamily: "inherit", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => { setShowApplyPanel(false); setApplyMessage(""); }}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e8e2d6", background: "white", fontSize: 11, fontWeight: 600, color: "#888", cursor: "pointer" }}
              >
                ביטול
              </button>
              <button
                onClick={handleApplySubmit}
                disabled={applyMutation.isPending}
                style={{ flex: 1, padding: "6px 12px", borderRadius: 8, border: "none", background: OLIVE, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: applyMutation.isPending ? 0.7 : 1 }}
              >
                {applyMutation.isPending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
                שלח מועמדות
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apply button (bottom strip) ── */}
      {!isApplied && !isExpired && (
      <button
        onClick={(e) => { e.stopPropagation(); if (!isAuthenticated) { onLoginRequired?.("כדי להגיש מועמדות יש להתחבר"); return; } setShowApplyPanel(v => !v); }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 0,
          overflow: "hidden",
          background: OLIVE,
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          outline: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "height 0.2s ease",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.height = "36px"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.height = "0px"; }}
      >
        <Send size={13} />
        הגישו אותי להצעה זו
      </button>
      )}
      {isApplied && (
        <div style={{ position: "absolute", bottom: 8, left: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "oklch(0.65 0.22 160 / 0.15)", color: "oklch(0.42 0.18 150)", border: "1px solid oklch(0.65 0.22 160 / 0.30)", borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>
          <CheckCircle size={12} />
          הגשת מועמדות
        </div>
      )}
    </div>
  );
}

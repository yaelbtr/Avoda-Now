import React, { useState, useRef, useEffect } from "react";
import { MapPin, Heart, Send, Building2, Share2, Mail, Copy, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getCategoryIcon,
  getCategoryLabel,
  formatSalary,
  getStartTimeLabel,
} from "@shared/categories";
import { useAuth } from "@/contexts/AuthContext";
import { shareJobOnWhatsApp, shareJobByEmail, shareJobOnFacebook, shareJobOnTelegram, copyJobLink } from "@/components/JobCard";

interface CarouselJob {
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
}

interface CarouselJobCardProps {
  job: CarouselJob;
  badge?: "urgent" | "today";
  onLoginRequired?: (msg: string) => void;
  onCardClick?: (job: CarouselJob) => void;
}

const CATEGORY_BG: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80&fit=crop",
  hospitality: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80&fit=crop",
  cleaning: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop",
  delivery: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80&fit=crop",
  construction: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  security: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80&fit=crop",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80&fit=crop",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80&fit=crop",
  events: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80&fit=crop",
  childcare: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80&fit=crop",
  eldercare: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&q=80&fit=crop",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&fit=crop",
  other: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80&fit=crop",
};

function getCategoryBg(category: string): string {
  return CATEGORY_BG[category] ?? CATEGORY_BG.other;
}

const OLIVE = "#4F583B";

function CarouselSharePopover({ job }: { job: CarouselJob }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCopyLink = async () => {
    try {
      await copyJobLink(job.id);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          width: 40, height: 40, borderRadius: 12,
          background: open ? "#ebe5d5" : "#F5F0E4",
          color: OLIVE, border: "none", outline: "none",
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#ebe5d5")}
        onMouseLeave={e => (e.currentTarget.style.background = open ? "#ebe5d5" : "#F5F0E4")}
        title="שתף"
      >
        <Share2 size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#fff",
              border: "1px solid #e8e2d6",
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              zIndex: 50,
              minWidth: 160,
              direction: "rtl",
            }}
          >
            {/* WhatsApp */}
            <button
              onClick={() => { shareJobOnWhatsApp(job.title, job.id, job.city, job.salary, job.salaryType); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#25D366", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              שתף ב-WhatsApp
            </button>
            {/* Telegram */}
            <button
              onClick={() => { shareJobOnTelegram(job.title, job.id, job.city); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#0088cc", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e8f4fb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              שתף ב-Telegram
            </button>
            {/* Facebook */}
            <button
              onClick={() => { shareJobOnFacebook(job.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1877F2", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#eef2fb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              שתף ב-Facebook
            </button>
            {/* Email */}
            <button
              onClick={() => { shareJobByEmail(job.title, job.id, job.city, job.salary, job.salaryType); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: OLIVE, width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f5f0e4")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Mail size={15} style={{ flexShrink: 0 }} />
              שתף ב-Email
            </button>
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: copied ? "#f0fdf4" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: copied ? "#16a34a" : "#6b7280", width: "100%", textAlign: "right" }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.background = "#f5f5f5"; }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.background = "transparent"; }}
            >
              {copied ? <Check size={15} style={{ flexShrink: 0 }} /> : <Copy size={15} style={{ flexShrink: 0 }} />}
              {copied ? "הועתק!" : "העתק קישור"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CarouselJobCard({ job, badge, onLoginRequired, onCardClick }: CarouselJobCardProps) {
  const { isAuthenticated } = useAuth();

  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;
  const isUrgent = badge === "urgent";
  const isVolunteer = job.salaryType === "volunteer";
  const bgImage = getCategoryBg(job.category);

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onLoginRequired?.("כדי להגיש מועמדות יש להתחבר");
      return;
    }
    shareJobOnWhatsApp(job.title, job.id, job.city, job.salary, job.salaryType);
  };

  return (
    <div
      dir="rtl"
      style={{
        width: 210,
        flexShrink: 0,
        borderRadius: 20,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        position: "relative",
      }}
      onClick={() => onCardClick?.(job)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.14)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.10)";
      }}
    >
      {/* ── Image area ── */}
      <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
        <img
          src={bgImage}
          alt={catLabel}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          loading="lazy"
        />
        {/* Fade to white at bottom */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 30%, rgba(255,255,255,0.6) 70%, #ffffff 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Urgent badge */}
        {isUrgent && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "#E8521A",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 20,
              boxShadow: "0 2px 6px rgba(232,82,26,0.4)",
            }}
          >
            דחוף ביותר
          </div>
        )}
      </div>

      {/* ── Category icon (floats over image/content boundary) ── */}
      <div
        style={{
          position: "absolute",
          top: 82,
          right: 14,
          width: 50,
          height: 50,
          borderRadius: 14,
          background: "#ffffff",
          boxShadow: "0 3px 10px rgba(0,0,0,0.13)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          zIndex: 2,
        }}
      >
        {catIcon}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "8px 14px 14px 14px", direction: "rtl" }}>
        {/* Spacer for icon */}
        <div style={{ height: 28 }} />

        {/* Title */}
        <h3
          style={{
            color: OLIVE,
            fontSize: 14,
            fontWeight: 800,
            lineHeight: 1.3,
            marginBottom: 6,
            textAlign: "right",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {job.title}
        </h3>

        {/* Business name */}
        {job.businessName && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: `${OLIVE}bb`, fontSize: 11, fontWeight: 500, marginBottom: 3, direction: "rtl" }}>
            <Building2 size={11} style={{ color: OLIVE, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{job.businessName}</span>
          </div>
        )}
        {/* Address */}
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: `${OLIVE}bb`, fontSize: 11, fontWeight: 500, marginBottom: 10, direction: "rtl" }}>
            <MapPin size={11} style={{ color: OLIVE, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{job.city ?? job.address}</span>
          </div>
        )}

        {/* Time ago */}
        {job.createdAt && (
          <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginBottom: 6 }}>
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
        {/* Divider */}
        <div style={{ height: 1, background: "#f0ede6", marginBottom: 10 }} />

        {/* Info row */}
        {isVolunteer ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 12,
              padding: "4px 0",
            }}
          >
            <Heart size={16} style={{ color: "oklch(0.82 0.15 80.8)", fill: "oklch(0.82 0.15 80.8)", flexShrink: 0 }} />
            <span style={{ color: "oklch(0.82 0.15 80.8)", fontSize: 14, fontWeight: 900 }}>התנדבות</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            {/* Time badge */}
            <div
              style={{
                background: job.startTime === "today" ? "#FFF3E0" : "#F5F0E4",
                color: job.startTime === "today" ? "#E65100" : OLIVE,
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 3,
                border: job.startTime === "today" ? "1px solid #FFCC80" : "none",
              }}
            >
              {job.startTime === "today" && <span style={{ fontSize: 12 }}>🔥</span>}
              {job.startTime === "today" ? "להיום" : getStartTimeLabel(job.startTime)}
            </div>
            {/* Salary */}
            {job.salary && !isVolunteer ? (
              <span style={{ color: OLIVE, fontSize: 13, fontWeight: 700 }}>{salaryStr}</span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Heart size={13} style={{ color: "oklch(0.82 0.15 80.8)", fill: "oklch(0.82 0.15 80.8)", flexShrink: 0 }} />
                <span style={{ color: "oklch(0.82 0.15 80.8)", fontSize: 12, fontWeight: 800 }}>התנדבות</span>
              </div>
            )}
          </div>
        )}

        {/* CTA button row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleApply(e); }}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              background: OLIVE,
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              outline: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 3px 10px rgba(79,88,59,0.28)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#3d4530")}
            onMouseLeave={e => (e.currentTarget.style.background = OLIVE)}
          >
            <span>הגישו אותי להצעה זו</span>
            <Send size={14} />
          </button>
<CarouselSharePopover job={job} />
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { MapPin, Heart, Send } from "lucide-react";
import {
  getCategoryIcon,
  getCategoryLabel,
  formatSalary,
  getStartTimeLabel,
} from "@shared/categories";
import { useAuth } from "@/contexts/AuthContext";
import { shareJobOnWhatsApp } from "@/components/JobCard";

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

        {/* Location */}
        {location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              color: `${OLIVE}bb`,
              fontSize: 11,
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
              {job.businessName ? `${job.businessName}, ` : ""}{location}
            </span>
            <MapPin size={12} style={{ color: OLIVE, flexShrink: 0 }} />
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
                background: "#F5F0E4",
                color: OLIVE,
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 8,
              }}
            >
              {getStartTimeLabel(job.startTime)}
            </div>
            {/* Salary */}
            {job.salary && !isVolunteer ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span style={{ color: OLIVE, fontSize: 17, fontWeight: 800 }}>{salaryStr}</span>
                <span style={{ color: "#9ca3af", fontSize: 10, fontWeight: 600, marginRight: 2 }}>לשעה</span>
              </div>
            ) : !isVolunteer ? (
              <span style={{ color: "#9ca3af", fontSize: 11 }}>שכר לא צוין</span>
            ) : null}
          </div>
        )}

        {/* CTA button */}
        <button
      onClick={(e) => { e.stopPropagation(); handleApply(e); }}
        style={{
          width: "100%",
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
      </div>
    </div>
  );
}

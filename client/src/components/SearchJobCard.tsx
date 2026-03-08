import React from "react";
import { MapPin, Heart, Send, Navigation } from "lucide-react";
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

const OLIVE = "#4F583B";

export default function SearchJobCard({ job, showDistance, onLoginRequired, onCardClick }: SearchJobCardProps) {
  const { isAuthenticated } = useAuth();
  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;
  const isVolunteer = job.salaryType === "volunteer";
  const bgImage = CATEGORY_BG[job.category] ?? CATEGORY_BG.other;

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
          {location && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 3,
                color: `${OLIVE}99`,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {job.businessName ? `${job.businessName}, ` : ""}{location}
              </span>
              <MapPin size={11} style={{ color: OLIVE, flexShrink: 0 }} />
              {showDistance && job.distance != null && (
                <span
                  style={{
                    marginRight: 4,
                    background: "#f0f4eb",
                    color: OLIVE,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 8,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Navigation size={9} />
                  {job.distance < 1
                    ? `${Math.round(job.distance * 1000)}מ'`
                    : `${job.distance.toFixed(1)}ק"מ`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom: time badge + salary / volunteer */}
        <div>
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
                  background: "#F5F0E4",
                  color: OLIVE,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                {getStartTimeLabel(job.startTime)}
              </div>
              {salaryStr ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ color: OLIVE, fontSize: 16, fontWeight: 800 }}>{salaryStr}</span>
                  <span style={{ color: OLIVE, fontSize: 12, fontWeight: 700 }}>₪</span>
                  <span style={{ color: "#9ca3af", fontSize: 10, fontWeight: 600, marginRight: 1 }}>/שעה</span>
                </div>
              ) : (
                <span style={{ color: "#9ca3af", fontSize: 11 }}>שכר לא צוין</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Apply button (bottom strip) ── */}
      <button
        onClick={handleApply}
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
    </div>
  );
}

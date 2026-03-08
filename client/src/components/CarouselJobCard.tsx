import React from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Zap, Flame, Phone, Share2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getCategoryIcon,
  getCategoryLabel,
  formatSalary,
  getStartTimeLabel,
} from "@shared/categories";
import { useAuth } from "@/contexts/AuthContext";
import { contactViaWhatsApp, callPhone, shareJobOnWhatsApp } from "@/components/JobCard";
import {
  C_DANGER as DANGER, C_WARNING as WARNING,
  C_SUCCESS as SUCCESS,
  C_DARK_BG, C_DARK_CARD, C_DARK_CARD_BORDER,
} from "@/lib/colors";

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
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs === 1 ? "שעה" : hrs + " שע'"}`;
  return `לפני ${Math.floor(hrs / 24)} ימים`;
}

const WhatsAppIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Category-based background images (warm, professional, relevant)
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

function getCategoryBg(category: string): string {
  return CATEGORY_BG[category] ?? CATEGORY_BG.other;
}

export default function CarouselJobCard({ job, badge, onLoginRequired }: CarouselJobCardProps) {
  const [open, setOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();

  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;
  const isUrgent = badge === "urgent";
  const bgImage = getCategoryBg(job.category);

  const handleCall = () => {
    if (!isAuthenticated) { onLoginRequired?.("כדי להתקשר יש להתחבר"); return; }
    if (job.contactPhone) callPhone(job.contactPhone);
  };

  const handleWhatsApp = () => {
    if (!isAuthenticated) { onLoginRequired?.("כדי לשלוח הודעה יש להתחבר"); return; }
    if (job.contactPhone) contactViaWhatsApp(job.contactPhone, job.title);
  };

  const handleShare = () => {
    shareJobOnWhatsApp(job.title, job.id, job.city, job.salary, job.salaryType);
  };

  return (
    <>
      {/* ── Compact card (carousel tile) ─────────────────────────────── */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.025, y: -3 }}
        whileTap={{ scale: 0.975 }}
        className="w-full text-right rounded-2xl overflow-hidden focus:outline-none flex flex-col"
        aria-label={`פתח פרטים: ${job.title}`}
        style={{
          background: "#ffffff",
          border: "1px solid #e8e8e8",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
          minHeight: 220,
        }}
      >
        {/* ── Top image area ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 130 }}>
          <img
            src={bgImage}
            alt={catLabel}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Subtle dark overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.18) 100%)" }}
          />

          {/* Badge — top-right corner */}
          {isUrgent ? (
            <span
              className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "#E8521A",
                color: "#ffffff",
                letterSpacing: "0.01em",
              }}
            >
              <Zap className="h-3 w-3" />
              דחוף ביותר
            </span>
          ) : (
            <span
              className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "#E8521A",
                color: "#ffffff",
                letterSpacing: "0.01em",
              }}
            >
              <Flame className="h-3 w-3" />
              דחוף ביותר
            </span>
          )}

          {/* Category icon — bottom-left of image (white rounded square) */}
          <div
            className="absolute bottom-[-18px] left-3 w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: "#ffffff",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            }}
          >
            {catIcon}
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex flex-col flex-1 px-4 pb-3.5" dir="rtl" style={{ paddingTop: "28px" }}>
          {/* Title */}
          <h3
            className="font-extrabold text-[15px] leading-snug mb-1.5 line-clamp-2 text-right w-full"
            style={{ color: "#1a1a1a" }}
          >
            {job.title}
          </h3>

          {/* Location */}
          {location && (
            <div
              className="flex items-center gap-1 text-[12px] mb-auto justify-end"
              style={{ color: "#777777" }}
            >
              <span className="truncate">
                {job.businessName ? `${job.businessName}, ` : ""}{location}
              </span>
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "#bbbbbb" }} />
            </div>
          )}

          {/* Divider */}
          <div className="mt-3 mb-2.5" style={{ borderTop: "1px solid #f0f0f0" }} />

          {/* Bottom row: start time pill (right) + salary (left) */}
          <div className="flex items-center justify-between" dir="rtl">
            {/* Start time pill — right side */}
            <span
              className="flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: "#f7f7f7",
                color: "#444444",
                border: "1px solid #e8e8e8",
              }}
            >
              {getStartTimeLabel(job.startTime)}
            </span>

            {/* Salary — left side */}
            {salaryStr ? (
              <div className="flex items-baseline gap-0.5">
                <span
                  className="text-[18px] font-black"
                  style={{ color: "oklch(0.82 0.15 80.8)" }}
                >
                  ₪{salaryStr}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "#aaaaaa" }}>
                  /שעה
                </span>
              </div>
            ) : (
              <span className="text-[11px]" style={{ color: "#aaaaaa" }}>שכר לא צוין</span>
            )}
          </div>
        </div>
      </motion.button>

      {/* ── Full detail bottom sheet ──────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
          style={{
            background: `linear-gradient(180deg, ${C_DARK_BG} 0%, oklch(0.11 0.04 125) 100%)`,
            border: `1px solid ${C_DARK_CARD_BORDER}`,
            borderBottom: "none",
          }}
        >
          <SheetHeader className="text-right mb-5">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.10)" }}
              >
                {catIcon}
              </div>
              <div className="flex-1">
                <SheetTitle className="text-[17px] font-black leading-tight text-white">{job.title}</SheetTitle>
                <p className="text-xs mt-0.5" style={{ color: "oklch(1 0 0 / 0.40)" }}>{catLabel}</p>
              </div>
              <span
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: `${DANGER}2a`, color: "oklch(0.82 0.18 25)", border: `1px solid ${DANGER}50` }}
              >
                <Zap className="h-3 w-3" />
                {isUrgent ? "דחוף" : "להיום"}
              </span>
            </div>
          </SheetHeader>

          {/* Details */}
          <div
            className="space-y-3 mb-6 rounded-2xl p-4"
            style={{ background: C_DARK_CARD, border: `1px solid ${C_DARK_CARD_BORDER}` }}
          >
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: "oklch(0.75 0.18 160)" }} />
                <span className="text-sm text-white">{location}</span>
                {typeof job.distance === "number" && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full mr-auto"
                    style={{ background: "oklch(0.55 0.15 160 / 0.15)", color: "oklch(0.75 0.18 160)" }}
                  >
                    {job.distance < 1 ? `${Math.round(job.distance * 1000)} מ'` : `${job.distance.toFixed(1)} ק"מ`}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" style={{ color: "oklch(0.75 0.18 160)" }} />
              <span className="text-sm text-white">{getStartTimeLabel(job.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" style={{ color: "oklch(0.75 0.18 160)" }} />
              <span className="text-sm text-white">{job.workersNeeded} עובדים דרושים</span>
            </div>
            {salaryStr && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-black" style={{ color: SUCCESS }}>₪ {salaryStr}</span>
                <span className="text-xs" style={{ color: "oklch(1 0 0 / 0.40)" }}>לשעה</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={handleCall}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: "oklch(0.55 0.15 160 / 0.15)", border: "1px solid oklch(0.55 0.15 160 / 0.30)" }}
            >
              <Phone className="h-5 w-5" style={{ color: "oklch(0.75 0.18 160)" }} />
              <span className="text-[11px] font-bold" style={{ color: "oklch(0.75 0.18 160)" }}>התקשר</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: "oklch(0.55 0.15 160 / 0.15)", border: "1px solid oklch(0.55 0.15 160 / 0.30)" }}
            >
              <WhatsAppIcon />
              <span className="text-[11px] font-bold" style={{ color: "oklch(0.75 0.18 160)" }}>וואטסאפ</span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.10)" }}
            >
              <Share2 className="h-5 w-5" style={{ color: "oklch(1 0 0 / 0.40)" }} />
              <span className="text-[11px] font-bold" style={{ color: "oklch(1 0 0 / 0.40)" }}>שתף</span>
            </button>
          </div>

          <p className="text-center text-[11px]" style={{ color: "oklch(1 0 0 / 0.25)" }}>
            פורסם {relativeTime(job.createdAt)}
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}

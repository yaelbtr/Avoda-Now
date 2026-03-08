import React from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Zap, Flame, Phone, Share2, ChevronLeft, Navigation } from "lucide-react";
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

export default function CarouselJobCard({ job, badge, onLoginRequired }: CarouselJobCardProps) {
  const [open, setOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();

  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;
  const isUrgent = badge === "urgent";

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
        className="w-full text-right rounded-2xl overflow-hidden relative focus:outline-none flex flex-col"
        aria-label={`פתח פרטים: ${job.title}`}
        style={{
          background: `linear-gradient(160deg, ${C_DARK_BG} 0%, oklch(0.13 0.04 125) 100%)`,
          border: `1px solid ${isUrgent ? `${DANGER}40` : `${WARNING}35`}`,
          boxShadow: `0 6px 24px oklch(0 0 0 / 0.30), 0 1px 0 oklch(1 0 0 / 0.06) inset`,
          transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
          minHeight: 200,
        }}
      >
        {/* Ambient top-right glow */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${isUrgent ? `${DANGER}22` : `${WARNING}18`} 0%, transparent 70%)` }}
        />

        {/* ── Header strip ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          {/* Category icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "oklch(1 0 0 / 0.07)", border: "1px solid oklch(1 0 0 / 0.10)" }}
          >
            {catIcon}
          </div>

          {/* Badge */}
          {isUrgent ? (
            <span
              className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: `${DANGER}28`, color: "oklch(0.82 0.18 25)", border: `1px solid ${DANGER}50` }}
            >
              <Zap className="h-2.5 w-2.5" />
              דחוף
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: `${WARNING}22`, color: "oklch(0.88 0.14 75)", border: `1px solid ${WARNING}45` }}
            >
              <Flame className="h-2.5 w-2.5" />
              להיום
            </span>
          )}
        </div>

        {/* ── Title + category ── */}
        <div className="px-4 pb-3">
          <h3 className="font-black text-[14px] text-white leading-snug mb-0.5 line-clamp-2 text-right">
            {job.title}
          </h3>
          {/* Category pill */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "oklch(1 0 0 / 0.07)", color: "oklch(1 0 0 / 0.40)" }}
          >
            {catLabel}
          </span>
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)", margin: "0 16px" }} />

        {/* ── Info tags row ── */}
        <div className="px-4 pt-3 pb-3 flex flex-wrap gap-1.5" dir="rtl">
          {/* Location */}
          {location && (
            <span
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(1 0 0 / 0.45)" }}
            >
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {location}
            </span>
          )}
          {/* Distance */}
          {typeof job.distance === "number" && (
            <span
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ background: "oklch(0.55 0.15 160 / 0.12)", color: "oklch(0.75 0.18 160)" }}
            >
              <Navigation className="h-2.5 w-2.5 shrink-0" />
              {job.distance < 1 ? `${Math.round(job.distance * 1000)} מ'` : `${job.distance.toFixed(1)} ק"מ`}
            </span>
          )}
          {/* Start time */}
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
            style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(1 0 0 / 0.40)" }}
          >
            <Clock className="h-2.5 w-2.5 shrink-0" />
            {getStartTimeLabel(job.startTime)}
          </span>
          {/* Workers needed */}
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
            style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(1 0 0 / 0.40)" }}
          >
            <Users className="h-2.5 w-2.5 shrink-0" />
            {job.workersNeeded} דרושים
          </span>
        </div>

        {/* ── Salary + posted time ── */}
        <div className="px-4 pb-4 flex items-end justify-between mt-auto">
          {salaryStr ? (
            <span
              className="text-[13px] font-black"
              style={{ color: SUCCESS }}
            >
              ₪ {salaryStr}
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 0.25)" }}>שכר לא צוין</span>
          )}
          <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 0.22)" }}>
            {relativeTime(job.createdAt)}
          </span>
        </div>

        {/* Tap hint */}
        <div
          className="absolute bottom-3 left-3 flex items-center gap-0.5 text-[9px]"
          style={{ color: "oklch(1 0 0 / 0.18)" }}
        >
          <ChevronLeft className="h-2.5 w-2.5" />
          פרטים
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
              {isUrgent ? (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: `${DANGER}2a`, color: "oklch(0.82 0.18 25)", border: `1px solid ${DANGER}50` }}
                >
                  <Zap className="h-3 w-3" />
                  דחוף
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: `${WARNING}22`, color: "oklch(0.88 0.14 75)", border: `1px solid ${WARNING}45` }}
                >
                  <Flame className="h-3 w-3" />
                  להיום
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Details */}
          <div
            className="space-y-3 mb-6 rounded-2xl p-4"
            style={{ background: C_DARK_CARD, border: `1px solid ${C_DARK_CARD_BORDER}` }}
          >
            <div className="flex items-center gap-2.5 text-sm" style={{ color: "oklch(1 0 0 / 0.65)" }}>
              <MapPin className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 0.30)" }} />
              <span>{job.address}{job.city && job.city !== job.address ? `, ${job.city}` : ""}</span>
            </div>
            {typeof job.distance === "number" && (
              <div className="flex items-center gap-2.5 text-sm" style={{ color: "oklch(0.75 0.18 160)" }}>
                <Navigation className="h-4 w-4 shrink-0" style={{ color: "oklch(0.65 0.18 160)" }} />
                <span>
                  {job.distance < 1
                    ? `${Math.round(job.distance * 1000)} מטר ממך`
                    : `${job.distance.toFixed(1)} ק"מ ממך`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm" style={{ color: "oklch(1 0 0 / 0.65)" }}>
              <Clock className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 0.30)" }} />
              <span>{getStartTimeLabel(job.startTime)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm" style={{ color: "oklch(1 0 0 / 0.65)" }}>
              <Users className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 0.30)" }} />
              <span>דרושים {job.workersNeeded} עובדים</span>
            </div>
            {salaryStr && (
              <div
                className="flex items-center gap-2.5 text-sm font-black rounded-xl px-3 py-2"
                style={{
                  color: "oklch(0.75 0.18 160)",
                  background: "oklch(0.55 0.20 155 / 0.12)",
                  border: "1px solid oklch(0.55 0.20 155 / 0.20)",
                }}
              >
                <span className="text-lg">💰</span>
                <span>{salaryStr}</span>
              </div>
            )}
            {job.businessName && (
              <div className="flex items-center gap-2.5 text-sm" style={{ color: "oklch(1 0 0 / 0.65)" }}>
                <span className="text-lg">🏢</span>
                <span>{job.businessName}</span>
              </div>
            )}
            <p className="text-xs" style={{ color: "oklch(1 0 0 / 0.25)" }}>פורסם {relativeTime(job.createdAt)}</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm text-white"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.20 155) 0%, oklch(0.48 0.18 160) 100%)",
                boxShadow: "0 4px 14px oklch(0.55 0.20 155 / 0.35)",
              }}
              onClick={handleWhatsApp}
            >
              <WhatsAppIcon />
              וואטסאפ
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm"
              style={{
                background: "oklch(1 0 0 / 0.07)",
                border: "1px solid oklch(1 0 0 / 0.14)",
                color: "oklch(1 0 0 / 0.70)",
              }}
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
              התקשר
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm"
              style={{
                background: "oklch(1 0 0 / 0.07)",
                border: "1px solid oklch(1 0 0 / 0.14)",
                color: "oklch(1 0 0 / 0.70)",
              }}
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              שתף
            </motion.button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

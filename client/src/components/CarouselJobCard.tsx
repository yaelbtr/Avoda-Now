import React from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Zap, Flame, Phone, Share2 } from "lucide-react";
import { AppButton } from "@/components/AppButton";
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
  C_TEXT_ON_DARK_MID,
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

export default function CarouselJobCard({ job, badge, onLoginRequired }: CarouselJobCardProps) {
  const [open, setOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();

  const salaryStr = formatSalary(job.salary ?? null, job.salaryType);
  const catIcon = getCategoryIcon(job.category);
  const catLabel = getCategoryLabel(job.category);
  const location = job.city ?? job.address;

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

  const isUrgent = badge === "urgent";
  const accentColor = isUrgent ? DANGER : WARNING;
  const accentBg = isUrgent ? `${DANGER} / 0.15` : `${WARNING} / 0.12`;
  const accentBorder = isUrgent ? `${DANGER} / 0.3` : `${WARNING} / 0.25`;

  return (
    <>
      {/* ── Compact card (carousel tile) ─────────────────────────────── */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.97 }}
        className="w-full text-right rounded-2xl p-3 focus:outline-none overflow-hidden relative"
        aria-label={`פתח פרטים: ${job.title}`}
        style={{
          background: `linear-gradient(135deg, ${C_DARK_BG} 0%, oklch(0.14 0.020 275) 100%)`,

          border: `1px solid ${accentBorder}`,
          boxShadow: "0 4px 20px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.06)",
        }}
      >
        {/* Subtle glow in corner */}
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accentBg} 0%, transparent 70%)` }}
        />

        {/* Top row: badge + category icon */}
        <div className="flex items-start justify-between mb-2 relative">
          <span className="text-xl">{catIcon}</span>
          {badge === "urgent" && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `${DANGER}33`,
                color: `oklch(0.80 0.18 25)`,
                border: `1px solid ${DANGER}59`,
              }}
            >
              <Zap className="h-3 w-3" />
              דחוף
            </span>
          )}
          {badge === "today" && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `${WARNING}26`,
                color: "oklch(0.88 0.14 75)",
                border: `1px solid ${WARNING}4d`,
              }}
            >
              <Flame className="h-3 w-3" />
              להיום
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm text-white leading-snug mb-0.5 line-clamp-1">
          {job.title}
        </h3>

        {/* Category */}
        <p className="text-xs text-white/40 mb-2">{catLabel}</p>

        {/* Key details */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
          {location && (
            <span className="flex items-center gap-1 text-white/50">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </span>
          )}
          {salaryStr && (
            <span
              className="font-bold"
              style={{ color: SUCCESS }}
            >
              {salaryStr}
            </span>
          )}

        </div>

        {/* Posted time */}
        <p className="text-xs text-white/25 mt-1.5">{relativeTime(job.createdAt)}</p>
      </motion.button>

      {/* ── Full detail bottom sheet ──────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
          style={{
            background: C_DARK_BG,
            border: `1px solid ${C_DARK_CARD_BORDER}`,
            borderBottom: "none",
          }}
        >
          <SheetHeader className="text-right mb-5">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{catIcon}</span>
              <div className="flex-1">
                <SheetTitle className="text-lg font-bold leading-tight text-white">{job.title}</SheetTitle>
                <p className="text-sm text-white/40">{catLabel}</p>
              </div>
              {badge === "urgent" && (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `${DANGER}33`,
                    color: "oklch(0.80 0.18 25)",
                    border: `1px solid ${DANGER}59`,
                  }}
                >
                  <Zap className="h-3 w-3" />
                  דחוף
                </span>
              )}
              {badge === "today" && (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `${WARNING}26`,
                    color: "oklch(0.88 0.14 75)",
                    border: `1px solid ${WARNING}4d`,
                  }}
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
            style={{
              background: C_DARK_CARD,
              border: `1px solid ${C_DARK_CARD_BORDER}`,
            }}
          >
            <div className="flex items-center gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4 text-white/30 shrink-0" />
              <span>{job.address}{job.city && job.city !== job.address ? `, ${job.city}` : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="h-4 w-4 text-white/30 shrink-0" />
              <span>{getStartTimeLabel(job.startTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Users className="h-4 w-4 text-white/30 shrink-0" />
              <span>דרושים {job.workersNeeded} עובדים</span>
            </div>
            {salaryStr && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">💰</span>
                <span className="font-bold" style={{ color: "oklch(0.75 0.18 160)" }}>{salaryStr}</span>
              </div>
            )}
            {job.businessName && (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="text-lg">🏢</span>
                <span>{job.businessName}</span>
              </div>
            )}
            <p className="text-xs text-white/25">פורסם {relativeTime(job.createdAt)}</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <AppButton
              className="font-bold gap-1.5"
              onClick={handleWhatsApp}
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.20 155) 0%, oklch(0.48 0.18 160) 100%)",
                border: "none",
                color: "white",
              }}
            >
              <span className="text-base">💬</span>
              וואטסאפ
            </AppButton>
            <AppButton
              variant="outline"
              className="gap-1.5 font-semibold"
              onClick={handleCall}
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: "1px solid oklch(1 0 0 / 12%)",
                color: "oklch(1 0 0 / 70%)",
              }}
            >
              <Phone className="h-4 w-4" />
              התקשר
            </AppButton>
            <AppButton
              variant="outline"
              className="gap-1.5"
              onClick={handleShare}
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: "1px solid oklch(1 0 0 / 12%)",
                color: "oklch(1 0 0 / 70%)",
              }}
            >
              <Share2 className="h-4 w-4" />
              שתף
            </AppButton>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

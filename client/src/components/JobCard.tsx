import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { buildJobPath } from "@/lib/jobSlug";
import {
  MapPin, Clock, Users, Share2, Zap, Timer, Flame, Calendar,
  Mail, Copy, Check, Bookmark, BookmarkCheck, Star, BookmarkX,
  Send, Loader2, CheckCircle, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  C_BRAND_HEX, C_DANGER_HEX, C_SUCCESS_HEX,
} from "@/lib/colors";
import { AppButton } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCategoryIcon,
  getCategoryLabel,
  formatSalary,
  formatDistance,
  getStartTimeLabel,
  isJobToday,
  WARTIME_CATEGORIES,
  SEASONAL_CATEGORIES,
} from "@shared/categories";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JobCardJob {
  id: number;
  title: string;
  category: string;
  address: string;
  city?: string | null;
  salary?: string | null;
  salaryType: string;
  contactPhone: string | null | undefined;
  businessName?: string | null;
  startTime: string;
  startDateTime?: Date | string | null;
  isUrgent?: boolean | null;
  isLocalBusiness?: boolean | null;
  workersNeeded: number;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  distance?: number;
  savedAt?: Date | string | null;
  hourlyRate?: string | null;
  estimatedHours?: string | null;
  jobDate?: string | null;
  workStartTime?: string | null;
  workEndTime?: string | null;
}

export interface JobCardProps {
  job: JobCardJob;
  showDistance?: boolean;
  isHighMatch?: boolean;
  isSaved?: boolean;
  isApplied?: boolean;
  onSaveToggle?: (jobId: number, saved: boolean) => void;
  /** For saved-mode: show BookmarkX remove button */
  onUnsave?: (jobId: number) => void;
  /** Inline apply callback (used in saved-mode and find-jobs) */
  onApply?: (jobId: number, message: string | undefined, origin: string) => void;
  isApplyPending?: boolean;
  onLoginRequired?: (message: string) => void;
  /** Called when card or "צפה במשרה" is clicked — opens bottom sheet */
  onCardClick?: (job: JobCardJob) => void;
  /** compact: minimal card for carousel — shows only WhatsApp + "צפה במשרה" */
  variant?: "default" | "compact";
}

const SITE_URL = "https://avodanow.co.il";

// ── Share helpers (exported for use in other components) ──────────────────────

export function shareJobOnWhatsApp(
  jobTitle: string,
  jobId: number,
  city?: string | null,
  salary?: string | null,
  salaryType?: string,
  referrerId?: number | null
) {
  const location = city ?? "";
  const salaryStr =
    salary && salaryType !== "volunteer"
      ? `₪${parseFloat(salary).toLocaleString("he-IL")} ${salaryType === "hourly" ? "לשעה" : salaryType === "daily" ? "ליום" : "לחודש"}`
      : "התנדבות";
  const basePath = buildJobPath(jobId, jobTitle, city);
  const jobUrl = `${SITE_URL}${basePath}${referrerId ? `?ref=${referrerId}` : ""}`;
  const text = encodeURIComponent(
    `עבודה זמנית:
${jobTitle}
${location}
${salaryStr}
פרטים כאן:
${jobUrl}`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

export function shareJobByEmail(
  jobTitle: string,
  jobId: number,
  city?: string | null,
  salary?: string | null,
  salaryType?: string,
  referrerId?: number | null
) {
  const location = city ?? "";
  const salaryStr =
    salary && salaryType !== "volunteer"
      ? `₪${parseFloat(salary).toLocaleString("he-IL")} ${salaryType === "hourly" ? "לשעה" : salaryType === "daily" ? "ליום" : "לחודש"}`
      : "התנדבות";
  const basePath = buildJobPath(jobId, jobTitle, city);
  const jobUrl = `${SITE_URL}${basePath}${referrerId ? `?ref=${referrerId}` : ""}`;
  const subject = encodeURIComponent(`עבודה זמנית: ${jobTitle}`);
  const body = encodeURIComponent(
    `שלום,

מצאתי משרה שעשויה לעניין אותך:
${jobTitle}
${location}
${salaryStr}

פרטים נוספים:
${jobUrl}`
  );
  window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
}

export function shareJobOnFacebook(jobId: number, jobTitle?: string, city?: string | null, referrerId?: number | null) {
  const basePath = buildJobPath(jobId, jobTitle ?? String(jobId), city);
  const jobUrl = encodeURIComponent(`${SITE_URL}${basePath}${referrerId ? `?ref=${referrerId}` : ""}`);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${jobUrl}`, "_blank");
}

export function shareJobOnTelegram(jobTitle: string, jobId: number, city?: string | null, referrerId?: number | null) {
  const basePath = buildJobPath(jobId, jobTitle, city);
  const jobUrl = `${SITE_URL}${basePath}${referrerId ? `?ref=${referrerId}` : ""}`;
  const text = encodeURIComponent(`עבודה זמנית: ${jobTitle}${city ? ` - ${city}` : ""}
${jobUrl}`);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(jobUrl)}&text=${text}`, "_blank");
}

export function copyJobLink(jobId: number, jobTitle?: string, city?: string | null, referrerId?: number | null): Promise<void> {
  const basePath = buildJobPath(jobId, jobTitle ?? String(jobId), city);
  const jobUrl = `${SITE_URL}${basePath}${referrerId ? `?ref=${referrerId}` : ""}`;
  return navigator.clipboard.writeText(jobUrl);
}

export function contactViaWhatsApp(phone: string, jobTitle: string) {
  const clean = phone.replace(/\D/g, "");
  const intl = clean.startsWith("0") ? "972" + clean.slice(1) : clean;
  const text = encodeURIComponent(`שלום, ראיתי את המשרה "${jobTitle}" באתר AvodaNow ואני מעוניין/ת.`);
  window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
}

export function callPhone(phone: string) {
  window.location.href = `tel:${phone}`;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "פורסם עכשיו";
  if (mins < 60) return `לפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs === 1 ? "שעה" : hrs + " שעות"}`;
  const days = Math.floor(hrs / 24);
  return `לפני ${days === 1 ? "יום" : days + " ימים"}`;
}

function expiryCountdown(expiresAt: Date | string | null | undefined): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "פג תוקף";
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs === 0) return `${mins} דקות נותרו`;
  if (hrs < 6) return `${hrs} שעות נותרו`;
  return null;
}

const WhatsAppIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Share popover (reusable)
export function SharePopover({
  jobTitle, jobId, city, salary, salaryType,
}: {
  jobTitle: string; jobId: number; city?: string | null; salary?: string | null; salaryType?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const referrerId = user?.id ?? null;
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
      await copyJobLink(jobId, jobTitle, city, referrerId);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    } catch { setOpen(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="p-2 rounded-xl transition-colors shrink-0"
        style={{
          background: "oklch(0.95 0.02 84)",
          border: "1px solid oklch(0.87 0.04 84.0)",
          color: "var(--text-muted)",
        }}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        title="שתף"
      >
        <Share2 className="h-4 w-4" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#fff",
              border: "1px solid oklch(0.87 0.04 84.0)",
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
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { shareJobOnWhatsApp(jobTitle, jobId, city, salary, salaryType, referrerId); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#25D366", width: "100%", textAlign: "right" }} onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              שתף ב-WhatsApp
            </button>
            <button onClick={() => { shareJobOnTelegram(jobTitle, jobId, city, referrerId); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#0088cc", width: "100%", textAlign: "right" }} onMouseEnter={e => (e.currentTarget.style.background = "#e8f4fb")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              שתף ב-Telegram
            </button>
            <button onClick={() => { shareJobOnFacebook(jobId, jobTitle, city, referrerId); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1877F2", width: "100%", textAlign: "right" }} onMouseEnter={e => (e.currentTarget.style.background = "#eef2fb")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              שתף ב-Facebook
            </button>
            <button onClick={() => { shareJobByEmail(jobTitle, jobId, city, salary, salaryType, referrerId); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4F583B", width: "100%", textAlign: "right" }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f0e4")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Mail style={{ width: 15, height: 15, flexShrink: 0 }} />
              שתף ב-Email
            </button>
            <button onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: copied ? "#f0fdf4" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: copied ? "#16a34a" : "#6b7280", width: "100%", textAlign: "right" }} onMouseEnter={e => { if (!copied) e.currentTarget.style.background = "#f5f5f5"; }} onMouseLeave={e => { if (!copied) e.currentTarget.style.background = "transparent"; }}>
              {copied ? <Check style={{ width: 15, height: 15, flexShrink: 0 }} /> : <Copy style={{ width: 15, height: 15, flexShrink: 0 }} />}
              {copied ? "הועתק!" : "העתק קישור"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main JobCard ───────────────────────────────────────────────────────────────

export function JobCard({
  job,
  showDistance,
  isHighMatch,
  isSaved,
  isApplied,
  onSaveToggle,
  onUnsave,
  onApply,
  isApplyPending,
  onLoginRequired,
  onCardClick,
  variant = "default",
}: JobCardProps) {
  const { isAuthenticated } = useAuth();
  const isVolunteer = job.salaryType === "volunteer";
  const cityDisplay = job.city ?? "";
  const isToday = isJobToday(job.startDateTime, job.startTime, job.jobDate);
  // Check if job is specifically scheduled for today (via jobDate field) — shows green badge
  const isJobDateToday = (() => {
    if (!job.jobDate) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return job.jobDate === todayStr;
  })();
  // contactPhone is always null for workers (stripped server-side)
  const hasPhone = false;
  const countdown = expiryCountdown(job.expiresAt);
  const isWartime = WARTIME_CATEGORIES.includes(job.category as typeof WARTIME_CATEGORIES[number]);
  const isSeasonal = SEASONAL_CATEGORIES.includes(job.category as typeof SEASONAL_CATEGORIES[number]);
  const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
  const isNew = job.createdAt && (Date.now() - new Date(job.createdAt).getTime()) < 60 * 60 * 1000;
  const [showApplyPanel, setShowApplyPanel] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");

  const handleRestrictedAction = (message: string) => {
    if (onLoginRequired) onLoginRequired(message);
  };

  const handleApplySubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApply) return;
    onApply(job.id, applyMessage || undefined, window.location.origin);
    setShowApplyPanel(false);
    setApplyMessage("");
  };

  const handleCardClick = () => {
    if (onCardClick) onCardClick(job);
  };

  // ── Compact variant (carousel) ────────────────────────────────────────────────
  if (variant === "compact") {
    const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ";
    const bgImages: Record<string, string> = {
      // Israeli-themed category images
      food:         `${CDN}/food_13babaca.jpg`,
      hospitality:  `${CDN}/hospitality_4e40b631.jpg`,
      construction: `${CDN}/construction_c2bb0958.jpg`,
      delivery:     `${CDN}/delivery_91f37dee.jpg`,
      office:       `${CDN}/office_4b15cb75.jpg`,
      events:       `${CDN}/events_54d2596b.jpg`,
      childcare:    `${CDN}/childcare_be8d0444.jpg`,
      // Remaining categories use quality Unsplash fallbacks
      cleaning:     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&fit=crop",
      security:     "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&q=80&fit=crop",
      retail:       "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80&fit=crop",
      eldercare:    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80&fit=crop",
      tech:         "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&fit=crop",
      other:        "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=80&fit=crop",
    };
    const bgImage = bgImages[job.category] ?? bgImages.other;
    const salaryStr = formatSalary(job.salary ?? null, job.salaryType);

    // Placeholder colors per category (dominant hue of the real image)
    const placeholderColors: Record<string, string> = {
      food:         "#c8a97e", // warm spice tones
      hospitality:  "#2a3a4a", // dark hotel lobby
      construction: "#8b7355", // sandy concrete
      delivery:     "#c0392b", // Wolt red
      office:       "#3d5a80", // cool blue office
      events:       "#4a3728", // warm evening
      childcare:    "#e8b86d", // warm yellow classroom
      cleaning:     "#a8d8ea", // fresh light blue
      security:     "#2c3e50", // dark navy
      retail:       "#d4a96a", // warm shop
      eldercare:    "#7fb3a0", // calm green
      tech:         "#1a1a2e", // dark tech
      other:        "#6b7280", // neutral gray
    };
    const placeholderColor = placeholderColors[job.category] ?? placeholderColors.other;

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
      <motion.div
        whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.14)" }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="group rounded-2xl overflow-hidden bg-white relative transition-all duration-200 hover:backdrop-blur-[20px] hover:bg-white/85"
        style={{
          width: 210,
          border: `1px solid ${job.isUrgent ? `${C_DANGER_HEX}35` : "oklch(0.87 0.04 84.0)"}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        dir="rtl"
        onClick={onCardClick ? handleCardClick : undefined}
      >
        {/* "New" green pulsing dot — top-left corner */}
        {isNew && (
          <span
            className="absolute top-2 left-2 z-10 flex items-center justify-center"
            style={{ width: 10, height: 10 }}
          >
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#22c55e" }}
            />
            <span
              className="relative inline-flex rounded-full"
              style={{ width: 8, height: 8, background: "#16a34a" }}
            />
          </span>
        )}
        {/* Category image header */}
        <div className="relative" style={{ height: 110, overflow: "hidden" }}>
          <img
            src={bgImage}
            alt={getCategoryLabel(job.category)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)" }}
          />
          {/* Category icon */}
          <div
            className="absolute bottom-2 right-2 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            {getCategoryIcon(job.category)}
          </div>
          {/* Urgent / Today badge */}
          {job.isUrgent && (
            <span
              className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: C_DANGER_HEX, color: "#fff" }}
            >
              <Zap className="h-2.5 w-2.5" />דחוף
            </span>
          )}
          {!job.isUrgent && isJobDateToday && (
            <span className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "oklch(0.45 0.18 145)", color: "#fff" }}>
              <Calendar className="h-2.5 w-2.5" />היום
            </span>
          )}
          {!job.isUrgent && isToday && !isJobDateToday && (
            <span className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
              <Flame className="h-2.5 w-2.5" />להיום
            </span>
          )}
          {/* Salary badge bottom-left */}
          <span
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-black"
            style={{
              background: isVolunteer ? "oklch(0.65 0.22 160 / 0.90)" : "oklch(0.38 0.07 125.0 / 0.90)",
              color: "#fff",
              backdropFilter: "blur(4px)",
            }}
          >
            {isVolunteer ? "💚 התנדבות" : salaryStr}
          </span>
        </div>

        {/* Content */}
        <div className="p-3" dir="rtl">
          {/* Category badge */}
          <div className="mb-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "oklch(0.96 0.03 122 / 0.8)",
                color: "oklch(0.38 0.09 122)",
                border: "1px solid oklch(0.88 0.06 122 / 0.5)",
              }}
            >
              <span className="text-[11px]">{getCategoryIcon(job.category)}</span>
              {getCategoryLabel(job.category)}
            </span>
          </div>

          <h3
            className="font-bold text-[13px] leading-tight text-right mb-1.5"
            style={{
              color: "var(--text-primary)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {job.title}
          </h3>

            <div className="flex items-center gap-1 text-[11px] mb-1.5" style={{ color: "var(--text-muted)" }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: "oklch(0.50 0.07 125.0)" }} />
            <span className="truncate">{cityDisplay}</span>
            {job.startTime !== "flexible" && (
              <>
                <span className="mx-0.5 opacity-40">·</span>
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{getStartTimeLabel(job.startTime)}</span>
              </>
            )}
          </div>

          {/* Date + work hours row */}
          {(job.jobDate || (job.workStartTime && job.workEndTime)) ? (
            <div className="flex items-center gap-1 text-[11px] mb-3 font-medium" style={{ color: "oklch(0.38 0.10 122)" }}>
              {job.jobDate && (
                <>
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{new Date(job.jobDate + 'T00:00:00').toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
                </>
              )}
              {job.jobDate && job.workStartTime && job.workEndTime && (
                <span className="mx-0.5 opacity-40">·</span>
              )}
              {job.workStartTime && job.workEndTime && (
                <>
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{job.workStartTime}–{job.workEndTime}</span>
                </>
              )}
            </div>
          ) : <div className="mb-3" />}

          {/* Action buttons row */}
          <div className="flex items-center justify-between gap-1.5" dir="rtl">
            <div className="flex items-center gap-1.5">
              {/* Apply / Applied */}
              {!isExpired && onApply && (
                isApplied ? (
                  <span
                    className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-xl font-bold shrink-0"
                    style={{ background: "oklch(0.65 0.22 160 / 0.10)", color: "oklch(0.42 0.18 150)", border: "1px solid oklch(0.65 0.22 160 / 0.25)" }}
                  >
                    <CheckCircle className="h-3 w-3" />הגשת ✓
                  </span>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAuthenticated) { handleRestrictedAction("כדי להגיש מועמדות יש להתחבר"); return; }
                      onApply(job.id, undefined, window.location.origin);
                    }}
                    disabled={isApplyPending}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-xl font-bold shrink-0"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                      color: "oklch(0.97 0.02 91)",
                      opacity: isApplyPending ? 0.7 : 1,
                    }}
                  >
                    {isApplyPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    הגש
                  </motion.button>
                )
              )}
            </div>

            {/* Share button */}
            <SharePopover
              jobTitle={job.title}
              jobId={job.id}
              city={job.city}
              salary={job.salary}
              salaryType={job.salaryType}
            />
          </div>

        </div>
      </motion.div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={-70}
          hideArrow
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full z-50 pointer-events-none"
          style={{
            background: "rgba(255,240,100,0.55)",
            color: "rgba(60,45,0,0.9)",
            border: "none",
            boxShadow: "none",
            backdropFilter: "blur(4px)",
          }}
        >
          לחץ לפרטים
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
    <motion.div
      whileHover={{
        y: -2,
        boxShadow: job.isUrgent
          ? `0 10px 30px ${C_DANGER_HEX}20, 0 2px 8px ${C_DANGER_HEX}10`
          : "0 8px 28px oklch(0.38 0.07 125.0 / 0.10), 0 2px 6px oklch(0.38 0.07 125.0 / 0.05)",
        borderColor: job.isUrgent ? `${C_DANGER_HEX}60` : "oklch(0.80 0.06 84.0)",
      }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-2xl p-4 relative overflow-hidden bg-white transition-all duration-200 hover:backdrop-blur-[20px] hover:bg-white/85"
      style={{
        border: `1px solid ${job.isUrgent ? `${C_DANGER_HEX}35` : "oklch(0.87 0.04 84.0)"}`,
        boxShadow: job.isUrgent
          ? `0 2px 12px ${C_DANGER_HEX}12`
          : "0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
        cursor: "pointer",
      }}
      dir="rtl"
      onClick={onCardClick ? handleCardClick : undefined}
    >
      {/* Urgent right border accent */}
      {job.isUrgent && (
        <div
          className="absolute top-0 right-0 w-[3px] h-full rounded-r-2xl"
          style={{ background: `linear-gradient(180deg, ${C_DANGER_HEX} 0%, #f97316 100%)` }}
        />
      )}

      {/* "New" green pulsing dot — top-left corner */}
      {isNew && (
        <span
          className="absolute top-3 left-3 z-10 flex items-center justify-center"
          style={{ width: 10, height: 10 }}
        >
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: "#22c55e" }}
          />
          <span
            className="relative inline-flex rounded-full"
            style={{ width: 8, height: 8, background: "#16a34a" }}
          />
        </span>
      )}

      {/* ── Header: title + category icon + salary ── */}
      <div className="flex items-start justify-between gap-3 mb-2" dir="rtl">
        {/* Right: category icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{
            background: job.isUrgent
              ? `linear-gradient(135deg, ${C_DANGER_HEX}18 0%, ${C_DANGER_HEX}0e 100%)`
              : "linear-gradient(135deg, oklch(0.96 0.02 122.3) 0%, oklch(0.93 0.03 91.6) 100%)",
            border: job.isUrgent
              ? `1px solid ${C_DANGER_HEX}30`
              : "1px solid oklch(0.89 0.05 84.0)",
          }}
        >
          {getCategoryIcon(job.category)}
        </div>

        {/* Center: title + badges + business */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[15px] leading-tight text-right mb-1" style={{ color: "var(--text-primary)" }}>
            {job.title}
          </h3>
          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {job.isUrgent && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${C_DANGER_HEX}15`, color: C_DANGER_HEX, border: `1px solid ${C_DANGER_HEX}30` }}>
                <Zap className="h-2.5 w-2.5" />דחוף
              </span>
            )}
            {isJobDateToday && !job.isUrgent && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "oklch(0.95 0.08 145)", color: "oklch(0.32 0.12 145)", border: "1px solid oklch(0.80 0.10 145)" }}>
                <Calendar className="h-2.5 w-2.5" />היום
              </span>
            )}
            {isToday && !isJobDateToday && !job.isUrgent && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                <Flame className="h-2.5 w-2.5" />להיום
              </span>
            )}
            {isWartime && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200">🆘 חירום</span>
            )}
            {isSeasonal && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">🫓 פסח</span>
            )}
            {isHighMatch && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "oklch(0.96 0.08 145)", color: "oklch(0.35 0.12 145)", border: "1px solid oklch(0.82 0.10 145)" }}>
                <Star className="h-2.5 w-2.5 fill-current" />התאמה גבוהה
              </span>
            )}
          </div>

        </div>

        {/* Left: salary + hourly summary */}
        <div className="shrink-0 text-left flex flex-col items-end gap-0.5">
          <span className="text-sm font-black whitespace-nowrap" style={{ color: isVolunteer ? C_SUCCESS_HEX : C_BRAND_HEX }}>
            {isVolunteer ? "💚 התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
          </span>
          {/* Hourly rate × estimated hours summary */}
          {!isVolunteer && job.hourlyRate && (
            <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: C_BRAND_HEX }}>
              {parseFloat(job.hourlyRate).toLocaleString("he-IL")} ₪/שעה
              {job.estimatedHours && (
                <> · {parseFloat(job.estimatedHours) % 1 === 0
                  ? parseFloat(job.estimatedHours).toFixed(0)
                  : parseFloat(job.estimatedHours).toFixed(1)} שעות</>
              )}
            </span>
          )}
          {/* Total earnings estimate */}
          {!isVolunteer && job.hourlyRate && job.estimatedHours && (
            <span className="text-[9px] font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              סה"כ {(parseFloat(job.hourlyRate) * parseFloat(job.estimatedHours)).toLocaleString("he-IL")} ₪ לעבודה
            </span>
          )}
        </div>
      </div>

      {/* ── Meta chips row ── */}
      <div
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs py-2 mb-2"
        style={{ borderTop: "1px solid oklch(0.93 0.03 91.6)", borderBottom: "1px solid oklch(0.93 0.03 91.6)" }}
      >
        <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--text-secondary)" }}>
          <MapPin className="h-3 w-3 shrink-0" style={{ color: C_BRAND_HEX }} />
          {cityDisplay}
          {showDistance && job.distance !== undefined && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold mr-0.5" style={{ background: `${C_BRAND_HEX}12`, color: C_BRAND_HEX, border: `1px solid ${C_BRAND_HEX}25` }}>
              📍 {formatDistance(job.distance)} ממך
            </span>
          )}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "oklch(0.93 0.03 91.6)", color: "var(--text-secondary)" }}>
          {getCategoryLabel(job.category)}
        </span>
        <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Clock className="h-3 w-3 shrink-0" />
          {getStartTimeLabel(job.startTime)}
        </span>

      </div>

      {/* ── Time row ── */}
      <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: "var(--text-faint)" }}>
        <span>{relativeTime(job.createdAt)}</span>
        {countdown && (
          <span className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full" style={{ color: countdown === "פג תוקף" ? C_DANGER_HEX : "#f97316", background: countdown === "פג תוקף" ? `${C_DANGER_HEX}12` : "oklch(0.78 0.17 65 / 0.10)" }}>
            <Timer className="h-2.5 w-2.5 shrink-0" />
            {countdown}
          </span>
        )}
      </div>

      {/* ── Inline apply panel ── */}
      <AnimatePresence>
        {showApplyPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mb-3 p-3 rounded-xl" style={{ background: "oklch(0.97 0.02 100)", border: "1px solid oklch(0.87 0.04 84.0)" }}>
              <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.38 0.07 125.0)" }}>הוסף הודעה קצרה (אופציונלי)</p>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="לדוגמא: יש לי ניסיון רלוונטי ואני זמין/ה להתחיל מחר..."
                maxLength={500}
                rows={2}
                dir="rtl"
                className="w-full text-xs rounded-lg p-2 resize-none outline-none"
                style={{ border: "1px solid oklch(0.87 0.04 84.0)", background: "white", color: "var(--text-primary)", fontFamily: "inherit" }}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowApplyPanel(false); setApplyMessage(""); }}
                  className="flex-none px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "white", color: "var(--text-muted)", border: "1px solid oklch(0.87 0.04 84.0)" }}
                >
                  ביטול
                </button>
                <motion.button
                  onClick={handleApplySubmit}
                  disabled={isApplyPending}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)", color: "oklch(0.97 0.02 91)", opacity: isApplyPending ? 0.7 : 1 }}
                >
                  {isApplyPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  שלח מועמדות
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action buttons row ── */}
      <div className="flex items-center gap-2 w-full" dir="rtl">

        {/* Save / Unsave */}
        {onUnsave ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onUnsave(job.id); }}
            className="p-2 rounded-xl shrink-0"
            title="הסר מהשמורים"
            style={{ background: "oklch(0.65 0.22 25 / 0.06)", border: "1px solid oklch(0.65 0.22 25 / 0.15)", color: "oklch(0.60 0.22 25)" }}
          >
            <BookmarkX className="h-4 w-4" />
          </motion.button>
        ) : onSaveToggle ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onSaveToggle(job.id, !isSaved); }}
            className="p-2 rounded-xl shrink-0"
            title={isSaved ? "בטל שמירה" : "שמור עבודה"}
            style={{
              background: isSaved ? "oklch(0.42 0.12 88 / 0.10)" : "oklch(0.95 0.02 84)",
              border: `1px solid ${isSaved ? "oklch(0.42 0.12 88 / 0.30)" : "oklch(0.87 0.04 84.0)"}`,
              color: isSaved ? "oklch(0.42 0.12 88)" : "var(--text-muted)",
            }}
          >
            {isSaved
              ? <BookmarkCheck className="h-4 w-4" style={{ fill: "oklch(0.42 0.12 88)" }} />
              : <Bookmark className="h-4 w-4" />}
          </motion.button>
        ) : null}

        {/* Share */}
        <SharePopover jobTitle={job.title} jobId={job.id} city={job.city} salary={job.salary} salaryType={job.salaryType} />

        {/* Apply / Applied / צפה במשרה */}
        {!isExpired && onApply && (
          isApplied ? (
            <span className="flex items-center gap-1 text-[11px] px-3 py-2 rounded-xl font-bold shrink-0" style={{ background: "oklch(0.65 0.22 160 / 0.10)", color: "oklch(0.42 0.18 150)", border: "1px solid oklch(0.65 0.22 160 / 0.25)" }}>
              <CheckCircle className="h-3.5 w-3.5" />הגשת
            </span>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isAuthenticated) { handleRestrictedAction("כדי להגיש מועמדות יש להתחבר"); return; }
                setShowApplyPanel(v => !v);
              }}
              className="flex items-center gap-1 text-[11px] px-3 py-2 rounded-xl font-bold shrink-0"
              style={{
                background: showApplyPanel
                  ? "oklch(0.93 0.03 91.6)"
                  : "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                color: showApplyPanel ? "var(--text-muted)" : "oklch(0.97 0.02 91)",
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              הגש
            </motion.button>
          )
        )}

      </div>
    </motion.div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={-80}
        hideArrow
        className="text-[11px] font-semibold px-3 py-1.5 rounded-full z-50 pointer-events-none"
        style={{
          background: "rgba(255,240,100,0.55)",
          color: "rgba(60,45,0,0.9)",
          border: "none",
          boxShadow: "none",
          backdropFilter: "blur(4px)",
        }}
      >
        לחץ לפרטים
      </TooltipContent>
    </Tooltip>
  );
}

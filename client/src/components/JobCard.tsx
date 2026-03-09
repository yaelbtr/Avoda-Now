import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect } from "react";
import { MapPin, Clock, Users, Share2, Phone, ChevronLeft, Lock, Zap, Timer, Flame, Mail, Copy, Check, Bookmark, BookmarkCheck, Star, BookmarkX, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  C_BRAND_HEX, C_BRAND_DARK_HEX, C_BORDER,
  C_DANGER_HEX, C_SUCCESS_HEX, C_SUCCESS_DARK_HEX,
  G_SUCCESS, G_URGENT, G_WHATSAPP,
} from "@/lib/colors";
import { AppButton } from "@/components/AppButton";
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

interface JobCardProps {
  job: {
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
    isLocalBusiness?: boolean | null;
    workersNeeded: number;
    createdAt: Date | string;
    expiresAt?: Date | string | null;
    distance?: number;
    savedAt?: Date | string | null;
  };
  showDistance?: boolean;
  isHighMatch?: boolean;
  isSaved?: boolean;
  isApplied?: boolean;
  onSaveToggle?: (jobId: number, saved: boolean) => void;
  onUnsave?: (jobId: number) => void;
  onApply?: (jobId: number, message: string | undefined, origin: string) => void;
  isApplyPending?: boolean;
  onLoginRequired?: (message: string) => void;
  /** Show saved-jobs card mode: unsave button, savedAt, inline apply panel */
  savedMode?: boolean;
}

const SITE_URL = "https://job-now.manus.space";

export function shareJobOnWhatsApp(
  jobTitle: string,
  jobId: number,
  city?: string | null,
  salary?: string | null,
  salaryType?: string
) {
  const location = city ?? "";
  const salaryStr = salary && salaryType !== "volunteer"
    ? `₪${parseFloat(salary).toLocaleString("he-IL")} ${salaryType === "hourly" ? "לשעה" : salaryType === "daily" ? "ליום" : "לחודש"}`
    : "התנדבות";
  const jobUrl = `${SITE_URL}/job/${jobId}`;
  const text = encodeURIComponent(
    `עבודה זמנית:\n${jobTitle}\n${location}\n${salaryStr}\nפרטים כאן:\n${jobUrl}`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

export function shareJobByEmail(
  jobTitle: string,
  jobId: number,
  city?: string | null,
  salary?: string | null,
  salaryType?: string
) {
  const location = city ?? "";
  const salaryStr = salary && salaryType !== "volunteer"
    ? `₪${parseFloat(salary).toLocaleString("he-IL")} ${salaryType === "hourly" ? "לשעה" : salaryType === "daily" ? "ליום" : "לחודש"}`
    : "התנדבות";
  const jobUrl = `${SITE_URL}/job/${jobId}`;
  const subject = encodeURIComponent(`עבודה זמנית: ${jobTitle}`);
  const body = encodeURIComponent(`שלום,\n\nמצאתי משרה שעשויה לעניין אותך:\n${jobTitle}\n${location}\n${salaryStr}\n\nפרטים נוספים:\n${jobUrl}`);
  window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
}

export function shareJobOnFacebook(jobId: number) {
  const jobUrl = encodeURIComponent(`${SITE_URL}/job/${jobId}`);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${jobUrl}`, "_blank");
}

export function shareJobOnTelegram(
  jobTitle: string,
  jobId: number,
  city?: string | null
) {
  const jobUrl = `${SITE_URL}/job/${jobId}`;
  const text = encodeURIComponent(`עבודה זמנית: ${jobTitle}${city ? ` - ${city}` : ""}\n${jobUrl}`);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(jobUrl)}&text=${text}`, "_blank");
}

export function copyJobLink(jobId: number): Promise<void> {
  const jobUrl = `${SITE_URL}/job/${jobId}`;
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
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function SharePopover({ jobTitle, jobId, city, salary, salaryType }: { jobTitle: string; jobId: number; city?: string | null; salary?: string | null; salaryType?: string }) {
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
      await copyJobLink(jobId);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    } catch {
      // fallback: just close
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
        <AppButton
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          style={{ color: "var(--text-muted)" }}
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
          title="שתף"
        >
          <Share2 className="h-3.5 w-3.5" />
        </AppButton>
      </motion.div>
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
            {/* WhatsApp */}
            <button
              onClick={() => { shareJobOnWhatsApp(jobTitle, jobId, city, salary, salaryType); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#25D366", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              שתף ב-WhatsApp
            </button>
            {/* Telegram */}
            <button
              onClick={() => { shareJobOnTelegram(jobTitle, jobId, city); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#0088cc", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e8f4fb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              שתף ב-Telegram
            </button>
            {/* Facebook */}
            <button
              onClick={() => { shareJobOnFacebook(jobId); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1877F2", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#eef2fb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              שתף ב-Facebook
            </button>
            {/* Email */}
            <button
              onClick={() => { shareJobByEmail(jobTitle, jobId, city, salary, salaryType); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4F583B", width: "100%", textAlign: "right" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f5f0e4")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Mail style={{ width: 15, height: 15, flexShrink: 0 }} />
              שתף ב-Email
            </button>
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: copied ? "#f0fdf4" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: copied ? "#16a34a" : "#6b7280", width: "100%", textAlign: "right" }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.background = "#f5f5f5"; }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.background = "transparent"; }}
            >
              {copied ? <Check style={{ width: 15, height: 15, flexShrink: 0 }} /> : <Copy style={{ width: 15, height: 15, flexShrink: 0 }} />}
              {copied ? "הועתק!" : "העתק קישור"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function JobCard({ job, showDistance, isHighMatch, isSaved, isApplied, onSaveToggle, onUnsave, onApply, isApplyPending, onLoginRequired, savedMode }: JobCardProps) {
  const { isAuthenticated } = useAuth();
  const isVolunteer = job.salaryType === "volunteer";
  const cityDisplay = job.city ?? job.address.split(",")[0];
  const isToday = isJobToday(job.startDateTime, job.startTime);
  const hasPhone = isAuthenticated && !!job.contactPhone;
  const countdown = expiryCountdown(job.expiresAt);
  const isWartime = WARTIME_CATEGORIES.includes(job.category as typeof WARTIME_CATEGORIES[number]);
  const isSeasonal = SEASONAL_CATEGORIES.includes(job.category as typeof SEASONAL_CATEGORIES[number]);
  const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
  const [showApplyPanel, setShowApplyPanel] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");

  const handleRestrictedAction = (message: string) => {
    if (onLoginRequired) onLoginRequired(message);
  };

  const handleApplySubmit = () => {
    if (!onApply) return;
    onApply(job.id, applyMessage || undefined, window.location.origin);
    setShowApplyPanel(false);
    setApplyMessage("");
  };

  return (
    <motion.div
      whileHover={{
        y: -3,
        boxShadow: job.isUrgent
          ? `0 12px 36px ${C_DANGER_HEX}20, 0 2px 8px ${C_DANGER_HEX}10`
          : "0 12px 36px oklch(0.38 0.07 125.0 / 0.12), 0 2px 8px oklch(0.38 0.07 125.0 / 0.06)",
        borderColor: job.isUrgent ? `${C_DANGER_HEX}60` : "oklch(0.80 0.06 84.0)",
      }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-4 relative overflow-hidden bg-white"
      style={{
        border: `1px solid ${job.isUrgent ? `${C_DANGER_HEX}35` : "oklch(0.87 0.04 84.0)"}`,
        boxShadow: job.isUrgent
          ? `0 2px 12px ${C_DANGER_HEX}12`
          : "0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
      }}
      dir="rtl"
    >
      {/* Urgent right border accent */}
      {job.isUrgent && (
        <div
          className="absolute top-0 right-0 w-[3px] h-full rounded-r-2xl"
          style={{ background: `linear-gradient(180deg, ${C_DANGER_HEX} 0%, #f97316 100%)` }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Category icon circle */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              background: job.isUrgent
                ? `linear-gradient(135deg, ${C_DANGER_HEX}18 0%, ${C_DANGER_HEX}0e 100%)`
                : "linear-gradient(135deg, oklch(0.96 0.02 122.3) 0%, oklch(0.93 0.03 91.6) 100%)",
              border: job.isUrgent
                ? `1px solid ${C_DANGER_HEX}30`
                : "1px solid oklch(0.89 0.05 84.0)",
              boxShadow: job.isUrgent
                ? `0 2px 8px ${C_DANGER_HEX}15`
                : "0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
            }}
          >
            {getCategoryIcon(job.category)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <h3 className="font-bold text-[15px] leading-tight text-right" style={{ color: "var(--text-primary)" }}>
                {job.title}
              </h3>
            </div>
            {/* Badges row */}
            <div className="flex flex-wrap gap-1">
              {job.isUrgent && (
                <span
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: `${C_DANGER_HEX}15`, color: C_DANGER_HEX, border: `1px solid ${C_DANGER_HEX}30` }}
                >
                  <Zap className="h-2.5 w-2.5" />
                  דחוף
                </span>
              )}
              {isToday && !job.isUrgent && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-orange-50 text-orange-600 border border-orange-200">
                  <Flame className="h-2.5 w-2.5" />
                  להיום
                </span>
              )}
              {isWartime && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-purple-50 text-purple-600 border border-purple-200">
                  🆘 חירום
                </span>
              )}
              {isSeasonal && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-amber-50 text-amber-600 border border-amber-200">
                  🫓 פסח
                </span>
              )}
              {job.isLocalBusiness && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-blue-50 text-blue-600 border border-blue-200">
                  🏢 עסק מקומי
                </span>
              )}
              {isVolunteer && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-green-50 text-green-600 border border-green-200">
                  💚 התנדבות
                </span>
              )}
              {isHighMatch && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: "oklch(0.96 0.08 145)", color: "oklch(0.35 0.12 145)", border: "1px solid oklch(0.82 0.10 145)" }}>
                  <Star className="h-2.5 w-2.5 fill-current" />
                  התאמה גבוהה
                </span>
              )}
            </div>
            {job.businessName && (
              <p className="text-[11px] truncate mt-1 text-right" style={{ color: "var(--text-muted)" }}>{job.businessName}</p>
            )}
          </div>
        </div>
        {/* Salary */}
        <div className="shrink-0 text-left">
          <span
            className="text-sm font-black whitespace-nowrap"
            style={{
              color: isVolunteer ? C_SUCCESS_HEX : C_BRAND_HEX,
            }}
          >
            {isVolunteer ? "💚 התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2 pb-2"
        style={{ borderBottom: "1px solid oklch(0.93 0.03 91.6)" }}
      >
        <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--text-secondary)" }}>
          <MapPin className="h-3 w-3 shrink-0" style={{ color: C_BRAND_HEX }} />
          {cityDisplay}
          {showDistance && job.distance !== undefined && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold mr-0.5"
              style={{ background: `${C_BRAND_HEX}12`, color: C_BRAND_HEX, border: `1px solid ${C_BRAND_HEX}25` }}
            >
              📍 {formatDistance(job.distance)} ממך
            </span>
          )}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "oklch(0.93 0.03 91.6)", color: "var(--text-secondary)" }}
        >
          {getCategoryLabel(job.category)}
        </span>
        <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Clock className="h-3 w-3 shrink-0" />
          {getStartTimeLabel(job.startTime)}
        </span>
        <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Users className="h-3 w-3 shrink-0" />
          {job.workersNeeded} עובדים
        </span>
      </div>

      {/* Time info row */}
      <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: "var(--text-faint)" }}>
        <span>{relativeTime(job.createdAt)}</span>
        {countdown && (
          <span
            className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: countdown === "פג תוקף" ? C_DANGER_HEX : "#f97316",
              background: countdown === "פג תוקף" ? `${C_DANGER_HEX}12` : "oklch(0.78 0.17 65 / 0.10)",
            }}
          >
            <Timer className="h-2.5 w-2.5 shrink-0" />
            {countdown}
          </span>
        )}
      </div>

      {/* Inline apply panel (savedMode) */}
      {savedMode && (
        <AnimatePresence>
          {showApplyPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="mt-3 p-3 rounded-xl"
                style={{ background: "oklch(0.97 0.02 100)", border: "1px solid oklch(0.87 0.04 84.0)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.38 0.07 125.0)" }}>
                  הוסף הודעה קצרה (אופציונלי)
                </p>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="לדוגמא: יש לי ניסיון רלוונטי ואני זמין/ה להתחיל מחר..."
                  maxLength={500}
                  rows={2}
                  dir="rtl"
                  className="w-full text-xs rounded-lg p-2 resize-none outline-none"
                  style={{ border: "1px solid oklch(0.87 0.04 84.0)", background: "white", color: "var(--text-primary)", fontFamily: "inherit" }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setShowApplyPanel(false); setApplyMessage(""); }}
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
                    style={{
                      background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                      color: "oklch(0.97 0.02 91)",
                      opacity: isApplyPending ? 0.7 : 1,
                    }}
                  >
                    {isApplyPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    שלח מועמדות
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 flex-wrap" dir="rtl">
        {savedMode ? (
          /* Saved-mode action row: צפה במשרה + שתף + הגש מועמדות / applied badge */
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <a
                href={`/job/${job.id}`}
                className="text-xs font-medium underline underline-offset-2"
                style={{ color: "oklch(0.50 0.07 125.0)" }}
              >
                צפה במשרה
              </a>
              <SharePopover jobTitle={job.title} jobId={job.id} city={job.city} salary={job.salary} salaryType={job.salaryType} />
            </div>
            <div className="flex items-center gap-2">
              {onUnsave && (
                <button
                  onClick={() => onUnsave(job.id)}
                  className="p-1.5 rounded-lg transition-all shrink-0"
                  title="הסר מהשמורים"
                  style={{ background: "oklch(0.65 0.22 25 / 0.06)", border: "1px solid oklch(0.65 0.22 25 / 0.15)", color: "oklch(0.60 0.22 25)" }}
                >
                  <BookmarkX className="h-4 w-4" />
                </button>
              )}
              {!isExpired && (
                isApplied ? (
                  <span
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-bold"
                    style={{ background: "oklch(0.65 0.22 160 / 0.10)", color: "oklch(0.42 0.18 150)", border: "1px solid oklch(0.65 0.22 160 / 0.25)" }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    הגשת מועמדות
                  </span>
                ) : (
                  <motion.button
                    onClick={() => {
                      if (!isAuthenticated) { handleRestrictedAction("כדי להגיש מועמדות יש להתחבר"); return; }
                      setShowApplyPanel(v => !v);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-bold"
                    style={{
                      background: showApplyPanel
                        ? "oklch(0.93 0.03 91.6)"
                        : "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
                      color: showApplyPanel ? "var(--text-muted)" : "oklch(0.97 0.02 91)",
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    הגש מועמדות
                  </motion.button>
                )
              )}
            </div>
          </div>
        ) : (
          /* Normal mode: phone/whatsapp + save + share + details */
          <>
            {hasPhone ? (
              <>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1 min-w-0">
                  <AppButton
                    variant="whatsapp"
                    size="sm"
                    className="gap-1.5 text-xs w-full font-bold"
                    onClick={() => contactViaWhatsApp(job.contactPhone!, job.title)}
                  >
                    <WhatsAppIcon />
                    <span className="truncate">וואטסאפ</span>
                  </AppButton>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1 min-w-0">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs w-full font-bold"
                    onClick={() => callPhone(job.contactPhone!)}
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">התקשר</span>
                  </AppButton>
                </motion.div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 min-w-0">
                <AppButton
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs flex-1 min-w-0 w-full font-semibold"
                  style={{ borderStyle: "dashed", color: "var(--text-muted)" }}
                  onClick={() => handleRestrictedAction("כדי ליצור קשר עם המעסיק יש להתחבר למערכת")}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">התחבר לראות טלפון</span>
                </AppButton>
              </motion.div>
            )}
            {onSaveToggle && (
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  style={{ color: isSaved ? "oklch(0.42 0.12 88)" : "var(--text-muted)" }}
                  onClick={(e) => { e.stopPropagation(); onSaveToggle(job.id, !isSaved); }}
                  title={isSaved ? "בטל שמירה" : "שמור עבודה"}
                >
                  {isSaved
                    ? <BookmarkCheck className="h-3.5 w-3.5" style={{ fill: "oklch(0.42 0.12 88)", color: "oklch(0.42 0.12 88)" }} />
                    : <Bookmark className="h-3.5 w-3.5" />}
                </AppButton>
              </motion.div>
            )}
            <SharePopover jobTitle={job.title} jobId={job.id} city={job.city} salary={job.salary} salaryType={job.salaryType} />
            <Link href={`/job/${job.id}`}>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <AppButton variant="secondary" size="sm" className="gap-1 text-xs font-bold">
                  <ChevronLeft className="h-3 w-3" />
                  פרטים
                </AppButton>
              </motion.div>
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}

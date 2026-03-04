import { Link } from "wouter";
import { MapPin, Clock, Users, Share2, Phone, ChevronLeft, Lock, Zap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  };
  showDistance?: boolean;
  onLoginRequired?: (message: string) => void;
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

export function contactViaWhatsApp(phone: string, jobTitle: string) {
  const clean = phone.replace(/\D/g, "");
  const intl = clean.startsWith("0") ? "972" + clean.slice(1) : clean;
  const text = encodeURIComponent(`שלום, ראיתי את המשרה "${jobTitle}" באתר Job-Now ואני מעוניין/ת.`);
  window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
}

export function callPhone(phone: string) {
  window.location.href = `tel:${phone}`;
}

/** Returns a relative time string like "פורסם לפני שעה" */
function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "פורסם עכשיו";
  if (mins < 60) return `פורסם לפני ${mins} דקות`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `פורסם לפני ${hrs === 1 ? "שעה" : hrs + " שעות"}`;
  const days = Math.floor(hrs / 24);
  return `פורסם לפני ${days === 1 ? "יום" : days + " ימים"}`;
}

/** Returns expiry countdown like "פג תוקף בעוד 3 שעות" or null if not expiring soon */
function expiryCountdown(expiresAt: Date | string | null | undefined): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "פג תוקף";
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs === 0) return `פג תוקף בעוד ${mins} דקות`;
  if (hrs < 6) return `פג תוקף בעוד ${hrs} שעות`;
  return null; // Don't show if more than 6 hours
}

const WhatsAppIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function JobCard({ job, showDistance = false, onLoginRequired }: JobCardProps) {
  const { isAuthenticated } = useAuth();
  const isVolunteer = job.salaryType === "volunteer";
  const cityDisplay = job.city ?? job.address.split(",")[0];
  const isToday = isJobToday(job.startDateTime, job.startTime);
  const hasPhone = isAuthenticated && !!job.contactPhone;
  const countdown = expiryCountdown(job.expiresAt);
  const isWartime = WARTIME_CATEGORIES.includes(job.category as typeof WARTIME_CATEGORIES[number]);
  const isSeasonal = SEASONAL_CATEGORIES.includes(job.category as typeof SEASONAL_CATEGORIES[number]);

  const handleRestrictedAction = (message: string) => {
    if (onLoginRequired) onLoginRequired(message);
  };

  return (
    <div className={`bg-card rounded-xl border p-4 card-hover shadow-sm ${job.isUrgent ? "border-red-300 bg-red-50/30" : "border-border"}`} dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
            {getCategoryIcon(job.category)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-foreground text-base leading-tight text-right">
                {job.title}
              </h3>
              {job.isUrgent && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shrink-0">
                  <Zap className="h-3 w-3 fill-white" />
                  דחוף
                </span>
              )}
              {isToday && !job.isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white shrink-0">
                  🔥 להיום
                </span>
              )}
              {isWartime && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white shrink-0">
                  🆘 חירום
                </span>
              )}
              {isSeasonal && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shrink-0">
                  🫓 פסח
                </span>
              )}
              {job.isLocalBusiness && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white shrink-0">
                  🏢 עסק מקומי
                </span>
              )}
              {isVolunteer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white shrink-0">
                  💚 התנדבות
                </span>
              )}
            </div>
            {job.businessName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 text-right">{job.businessName}</p>
            )}
          </div>
        </div>
        {/* Salary */}
        <div className="shrink-0 text-left">
          <span className={`text-sm font-semibold whitespace-nowrap ${isVolunteer ? "text-green-600" : "text-primary"}`}>
            {isVolunteer ? "💚 התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <MapPin className="h-3 w-3 text-primary shrink-0" />
          {cityDisplay}
          {showDistance && job.distance !== undefined && (
            <span className="text-primary font-semibold mr-0.5">· {formatDistance(job.distance)}</span>
          )}
        </span>
        <Badge variant="secondary" className="text-xs py-0 h-4 px-1.5">
          {getCategoryLabel(job.category)}
        </Badge>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {getStartTimeLabel(job.startTime)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 shrink-0" />
          {job.workersNeeded} עובדים
        </span>
      </div>

      {/* Time info row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>{relativeTime(job.createdAt)}</span>
        {countdown && (
          <span className={`flex items-center gap-1 font-medium ${countdown === "פג תוקף" ? "text-destructive" : "text-orange-600"}`}>
            <Timer className="h-3 w-3 shrink-0" />
            {countdown}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 flex-wrap" dir="rtl">
        {hasPhone ? (
          <>
            <Button
              size="sm"
              className="gap-1.5 text-xs flex-1 min-w-0"
              style={{ backgroundColor: "#25D366", color: "white" }}
              onClick={() => contactViaWhatsApp(job.contactPhone!, job.title)}
            >
              <WhatsAppIcon />
              <span className="truncate">וואטסאפ</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs flex-1 min-w-0"
              onClick={() => callPhone(job.contactPhone!)}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">התקשר</span>
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs flex-1 min-w-0 border-dashed text-muted-foreground"
            onClick={() => handleRestrictedAction("כדי ליצור קשר עם המעסיק יש להתחבר למערכת")}
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">התחבר לראות טלפון</span>
          </Button>
        )}

        {/* Share */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
          onClick={() => shareJobOnWhatsApp(job.title, job.id, job.city, job.salary, job.salaryType)}
          title="שתף ב-WhatsApp"
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>

        <Link href={`/job/${job.id}`}>
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <ChevronLeft className="h-3 w-3" />
            פרטים
          </Button>
        </Link>
      </div>
    </div>
  );
}

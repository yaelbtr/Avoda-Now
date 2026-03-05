import React from "react";
import { MapPin, Clock, Users, Zap, Flame, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <>
      {/* ── Compact card (carousel tile) ─────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="w-full text-right bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`פתח פרטים: ${job.title}`}
      >
        {/* Top row: badge + category icon */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{catIcon}</span>
          {badge === "urgent" && (
            <span className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              <Zap className="h-3 w-3 fill-white" />
              דחוף
            </span>
          )}
          {badge === "today" && (
            <span className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              <Flame className="h-3 w-3" />
              להיום
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-foreground leading-snug mb-1 line-clamp-2">
          {job.title}
        </h3>

        {/* Category */}
        <p className="text-xs text-muted-foreground mb-2">{catLabel}</p>

        {/* Key details row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </span>
          )}
          {salaryStr && (
            <span className="font-semibold text-green-700 dark:text-green-400">
              {salaryStr}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            {job.workersNeeded} עובדים
          </span>
        </div>

        {/* Posted time */}
        <p className="text-xs text-muted-foreground/60 mt-2">{relativeTime(job.createdAt)}</p>
      </button>

      {/* ── Full detail bottom sheet ──────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <SheetHeader className="text-right mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{catIcon}</span>
              <div>
                <SheetTitle className="text-lg font-bold leading-tight">{job.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">{catLabel}</p>
              </div>
              {badge === "urgent" && (
                <span className="mr-auto flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3 fill-white" />
                  דחוף
                </span>
              )}
              {badge === "today" && (
                <span className="mr-auto flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  <Flame className="h-3 w-3" />
                  להיום
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Details grid */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{job.address}{job.city && job.city !== job.address ? `, ${job.city}` : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{getStartTimeLabel(job.startTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>דרושים {job.workersNeeded} עובדים</span>
            </div>
            {salaryStr && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">💰</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{salaryStr}</span>
              </div>
            )}
            {job.businessName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">🏢</span>
                <span>{job.businessName}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">פורסם {relativeTime(job.createdAt)}</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white font-bold gap-1.5"
              onClick={handleWhatsApp}
            >
              <span className="text-base">💬</span>
              וואטסאפ
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 font-semibold"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
              התקשר
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              שתף
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

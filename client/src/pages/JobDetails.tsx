import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Clock, Users, Phone, Share2, ChevronRight,
  Briefcase, DollarSign, Loader2, AlertCircle, Flag, CheckCircle2,
  Lock, Copy, Zap, Timer,
} from "lucide-react";
import {
  getCategoryIcon, getCategoryLabel, formatSalary,
  getStartTimeLabel, formatDistance
} from "@shared/categories";
import { toast } from "sonner";
import LoginModal from "@/components/LoginModal";

const SITE_URL = "https://job-now.manus.space";

const WhatsAppIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const cls = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
};

function OGMetaTags({ title, description, jobId }: { title: string; description: string; jobId: number }) {
  useEffect(() => {
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const jobUrl = `${SITE_URL}/job/${jobId}`;
    document.title = `${title} | Job-Now`;
    setMeta("og:title", `${title} | Job-Now`);
    setMeta("og:description", description.slice(0, 200));
    setMeta("og:url", jobUrl);
    setMeta("og:type", "article");
    setMeta("og:site_name", "Job-Now");
    setMeta("og:image", `${SITE_URL}/og-image.png`);
    return () => { document.title = "Job-Now | מצא עבודה או עובדים עכשיו"; };
  }, [title, description, jobId]);
  return null;
}

export default function JobDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const jobId = parseInt(params.id ?? "0");
  const { isAuthenticated, user } = useAuth();

  const { data: job, isLoading, error } = trpc.jobs.getById.useQuery(
    { id: jobId },
    { enabled: !!jobId }
  );

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => {}
    );
  }, []);

  const reportMutation = trpc.jobs.report.useMutation({
    onSuccess: () => { setReported(true); setReportOpen(false); toast.success("הדיווח נשלח. תודה!"); },
    onError: (e) => toast.error(e.message),
  });

  const markFilledMutation = trpc.jobs.markFilled.useMutation({
    onSuccess: () => { toast.success("המשרה סוגרה בהצלחה! 🎉"); navigate("/my-jobs"); },
    onError: (e) => toast.error(e.message),
  });

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    if (!job) return;
    const lat = parseFloat(job.latitude as string);
    const lng = parseFloat(job.longitude as string);
    map.setCenter({ lat, lng });
    map.setZoom(15);
    new google.maps.Marker({ position: { lat, lng }, map, title: job.title });
  };

  /** Show login modal with a contextual message */
  const requireLogin = (message: string) => {
    setLoginMessage(message);
    setLoginOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center" dir="rtl">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-60" />
        <p className="font-medium text-lg">משרה לא נמצאה</p>
        <Button className="mt-4" onClick={() => navigate("/find-jobs")}>חזור לחיפוש</Button>
      </div>
    );
  }

  const lat = parseFloat(job.latitude as string);
  const lng = parseFloat(job.longitude as string);
  const isVolunteer = job.salaryType === "volunteer";
  const jobUrl = `${SITE_URL}/job/${job.id}`;
  const shareText = encodeURIComponent(`מצאתי עבודה באתר Job-Now 💼\n${job.title}\n${jobUrl}`);

  // Phone is only available when authenticated (server strips it for guests)
  const hasPhone = isAuthenticated && !!job.contactPhone;
  const cleanPhone = hasPhone ? job.contactPhone!.replace(/\D/g, "") : "";
  const intlPhone = cleanPhone.startsWith("0") ? "972" + cleanPhone.slice(1) : cleanPhone;
  const contactText = encodeURIComponent(`שלום, ראיתי את המשרה "${job.title}" באתר Job-Now ואני מעוניין/ת.`);

  const distance = userLat && userLng
    ? (() => {
        const R = 6371;
        const dLat = ((lat - userLat) * Math.PI) / 180;
        const dLon = ((lng - userLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((userLat * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      })()
    : null;

  const isOwner = isAuthenticated && user?.id === job.postedBy;

  // Expiry countdown
  const expiryMs = job.expiresAt ? new Date(job.expiresAt).getTime() - Date.now() : null;
  const expiryText = expiryMs !== null
    ? expiryMs <= 0 ? "פג תוקף"
      : expiryMs < 3600000 ? `פג תוקף בעוד ${Math.floor(expiryMs / 60000)} דקות`
      : expiryMs < 21600000 ? `פג תוקף בעוד ${Math.floor(expiryMs / 3600000)} שעות`
      : null
    : null;

  // WhatsApp share with proper format
  const shareJobText = encodeURIComponent(
    "עבודה זמנית:" + "\n" + job.title + "\n" + (job.city ?? job.address.split(",")[0]) + "\n" + (isVolunteer ? "התנדבות" : "₪" + (job.salary ?? "")) + "\n" + "פרטים כאן:" + "\n" + jobUrl
  );

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <OGMetaTags title={job.title} description={job.description} jobId={job.id} />

      {/* Back */}
      <button
        onClick={() => navigate("/find-jobs")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
        חזור לחיפוש
      </button>

      {/* Header card */}
      <div className="bg-card rounded-xl border border-border p-5 mb-4 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl shrink-0">
            {getCategoryIcon(job.category)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight">{job.title}</h1>
            {job.businessName && (
              <p className="text-base text-muted-foreground mt-0.5">{job.businessName}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {job.isUrgent && (
                <Badge className="bg-red-500 text-white gap-1 flex items-center">
                  <Zap className="h-3 w-3 fill-white" />
                  דחוף — צריך עובד עכשיו
                </Badge>
              )}
              <Badge variant="secondary">{getCategoryLabel(job.category)}</Badge>
              <Badge variant={job.status === "active" ? "default" : "secondary"}>
                {job.status === "active" ? "פעיל" : job.status === "under_review" ? "בבדיקה" : "סגור"}
              </Badge>
              {isVolunteer && <Badge className="bg-green-100 text-green-700 border-green-200">💚 התנדבות</Badge>}
              {expiryText && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1 flex items-center">
                  <Timer className="h-3 w-3" />
                  {expiryText}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{job.city ?? job.address.split(",")[0]}</span>
          </div>
          {distance !== null && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <MapPin className="h-4 w-4 shrink-0" />
              {formatDistance(distance)} ממך
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            {getStartTimeLabel(job.startTime)}
            {job.workingHours && ` · ${job.workingHours}`}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 text-primary shrink-0" />
            {job.workersNeeded} עובדים דרושים
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <DollarSign className="h-4 w-4 text-primary shrink-0" />
            <span className={`font-semibold ${isVolunteer ? "text-green-600" : "text-foreground"}`}>
              {isVolunteer ? "💚 התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-card rounded-xl border border-border p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          תיאור המשרה
        </h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
          {job.description}
        </p>
      </div>

      {/* Map */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4 shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            מיקום — {job.address}
          </h2>
        </div>
        <MapView
          onMapReady={handleMapReady}
          initialCenter={{ lat, lng }}
          initialZoom={15}
          className="h-52"
        />
      </div>

      {/* Contact section */}
      <div className="bg-card rounded-xl border border-border p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-foreground mb-1">פרטי יצירת קשר</h2>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="font-medium text-foreground">{job.contactName}</span>
        </p>

        {isAuthenticated && hasPhone ? (
          /* ── Authenticated: show full contact options ── */
          <div className="flex flex-col gap-2">
            {/* Phone number display */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 mb-1">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <span dir="ltr" className="font-medium text-foreground text-sm">{job.contactPhone}</span>
            </div>
            <a
              href={`https://wa.me/${intlPhone}?text=${contactText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="w-full gap-2 text-white" style={{ backgroundColor: "#25D366" }}>
                <WhatsAppIcon size="lg" />
                שלח הודעה בוואטסאפ
              </Button>
            </a>
            <a href={`tel:${job.contactPhone}`}>
              <Button size="lg" variant="outline" className="w-full gap-2">
                <Phone className="h-5 w-5" />
                התקשר עכשיו
              </Button>
            </a>
          </div>
        ) : (
          /* ── Guest: show locked state with login prompt ── */
          <div className="space-y-3">
            {/* Masked phone placeholder */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-dashed border-border">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-sm tracking-widest">05X-XXX-XXXX</span>
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => requireLogin("כדי ליצור קשר עם המעסיק יש להתחבר למערכת")}
            >
              <Lock className="h-4 w-4" />
              התחבר כדי לראות מספר טלפון
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              style={{ borderColor: "#25D366", color: "#25D366" }}
              onClick={() => requireLogin("כדי ליצור קשר עם המעסיק יש להתחבר למערכת")}
            >
              <WhatsAppIcon size="lg" />
              התחבר כדי לשלוח וואטסאפ
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              כדי ליצור קשר עם המעסיק יש להתחבר למערכת
            </p>
          </div>
        )}

        {/* Share button — always visible */}
        <a
          href={`https://wa.me/?text=${shareJobText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2"
        >
          <Button size="lg" variant="ghost" className="w-full gap-2 text-muted-foreground">
            <Share2 className="h-5 w-5" />
            שתף עבודה ב-WhatsApp
          </Button>
        </a>
      </div>

      {/* Mark as filled — only for job owner */}
      {isOwner && job.status === "active" && (
        <div className="mb-4">
          <Button
            size="lg"
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => markFilledMutation.mutate({ id: job.id })}
            disabled={markFilledMutation.isPending}
          >
            {markFilledMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            מצאתי עובד — סגור משרה
          </Button>
        </div>
      )}

      {/* Duplicate job button */}
      <div className="mb-4">
        <button
          onClick={() => {
            const params = new URLSearchParams({
              from: String(job.id),
              title: job.title,
              description: job.description,
              category: job.category,
              address: job.address,
              salary: job.salary ? String(job.salary) : "",
              salaryType: job.salaryType ?? "hourly",
              contactName: job.contactName,
              contactPhone: job.contactPhone ?? "",
              businessName: job.businessName ?? "",
              workingHours: job.workingHours ?? "",
              startTime: job.startTime ?? "flexible",
              workersNeeded: String(job.workersNeeded ?? 1),
            });
            navigate(`/post-job?${params.toString()}`);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
        >
          <Copy className="h-4 w-4" />
          פרסם עבודה דומה
        </button>
      </div>

      {/* Report */}
      <div className="text-center pb-4">
        {reported ? (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            הדיווח נשלח. תודה!
          </div>
        ) : (
          <button
            onClick={() => {
              if (!isAuthenticated) {
                requireLogin("כדי לדווח על משרה יש להתחבר למערכת");
                return;
              }
              setReportOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors mx-auto"
          >
            <Flag className="h-3.5 w-3.5" />
            דווח על משרה חשודה
          </button>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>דיווח על משרה</DialogTitle>
            <DialogDescription>
              אם המשרה נראית חשודה, מטעה, או בלתי הולמת — אנא דווח לנו.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="תאר בקצרה את הבעיה (אופציונלי)"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2 justify-start" dir="rtl">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>ביטול</Button>
            <Button
              variant="destructive"
              onClick={() => reportMutation.mutate({ jobId: job.id, reason: reportReason || undefined })}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שלח דיווח"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Modal with contextual message */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl" dir="rtl">
          <div className="bg-primary/5 border-b border-border px-6 py-4 text-center">
            <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="font-semibold text-foreground">{loginMessage}</p>
          </div>
          <div className="p-0">
            <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Standalone login modal (used for the login prompt) */}
      {loginOpen && (
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
        />
      )}
    </div>
  );
}

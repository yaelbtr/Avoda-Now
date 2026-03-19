import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { parseJobId, buildJobPath } from "@/lib/jobSlug";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { AppButton } from "@/components/ui";
import { MapView } from "@/components/Map";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AppTextarea } from "@/components/ui";
import {
  MapPin, Clock, Users, Phone, Share2, ChevronRight,
  Briefcase, DollarSign, AlertCircle, Flag, CheckCircle2,
  Lock, Copy, Zap, Timer, Calendar, ImageIcon, ChevronLeft,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import {
  getCategoryIcon, getCategoryLabel, formatSalary,
  getStartTimeLabel, formatDistance,
} from "@shared/categories";
import { minAgeLabel } from "@shared/ageUtils";
import { toast } from "sonner";
import LoginModal from "@/components/LoginModal";
import { BirthDateModal } from "@/components/BirthDateModal";
import { saveReturnPath } from "@/const";
import { useJobPostingSchema, useBreadcrumbSchema } from "@/hooks/useStructuredData";
import { useSEO } from "@/hooks/useSEO";
import {
  C_BRAND_HEX, C_BRAND_DARK_HEX, C_BORDER, C_PAGE_BG_HEX,
  C_SUCCESS_HEX, C_SUCCESS_DARK_HEX, G_WHATSAPP,
} from "@/lib/colors";

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
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const jobUrl = `${SITE_URL}/job/${jobId}`;
    document.title = `${title} | AvodaNow`;
    setMeta("og:title", `${title} | AvodaNow`);
    setMeta("og:description", description.slice(0, 200));
    setMeta("og:url", jobUrl);
    setMeta("og:type", "article");
    setMeta("og:site_name", "AvodaNow");
    setMeta("og:image", `${SITE_URL}/og-image.png`);
    return () => { document.title = "AvodaNow | מצא עבודה או עובדים עכשיו"; };
  }, [title, description, jobId]);
  return null;
}

// ── Light card style helper ─────────────────────────────────────────────
const lightCard: React.CSSProperties = {
  background: "white",
  border: `1px solid ${C_BORDER}`,
  borderRadius: "1rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45 },
  }),
};

export default function JobDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  // Accept both /job/42 and /job/42-שליח-בתל-אביב formats
  const jobId = parseJobId(params.id ?? "0");
  const { isAuthenticated, user } = useAuth();

  const { data: job, isLoading, error } = trpc.jobs.getById.useQuery(
    { id: jobId },
    { enabled: !!jobId }
  );

  // Fetch employer profile for profile photo (only if job has a postedBy)
  const { data: employerProfile } = trpc.user.getPublicProfile.useQuery(
    { userId: job?.postedBy ?? 0 },
    { enabled: !!job?.postedBy }
  );

  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  // Age-gate state (same pattern as FindJobs)
  const [birthDateModalOpen, setBirthDateModalOpen] = useState(false);
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

  // Worker's own application for this job (to show withdraw button)
  const { data: myApplications } = trpc.jobs.myApplications.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const myApplicationForJob = myApplications?.find(a => a.jobId === jobId);

  const withdrawMutation = trpc.jobs.withdrawApplication.useMutation({
    onSuccess: () => {
      toast.success("מועמדות בוטלה בהצלחה");
      utils.jobs.myApplications.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();
  // Apply mutation with age-gate
  const applyMutationJD = trpc.jobs.applyToJob.useMutation({
    onSuccess: () => { utils.jobs.myApplications.invalidate(); toast.success("מועמדות הוגשה בהצלחה! 🎉"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const birthDateInfoQueryJD = trpc.user.getBirthDateInfo.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const handleApplyJD = () => {
    if (!isAuthenticated) { requireLogin("כדי להגיש מועמדות יש להתחבר למערכת"); return; }
    const hasBirthDate = birthDateInfoQueryJD.data?.birthDate != null;
    if (!hasBirthDate) {
      setBirthDateModalOpen(true);
      return;
    }
    applyMutationJD.mutate({ jobId: job!.id, origin: window.location.origin });
  };
  const handleBirthDateSuccessJD = () => {
    setBirthDateModalOpen(false);
    applyMutationJD.mutate({ jobId: job!.id, origin: window.location.origin });
  };

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    if (!job) return;
    const lat = parseFloat(job.latitude as string);
    const lng = parseFloat(job.longitude as string);
    map.setCenter({ lat, lng });
    map.setZoom(15);
    new google.maps.Marker({ position: { lat, lng }, map, title: job.title });
  };

  const requireLogin = (message: string) => { saveReturnPath(); setLoginMessage(message); setLoginOpen(true); };

  // ── SEO hooks MUST be called before any early returns (Rules of Hooks) ──────
  const _jobCity = job ? (job.city ?? job.address?.split(",")[0] ?? "") : "";
  const _isVolunteer = job?.salaryType === "volunteer";
  const _salaryText = _isVolunteer ? "התנדבות" : job?.salary ? `₪${job.salary} ל${job?.salaryType === "hourly" ? "שעה" : job?.salaryType === "daily" ? "יום" : "חודש"}` : "";
  const _seoJobTitle = job ? `${job.title}${_jobCity ? ` ב${_jobCity}` : ""}${_salaryText ? ` – ${_salaryText}` : ""}` : "AvodaNow | מצא עבודה";
  const _jobPath = job ? buildJobPath(job.id, job.title, job.city) : "";

  useSEO({
    title: _seoJobTitle,
    description: job ? job.description.slice(0, 200) : "",
    canonical: _jobPath || undefined,
    ogImage: `${SITE_URL}/og-image.png`,
  });

  useBreadcrumbSchema(
    job
      ? [
          { name: "בית", path: "/" },
          { name: "חיפוש עבודה", path: "/find-jobs" },
          ...(_jobCity ? [{ name: `עבודות ב${_jobCity}`, path: `/jobs/${encodeURIComponent(_jobCity)}` }] : []),
          { name: job.title, path: _jobPath },
        ]
      : [{ name: "בית", path: "/" }]
  );

  useJobPostingSchema(
    job
      ? {
          id: job.id,
          title: job.title,
          description: job.description,
          city: job.city,
          address: job.address,
          salary: job.salary as string | null,
          salaryType: job.salaryType as "hourly" | "daily" | "monthly" | "volunteer" | null,
          businessName: job.businessName,
          createdAt: job.createdAt,
          expiresAt: job.expiresAt,
          isUrgent: job.isUrgent,
        }
      : null
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" style={{ background: C_PAGE_BG_HEX }}>
        <BrandLoader size="lg" label="טוען פרטי משרה..." />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 bg-[#f5f7f8]" dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-50 border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="font-semibold text-lg text-gray-900">משרה לא נמצאה</p>
        <AppButton variant="brand" onClick={() => navigate("/find-jobs")}>חזור לחיפוש</AppButton>
      </div>
    );
  }

  const lat = parseFloat(job.latitude as string);
  const lng = parseFloat(job.longitude as string);
  const isVolunteer = job.salaryType === "volunteer";
  // Use slug-based URL for canonical and sharing
  const jobPath = buildJobPath(job.id, job.title, job.city);
  const referrerId = user?.id ?? null;
  const jobUrl = `${SITE_URL}${jobPath}${referrerId ? `?ref=${referrerId}` : ""}`;
  const shareText = encodeURIComponent(`מצאתי עבודה באתר AvodaNow 💼\n${job.title}\n${jobUrl}`);
  // contactPhone is never sent to workers — contact is via application only

  const distance = userLat && userLng
    ? (() => {
        const R = 6371;
        const dLat = ((lat - userLat) * Math.PI) / 180;
        const dLon = ((lng - userLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      })()
    : null;

  const isOwner = isAuthenticated && user?.id === job.postedBy;

  const expiryMs = job.expiresAt ? new Date(job.expiresAt).getTime() - Date.now() : null;
  const expiryText = expiryMs !== null
    ? expiryMs <= 0 ? "פג תוקף"
      : expiryMs < 3600000 ? `פג תוקף בעוד ${Math.floor(expiryMs / 60000)} דקות`
      : expiryMs < 21600000 ? `פג תוקף בעוד ${Math.floor(expiryMs / 3600000)} שעות`
      : null
    : null;

  const shareJobText = encodeURIComponent(
    "עבודה זמנית:" + "\n" + job.title + "\n" + (job.city ?? job.address.split(",")[0]) + "\n" +
    (isVolunteer ? "התנדבות" : "₪" + (job.salary ?? "")) + "\n" + "פרטים כאן:" + "\n" + jobUrl
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen" style={{ background: C_PAGE_BG_HEX }}
    >


      <div className="relative max-w-2xl mx-auto px-4 py-8">

        {/* ── Visual Breadcrumb ── */}
        <motion.nav
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-6 flex-wrap"
          dir="rtl"
        >
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/find-jobs" className="text-gray-400 hover:text-gray-700 transition-colors">חיפוש עבודה</Link>
          {_jobCity && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              <Link
                href={`/jobs/${encodeURIComponent(_jobCity)}`}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                {`עבודות ב${_jobCity}`}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium truncate max-w-[160px]">{job.title}</span>
        </motion.nav>

        {/* ── Header card ── */}
        <motion.div
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...lightCard, padding: "1.25rem", marginBottom: "1rem" }}
        >
          <div className="flex items-start gap-4 mb-4">
            {/* Category icon or employer profile photo */}
            {employerProfile?.profilePhoto ? (
              <img
                src={employerProfile.profilePhoto}
                alt={job.businessName ?? job.contactName}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-200"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${C_BRAND_HEX}1a 0%, ${C_BRAND_HEX}0d 100%)`,
                  border: `1px solid ${C_BRAND_HEX}26`,
                }}
              >
                {getCategoryIcon(job.category)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black leading-tight mb-1 text-gray-900">
                {job.title}
              </h1>
              {job.businessName && (
                <p className="text-sm mb-2 text-gray-500">
                  {job.businessName}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {job.isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                    <Zap className="h-3 w-3 fill-white" />
                    דחוף — צריך עובד עכשיו
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  {getCategoryLabel(job.category)}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    job.status === "active" ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {job.status === "active" ? "פעיל" : job.status === "under_review" ? "בבדיקה" : "סגור"}
                </span>
                {isVolunteer && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    💚 התנדבות
                  </span>
                )}
                {expiryText && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                    <Timer className="h-3 w-3" />
                    {expiryText}
                  </span>
                )}
                {(job as any).minAge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.08)", color: "rgb(185,28,28)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    🔞 {minAgeLabel((job as any).minAge)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="truncate">{job.city ?? job.address.split(",")[0]}</span>
            </div>
            {distance !== null && (
              <div className="flex items-center gap-2 font-medium text-blue-600">
                <MapPin className="h-4 w-4 shrink-0" />
                {formatDistance(distance)} ממך
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 shrink-0 text-blue-500" />
              {getStartTimeLabel(job.startTime)}
              {job.workingHours && ` · ${job.workingHours}`}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="h-4 w-4 shrink-0 text-blue-500" />
              {job.workersNeeded} עובדים דרושים
            </div>
            {/* Date */}
            {(job as any).jobDate && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4 shrink-0 text-blue-500" />
                <span>תאריך: {new Date((job as any).jobDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
            {/* Work hours */}
            {((job as any).workStartTime || (job as any).workEndTime) && (
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4 shrink-0 text-orange-500" />
                <span>שעות: {(job as any).workStartTime ?? ""}{(job as any).workStartTime && (job as any).workEndTime ? " עד " : ""}{(job as any).workEndTime ?? ""}</span>
              </div>
            )}
            <div className="flex items-center gap-2 col-span-2">
              <DollarSign className="h-4 w-4 shrink-0 text-blue-500" />
              <span className={`font-semibold ${isVolunteer ? "text-green-600" : "text-blue-600"}`}>
                {isVolunteer ? "💚 התנדבות" : formatSalary(job.salary ?? null, job.salaryType)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Description ── */}
        <motion.div
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...lightCard, padding: "1.25rem", marginBottom: "1rem" }}
        >
          <h2 className="font-bold mb-3 flex items-center gap-2 text-gray-900">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
            </div>
            תיאור המשרה
          </h2>
          <p className="leading-relaxed whitespace-pre-wrap text-sm text-gray-600">
            {job.description}
          </p>
        </motion.div>

        {/* ── Job Images Gallery ── */}
        {(job as any).imageUrls && JSON.parse((job as any).imageUrls ?? "[]").length > 0 && (() => {
          const images: string[] = JSON.parse((job as any).imageUrls ?? "[]");
          return (
            <motion.div
              custom={2}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              style={{ ...lightCard, padding: "1.25rem", marginBottom: "1rem" }}
            >
              <h2 className="font-bold mb-3 flex items-center gap-2 text-gray-900">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                </div>
                תמונות מהמקום
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGalleryIndex(i)}
                    className="shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt={`תמונה ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
              {/* Lightbox */}
              {galleryIndex !== null && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                  onClick={() => setGalleryIndex(null)}
                >
                  <button
                    type="button"
                    className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/30"
                    onClick={() => setGalleryIndex(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {galleryIndex > 0 && (
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/20 rounded-full p-2 hover:bg-white/30"
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(g => (g ?? 0) - 1); }}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  {galleryIndex < images.length - 1 && (
                    <button
                      type="button"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 rounded-full p-2 hover:bg-white/30"
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(g => (g ?? 0) + 1); }}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  <img
                    src={images[galleryIndex]}
                    alt={`תמונה ${galleryIndex + 1}`}
                    className="max-w-full max-h-[80vh] rounded-xl object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute bottom-4 text-white text-sm">{galleryIndex + 1} / {images.length}</div>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ── Map ── */}
        <motion.div
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...lightCard, overflow: "hidden", marginBottom: "1rem" }}
        >
          <div className="p-4 flex items-center gap-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h2 className="font-bold text-sm text-gray-900">
              מיקום — {job.address}
            </h2>
          </div>
          <MapView
            onMapReady={handleMapReady}
            initialCenter={{ lat, lng }}
            initialZoom={15}
            className="h-52"
          />
        </motion.div>

        {/* ── Contact section ── */}
        <motion.div
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...lightCard, padding: "1.25rem", marginBottom: "1rem" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200">
              <Phone className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-900">פרטי יצירת קשר</h2>
          </div>
          <p className="text-sm mb-4 text-gray-600">
            <span className="font-medium text-gray-900">{job.contactName}</span>
          </p>

          {/* Apply button — shown to workers who haven't applied yet */}
          {!isOwner && job.status === "active" && !myApplicationForJob && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleApplyJD}
              disabled={applyMutationJD.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all mb-3"
              style={{ background: C_BRAND_HEX, color: "#fff" }}
            >
              {applyMutationJD.isPending ? (
                <BrandLoader size="sm" />
              ) : (
                <>
                  <Briefcase className="h-4 w-4" />
                  הגש מועמדות
                </>
              )}
            </motion.button>
          )}
          {/* Already applied indicator */}
          {!isOwner && isAuthenticated && myApplicationForJob && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-3 py-2 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              הגשת מועמדות למשרה זו
            </div>
          )}
          {/* Contact via application only */}
          <div className="space-y-3">
            <p className="text-xs text-center text-gray-500">פנייה למעסיק מתבצעת דרך הגשת מועמדות בלבד</p>
          </div>

          {/* Share — always visible */}
          <motion.a
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            href={`https://wa.me/?text=${shareJobText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3"
          >
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border border-gray-200 text-gray-600 hover:bg-gray-100" style={{ background: C_PAGE_BG_HEX }}
            >
              <Share2 className="h-4 w-4" />
              שתף עבודה ב-WhatsApp
            </button>
          </motion.a>
        </motion.div>

        {/* ── Worker: withdraw application ── */}
        <AnimatePresence>
          {!isOwner && isAuthenticated && myApplicationForJob && job.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="mb-4"
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                onClick={() => {
                  if (confirm("האם אתה בטוח שברצונך לבטל את המועמדות?")) {
                    withdrawMutation.mutate({ applicationId: myApplicationForJob.id });
                  }
                }}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? (
                  <BrandLoader size="sm" />
                ) : (
                  <>❌ בטל מועמדות</>
                )}
              </motion.button>
              <p className="text-xs text-center text-gray-400 mt-1">ניתן לבטל מועמדות רק כל עוד המשרה פעילה</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Owner: mark as filled ── */}
        <AnimatePresence>
          {isOwner && job.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="mb-4"
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${C_SUCCESS_HEX} 0%, ${C_SUCCESS_DARK_HEX} 100%)`,
                  boxShadow: `0 4px 16px ${C_SUCCESS_HEX}4d`,
                }}
                onClick={() => markFilledMutation.mutate({ id: job.id })}
                disabled={markFilledMutation.isPending}
              >
                {markFilledMutation.isPending
                  ? <BrandLoader size="sm" />
                  : <CheckCircle2 className="h-5 w-5" />}
                מצאתי עובד — סגור משרה
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Duplicate job ── */}
        <motion.div
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="mb-4"
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const p = new URLSearchParams({
                from: String(job.id),
                title: job.title,
                description: job.description,
                category: job.category,
                address: job.address,
                salary: job.salary ? String(job.salary) : "",
                salaryType: job.salaryType ?? "hourly",
                contactName: job.contactName,
                contactPhone: "", // contactPhone not exposed to workers
                businessName: job.businessName ?? "",
                workingHours: job.workingHours ?? "",
                startTime: job.startTime ?? "flexible",
                workersNeeded: String(job.workersNeeded ?? 1),
              });
              navigate(`/post-job?${p.toString()}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all bg-white border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Copy className="h-4 w-4" />
            פרסם עבודה דומה
          </motion.button>
        </motion.div>

        {/* ── Report ── */}
        <motion.div
          custom={5}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="text-center pb-4"
        >
          {reported ? (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              הדיווח נשלח. תודה!
            </div>
          ) : (
            <button
              onClick={() => {
                if (!isAuthenticated) { requireLogin("כדי לדווח על משרה יש להתחבר למערכת"); return; }
                setReportOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs mx-auto transition-colors text-gray-400 hover:text-red-500"
            >
              <Flag className="h-3.5 w-3.5" />
              דווח על משרה חשודה
            </button>
          )}
        </motion.div>
      </div>

      {/* ── Report Dialog ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>דיווח על משרה</DialogTitle>
            <DialogDescription>
              אם המשרה נראית חשודה, מטעה, או בלתי הולמת — אנא דווח לנו.
            </DialogDescription>
          </DialogHeader>
          <AppTextarea
            placeholder="תאר בקצרה את הבעיה (אופציונלי)"
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            dir="rtl"
            rows={3}
          />
          <div className="flex gap-2 justify-start" dir="rtl">
            <AppButton variant="ghost" onClick={() => setReportOpen(false)}>ביטול</AppButton>
            <AppButton
              variant="destructive"
              onClick={() => reportMutation.mutate({ jobId: job.id, reason: reportReason || undefined })}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? <BrandLoader size="sm" /> : "שלח דיווח"}
            </AppButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Login Modal ── */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message={loginMessage}
      />
      {/* ── Birth Date Modal (age gate) ── */}
      <BirthDateModal
        isOpen={birthDateModalOpen}
        onClose={() => setBirthDateModalOpen(false)}
        onSuccess={handleBirthDateSuccessJD}
        jobId={job?.id}
      />
    </div>
  );
}

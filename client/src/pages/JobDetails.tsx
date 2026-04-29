import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { parseJobId, buildJobPath } from "@/lib/jobSlug";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { AppButton } from "@/components/ui";
import { MapView } from "@/components/Map";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AppTextarea } from "@/components/ui";
import {
  MapPin, Clock, Users, Phone, Share2, ChevronRight,
  Briefcase, AlertCircle, Flag, CheckCircle2,
  Copy, Zap, Timer, Calendar, ImageIcon, ChevronLeft, X,
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
import { RealActionConsentModal } from "@/components/RealActionConsentModal";
import { useApplyWithAgeGate } from "@/hooks/useApplyWithAgeGate";
import { saveReturnPath } from "@/const";
import { useJobPostingSchema, useBreadcrumbSchema } from "@/hooks/useStructuredData";
import { useSEO } from "@/hooks/useSEO";
import {
  C_BRAND_HEX, C_BRAND_DARK_HEX, C_BORDER, C_PAGE_BG_HEX,
  C_SUCCESS_HEX, C_SUCCESS_DARK_HEX,
} from "@/lib/colors";

const SITE_URL = typeof window !== "undefined"
  ? window.location.origin.replace(/\/+$/, "")
  : "";

// ── Brand design tokens (YallaAvoda) ─────────────────────────────────────────
const T = {
  brand:        C_BRAND_HEX,          // olive-green #4a5d23
  brandDark:    C_BRAND_DARK_HEX,
  pageBg:       C_PAGE_BG_HEX,        // #f8f5ee
  border:       C_BORDER,             // oklch(0.88 0.04 122)
  labelColor:   "#4F583B",
  cardBg:       "#ffffff",
  cardRadius:   "1rem",
  cardShadow:   "0 1px 4px rgba(0,0,0,0.06)",
  sectionIconBg: "oklch(0.94 0.04 122)",
  sectionIconBorder: "oklch(0.85 0.06 122)",
  sectionIconColor: C_BRAND_HEX,
} as const;

const card: React.CSSProperties = {
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  borderRadius: T.cardRadius,
  boxShadow: T.cardShadow,
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4 },
  }),
};

// ── Section header with brand icon ─────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: T.sectionIconBg, border: `1px solid ${T.sectionIconBorder}` }}
      >
        <span style={{ color: T.sectionIconColor }}>{icon}</span>
      </div>
      <h2 className="font-bold text-sm" style={{ color: "#1a2010" }}>{title}</h2>
    </div>
  );
}

// ── WhatsApp icon ───────────────────────────────────────────────────────────
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
    document.title = `${title} | YallaAvoda`;
    setMeta("og:title", `${title} | YallaAvoda`);
    setMeta("og:description", description.slice(0, 200));
    setMeta("og:url", jobUrl);
    setMeta("og:type", "article");
    setMeta("og:site_name", "YallaAvoda");
    setMeta("og:image", `${SITE_URL}/og-image.png`);
    return () => { document.title = "YallaAvoda | מוצאים עבודה זמנית או עובדים – תוך דקות"; };
  }, [title, description, jobId]);
  return null;
}

export default function JobDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const jobId = parseJobId(params.id ?? "0");
  const { isAuthenticated, user } = useAuth();
  const authQuery = useAuthQuery();

  const { data: job, isLoading, error } = trpc.jobs.getById.useQuery(
    { id: jobId },
    { enabled: !!jobId }
  );

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

  const { data: myApplications } = trpc.jobs.myApplications.useQuery(undefined, {
    ...authQuery(),
    staleTime: 30_000,
  });
  const myApplicationForJob = myApplications?.find(a => a.jobId === jobId);

  const utils = trpc.useUtils();

  const withdrawMutation = trpc.jobs.withdrawApplication.useMutation({
    onSuccess: () => {
      toast.success("מועמדות בוטלה בהצלחה");
      utils.jobs.myApplications.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const requireLogin = (message: string) => { saveReturnPath(); setLoginMessage(message); setLoginOpen(true); };

  const {
    apply: applyWithAgeGate,
    isPending: isApplyPending,
    birthDateModalOpen,
    handleBirthDateSuccess: handleBirthDateSuccessJD,
    closeBirthDateModal,
    consentModalOpen,
    handleConsentConfirm,
    closeConsentModal,
  } = useApplyWithAgeGate({
    isAuthenticated,
    onLoginRequired: requireLogin,
    onSuccess: () => utils.jobs.myApplications.invalidate(),
  });

  const handleApplyJD = () => {
    if (!job) return;
    applyWithAgeGate({ jobId: job.id, origin: window.location.origin });
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

  // ── SEO hooks (must be before early returns) ────────────────────────────
  const _jobCity = job ? (job.city ?? job.address?.split(",")[0] ?? "") : "";
  const _isVolunteer = job?.salaryType === "volunteer";
  const _salaryText = _isVolunteer ? "התנדבות" : job?.salary ? `₪${job.salary} ל${job?.salaryType === "hourly" ? "שעה" : job?.salaryType === "daily" ? "יום" : "חודש"}` : "";
  const _seoJobTitle = job ? `${job.title}${_jobCity ? ` ב${_jobCity}` : ""}${_salaryText ? ` – ${_salaryText}` : ""}` : "YallaAvoda | מצא עבודה";
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
          hourlyRate: job.hourlyRate,
        }
      : null
  );

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" style={{ background: T.pageBg }}>
        <BrandLoader size="lg" label="טוען פרטי משרה..." />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4" style={{ background: T.pageBg }} dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.96 0.02 15)", border: "1px solid oklch(0.88 0.04 15)" }}>
          <AlertCircle className="h-8 w-8" style={{ color: "oklch(0.55 0.18 15)" }} />
        </div>
        <p className="font-bold text-lg" style={{ color: "#1a2010" }}>משרה לא נמצאה</p>
        <AppButton variant="brand" onClick={() => navigate("/find-jobs")}>חזור לחיפוש</AppButton>
      </div>
    );
  }

  const lat = parseFloat(job.latitude as string);
  const lng = parseFloat(job.longitude as string);
  const isVolunteer = job.salaryType === "volunteer";
  const jobPath = buildJobPath(job.id, job.title, job.city);
  const referrerId = user?.id ?? null;
  const jobUrl = `${SITE_URL}${jobPath}${referrerId ? `?ref=${referrerId}` : ""}`;

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

  const images: string[] = (() => {
    try { return JSON.parse((job as any).imageUrls ?? "[]"); } catch { return []; }
  })();

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: T.pageBg }}>
      <OGMetaTags title={job.title} description={job.description} jobId={job.id} />

      <div className="relative max-w-2xl mx-auto px-4 py-6">

        {/* ── Breadcrumb ── */}
        <motion.nav
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-xs mb-5 flex-wrap"
          dir="rtl"
        >
          <Link href="/" className="transition-colors" style={{ color: "#9ca3af" }}>בית</Link>
          <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#d1d5db" }} />
          <Link href="/find-jobs" className="transition-colors" style={{ color: "#9ca3af" }}>חיפוש עבודה</Link>
          {_jobCity && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#d1d5db" }} />
              <Link href={`/jobs/${encodeURIComponent(_jobCity)}`} className="transition-colors" style={{ color: "#9ca3af" }}>
                {`עבודות ב${_jobCity}`}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#d1d5db" }} />
          <span className="font-medium truncate max-w-[160px]" style={{ color: T.labelColor }}>{job.title}</span>
        </motion.nav>

        {/* ── Header card ── */}
        <motion.div
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...card, padding: "1.25rem", marginBottom: "0.875rem" }}
        >
          {/* Employer avatar + title row */}
          <div className="flex items-start gap-3.5 mb-4">
            {employerProfile?.profilePhoto ? (
              <img
                src={employerProfile.profilePhoto}
                alt={job.businessName ?? job.contactName}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
                style={{ border: `1px solid ${T.border}` }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{
                  background: `oklch(0.94 0.05 122)`,
                  border: `1px solid ${T.sectionIconBorder}`,
                }}
              >
                {getCategoryIcon(job.category)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black leading-tight mb-0.5" style={{ color: "#1a2010" }}>
                {job.title}
              </h1>
              {job.businessName && (
                <p className="text-sm mb-2" style={{ color: T.labelColor }}>{job.businessName}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {job.isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                    <Zap className="h-3 w-3 fill-white" />
                    דחוף
                  </span>
                )}
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: "oklch(0.94 0.05 122)", color: T.brand, border: `1px solid ${T.sectionIconBorder}` }}
                >
                  {getCategoryIcon(job.category)} {getCategoryLabel(job.category)}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={
                    job.status === "active"
                      ? { background: "oklch(0.94 0.06 145)", color: "oklch(0.38 0.14 145)", border: "1px solid oklch(0.84 0.08 145)" }
                      : { background: "oklch(0.94 0.01 100)", color: "#6b7280", border: "1px solid oklch(0.88 0.02 100)" }
                  }
                >
                  {job.status === "active" ? "פעיל" : job.status === "under_review" ? "בבדיקה" : "סגור"}
                </span>
                {isVolunteer && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "oklch(0.94 0.06 145)", color: "oklch(0.38 0.14 145)", border: "1px solid oklch(0.84 0.08 145)" }}>
                    💚 התנדבות
                  </span>
                )}
                {expiryText && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: "oklch(0.95 0.06 60)", color: "oklch(0.45 0.14 60)", border: "1px solid oklch(0.86 0.08 60)" }}>
                    <Timer className="h-3 w-3" />
                    {expiryText}
                  </span>
                )}
                {(job as any).minAge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.96 0.03 15)", color: "oklch(0.45 0.18 15)", border: "1px solid oklch(0.88 0.06 15)" }}>
                    🔞 {minAgeLabel((job as any).minAge)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm pt-4"
            style={{ borderTop: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-2" style={{ color: "#374151" }}>
              <MapPin className="h-4 w-4 shrink-0" style={{ color: T.brand }} />
              <span className="truncate">{job.city ?? job.address.split(",")[0]}</span>
            </div>
            {distance !== null && (
              <div className="flex items-center gap-2 font-semibold" style={{ color: T.brand }}>
                <MapPin className="h-4 w-4 shrink-0" />
                {formatDistance(distance)} ממך
              </div>
            )}
            <div className="flex items-center gap-2" style={{ color: "#374151" }}>
              <Clock className="h-4 w-4 shrink-0" style={{ color: T.brand }} />
              <span>{getStartTimeLabel(job.startTime)}{job.workingHours ? ` · ${job.workingHours}` : ""}</span>
            </div>
            <div className="flex items-center gap-2" style={{ color: "#374151" }}>
              <Users className="h-4 w-4 shrink-0" style={{ color: T.brand }} />
              <span>{job.workersNeeded} עובדים דרושים</span>
            </div>
            {(job as any).jobDate && (
              <div className="flex items-center gap-2" style={{ color: "#374151" }}>
                <Calendar className="h-4 w-4 shrink-0" style={{ color: T.brand }} />
                <span>{new Date((job as any).jobDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
            {((job as any).workStartTime || (job as any).workEndTime) && (
              <div className="flex items-center gap-2" style={{ color: "#374151" }}>
                <Clock className="h-4 w-4 shrink-0" style={{ color: "oklch(0.55 0.14 60)" }} />
                <span>{(job as any).workStartTime ?? ""}{(job as any).workStartTime && (job as any).workEndTime ? " עד " : ""}{(job as any).workEndTime ?? ""}</span>
              </div>
            )}
            {/* Salary — full width */}
            <div className="col-span-2 flex items-center gap-2 pt-1" style={{ borderTop: `1px dashed ${T.border}` }}>
              <span className="text-lg">💰</span>
              <span className="font-bold text-base" style={{ color: isVolunteer ? "oklch(0.38 0.14 145)" : T.brand }}>
                {isVolunteer ? "💚 התנדבות" : (formatSalary(job.salary ?? null, job.salaryType, job.hourlyRate ?? null) || "לא צוין")}
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
          style={{ ...card, padding: "1.25rem", marginBottom: "0.875rem" }}
        >
          <SectionHeader icon={<Briefcase className="h-3.5 w-3.5" />} title="תיאור המשרה" />
          <p className="leading-relaxed whitespace-pre-wrap text-sm" style={{ color: "#4b5563" }}>
            {job.description}
          </p>
        </motion.div>

        {/* ── Gallery ── */}
        {images.length > 0 && (
          <motion.div
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            style={{ ...card, padding: "1.25rem", marginBottom: "0.875rem" }}
          >
            <SectionHeader icon={<ImageIcon className="h-3.5 w-3.5" />} title="תמונות" />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className="shrink-0 w-28 h-28 rounded-xl overflow-hidden transition-opacity hover:opacity-90"
                  style={{ border: `1px solid ${T.border}` }}
                >
                  <img src={url} alt={`תמונה ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Map ── */}
        <motion.div
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...card, overflow: "hidden", marginBottom: "0.875rem" }}
        >
          <div className="p-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: T.sectionIconBg, border: `1px solid ${T.sectionIconBorder}` }}
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: T.sectionIconColor }} />
            </div>
            <h2 className="font-bold text-sm" style={{ color: "#1a2010" }}>
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

        {/* ── Contact / CTA ── */}
        <motion.div
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...card, padding: "1.25rem", marginBottom: "0.875rem" }}
        >
          <SectionHeader icon={<Phone className="h-3.5 w-3.5" />} title="פרטי יצירת קשר" />
          <p className="text-sm mb-4" style={{ color: "#4b5563" }}>
            <span className="font-semibold" style={{ color: "#1a2010" }}>{job.contactName}</span>
          </p>

          {/* Apply button */}
          {!isOwner && job.status === "active" && !myApplicationForJob && (
            <AppButton
              variant="brand"
              className="w-full mb-3"
              onClick={handleApplyJD}
              disabled={isApplyPending}
            >
              {isApplyPending ? <BrandLoader size="sm" /> : <><Briefcase className="h-4 w-4 ml-1.5" />הגש מועמדות</>}
            </AppButton>
          )}

          {/* Already applied */}
          {!isOwner && isAuthenticated && myApplicationForJob && (
            <div
              className="flex items-center justify-center gap-2 text-sm mb-3 py-2.5 rounded-xl"
              style={{ background: "oklch(0.94 0.06 145)", color: "oklch(0.38 0.14 145)", border: "1px solid oklch(0.84 0.08 145)" }}
            >
              <CheckCircle2 className="h-4 w-4" />
              הגשת מועמדות למשרה זו
            </div>
          )}

          <p className="text-xs text-center mb-3" style={{ color: "#9ca3af" }}>
            פנייה למעסיק מתבצעת דרך הגשת מועמדות בלבד
          </p>

          {/* WhatsApp share */}
          <a
            href={`https://wa.me/?text=${shareJobText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <AppButton variant="outline" className="w-full gap-2">
              <WhatsAppIcon size="sm" />
              שתף עבודה ב-WhatsApp
            </AppButton>
          </a>
        </motion.div>

        {/* ── Withdraw application ── */}
        <AnimatePresence>
          {!isOwner && isAuthenticated && myApplicationForJob && job.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mb-3"
            >
              <AppButton
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm("האם אתה בטוח שברצונך לבטל את המועמדות?")) {
                    withdrawMutation.mutate({ applicationId: myApplicationForJob.id });
                  }
                }}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? <BrandLoader size="sm" /> : <><X className="h-4 w-4 ml-1.5" />בטל מועמדות</>}
              </AppButton>
              <p className="text-xs text-center mt-1" style={{ color: "#9ca3af" }}>ניתן לבטל מועמדות רק כל עוד המשרה פעילה</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Owner: mark as filled ── */}
        <AnimatePresence>
          {isOwner && job.status === "active" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mb-3"
            >
              <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${C_SUCCESS_HEX} 0%, ${C_SUCCESS_DARK_HEX} 100%)`,
                  boxShadow: `0 4px 16px ${C_SUCCESS_HEX}4d`,
                }}
                onClick={() => markFilledMutation.mutate({ id: job.id })}
                disabled={markFilledMutation.isPending}
              >
                {markFilledMutation.isPending ? <BrandLoader size="sm" /> : <CheckCircle2 className="h-5 w-5" />}
                מצאתי עובד — סגור משרה
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Duplicate job ── */}
        <motion.div
          custom={5}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="mb-3"
        >
          <button
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
                contactPhone: "",
                businessName: job.businessName ?? "",
                workingHours: job.workingHours ?? "",
                startTime: job.startTime ?? "flexible",
                workersNeeded: String(job.workersNeeded ?? 1),
              });
              navigate(`/post-job?${p.toString()}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: T.cardBg,
              border: `1.5px dashed ${T.sectionIconBorder}`,
              color: T.brand,
            }}
          >
            <Copy className="h-4 w-4" />
            פרסם עבודה דומה
          </button>
        </motion.div>

        {/* ── Report ── */}
        <motion.div
          custom={6}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="text-center pb-6"
        >
          {reported ? (
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "oklch(0.38 0.14 145)" }}>
              <CheckCircle2 className="h-4 w-4" />
              הדיווח נשלח. תודה!
            </div>
          ) : (
            <button
              onClick={() => {
                if (!isAuthenticated) { requireLogin("כדי לדווח על משרה יש להתחבר למערכת"); return; }
                setReportOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs mx-auto transition-colors"
              style={{ color: "#9ca3af" }}
              onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.45 0.18 15)")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
            >
              <Flag className="h-3.5 w-3.5" />
              דווח על משרה חשודה
            </button>
          )}
        </motion.div>
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {galleryIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setGalleryIndex(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white rounded-full p-2 transition-colors"
              style={{ background: "rgba(255,255,255,0.15)" }}
              onClick={() => setGalleryIndex(null)}
            >
              <X className="h-5 w-5" />
            </button>
            {galleryIndex > 0 && (
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white rounded-full p-2 transition-colors"
                style={{ background: "rgba(255,255,255,0.15)" }}
                onClick={(e) => { e.stopPropagation(); setGalleryIndex(g => (g ?? 0) - 1); }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            {galleryIndex < images.length - 1 && (
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white rounded-full p-2 transition-colors"
                style={{ background: "rgba(255,255,255,0.15)" }}
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
          </motion.div>
        )}
      </AnimatePresence>

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

      <RealActionConsentModal
        open={consentModalOpen}
        onConfirm={handleConsentConfirm}
        onCancel={closeConsentModal}
      />
      {/* ── Birth Date Modal ── */}
      <BirthDateModal
        isOpen={birthDateModalOpen}
        onClose={closeBirthDateModal}
        onSuccess={handleBirthDateSuccessJD}
        jobId={job?.id}
      />
    </div>
  );
}
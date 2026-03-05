import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
  getStartTimeLabel, formatDistance,
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
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
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

// ── Glassmorphism style helpers ─────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  background: "oklch(1 0 0 / 5%)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: "1rem",
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

  const requireLogin = (message: string) => { setLoginMessage(message); setLoginOpen(true); };

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
        style={{ background: "oklch(0.10 0.015 265)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "oklch(0.62 0.22 255 / 0.1)",
            border: "1px solid oklch(0.62 0.22 255 / 0.2)",
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "oklch(0.72 0.22 240)" }} />
        </div>
        <p className="text-sm" style={{ color: "oklch(1 0 0 / 35%)" }}>טוען פרטי משרה...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4"
        style={{ background: "oklch(0.10 0.015 265)" }}
        dir="rtl"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "oklch(0.60 0.22 25 / 0.1)",
            border: "1px solid oklch(0.60 0.22 25 / 0.2)",
          }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: "oklch(0.65 0.22 25)" }} />
        </div>
        <p className="font-semibold text-lg" style={{ color: "oklch(0.95 0.005 80)" }}>משרה לא נמצאה</p>
        <Button onClick={() => navigate("/find-jobs")}>חזור לחיפוש</Button>
      </div>
    );
  }

  const lat = parseFloat(job.latitude as string);
  const lng = parseFloat(job.longitude as string);
  const isVolunteer = job.salaryType === "volunteer";
  const jobUrl = `${SITE_URL}/job/${job.id}`;
  const shareText = encodeURIComponent(`מצאתי עבודה באתר Job-Now 💼\n${job.title}\n${jobUrl}`);
  const hasPhone = isAuthenticated && !!job.contactPhone;
  const cleanPhone = hasPhone ? job.contactPhone!.replace(/\D/g, "") : "";
  const intlPhone = cleanPhone.startsWith("0") ? "972" + cleanPhone.slice(1) : cleanPhone;
  const contactText = encodeURIComponent(`שלום, ראיתי את המשרה "${job.title}" באתר Job-Now ואני מעוניין/ת.`);

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
      className="min-h-screen"
      style={{ background: "oklch(0.10 0.015 265)" }}
    >
      {/* ── Floating background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500,
            top: -120, right: -100,
            background: "radial-gradient(circle, oklch(0.62 0.22 255 / 0.07) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 350, height: 350,
            bottom: 50, left: -80,
            background: "radial-gradient(circle, oklch(0.78 0.17 65 / 0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <OGMetaTags title={job.title} description={job.description} jobId={job.id} />

      <div className="relative max-w-2xl mx-auto px-4 py-8" style={{ zIndex: 1 }}>

        {/* ── Back button ── */}
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate("/find-jobs")}
          className="flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: "oklch(1 0 0 / 40%)" }}
          whileHover={{ color: "oklch(0.95 0.005 80)" } as never}
        >
          <ChevronRight className="h-4 w-4" />
          חזור לחיפוש
        </motion.button>

        {/* ── Header card ── */}
        <motion.div
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...glassCard, padding: "1.25rem", marginBottom: "1rem" }}
        >
          <div className="flex items-start gap-4 mb-4">
            {/* Category icon */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.62 0.22 255 / 0.15) 0%, oklch(0.55 0.25 280 / 0.15) 100%)",
                border: "1px solid oklch(0.62 0.22 255 / 0.2)",
              }}
            >
              {getCategoryIcon(job.category)}
            </div>

            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-black leading-tight mb-1"
                style={{ color: "oklch(0.95 0.005 80)" }}
              >
                {job.title}
              </h1>
              {job.businessName && (
                <p className="text-sm mb-2" style={{ color: "oklch(1 0 0 / 50%)" }}>
                  {job.businessName}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {job.isUrgent && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.60 0.22 25) 0%, oklch(0.55 0.25 15) 100%)",
                      color: "white",
                      boxShadow: "0 0 12px oklch(0.60 0.22 25 / 0.4)",
                    }}
                  >
                    <Zap className="h-3 w-3 fill-white" />
                    דחוף — צריך עובד עכשיו
                  </span>
                )}
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: "oklch(0.62 0.22 255 / 0.12)",
                    color: "oklch(0.72 0.22 240)",
                    border: "1px solid oklch(0.62 0.22 255 / 0.2)",
                  }}
                >
                  {getCategoryLabel(job.category)}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  style={job.status === "active" ? {
                    background: "oklch(0.65 0.22 160 / 0.12)",
                    color: "oklch(0.68 0.20 160)",
                    border: "1px solid oklch(0.65 0.22 160 / 0.25)",
                  } : {
                    background: "oklch(1 0 0 / 6%)",
                    color: "oklch(1 0 0 / 40%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                  }}
                >
                  {job.status === "active" ? "פעיל" : job.status === "under_review" ? "בבדיקה" : "סגור"}
                </span>
                {isVolunteer && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: "oklch(0.65 0.22 160 / 0.1)",
                      color: "oklch(0.68 0.20 160)",
                      border: "1px solid oklch(0.65 0.22 160 / 0.2)",
                    }}
                  >
                    💚 התנדבות
                  </span>
                )}
                {expiryText && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: "oklch(0.72 0.18 65 / 0.1)",
                      color: "oklch(0.78 0.17 65)",
                      border: "1px solid oklch(0.72 0.18 65 / 0.2)",
                    }}
                  >
                    <Timer className="h-3 w-3" />
                    {expiryText}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2" style={{ color: "oklch(1 0 0 / 55%)" }}>
              <MapPin className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.22 240)" }} />
              <span className="truncate">{job.city ?? job.address.split(",")[0]}</span>
            </div>
            {distance !== null && (
              <div className="flex items-center gap-2 font-medium" style={{ color: "oklch(0.72 0.22 240)" }}>
                <MapPin className="h-4 w-4 shrink-0" />
                {formatDistance(distance)} ממך
              </div>
            )}
            <div className="flex items-center gap-2" style={{ color: "oklch(1 0 0 / 55%)" }}>
              <Clock className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.22 240)" }} />
              {getStartTimeLabel(job.startTime)}
              {job.workingHours && ` · ${job.workingHours}`}
            </div>
            <div className="flex items-center gap-2" style={{ color: "oklch(1 0 0 / 55%)" }}>
              <Users className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.22 240)" }} />
              {job.workersNeeded} עובדים דרושים
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <DollarSign className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.22 240)" }} />
              <span
                className="font-semibold"
                style={{ color: isVolunteer ? "oklch(0.68 0.20 160)" : "oklch(0.88 0.14 75)" }}
              >
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
          style={{ ...glassCard, padding: "1.25rem", marginBottom: "1rem" }}
        >
          <h2
            className="font-bold mb-3 flex items-center gap-2"
            style={{ color: "oklch(0.95 0.005 80)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.62 0.22 255 / 0.12)",
                border: "1px solid oklch(0.62 0.22 255 / 0.2)",
              }}
            >
              <Briefcase className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.22 240)" }} />
            </div>
            תיאור המשרה
          </h2>
          <p
            className="leading-relaxed whitespace-pre-wrap text-sm"
            style={{ color: "oklch(1 0 0 / 60%)" }}
          >
            {job.description}
          </p>
        </motion.div>

        {/* ── Map ── */}
        <motion.div
          custom={2}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          style={{ ...glassCard, overflow: "hidden", marginBottom: "1rem" }}
        >
          <div
            className="p-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.62 0.22 255 / 0.12)",
                border: "1px solid oklch(0.62 0.22 255 / 0.2)",
              }}
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.22 240)" }} />
            </div>
            <h2 className="font-bold text-sm" style={{ color: "oklch(0.95 0.005 80)" }}>
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
          style={{ ...glassCard, padding: "1.25rem", marginBottom: "1rem" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.62 0.22 255 / 0.12)",
                border: "1px solid oklch(0.62 0.22 255 / 0.2)",
              }}
            >
              <Phone className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.22 240)" }} />
            </div>
            <h2 className="font-bold" style={{ color: "oklch(0.95 0.005 80)" }}>פרטי יצירת קשר</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "oklch(1 0 0 / 55%)" }}>
            <span className="font-medium" style={{ color: "oklch(0.95 0.005 80)" }}>{job.contactName}</span>
          </p>

          {isAuthenticated && hasPhone ? (
            <div className="flex flex-col gap-2">
              {/* Phone number display */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-1"
                style={{
                  background: "oklch(0.62 0.22 255 / 0.08)",
                  border: "1px solid oklch(0.62 0.22 255 / 0.15)",
                }}
              >
                <Phone className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.22 240)" }} />
                <span dir="ltr" className="font-medium text-sm" style={{ color: "oklch(0.95 0.005 80)" }}>
                  {job.contactPhone}
                </span>
              </div>
              <motion.a
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                href={`https://wa.me/${intlPhone}?text=${contactText}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #25D366 0%, #1da851 100%)",
                    boxShadow: "0 0 20px #25D366 / 0.3",
                  }}
                >
                  <WhatsAppIcon size="lg" />
                  שלח הודעה בוואטסאפ
                </button>
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                href={`tel:${job.contactPhone}`}
              >
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    background: "oklch(0.62 0.22 255 / 0.1)",
                    border: "1px solid oklch(0.62 0.22 255 / 0.25)",
                    color: "oklch(0.72 0.22 240)",
                  }}
                >
                  <Phone className="h-5 w-5" />
                  התקשר עכשיו
                </button>
              </motion.a>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Masked phone */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "oklch(1 0 0 / 4%)",
                  border: "1px dashed oklch(1 0 0 / 12%)",
                }}
              >
                <Lock className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 30%)" }} />
                <span className="text-sm tracking-widest" style={{ color: "oklch(1 0 0 / 30%)" }}>
                  05X-XXX-XXXX
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                  boxShadow: "0 0 20px oklch(0.62 0.22 255 / 0.25)",
                }}
                onClick={() => requireLogin("כדי ליצור קשר עם המעסיק יש להתחבר למערכת")}
              >
                <Lock className="h-4 w-4" />
                התחבר כדי לראות מספר טלפון
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all"
                style={{
                  background: "#25D366 / 0.08",
                  border: "1px solid #25D366",
                  color: "#25D366",
                }}
                onClick={() => requireLogin("כדי ליצור קשר עם המעסיק יש להתחבר למערכת")}
              >
                <WhatsAppIcon size="lg" />
                התחבר כדי לשלוח וואטסאפ
              </motion.button>
              <p className="text-xs text-center" style={{ color: "oklch(1 0 0 / 30%)" }}>
                כדי ליצור קשר עם המעסיק יש להתחבר למערכת
              </p>
            </div>
          )}

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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "oklch(1 0 0 / 4%)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(1 0 0 / 45%)",
              }}
            >
              <Share2 className="h-4 w-4" />
              שתף עבודה ב-WhatsApp
            </button>
          </motion.a>
        </motion.div>

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
                  background: "linear-gradient(135deg, oklch(0.60 0.22 160) 0%, oklch(0.52 0.22 150) 100%)",
                  boxShadow: "0 0 20px oklch(0.60 0.22 160 / 0.3)",
                }}
                onClick={() => markFilledMutation.mutate({ id: job.id })}
                disabled={markFilledMutation.isPending}
              >
                {markFilledMutation.isPending
                  ? <Loader2 className="h-5 w-5 animate-spin" />
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
            whileHover={{ scale: 1.01, borderColor: "oklch(0.62 0.22 255 / 0.5)" }}
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
                contactPhone: job.contactPhone ?? "",
                businessName: job.businessName ?? "",
                workingHours: job.workingHours ?? "",
                startTime: job.startTime ?? "flexible",
                workersNeeded: String(job.workersNeeded ?? 1),
              });
              navigate(`/post-job?${p.toString()}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              border: "1px dashed oklch(0.62 0.22 255 / 0.3)",
              color: "oklch(0.72 0.22 240)",
              background: "oklch(0.62 0.22 255 / 0.04)",
            }}
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
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "oklch(0.68 0.20 160)" }}>
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
              style={{ color: "oklch(1 0 0 / 25%)" }}
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
          <Textarea
            placeholder="תאר בקצרה את הבעיה (אופציונלי)"
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
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

      {/* ── Login Modal ── */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message={loginMessage}
      />
    </div>
  );
}

import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppInput, AppTextarea, AppSelect, AppLabel } from "@/components/ui";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapView } from "@/components/Map";
import LoginModal from "@/components/LoginModal";
import CityAutocomplete from "@/components/CityAutocomplete";
import { saveReturnPath } from "@/const";
import { SALARY_TYPES, START_TIMES } from "@shared/categories";
import { useCategories } from "@/hooks/useCategories";
import { MapPin, LocateFixed, Loader2, CheckCircle2, Shield, Copy, Briefcase, Crosshair, Building2, Bell, BellOff, AlertTriangle, Camera, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ConfettiCelebration from "@/components/ConfettiCelebration";
import {
  C_SUCCESS as SUCCESS, C_DARK_BG, C_DARK_CARD, C_DARK_CARD_BORDER,
  C_TEXT_ON_DARK as TEXT_BRIGHT, C_TEXT_ON_DARK_MID as TEXT_MID,
  C_TEXT_ON_DARK_FAINT as TEXT_FAINT, C_BRAND as BRAND,
} from "@/lib/colors";

const schema = z.object({
  title: z.string().min(2, "נדרש כותרת"),
  description: z.string().min(10, "תיאור קצר מדי"),
  category: z.string().min(1, "בחר קטגוריה"),
  address: z.string().min(2, "נדרשת כתובת"),
  salary: z.string().optional(),
  salaryType: z.string(),
  hourlyRate: z.string().optional(),
  estimatedHours: z.string().optional(),
  // contactPhone is NOT in the form — taken from logged-in user on the server
  contactName: z.string().min(2, "נדרש שם"),
  businessName: z.string().optional(),
  workingHours: z.string().optional(),
  startTime: z.string(),
  startDateTime: z.string().optional(),
  workersNeeded: z.string(),
  activeDuration: z.enum(["1", "3", "7"]),
  isUrgent: z.boolean().optional(),
  isLocalBusiness: z.boolean().optional(),
  isVolunteer: z.boolean().optional(),
  showPhone: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// Simple math CAPTCHA (no external service needed)
function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

export default function PostJob() {
  const [, navigate] = useLocation();
  const { categories: dbCategories } = useCategories();
  const { isAuthenticated, user } = useAuth();
  const { userMode, setUserMode } = useUserMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [jobLocationMode, setJobLocationMode] = useState<"radius" | "city">("radius");
  const [jobSearchRadiusKm, setJobSearchRadiusKm] = useState(5);
  const [jobCity, setJobCity] = useState("");
  // New fields: date, work hours, images
  const [jobDate, setJobDate] = useState("");
  const [jobDateTouched, setJobDateTouched] = useState(false);
  const [workStartTime, setWorkStartTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [jobImages, setJobImages] = useState<string[]>([]); // S3 URLs
  const [uploadingImages, setUploadingImages] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useSEO({
    title: "פרסום משרה",
    description: "פרסם משרה בחינם ומצא עובדים זמינים במהירות. פשוט, מהיר, ללא עמלות.",
    canonical: "/post-job",
    noIndex: true,
  });

  // CAPTCHA state
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  // Legal checkboxes (Step 5 — Job Posting Policy)
  const [legalLawsConfirmed, setLegalLawsConfirmed] = useState(false);
  const [legalLicensesConfirmed, setLegalLicensesConfirmed] = useState(false);
  const [legalPolicyAccepted, setLegalPolicyAccepted] = useState(false);
  const [legalCheckboxError, setLegalCheckboxError] = useState(false);

  // Read URL params for duplicate-job pre-fill
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isDuplicate = !!urlParams.get("from");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      salaryType: (urlParams.get("salaryType") as FormData["salaryType"]) || "hourly",
      startTime: (urlParams.get("startTime") as FormData["startTime"]) || "flexible",
      workersNeeded: urlParams.get("workersNeeded") || "1",
      activeDuration: "7",
      title: urlParams.get("title") || "",
      description: urlParams.get("description") || "",
      category: urlParams.get("category") || "",
      address: urlParams.get("address") || "",
      salary: urlParams.get("salary") || "",
      contactName: urlParams.get("contactName") || "",
      businessName: urlParams.get("businessName") || "",
      workingHours: urlParams.get("workingHours") || "",
      startDateTime: urlParams.get("startDateTime") || "",
    },
  });

  const salaryType = watch("salaryType");
  const isUrgent = watch("isUrgent");
  const isLocalBusiness = watch("isLocalBusiness");
  const isVolunteer = watch("isVolunteer");
  const showPhone = watch("showPhone");

  // Region inactive state — set when server rejects with FORBIDDEN + region info
  const [regionBlocked, setRegionBlocked] = useState<{
    regionId: number;
    regionName: string;
    regionSlug: string;
  } | null>(null);

  const { data: myNotifications } = trpc.regions.myNotifications.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const requestNotif = trpc.regions.requestNotification.useMutation({
    onSuccess: (d) => {
      utils.regions.myNotifications.invalidate();
      if (d.alreadySubscribed) {
        toast.info("כבר נרשמת לקבל התראה עבור אזור זה");
      } else {
        toast.success("נרשמת! נשלח לך התראה כשהאזור ייפתח.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelNotif = trpc.regions.cancelNotification.useMutation({
    onSuccess: () => {
      utils.regions.myNotifications.invalidate();
      toast.success("ביטלת את ההתראה");
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  const uploadJobImage = trpc.jobs.uploadJobImage.useMutation();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 5 - jobImages.length;
    if (remaining <= 0) { toast.error("ניתן להעלות עד 5 תמונות"); return; }
    const toUpload = files.slice(0, remaining);
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} גדולה מדי (מקסימום 5MB)`); continue; }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) { toast.error("סוג קובץ לא נתמך. השתמש ב-JPG, PNG או WEBP"); continue; }
        const result = await uploadJobImage.mutateAsync({ base64, mimeType });
        urls.push(result.url);
      }
      setJobImages(prev => [...prev, ...urls]);
      if (urls.length > 0) toast.success(`${urls.length} תמונות הועלו בהצלחה`);
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };

  const createJob = trpc.jobs.create.useMutation({
    onSuccess: (job) => {
      setSuccess(true);
      setTimeout(() => navigate(`/job/${job?.id}`), 2000);
    },
    onError: (e) => {
      // Check if the error is a region-not-active FORBIDDEN
      const msg = e.message;
      if (e.data?.code === "FORBIDDEN" && msg.includes("האזור")) {
        // errorFormatter passes cause fields into e.data
        const regionId = (e.data as any)?.regionId as number | undefined;
        const regionName = (e.data as any)?.regionName as string | undefined;
        const regionSlug = (e.data as any)?.regionSlug as string | undefined;
        setRegionBlocked({
          regionId: regionId ?? 0,
          regionName: regionName ?? "האזור שלך",
          regionSlug: regionSlug ?? "",
        });
      } else {
        toast.error(msg);
      }
    },
  });

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    map.setCenter({ lat: 31.7683, lng: 35.2137 });
    map.setZoom(8);

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setLat(newLat);
      setLng(newLng);

      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        position: { lat: newLat, lng: newLng },
        map,
        animation: google.maps.Animation.DROP,
      });

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setValue("address", results[0].formatted_address);
        }
      });
    });
  };

  const getMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        setLocating(false);

        if (mapRef.current) {
          mapRef.current.setCenter({ lat: newLat, lng: newLng });
          mapRef.current.setZoom(15);
          if (markerRef.current) markerRef.current.setMap(null);
          markerRef.current = new google.maps.Marker({
            position: { lat: newLat, lng: newLng },
            map: mapRef.current,
            animation: google.maps.Animation.DROP,
          });
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              setValue("address", results[0].formatted_address);
            }
          });
        }
        toast.success("מיקום נמצא!");
      },
      () => { setLocating(false); toast.error("לא ניתן לאתר מיקום"); }
    );
  };

  const onSubmit = (data: FormData) => {
    if (!isAuthenticated) { saveReturnPath(); setLoginOpen(true); return; }
    if (!lat || !lng) { toast.error("אנא בחר מיקום על המפה"); return; }

    // Validate CAPTCHA
    if (parseInt(captchaInput) !== captcha.answer) {
      setCaptchaError(true);
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      toast.error("קוד אבטחה שגוי, נסה שוב");
      return;
    }
    // Validate required jobDate
    if (!jobDate) {
      setJobDateTouched(true);
      toast.error("אנא בחר תאריך לעבודה");
      return;
    }
    // Validate legal checkboxes
    if (!legalLawsConfirmed || !legalLicensesConfirmed || !legalPolicyAccepted) {
      setLegalCheckboxError(true);
      toast.error("יש לאשר את כל האישורים הנדרשים");
      return;
    }
    setLegalCheckboxError(false);
    setCaptchaError(false);
    createJob.mutate({
      title: data.title,
      description: data.description,
      category: data.category as Parameters<typeof createJob.mutate>[0]["category"],
      address: data.address,
      city: jobLocationMode === "city" ? jobCity || undefined : undefined,
      latitude: lat,
      longitude: lng,
      salary: data.salary ? parseFloat(data.salary) : undefined,
      salaryType: data.salaryType as Parameters<typeof createJob.mutate>[0]["salaryType"],
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
      estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
      // contactPhone is taken from the logged-in user on the server
      contactName: data.contactName,
      businessName: data.businessName || undefined,
      workingHours: data.workingHours || undefined,
      startTime: data.startTime as Parameters<typeof createJob.mutate>[0]["startTime"],
      startDateTime: data.startDateTime ? new Date(data.startDateTime).toISOString() : undefined,
      workersNeeded: parseInt(data.workersNeeded),
      activeDuration: data.activeDuration,
      isUrgent: data.isUrgent ?? false,
      isLocalBusiness: data.isLocalBusiness ?? false,
      showPhone: data.showPhone ?? false,
      jobLocationMode,
      jobSearchRadiusKm,
      jobDate: jobDate || undefined,
      workStartTime: workStartTime || undefined,
      workEndTime: workEndTime || undefined,
      imageUrls: jobImages.length > 0 ? jobImages : undefined,
    });
  };

  // Guest guard — show login prompt instead of form
  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">פרסום משרה</h2>
        <p className="text-muted-foreground mb-6">
          כדי לפרסם משרה יש להתחבר למערכת עם מספר טלפון
        </p>
        <AppButton variant="brand" size="lg" className="gap-2" onClick={() => setLoginOpen(true)}>
          <Shield className="h-5 w-5" />
          התחבר למערכת
        </AppButton>
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          message="כדי לפרסם משרה יש להתחבר למערכת"
        />
      </div>
    );
  }

  // Worker guard — if user chose worker mode, show a prompt to switch to employer
  if (isAuthenticated && userMode === "worker") {
    return (
      <div dir="rtl" className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">פרסום משרה — למעסיקים</h2>
        <p className="text-muted-foreground mb-6">
          אתה מחובר כ<strong>מחפש עבודה</strong>. כדי לפרסם משרה, עבור למצב מעסיק.
        </p>
        <AppButton variant="brand" size="lg" className="gap-2" onClick={() => setUserMode("employer")}>
          <Briefcase className="h-5 w-5" />
          עבור למצב מעסיק ופרסם משרה
        </AppButton>
        <p className="text-xs text-muted-foreground mt-4">תוכל לחזור למצב עובד בכל עת מהתפריט</p>
      </div>
    );
  }

  if (success) {
    return (
      <>
        {/* Full-screen confetti burst */}
        <ConfettiCelebration count={180} duration={3500} />

        {/* Celebration card */}
        <div
          className="min-h-screen flex items-center justify-center px-4"
          dir="rtl"
          style={{ background: C_DARK_BG }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="text-center max-w-sm w-full"
            style={{
              background: C_DARK_CARD,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: `1px solid ${C_DARK_CARD_BORDER}`,
              borderRadius: "1.5rem",
              padding: "2.5rem 2rem",
            }}
          >
            {/* Animated checkmark ring */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
              className="mx-auto mb-6 flex items-center justify-center"
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${SUCCESS} 0%, oklch(0.52 0.22 150) 100%)`,
                boxShadow: `0 0 40px ${SUCCESS} / 0.5, 0 0 80px ${SUCCESS} / 0.2`,
              }}
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-3xl font-black mb-2"
              style={{ color: TEXT_BRIGHT }}
            >
              🎉 המשרה פורסמה!
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="text-base mb-1"
              style={{ color: TEXT_MID }}
            >
              עובדים יוכלו לראות אותה עכשיו
            </motion.p>

            {/* Redirect notice */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-sm"
              style={{ color: TEXT_FAINT }}
            >
              מעביר אותך לדף המשרה...
            </motion.p>

            {/* Animated progress bar */}
            <motion.div
              className="mt-6 rounded-full overflow-hidden"
              style={{
                height: 4,
                background: C_DARK_CARD,
              }}
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 2.0, ease: "linear" }}
                style={{
                  height: "100%",
                  borderRadius: "9999px",
                  background: `linear-gradient(90deg, ${SUCCESS} 0%, ${BRAND} 100%)`,
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground text-right w-full">פרסם משרה</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm text-right">מלא את הפרטים ומצא עובדים תוך דקות</p>

      {/* Duplicate notice */}
      {isDuplicate && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-3 text-sm">
          <Copy className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-blue-700">
            הטופס מולא מראש עם פרטי המשרה הקודמת. ערוך ופרסם.
          </span>
        </div>
      )}

      {/* Limit notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5 flex items-center gap-3 text-sm">
        <Shield className="h-4 w-4 text-primary shrink-0" />
        <span className="text-muted-foreground">
          ניתן לפרסם עד <strong className="text-foreground">3 משרות פעילות</strong> בו-זמנית. נדרש אימות טלפון.
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic info */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-right">פרטי המשרה</h2>

          <AppInput
            id="title"
            label="כותרת המשרה"
            required
            placeholder="לדוגמה: שליח/ה דחופ/ת"
            dir="rtl"
            {...register("title")}
            error={errors.title?.message}
          />

          <AppSelect
            label="קטגוריה"
            required
            placeholder="בחר קטגוריה"
            options={dbCategories.map((cat) => ({ value: cat.slug, label: `${cat.icon} ${cat.name}` }))}
            onChange={(e) => setValue("category", e.target.value)}
            error={errors.category?.message}
          />

          <AppTextarea
            id="description"
            label="תיאור המשרה"
            required
            placeholder="תאר את המשרה, דרישות, שעות עבודה וכל מידע רלוונט…"
            rows={4}
            dir="rtl"
            {...register("description")}
            error={errors.description?.message}
          />
        </div>

        {/* Location */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            מיקום ואיך לחפש עובדים
          </h2>

          {/* Location mode selection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">איך תרצה לחפש עובדים?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJobLocationMode("radius")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  jobLocationMode === "radius" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <Crosshair className="h-4 w-4" />
                עובדים ברדיוס
              </button>
              <button
                type="button"
                onClick={() => setJobLocationMode("city")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  jobLocationMode === "city" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <Building2 className="h-4 w-4" />
                עובדים מעיר
              </button>
            </div>

            {jobLocationMode === "radius" && (
              <div className="flex gap-2 pt-1">
                {[2, 5, 10, 20].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setJobSearchRadiusKm(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      jobSearchRadiusKm === r ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"
                    }`}
                  >
                    {r} ק"מ
                  </button>
                ))}
              </div>
            )}

            {jobLocationMode === "city" && (
              <div className="mt-1">
                <CityAutocomplete
                  value={jobCity}
                  onChange={setJobCity}
                  onSelect={(city, _lat, _lng) => {
                    setJobCity(city);
                    toast.success(`עיר נבחרה: ${city}`);
                  }}
                  placeholder="לדוגמה: תל אביב, חיפה, ירושלים..."
                />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">לחץ על המפה לבחירת מיקום מדויק, או השתמש ב-GPS</p>

          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={getMyLocation}
            disabled={locating}
            className="gap-2"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            השתמש במיקום שלי
          </AppButton>

          <div className="rounded-lg overflow-hidden border border-border h-56">
            <MapView onMapReady={handleMapReady} className="h-56" />
          </div>

          {lat && lng && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              מיקום נבחר ({lat.toFixed(4)}, {lng.toFixed(4)})
            </p>
          )}

          <AppInput
            id="address"
            label="כתובת"
            required
            placeholder="הכתובת תמולא אוטומטית לאחר בחירת מיקום"
            dir="rtl"
            {...register("address")}
            error={errors.address?.message}
          />
        </div>

        {/* Salary & timing */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-right">שכר ושעות</h2>

          <div className="grid grid-cols-2 gap-3">
            <AppSelect
              label="סוג שכר"
              defaultValue="hourly"
              options={SALARY_TYPES.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(e) => setValue("salaryType", e.target.value)}
            />
            <AppInput
              id="salary"
              label={salaryType === "volunteer" ? "התנדבות" : "סכום (₪)"}
              type="number"
              placeholder={salaryType === "volunteer" ? "—" : "50"}
              disabled={salaryType === "volunteer"}
              dir="ltr"
              {...register("salary")}
            />
          </div>

          {/* Hourly rate + estimated hours — key info for workers */}
          {salaryType !== "volunteer" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <AppInput
                  id="hourlyRate"
                  label="מחיר לשעה (₪)"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="70"
                  dir="ltr"
                  {...register("hourlyRate")}
                />
                <p className="text-xs text-muted-foreground mt-0.5">לדוגמא: 70 ₪ לשעה</p>
              </div>
              <div>
                <AppInput
                  id="estimatedHours"
                  label="שעות עבודה משוערות"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  placeholder="4"
                  dir="ltr"
                  {...register("estimatedHours")}
                />
                <p className="text-xs text-muted-foreground mt-0.5">לדוגמא: 4 שעות</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <AppSelect
              label="זמן התחלה"
              defaultValue="flexible"
              options={START_TIMES.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(e) => setValue("startTime", e.target.value)}
            />
            <AppInput
              id="workersNeeded"
              label="עובדים דרושים"
              type="number"
              min="1"
              dir="ltr"
              {...register("workersNeeded")}
            />
          </div>

          {/* startDateTime moved into the grid above */}

          {/* Volunteer mode toggle */}
          <div
            onClick={() => {
              const next = !isVolunteer;
              setValue("isVolunteer", next);
              if (next) setValue("salaryType", "volunteer");
              else setValue("salaryType", "hourly");
            }}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isVolunteer ? "border-green-400 bg-green-50" : "border-border hover:border-green-300"}`}
          >
            <div>
              <p className={`font-semibold text-sm ${isVolunteer ? "text-green-700" : "text-foreground"}`}>
                💚 זו עבודת התנדבות — ללא תשלום
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                משרה התנדבותית — עזרה לקהילה, חירום, משפחות מילואימניקים
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isVolunteer ? "border-green-500 bg-green-500" : "border-muted-foreground"}`}>
              {isVolunteer && <span className="text-white text-xs">✓</span>}
            </div>
          </div>

          {/* Urgent toggle */}
          <div
            onClick={() => setValue("isUrgent", !isUrgent)}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isUrgent ? "border-red-400 bg-red-50" : "border-border hover:border-red-300"}`}
          >
            <div>
              <p className={`font-semibold text-sm ${isUrgent ? "text-red-700" : "text-foreground"}`}>
                ⚡ צריך עובד עכשיו — משרה דחופה
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                יוצג ראשון ברשימה · תפוג אחרי 12 שעות
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isUrgent ? "border-red-500 bg-red-500" : "border-muted-foreground"}`}>
              {isUrgent && <span className="text-white text-xs">✓</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AppSelect
              label="משך פרסום"
              defaultValue="1"
              options={[
                { value: "1", label: "יום אחד" },
                { value: "3", label: "3 ימים" },
                { value: "7", label: "שבוע" },
              ]}
              onChange={(e) => setValue("activeDuration", e.target.value as "1" | "3" | "7")}
            />
            <AppInput
              id="workingHours"
              label="שעות עבודה (טקסט חופשי)"
              placeholder="08:00-16:00"
              dir="ltr"
              {...register("workingHours")}
            />
            <AppInput
              id="startDateTime"
              label="🔥 תאריך ושעת התחלה מדויקים (אופציונלי)"
              type="datetime-local"
              dir="ltr"
              wrapperClassName="col-span-2"
              {...register("startDateTime")}
            />
          </div>

          {/* Date + exact work hours */}
          <div className="space-y-3">
            {/* Required date */}
            <AppInput
              id="jobDate"
              label="תאריך העבודה"
              required
              type="date"
              value={jobDate}
              onChange={e => setJobDate(e.target.value)}
              onBlur={() => setJobDateTouched(true)}
              min={new Date().toISOString().split("T")[0]}
              dir="ltr"
              error={!jobDate && jobDateTouched ? "תאריך העבודה הוא שדה חובה" : undefined}
            />

            {/* Optional time range */}
            <div>
              <AppLabel>שעות עבודה <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontWeight: 400 }}>(אופציונלי)</span></AppLabel>
              {/* Quick preset buttons */}
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {[
                  { label: "☀️ בוקר", start: "06:00", end: "14:00" },
                  { label: "☀️ צהריים", start: "12:00", end: "20:00" },
                  { label: "🌆 ערב", start: "16:00", end: "22:00" },
                  { label: "🌙 לילה", start: "22:00", end: "06:00" },
                ].map(preset => {
                  const isActive = workStartTime === preset.start && workEndTime === preset.end;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (isActive) { setWorkStartTime(""); setWorkEndTime(""); }
                        else { setWorkStartTime(preset.start); setWorkEndTime(preset.end); }
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                      style={isActive ? {
                        background: "oklch(0.35 0.08 122)",
                        borderColor: "oklch(0.35 0.08 122)",
                        color: "white",
                      } : {
                        background: "white",
                        borderColor: "oklch(0.88 0.04 122)",
                        color: "oklch(0.35 0.08 122)",
                      }}
                    >
                      {preset.label} ({preset.start}–{preset.end})
                    </button>
                  );
                })}
              </div>
              {/* Manual time inputs */}
              <div className="grid grid-cols-2 gap-3">
                <AppInput
                  id="workStartTime"
                  label="שעת התחלה"
                  type="time"
                  value={workStartTime}
                  onChange={e => setWorkStartTime(e.target.value)}
                  dir="ltr"
                />
                <AppInput
                  id="workEndTime"
                  label="שעת סיום"
                  type="time"
                  value={workEndTime}
                  onChange={e => setWorkEndTime(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Job Images */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-right">תמונות מהמקום (אופציונלי)</h2>
            <span className="text-xs text-muted-foreground">{jobImages.length}/5</span>
          </div>
          <p className="text-xs text-muted-foreground text-right bg-primary/5 border border-primary/20 rounded-lg p-3">
            📸 הוספת תמונות תעזור לעובדים להבין את העבודה ולקבל החלטה מהר יותר.
          </p>
          {/* Image previews */}
          {jobImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {jobImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                  <img src={url} alt={`תמונה ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  <button
                    type="button"
                    onClick={() => setJobImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {jobImages.length < 5 && (
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploadingImages}
              />
              {uploadingImages ? (
                <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">מעלה תמונות...</span></>
              ) : (
                <><ImagePlus className="w-5 h-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">לחץ להוספת תמונות (עד {5 - jobImages.length} נוספות)</span></>
              )}
            </label>
          )}
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-right">פרטי יצירת קשר</h2>

          <AppInput
            id="contactName"
            label="שם איש קשר"
            required
            placeholder="ישראל ישראלי"
            dir="rtl"
            {...register("contactName")}
            error={errors.contactName?.message}
          />

          <div>
            <AppLabel htmlFor="contactPhone">טלפון ליצירת קשר</AppLabel>
            <div
              id="contactPhone"
              dir="ltr"
              className="mt-1 flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted text-muted-foreground text-sm select-none"
            >
              📱 {user?.phone ?? "יופיע אוטומטית מהחשבון"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">הטלפון נלקח אוטומטית מחשבוןך</p>
          </div>

          <AppInput
            id="businessName"
            label="שם עסק"
            placeholder="שם החברה / העסק"
            dir="rtl"
            {...register("businessName")}
          />

          {/* Show phone toggle */}
          <div
            onClick={() => setValue("showPhone", !showPhone)}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
              showPhone ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div>
              <p className={`font-semibold text-sm ${showPhone ? "text-primary" : "text-foreground"}`}>
                📞 הצג מספר טלפון לעובדים
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showPhone
                  ? "מספר הטלפון שלך יוצג בכרטיס המשרה"
                  : "מספר הטלפון מוסתר — עובדים ישלחו מועמדות ותקבל SMS"}
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              showPhone ? "border-primary bg-primary" : "border-muted-foreground"
            }`}>
              {showPhone && <span className="text-white text-xs">✓</span>}
            </div>
          </div>
        </div>

        {/* CAPTCHA */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            אימות אנטי-ספאם
          </h2>
          <p className="text-sm text-muted-foreground mb-3 text-right">
            פתור: <strong className="text-foreground text-base">{captcha.a} + {captcha.b} = ?</strong>
          </p>          <AppInput
            type="number"
            placeholder="הכנס את התשובה"
            value={captchaInput}
            onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
            wrapperClassName="max-w-32"
            error={captchaError ? "תשובה שגויאה, נסה שוב" : undefined}
            dir="ltr"
          />
        </div>

        {/* Region blocked banner */}
        {regionBlocked && (
          <div
            dir="rtl"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-right"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 rounded-full bg-red-100 p-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-900 text-sm leading-snug">
                  האזור עדיין בהרצה ונפתח בקרוב למעסיקים.
                </p>
                <p className="mt-1 text-xs text-red-700 leading-relaxed">
                  אנחנו אוספים עובדים באזור ונעדכן אותך כשהאזור ייפתח לפרסום משרות.
                </p>
                {regionBlocked.regionId > 0 && (() => {
                  const subscribed = (myNotifications ?? []).some(
                    (n) => n.regionId === regionBlocked.regionId
                  );
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (subscribed) {
                          cancelNotif.mutate({ regionId: regionBlocked.regionId });
                        } else {
                          requestNotif.mutate({ regionId: regionBlocked.regionId, type: "employer" });
                        }
                      }}
                      disabled={requestNotif.isPending || cancelNotif.isPending}
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        subscribed
                          ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-50"
                          : "border-red-300 bg-white text-red-700 hover:bg-red-50"
                      }`}
                    >
                      {subscribed ? (
                        <><BellOff className="w-3 h-3" /> בטל התראה</>
                      ) : (
                        <><Bell className="w-3 h-3" /> הודע לי כשהאזור נפתח</>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Legal checkboxes — Step 5 (Job Posting Policy) */}
        <div dir="rtl" className="space-y-3 rounded-xl border p-4" style={{ borderColor: legalCheckboxError ? "#dc2626" : "#d6c99a", background: "#fefcf4" }}>
          <p className="text-xs font-semibold" style={{ color: "#4a5d23" }}>אישורים נדרשים לפרסום משרה</p>

          {/* Checkbox 1 */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={legalLawsConfirmed}
              onChange={e => { setLegalLawsConfirmed(e.target.checked); if (e.target.checked) setLegalCheckboxError(false); }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-olive-600 cursor-pointer"
            />
            <span className="text-xs leading-relaxed" style={{ color: "#3d3d3d" }}>
              אני מאשר/ת כי פרסום המשרה עומד בדרישות החוק הישראלי ואינו כולל אפליה, הטרדה או פרסום בלתי חוקי.
            </span>
          </label>

          {/* Checkbox 2 */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={legalLicensesConfirmed}
              onChange={e => { setLegalLicensesConfirmed(e.target.checked); if (e.target.checked) setLegalCheckboxError(false); }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-xs leading-relaxed" style={{ color: "#3d3d3d" }}>
              אני מאשר/ת כי בדיקת רישיונות והסמכות של נותן השירות היא באחריותי בלבד.
            </span>
          </label>

          {/* Checkbox 3 */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={legalPolicyAccepted}
              onChange={e => { setLegalPolicyAccepted(e.target.checked); if (e.target.checked) setLegalCheckboxError(false); }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-xs leading-relaxed" style={{ color: "#3d3d3d" }}>
              אני קראתי ומסכים/ת ל{" "}
              <a href="/job-posting-policy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#4a5d23" }}>מדיניות פרסום משרות</a>
              {" ול "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#4a5d23" }}>תנאי השימוש</a>.
            </span>
          </label>

          {/* Platform disclaimer */}
          <p className="text-xs" style={{ color: "#6b7280" }}>
            הפלטפורמה אינה אחראית לתוכן המשרה או לתנאי העבודה.
          </p>

          {legalCheckboxError && (
            <p className="text-xs font-medium" style={{ color: "#dc2626" }}>יש לאשר את כל האישורים לפני פרסום המשרה</p>
          )}
        </div>

        <AppButton
          type="submit"
          variant="brand"
          size="xl"
          className="w-full"
          disabled={createJob.isPending}
        >
          {createJob.isPending ? (
            <><Loader2 className="h-5 w-5 animate-spin ml-2" />מפרסם...</>
          ) : (
            "פרסם עבודה"
          )}
        </AppButton>
      </form>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

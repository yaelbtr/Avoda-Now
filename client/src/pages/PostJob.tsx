import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapView } from "@/components/Map";
import LoginModal from "@/components/LoginModal";
import CityAutocomplete from "@/components/CityAutocomplete";
import { saveReturnPath } from "@/const";
import { JOB_CATEGORIES, SALARY_TYPES, START_TIMES } from "@shared/categories";
import { MapPin, LocateFixed, Loader2, CheckCircle2, Shield, MessageCircle, Copy, Briefcase, Crosshair, Building2 } from "lucide-react";
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

  const createJob = trpc.jobs.create.useMutation({
    onSuccess: (job) => {
      setSuccess(true);
      setTimeout(() => navigate(`/job/${job?.id}`), 2000);
    },
    onError: (e) => toast.error(e.message),
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

  const handleWhatsAppPublish = () => {
    const message = encodeURIComponent(
      `שלום, אני רוצה לפרסם עבודה:

שם העסק:
סוג העבודה:
מיקום:
שכר:
טלפון ליצירת קשר:`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-2">
        <button
          type="button"
          onClick={handleWhatsAppPublish}
          className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          פרסם דרך WhatsApp
        </button>
        <h1 className="text-2xl font-bold text-foreground text-right">פרסם משרה</h1>
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

          <div>
            <Label htmlFor="title">כותרת המשרה *</Label>
            <Input id="title" placeholder="לדוגמה: שליח/ה דחוף/ת" {...register("title")} className="mt-1" />
            {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="category">קטגוריה *</Label>
            <Select onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="בחר קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {JOB_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">תיאור המשרה *</Label>
            <Textarea
              id="description"
              placeholder="תאר את המשרה, דרישות, שעות עבודה וכל מידע רלוונטי..."
              rows={4}
              {...register("description")}
              className="mt-1 resize-none"
            />
            {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
          </div>
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

          <div>
            <Label htmlFor="address">כתובת *</Label>
            <Input
              id="address"
              placeholder="הכתובת תמולא אוטומטית לאחר בחירת מיקום"
              {...register("address")}
              className="mt-1"
            />
            {errors.address && <p className="text-destructive text-xs mt-1">{errors.address.message}</p>}
          </div>
        </div>

        {/* Salary & timing */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-right">שכר ושעות</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>סוג שכר</Label>
              <Select defaultValue="hourly" onValueChange={(v) => setValue("salaryType", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="salary">
                {salaryType === "volunteer" ? "התנדבות" : "סכום (₪)"}
              </Label>
              <Input
                id="salary"
                type="number"
                placeholder={salaryType === "volunteer" ? "—" : "50"}
                disabled={salaryType === "volunteer"}
                {...register("salary")}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>זמן התחלה</Label>
              <Select defaultValue="flexible" onValueChange={(v) => setValue("startTime", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {START_TIMES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="workersNeeded">עובדים דרושים</Label>
              <Input
                id="workersNeeded"
                type="number"
                min="1"
                {...register("workersNeeded")}
                className="mt-1"
              />
            </div>
          </div>

          {/* Exact start date/time for urgent jobs */}
          <div>
            <Label htmlFor="startDateTime">
              🔥 תאריך ושעת התחלה מדויקים (אופציונלי)
            </Label>
            <Input
              id="startDateTime"
              type="datetime-local"
              {...register("startDateTime")}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              אם תמלא שדה זה, המשרה תסומן כג׳ "עבודה להיום" כאשר ההתחלה בתוך 24 שעות
            </p>
          </div>

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

          {/* Local business toggle */}
          <div
            onClick={() => setValue("isLocalBusiness", !isLocalBusiness)}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isLocalBusiness ? "border-blue-400 bg-blue-50" : "border-border hover:border-blue-300"}`}
          >
            <div>
              <p className={`font-semibold text-sm ${isLocalBusiness ? "text-blue-700" : "text-foreground"}`}>
                🏢 עסק מקומי
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                יוצג badge "עסק מקומי" על כרטיס העבודה
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isLocalBusiness ? "border-blue-500 bg-blue-500" : "border-muted-foreground"}`}>
              {isLocalBusiness && <span className="text-white text-xs">✓</span>}
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
            <div>
              <Label>משך פרסום</Label>
              <Select defaultValue="1" onValueChange={(v) => setValue("activeDuration", v as "1" | "3" | "7")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">יום אחד</SelectItem>
                  <SelectItem value="3">3 ימים</SelectItem>
                  <SelectItem value="7">שבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="workingHours">שעות עבודה</Label>
              <Input
                id="workingHours"
                placeholder="08:00-16:00"
                {...register("workingHours")}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-right">פרטי יצירת קשר</h2>

          <div>
            <Label htmlFor="contactName">שם איש קשר *</Label>
            <Input id="contactName" placeholder="ישראל ישראלי" {...register("contactName")} className="mt-1" />
            {errors.contactName && <p className="text-destructive text-xs mt-1">{errors.contactName.message}</p>}
          </div>

          <div>
            <Label htmlFor="contactPhone">טלפון ליצירת קשר</Label>
            <div
              id="contactPhone"
              dir="ltr"
              className="mt-1 flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted text-muted-foreground text-sm select-none"
            >
              📱 {user?.phone ?? "יופיע אוטומטית מהחשבון"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">הטלפון נלקח אוטומטית מחשבוןך</p>
          </div>

          <div>
            <Label htmlFor="businessName">שם עסק (אופציונלי)</Label>
            <Input id="businessName" placeholder="שם החברה / העסק" {...register("businessName")} className="mt-1" />
          </div>

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
          </p>
          <Input
            type="number"
            placeholder="הכנס את התשובה"
            value={captchaInput}
            onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
            className={`max-w-32 ${captchaError ? "border-destructive" : ""}`}
          />
          {captchaError && <p className="text-destructive text-xs mt-1 text-right">תשובה שגויה, נסה שוב</p>}
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

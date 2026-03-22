import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { AppButton } from "@/components/ui";
import { AppInput, AppTextarea, AppSelect, AppLabel } from "@/components/ui";
import { MapView } from "@/components/Map";
import LoginModal from "@/components/LoginModal";
import CityAutocomplete from "@/components/CityAutocomplete";
import { saveReturnPath } from "@/const";
import { SALARY_TYPES, START_TIMES } from "@shared/categories";
import { shouldWarnLateJob, normalizeDateInput } from "@shared/ageUtils";
import { useCategories } from "@/hooks/useCategories";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  MapPin, LocateFixed, Loader2, CheckCircle2, Shield, Copy, Briefcase,
  Crosshair, Building2, Bell, BellOff, AlertTriangle, Camera, X, ImagePlus,
  FileText, Clock, Banknote, Send, ArrowLeft, ArrowRight, RotateCcw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ConfettiCelebration from "@/components/ConfettiCelebration";
import { usePostJobDraft, draftAge } from "@/hooks/usePostJobDraft";
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
type TabId = "details" | "location" | "conditions" | "publish";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "details",    label: "פרטי משרה",  icon: FileText  },
  { id: "location",   label: "מיקום ושעות", icon: Clock     },
  { id: "conditions", label: "תנאים",       icon: Banknote  },
  { id: "publish",    label: "פרסום",       icon: Send      },
];

export default function PostJob() {
  const [, navigate] = useLocation();
  const { categories: dbCategories, bySlug: catBySlug } = useCategories();
  const { isAuthenticated, user } = useAuth();
  const { userMode, setUserMode } = useUserMode();
  const { employerLock } = usePlatformSettings();
  const [loginOpen, setLoginOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [jobLocationMode, setJobLocationMode] = useState<"radius" | "city">("radius");
  const [jobSearchRadiusKm, setJobSearchRadiusKm] = useState(5);
  const [jobCity, setJobCity] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [jobDateTouched, setJobDateTouched] = useState(false);
  const [workStartTime, setWorkStartTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [minAge, setMinAge] = useState<16 | 18 | null>(null);
  const [jobImages, setJobImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // ── Draft persistence ─────────────────────────────────────────────────────
  const { draft, hasDraft, saveDraft, saveDraftNow, clearDraft } = usePostJobDraft();
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  useSEO({
    title: "פרסום משרה",
    description: "פרסם משרה בחינם ומצא עובדים זמינים במהירות. פשוט, מהיר, ללא עמלות.",
    canonical: "/post-job",
    noIndex: true,
  });

  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [legalLawsConfirmed, setLegalLawsConfirmed] = useState(false);
  const [legalLicensesConfirmed, setLegalLicensesConfirmed] = useState(false);
  const [legalPolicyAccepted, setLegalPolicyAccepted] = useState(false);
  const [legalCheckboxError, setLegalCheckboxError] = useState(false);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isDuplicate = !!urlParams.get("from");

  // Show draft banner on mount if draft exists and not a duplicate
  useEffect(() => {
    if (hasDraft && !isDuplicate && !draftRestored) {
      setShowDraftBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors }, trigger } = useForm<FormData>({
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

  // ── Collect all form state for draft ────────────────────────────────────
  const collectDraftData = useCallback(() => {
    const vals = getValues();
    return {
      ...vals,
      lat,
      lng,
      jobLocationMode,
      jobSearchRadiusKm,
      jobCity,
      jobDate,
      workStartTime,
      workEndTime,
      minAge,
      jobImages,
      activeTab,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, jobLocationMode, jobSearchRadiusKm, jobCity, jobDate, workStartTime, workEndTime, minAge, jobImages, activeTab]);

  // Auto-save on every meaningful state change
  useEffect(() => {
    if (draftRestored || success) return;
    saveDraft(collectDraftData());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, jobLocationMode, jobSearchRadiusKm, jobCity, jobDate, workStartTime, workEndTime, minAge, jobImages, activeTab]);

  // Restore draft into form fields
  const restoreDraft = useCallback(() => {
    if (!draft) return;
    const fields: (keyof FormData)[] = [
      "title", "description", "category", "address", "salary", "salaryType",
      "hourlyRate", "estimatedHours", "contactName", "businessName", "workingHours",
      "startTime", "startDateTime", "workersNeeded", "activeDuration",
      "isUrgent", "isLocalBusiness", "isVolunteer", "showPhone",
    ];
    fields.forEach((f) => {
      const v = draft[f];
      if (v !== undefined && v !== null) setValue(f, v as any);
    });
    if (draft.lat != null) setLat(draft.lat);
    if (draft.lng != null) setLng(draft.lng);
    if (draft.jobLocationMode) setJobLocationMode(draft.jobLocationMode);
    if (draft.jobSearchRadiusKm) setJobSearchRadiusKm(draft.jobSearchRadiusKm);
    if (draft.jobCity) setJobCity(draft.jobCity);
    if (draft.jobDate) setJobDate(draft.jobDate);
    if (draft.workStartTime) setWorkStartTime(draft.workStartTime);
    if (draft.workEndTime) setWorkEndTime(draft.workEndTime);
    if (draft.minAge !== undefined) setMinAge(draft.minAge ?? null);
    if (draft.jobImages?.length) setJobImages(draft.jobImages);
    if (draft.activeTab) setActiveTab(draft.activeTab as TabId);
    setDraftRestored(true);
    setShowDraftBanner(false);
    toast.success("הטיוטה שוחזרה בהצלחה");
  }, [draft, setValue]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    toast("הטיוטה נמחקה");
  }, [clearDraft]);

  const salaryType = watch("salaryType");
  const isUrgent = watch("isUrgent");
  const isVolunteer = watch("isVolunteer");
  const showPhone = watch("showPhone");
  const watchedCategory = watch("category");
  const watchedTitle = watch("title");
  const watchedAddress = watch("address");
  const watchedSalary = watch("salary");
  const watchedHourlyRate = watch("hourlyRate");
  const watchedContactName = watch("contactName");

  // ── Tab completion tracking ─────────────────────────────────────────────────────
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set());

  const categoryBlocksMinors = !!(watchedCategory && catBySlug[watchedCategory]?.allowedForMinors === false);
  const hoursBlockMinors = !!(workEndTime && shouldWarnLateJob(workEndTime));
  const jobBlocksMinors = categoryBlocksMinors || hoursBlockMinors;

  const [regionBlocked, setRegionBlocked] = useState<{
    regionId: number;
    regionName: string;
    regionSlug: string;
  } | null>(null);

  const { data: employerProfile } = trpc.user.getEmployerProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // ── Autofill contact fields from employer profile ─────────────────────────────
  // Only runs once when profile loads; never overwrites user input or a restored draft.
  useEffect(() => {
    if (!employerProfile) return;
    // Skip if a draft is waiting to be restored (it may have its own values)
    if (hasDraft) return;
    const currentContact = getValues("contactName");
    const currentBusiness = getValues("businessName");
    if (!currentContact) {
      const profileName = employerProfile.name ?? user?.name ?? "";
      if (profileName) setValue("contactName", profileName, { shouldDirty: false });
    }
    if (!currentBusiness) {
      const profileCompany = employerProfile.companyName ?? "";
      if (profileCompany) setValue("businessName", profileCompany, { shouldDirty: false });
    }
  // Run only when employerProfile first becomes available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerProfile]);

  const { data: myNotifications } = trpc.regions.myNotifications.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const requestNotif = trpc.regions.requestNotification.useMutation({
    onSuccess: (d) => {
      utils.regions.myNotifications.invalidate();
      if (d.alreadySubscribed) toast.info("כבר נרשמת לקבל התראה עבור אזור זה");
      else toast.success("נרשמת! נשלח לך התראה כשהאזור ייפתח.");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelNotif = trpc.regions.cancelNotification.useMutation({
    onSuccess: () => { utils.regions.myNotifications.invalidate(); toast.success("ביטלת את ההתראה"); },
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

  // Watch form changes for draft saving (react-hook-form subscription)
  watch((values) => {
    if (!success) saveDraft({ ...collectDraftData(), ...values });
  });

  const createJob = trpc.jobs.create.useMutation({
    onSuccess: (job) => {
      clearDraft();
      setSuccess(true);
      setTimeout(() => navigate(`/job/${job?.id}`), 2000);
    },
    onError: (e) => {
      const msg = e.message;
      if (e.data?.code === "FORBIDDEN" && msg.includes("האזור")) {
        const regionId = (e.data as any)?.regionId as number | undefined;
        const regionName = (e.data as any)?.regionName as string | undefined;
        const regionSlug = (e.data as any)?.regionSlug as string | undefined;
        setRegionBlocked({ regionId: regionId ?? 0, regionName: regionName ?? "האזור שלך", regionSlug: regionSlug ?? "" });
      } else {
        toast.error(msg);
      }
    },
  });

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    const defLat = employerProfile?.defaultJobLatitude ? parseFloat(employerProfile.defaultJobLatitude) : null;
    const defLng = employerProfile?.defaultJobLongitude ? parseFloat(employerProfile.defaultJobLongitude) : null;
    const defCity = employerProfile?.defaultJobCity ?? null;

    if (defLat && defLng && !isDuplicate) {
      map.setCenter({ lat: defLat, lng: defLng });
      map.setZoom(14);
      setLat(defLat);
      setLng(defLng);
      markerRef.current = new google.maps.Marker({ position: { lat: defLat, lng: defLng }, map, animation: google.maps.Animation.DROP });
      if (defCity) {
        setValue("address", defCity);
      } else {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat: defLat, lng: defLng } }, (results, status) => {
          if (status === "OK" && results?.[0]) setValue("address", results[0].formatted_address);
        });
      }
    } else {
      map.setCenter({ lat: 31.7683, lng: 35.2137 });
      map.setZoom(8);
    }

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setLat(newLat);
      setLng(newLng);
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({ position: { lat: newLat, lng: newLng }, map, animation: google.maps.Animation.DROP });
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        if (status === "OK" && results?.[0]) setValue("address", results[0].formatted_address);
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
          markerRef.current = new google.maps.Marker({ position: { lat: newLat, lng: newLng }, map: mapRef.current, animation: google.maps.Animation.DROP });
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
            if (status === "OK" && results?.[0]) setValue("address", results[0].formatted_address);
          });
        }
        toast.success("מיקום נמצא!");
      },
      () => { setLocating(false); toast.error("לא ניתן לאתר מיקום"); }
    );
  };

  const onSubmit = (data: FormData) => {
    if (!isAuthenticated) { saveReturnPath(); setLoginOpen(true); return; }
    if (!lat || !lng) { toast.error("אנא בחר מיקום על המפה"); setActiveTab("location"); return; }
    if (parseInt(captchaInput) !== captcha.answer) {
      setCaptchaError(true);
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      toast.error("קוד אבטחה שגוי, נסה שוב");
      return;
    }
    if (!jobDate) {
      setJobDateTouched(true);
      toast.error("אנא בחר תאריך לעבודה");
      setActiveTab("location");
      return;
    }
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
      minAge: minAge ?? undefined,
    });
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">פרסום משרה</h2>
        <p className="text-muted-foreground mb-6">כדי לפרסם משרה יש להתחבר למערכת עם מספר טלפון</p>
        <AppButton variant="brand" size="lg" className="gap-2" onClick={() => setLoginOpen(true)}>
          <Shield className="h-5 w-5" />התחבר למערכת
        </AppButton>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message="כדי לפרסם משרה יש להתחבר למערכת" />
      </div>
    );
  }

  if (employerLock) {
    return (
      <div dir="rtl" className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">פרסום משרה — בקרוב</h2>
        <p className="text-muted-foreground mb-4">
          בשלב זה הפלטפורמה פתוחה <strong>לעובדים בלבד</strong>.<br />
          אפשרות פרסום משרות למעסיקים תיפתח בקרוב.
        </p>
        <AppButton variant="brand" size="lg" className="gap-2" onClick={() => navigate("/find-jobs")}>חפש עבודה</AppButton>
      </div>
    );
  }

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
          <Briefcase className="h-5 w-5" />עבור למצב מעסיק ופרסם משרה
        </AppButton>
        <p className="text-xs text-muted-foreground mt-4">תוכל לחזור למצב עובד בכל עת מהתפריט</p>
      </div>
    );
  }

  if (success) {
    return (
      <>
        <ConfettiCelebration count={180} duration={3500} />
        <div className="min-h-screen flex items-center justify-center px-4" dir="rtl" style={{ background: C_DARK_BG }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="text-center max-w-sm w-full"
            style={{ background: C_DARK_CARD, backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: `1px solid ${C_DARK_CARD_BORDER}`, borderRadius: "1.5rem", padding: "2.5rem 2rem" }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
              className="mx-auto mb-6 flex items-center justify-center"
              style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg, ${SUCCESS} 0%, oklch(0.52 0.22 150) 100%)`, boxShadow: `0 0 40px ${SUCCESS} / 0.5, 0 0 80px ${SUCCESS} / 0.2` }}
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }} className="text-3xl font-black mb-2" style={{ color: TEXT_BRIGHT }}>
              🎉 המשרה פורסמה!
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }} className="text-base mb-1" style={{ color: TEXT_MID }}>
              עובדים יוכלו לראות אותה עכשיו
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="text-sm" style={{ color: TEXT_FAINT }}>
              מעביר אותך לדף המשרה...
            </motion.p>
            <motion.div className="mt-6 rounded-full overflow-hidden" style={{ height: 4, background: C_DARK_CARD }}>
              <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ delay: 0.5, duration: 2.0, ease: "linear" }} style={{ height: "100%", borderRadius: "9999px", background: `linear-gradient(90deg, ${SUCCESS} 0%, ${BRAND} 100%)` }} />
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Tab content helpers ───────────────────────────────────────────────────
  const tabIndex = TABS.findIndex(t => t.id === activeTab);
  const isLastTab = tabIndex === TABS.length - 1;

  const goNext = async () => {
    // Save draft immediately when navigating between tabs
    saveDraftNow(collectDraftData());
    // Validate fields for current tab before advancing
    if (activeTab === "details") {
      const ok = await trigger(["title", "description", "category"]);
      if (!ok) return;
    }
    if (activeTab === "location") {
      if (!lat || !lng) { toast.error("אנא בחר מיקום על המפה"); return; }
      if (!jobDate) { setJobDateTouched(true); toast.error("אנא בחר תאריך לעבודה"); return; }
      const ok = await trigger(["address"]);
      if (!ok) return;
    }
    if (activeTab === "conditions") {
      const ok = await trigger(["contactName"]);
      if (!ok) return;
    }
    // Mark current tab as completed
    setCompletedTabs(prev => new Set(Array.from(prev).concat(activeTab)));
    const nextId = TABS[tabIndex + 1]?.id;
    if (nextId) setActiveTab(nextId);
  };

  const goPrev = () => {
    const prevId = TABS[tabIndex - 1]?.id;
    if (prevId) setActiveTab(prevId);
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: "var(--page-bg)" }}>
      {/* ── Header + Tab Bar ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: "var(--page-bg)", borderBottom: "1px solid oklch(0.92 0.02 100)" }}
      >
        {/* Accent gradient bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4F583B 0%, oklch(0.68 0.14 80.8) 100%)" }} />

        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          {/* Back + title row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
              style={{ color: "#4F583B" }}
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
            <h1 className="text-lg font-black" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>
              פרסם משרה
            </h1>
            <div className="w-14" /> {/* spacer */}
          </div>

          {/* Draft restore banner */}
          {showDraftBanner && draft?.savedAt && (
            <div
              className="rounded-xl border p-3 mb-4 flex items-center gap-3 text-sm"
              style={{ background: "oklch(0.97 0.03 100)", borderColor: "oklch(0.82 0.08 100)" }}
              dir="rtl"
            >
              <RotateCcw className="h-4 w-4 shrink-0" style={{ color: "#4F583B" }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: "#4F583B" }}>נמצאה טיוטה שמורה</p>
                <p className="text-xs" style={{ color: "oklch(0.50 0.06 122)" }}>נשמרה {draftAge(draft.savedAt)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: "#4F583B" }}
                >
                  <RotateCcw className="h-3 w-3" />
                  שחזר
                </button>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: "oklch(0.92 0.03 100)", color: "oklch(0.45 0.08 30)" }}
                >
                  <Trash2 className="h-3 w-3" />
                  מחק
                </button>
              </div>
            </div>
          )}

          {/* Duplicate notice */}
          {isDuplicate && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-3 text-sm">
              <Copy className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-blue-700">הטופס מולא מראש עם פרטי המשרה הקודמת. ערוך ופרסם.</span>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {TABS.map((tab, i) => (
              <div
                key={tab.id}
                className="transition-all rounded-full"
                style={{
                  width: i === tabIndex ? 24 : 8,
                  height: 8,
                  background: i <= tabIndex ? "#4F583B" : "oklch(0.88 0.03 100)",
                }}
              />
            ))}
          </div>

          {/* Tab Bar */}
          <div
            className="rounded-2xl p-1 flex gap-1"
            style={{ background: "oklch(0.93 0.02 100)", border: "1px solid oklch(0.89 0.03 100)" }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDone = completedTabs.has(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all relative"
                  style={isActive
                    ? { background: "#4F583B", color: "white", boxShadow: "0 2px 8px rgba(79,88,59,0.35)" }
                    : { color: "oklch(0.50 0.06 122)" }
                  }
                >
                  {/* Completion checkmark badge */}
                  {isDone && !isActive && (
                    <span
                      className="absolute top-1 right-1 flex items-center justify-center rounded-full"
                      style={{ width: 14, height: 14, background: "oklch(0.55 0.18 145)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-lg mx-auto px-4 mt-4 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >

              {/* ── Tab 1: פרטי משרה ──────────────────────────────────── */}
              {activeTab === "details" && (
                <div className="space-y-5">
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <h2 className="font-bold text-foreground text-right flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      פרטי המשרה
                    </h2>

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

                    {jobBlocksMinors && (
                      <div
                        className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                        style={{ background: "oklch(0.95 0.04 30 / 0.85)", border: "1px solid oklch(0.85 0.08 30 / 0.5)", color: "oklch(0.42 0.15 30)" }}
                        dir="rtl"
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="font-medium">
                          משרה זו לא תוצג לעובדים מתחת לגיל 18
                          {categoryBlocksMinors && hoursBlockMinors && <span className="block text-xs mt-0.5 font-normal">סיבה: קטגוריה מוגבלת לקטינים + שעת סיום לאחר 22:00</span>}
                          {categoryBlocksMinors && !hoursBlockMinors && <span className="block text-xs mt-0.5 font-normal">סיבה: קטגוריה זו אינה מותרת לעבודת קטינים</span>}
                          {!categoryBlocksMinors && hoursBlockMinors && <span className="block text-xs mt-0.5 font-normal">סיבה: שעת סיום לאחר 22:00 (חוק עבודת נוער)</span>}
                        </span>
                      </div>
                    )}

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

                  {/* Job Images */}
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-foreground text-right flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        תמונות מהמקום
                        <span className="text-xs font-normal text-muted-foreground">(אופציונלי)</span>
                      </h2>
                      <span className="text-xs text-muted-foreground">{jobImages.length}/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right bg-primary/5 border border-primary/20 rounded-lg p-3">
                      📸 הוספת תמונות תעזור לעובדים להבין את העבודה ולקבל החלטה מהר יותר.
                    </p>
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
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                        {uploadingImages
                          ? <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">מעלה תמונות...</span></>
                          : <><ImagePlus className="w-5 h-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">לחץ להוספת תמונות (עד {5 - jobImages.length} נוספות)</span></>
                        }
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab 2: מיקום ושעות ────────────────────────────────── */}
              {activeTab === "location" && (
                <div className="space-y-5">
                  {/* Location */}
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      מיקום ואיך לחפש עובדים
                    </h2>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">איך תרצה לחפש עובדים?</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setJobLocationMode("radius")}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${jobLocationMode === "radius" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          <Crosshair className="h-4 w-4" />עובדים ברדיוס
                        </button>
                        <button
                          type="button"
                          onClick={() => setJobLocationMode("city")}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${jobLocationMode === "city" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          <Building2 className="h-4 w-4" />עובדים מעיר
                        </button>
                      </div>

                      {jobLocationMode === "radius" && (
                        <div className="flex gap-2 pt-1">
                          {[2, 5, 10, 20].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setJobSearchRadiusKm(r)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${jobSearchRadiusKm === r ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"}`}
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
                            onSelect={(city) => { setJobCity(city); toast.success(`עיר נבחרה: ${city}`); }}
                            placeholder="לדוגמה: תל אביב, חיפה, ירושלים..."
                          />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">לחץ על המפה לבחירת מיקום מדויק, או השתמש ב-GPS</p>

                    <AppButton type="button" variant="outline" size="sm" onClick={getMyLocation} disabled={locating} className="gap-2">
                      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                      השתמש במיקום שלי
                    </AppButton>

                    <div className="rounded-xl overflow-hidden border border-border h-56">
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

                  {/* Date & Hours */}
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      תאריך ושעות עבודה
                    </h2>

                    <AppInput
                      id="jobDate"
                      label="תאריך העבודה"
                      required
                      type="date"
                      value={jobDate}
                      placeholder="DD/MM/YYYY"
                      onChange={e => setJobDate(normalizeDateInput(e.target.value))}
                      onBlur={() => setJobDateTouched(true)}
                      min={new Date().toISOString().split("T")[0]}
                      dir="ltr"
                      error={!jobDate && jobDateTouched ? "תאריך העבודה הוא שדה חובה" : undefined}
                    />

                    <div>
                      <AppLabel>שעות עבודה <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontWeight: 400 }}>(אופציונלי)</span></AppLabel>
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
                              style={isActive
                                ? { background: "oklch(0.35 0.08 122)", borderColor: "oklch(0.35 0.08 122)", color: "white" }
                                : { background: "white", borderColor: "oklch(0.88 0.04 122)", color: "oklch(0.35 0.08 122)" }
                              }
                            >
                              {preset.label} ({preset.start}–{preset.end})
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <AppInput id="workStartTime" label="שעת התחלה" type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} dir="ltr" />
                        <AppInput id="workEndTime" label="שעת סיום" type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} dir="ltr" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <AppSelect
                        label="זמן התחלה"
                        defaultValue="flexible"
                        options={START_TIMES.map((s) => ({ value: s.value, label: s.label }))}
                        onChange={(e) => setValue("startTime", e.target.value)}
                      />
                      <AppInput id="workersNeeded" label="עובדים דרושים" type="number" min="1" dir="ltr" {...register("workersNeeded")} />
                    </div>

                    <AppInput
                      id="startDateTime"
                      label="🔥 תאריך ושעת התחלה מדויקים (אופציונלי)"
                      type="datetime-local"
                      dir="ltr"
                      {...register("startDateTime")}
                    />
                  </div>
                </div>
              )}

              {/* ── Tab 3: תנאים ותשלום ──────────────────────────────── */}
              {activeTab === "conditions" && (
                <div className="space-y-5">
                  {/* Salary */}
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" />
                      שכר ותנאים
                    </h2>

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

                    {salaryType !== "volunteer" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <AppInput id="hourlyRate" label="מחיר לשעה (₪)" type="number" min="0" step="5" placeholder="70" dir="ltr" {...register("hourlyRate")} />
                          <p className="text-xs text-muted-foreground mt-0.5">לדוגמא: 70 ₪ לשעה</p>
                        </div>
                        <div>
                          <AppInput id="estimatedHours" label="שעות עבודה משוערות" type="number" min="0.5" max="24" step="0.5" placeholder="4" dir="ltr" {...register("estimatedHours")} />
                          <p className="text-xs text-muted-foreground mt-0.5">לדוגמא: 4 שעות</p>
                        </div>
                      </div>
                    )}

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
                      <AppInput id="workingHours" label="שעות עבודה (טקסט חופשי)" placeholder="08:00-16:00" dir="ltr" {...register("workingHours")} />
                    </div>

                    {/* Volunteer toggle */}
                    <div
                      onClick={() => { const next = !isVolunteer; setValue("isVolunteer", next); if (next) setValue("salaryType", "volunteer"); else setValue("salaryType", "hourly"); }}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isVolunteer ? "border-green-400 bg-green-50" : "border-border hover:border-green-300"}`}
                    >
                      <div>
                        <p className={`font-semibold text-sm ${isVolunteer ? "text-green-700" : "text-foreground"}`}>💚 זו עבודת התנדבות — ללא תשלום</p>
                        <p className="text-xs text-muted-foreground mt-0.5">משרה התנדבותית — עזרה לקהילה, חירום, משפחות מילואימניקים</p>
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
                        <p className={`font-semibold text-sm ${isUrgent ? "text-red-700" : "text-foreground"}`}>⚡ צריך עובד עכשיו — משרה דחופה</p>
                        <p className="text-xs text-muted-foreground mt-0.5">יוצג ראשון ברשימה · תפוג אחרי 12 שעות</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isUrgent ? "border-red-500 bg-red-500" : "border-muted-foreground"}`}>
                        {isUrgent && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </div>

                  {/* Min age */}
                  <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                    <div>
                      <h2 className="font-bold text-foreground text-right mb-1">
                        הגבלת גיל מינימלי <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontWeight: 400 }}>(אופציונלי)</span>
                      </h2>
                      <p className="text-xs text-muted-foreground text-right mb-3">קבע גיל מינימלי לעובדים. ברירת מחדל: ללא הגבלה.</p>
                      <div className="flex flex-wrap gap-2">
                        {([null, 16, 18] as const).map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => setMinAge(val)}
                            className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
                            style={minAge === val
                              ? { background: "var(--brand)", borderColor: "var(--brand)", color: "white" }
                              : { background: "transparent", borderColor: "var(--border)", color: "var(--foreground)" }
                            }
                          >
                            {val === null ? "ללא הגבלה" : val === 18 ? "מבוגרים בלבד (18+)" : "גיל 16+"}
                          </button>
                        ))}
                      </div>
                      {minAge === 18 && <p className="text-xs text-right mt-2" style={{ color: "var(--muted-foreground)" }}>ℹ️ משרה זו תוצג לעובדים בני 18 ומעלה בלבד.</p>}
                      {minAge === 16 && <p className="text-xs text-right mt-2" style={{ color: "var(--muted-foreground)" }}>ℹ️ משרה זו תוצג לעובדים בני 16 ומעלה (כולל קטינים).</p>}
                    </div>
                  </div>

                </div>
              )}

              {/* ── Tab 4: פרסום ─────────────────────────────────────── */}
              {activeTab === "publish" && (
                <div className="space-y-5">
                  {/* ── Job Preview Card ──────────────────────────────── */}
                  <div
                    className="rounded-2xl border p-5 space-y-3"
                    style={{ background: "oklch(0.97 0.03 100)", borderColor: "oklch(0.84 0.06 100)" }}
                    dir="rtl"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{ width: 28, height: 28, background: "#4F583B" }}
                      >
                        <Briefcase className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h2 className="font-bold text-sm" style={{ color: "#4F583B" }}>תצוגה מקדימית של המשרה</h2>
                    </div>

                    <p className="text-lg font-black leading-tight" style={{ color: "#1a1a1a" }}>
                      {watchedTitle || <span className="text-muted-foreground italic text-base font-normal">ללא כותרת</span>}
                    </p>
                    {watchedCategory && catBySlug[watchedCategory] && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full" style={{ background: "oklch(0.90 0.06 100)", color: "#4F583B" }}>
                        {catBySlug[watchedCategory].icon} {catBySlug[watchedCategory].name}
                      </span>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Location */}
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#4F583B" }} />
                        <span className="text-muted-foreground text-xs">
                          {watchedAddress || (jobCity ? jobCity : "מיקום לא נבחר")}
                        </span>
                      </div>

                      {/* Date */}
                      {jobDate && (
                        <div className="flex items-start gap-1.5">
                          <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#4F583B" }} />
                          <span className="text-muted-foreground text-xs">
                            {new Date(jobDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                            {workStartTime && workEndTime && ` · ${workStartTime}–${workEndTime}`}
                          </span>
                        </div>
                      )}

                      {/* Salary */}
                      {!isVolunteer && (watchedSalary || watchedHourlyRate) && (
                        <div className="flex items-start gap-1.5">
                          <Banknote className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#4F583B" }} />
                          <span className="text-muted-foreground text-xs">
                            {salaryType === "hourly" && watchedHourlyRate ? `₪${watchedHourlyRate}/שעה` : null}
                            {salaryType === "total" && watchedSalary ? `₪${watchedSalary} סה"כ` : null}
                            {salaryType === "daily" && watchedSalary ? `₪${watchedSalary}/יום` : null}
                          </span>
                        </div>
                      )}
                      {isVolunteer && (
                        <div className="flex items-start gap-1.5">
                          <Banknote className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#4F583B" }} />
                          <span className="text-xs font-medium" style={{ color: "oklch(0.55 0.18 145)" }}>התנדבות</span>
                        </div>
                      )}

                      {/* Urgency */}
                      {isUrgent && (
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                          <span className="text-xs font-semibold text-amber-600">דחוף</span>
                        </div>
                      )}
                    </div>

                    {/* Contact */}
                    {watchedContactName && (
                      <p className="text-xs" style={{ color: "oklch(0.55 0.06 122)" }}>
                        איש קשר: <strong>{watchedContactName}</strong>
                        {watch("businessName") ? ` · ${watch("businessName")}` : ""}
                      </p>
                    )}
                  </div>

                  {/* CAPTCHA */}
                  <div className="bg-card rounded-2xl border border-border p-5">
                    <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      אימות אנטי-ספאם
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3 text-right">
                      פתור: <strong className="text-foreground text-base">{captcha.a} + {captcha.b} = ?</strong>
                    </p>
                    <AppInput
                      type="number"
                      placeholder="הכנס את התשובה"
                      value={captchaInput}
                      onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                      wrapperClassName="max-w-32"
                      error={captchaError ? "תשובה שגויאה, נסה שוב" : undefined}
                      dir="ltr"
                    />
                  </div>

                  {/* Region blocked */}
                  {regionBlocked && (
                    <div dir="rtl" className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-right" role="alert">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 rounded-full bg-red-100 p-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-red-900 text-sm leading-snug">האזור עדיין בהרצה ונפתח בקרוב למעסיקים.</p>
                          <p className="mt-1 text-xs text-red-700 leading-relaxed">אנחנו אוספים עובדים באזור ונעדכן אותך כשהאזור ייפתח לפרסום משרות.</p>
                          {regionBlocked.regionId > 0 && (() => {
                            const subscribed = (myNotifications ?? []).some(n => n.regionId === regionBlocked.regionId);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (subscribed) cancelNotif.mutate({ regionId: regionBlocked.regionId });
                                  else requestNotif.mutate({ regionId: regionBlocked.regionId, type: "employer" });
                                }}
                                disabled={requestNotif.isPending || cancelNotif.isPending}
                                className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${subscribed ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-50" : "border-red-300 bg-white text-red-700 hover:bg-red-50"}`}
                              >
                                {subscribed ? <><BellOff className="w-3 h-3" /> בטל התראה</> : <><Bell className="w-3 h-3" /> הודע לי כשהאזור נפתח</>}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legal checkboxes */}
                  <div dir="rtl" className="space-y-3 rounded-xl border p-4" style={{ borderColor: legalCheckboxError ? "#dc2626" : "#d6c99a", background: "#fefcf4" }}>
                    <p className="text-xs font-semibold" style={{ color: "#4a5d23" }}>אישורים נדרשים לפרסום משרה</p>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={legalLawsConfirmed} onChange={e => { setLegalLawsConfirmed(e.target.checked); if (e.target.checked) setLegalCheckboxError(false); }} className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer" />
                      <span className="text-xs leading-relaxed" style={{ color: "#3d3d3d" }}>
                        אני מאשר/ת כי פרסום המשרה עומד בדרישות החוק הישראלי ואינו כולל אפליה, הטרדה או פרסום בלתי חוקי.
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={legalLicensesConfirmed} onChange={e => { setLegalLicensesConfirmed(e.target.checked); if (e.target.checked) setLegalCheckboxError(false); }} className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer" />
                      <span className="text-xs leading-relaxed" style={{ color: "#3d3d3d" }}>
                        אני מאשר/ת כי בדיקת רישיונות והסמכות של נותן השירות היא באחריותי בלבד.
                      </span>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={legalPolicyAccepted} onChange={e => { setLegalPolicyAccepted(e.target.checked); if (e.target.checked) setLegalCheckboxError(false); }} className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer" />
                      <span className="text-xs leading-relaxed" style={{ color: "#3d3d3d" }}>
                        אני קראתי ומסכים/ת ל{" "}
                        <a href="/job-posting-policy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#4a5d23" }}>מדיניות פרסום משרות</a>
                        {" ול "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#4a5d23" }}>תנאי השימוש</a>.
                      </span>
                    </label>

                    <p className="text-xs" style={{ color: "#6b7280" }}>הפלטפורמה אינה אחראית לתוכן המשרה או לתנאי העבודה.</p>

                    {legalCheckboxError && (
                      <p className="text-xs font-medium" style={{ color: "#dc2626" }}>יש לאשר את כל האישורים לפני פרסום המשרה</p>
                    )}
                  </div>

                  {/* Submit */}
                  <AppButton
                    type="submit"
                    variant="brand"
                    size="xl"
                    className="w-full"
                    disabled={createJob.isPending}
                  >
                    {createJob.isPending
                      ? <><Loader2 className="h-5 w-5 animate-spin ml-2" />מפרסם...</>
                      : <><Send className="h-5 w-5 ml-2" />פרסם עבודה</>
                    }
                  </AppButton>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Sticky bottom nav ────────────────────────────────────────────── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe"
          style={{ background: "var(--page-bg)", borderTop: "1px solid oklch(0.92 0.02 100)" }}
        >
          <div className="max-w-lg mx-auto py-3 flex gap-3">
            {tabIndex > 0 && (
              <AppButton type="button" variant="outline" size="lg" className="flex-1 gap-2" onClick={goPrev}>
                <ArrowRight className="h-4 w-4" />
                הקודם
              </AppButton>
            )}
            {!isLastTab && (
              <AppButton type="button" variant="brand" size="lg" className="flex-1 gap-2" onClick={goNext}>
                הבא
                <ArrowLeft className="h-4 w-4" />
              </AppButton>
            )}
          </div>
        </div>
      </form>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

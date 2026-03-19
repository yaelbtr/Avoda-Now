import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useSearch } from "wouter";
import { AppButton, BrandName } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppInput, AppTextarea, AppLabel } from "@/components/ui";
import { toast } from "sonner";
import {
  User, MapPin, Briefcase, Save, ArrowRight, ArrowLeft,
  Bell, MessageSquare, BellOff, Crosshair, Building2, FileText,
  CheckCircle2, Camera, ChevronDown, X, AlertTriangle, TrendingUp, Calendar, Lock,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { CityPicker } from "@/components/CityPicker";
import { WorkerProfilePreviewModal } from "@/components/WorkerProfilePreviewModal";
import { Eye, Trash2 } from "lucide-react";
import { IsraeliPhoneInput, parseIsraeliPhone, combinePhone, type PhoneValue } from "@/components/IsraeliPhoneInput";
import { PhoneChangeModal } from "@/components/PhoneChangeModal";
import { useCategories } from "@/hooks/useCategories";
import { calcProfileScore, calcProfileMissingItems } from "@/shared/profileScore";
import { normalizeDateInput } from "@shared/ageUtils";

const DAYS = [
  { value: "sunday", label: "א׳" },
  { value: "monday", label: "ב׳" },
  { value: "tuesday", label: "ג׳" },
  { value: "wednesday", label: "ד׳" },
  { value: "thursday", label: "ה׳" },
  { value: "friday", label: "ש׳" },
  { value: "saturday", label: "שבת" },
];

const TIME_SLOTS = [
  { value: "morning", label: "בוקר", sub: "06:00–12:00", icon: "🌅", isNight: false },
  { value: "afternoon", label: "צהריים", sub: "12:00–17:00", icon: "☀️", isNight: false },
  { value: "evening", label: "ערב", sub: "17:00–22:00", icon: "🏆", isNight: false },
  { value: "night", label: "לילה", sub: "22:00–06:00", icon: "🌙", isNight: true },
];

type NotifPref = "both" | "push_only" | "sms_only" | "none";

const NOTIF_OPTIONS: { value: NotifPref; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "both", label: "הכל", description: "Push + SMS", icon: <Bell className="h-4 w-4" /> },
  { value: "push_only", label: "Push בלבד", description: "התראות דפדפן בלבד", icon: <Bell className="h-4 w-4" /> },
  { value: "sms_only", label: "SMS בלבד", description: "הודעות טקסט בלבד", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "none", label: "כבוי", description: "ללא הודעות", icon: <BellOff className="h-4 w-4" /> },
];

const TOTAL_WIZARD_STEPS = 5;

// ── Progress bar for wizard ──────────────────────────────────────────────────
function WizardProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i < step
                ? "oklch(0.45 0.12 90)"
                : "oklch(0.88 0.03 90)",
            }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-left">שלב {step} מתוך {total}</p>
    </div>
  );
}

export default function WorkerProfile() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  useSEO({
    title: "הפרופיל שלי",
    description: "עדכן את פרופיל העובד שלך וקבל התראויות למשרות זמניות.",
    canonical: "/worker-profile",
    noIndex: true,
  });

  const { categories: dbCategories } = useCategories();
  const profileQuery = trpc.user.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const citiesQuery = trpc.user.getCities.useQuery(undefined, { staleTime: 60_000 });
  const notifPrefsQuery = trpc.user.getNotificationPrefs.useQuery(undefined, { enabled: isAuthenticated });
  const birthDateInfoQuery = trpc.user.getBirthDateInfo.useQuery(undefined, { enabled: isAuthenticated });

  // Map DB categories to the shape expected by the UI
  // Hide allowedForMinors=false categories when the worker is a minor (reuses birthDateInfoQuery above)
  const isCurrentUserMinor = birthDateInfoQuery.data?.isMinor === true;
  const PREFERENCE_CATEGORIES = dbCategories
    .filter(c => !isCurrentUserMinor || c.allowedForMinors !== false)
    .map(c => ({ value: c.slug, label: c.name, icon: c.icon ?? "💼" }));
  const utils = trpc.useUtils();

  // BirthDate update state
  const [bdEditDate, setBdEditDate] = useState("");
  const [bdConfirmOpen, setBdConfirmOpen] = useState(false);
  const [bdDeclared, setBdDeclared] = useState(false);
  const updateBirthDateMutation = trpc.user.updateBirthDate.useMutation({
    onSuccess: () => {
      toast.success("תאריך לידה עודכן בהצלחה");
      setBdConfirmOpen(false);
      setBdDeclared(false);
      utils.user.getBirthDateInfo.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("הפרופיל עודכן בהצלחה");
      // Reset dirty snapshot to current values so indicator clears
      savedSnapshot.current = {
        name, email, workerBio, selectedCategories, preferenceText,
        locationMode, preferredCity, searchRadiusKm,
        preferredDays, preferredTimeSlots, preferredCities,
        workerLatitude, workerLongitude, phoneVal,
      };
      profileQuery.refetch();
    },
    onError: () => toast.error("שגיאה בשמירת הפרופיל"),
  });

  const completeSignupMutation = trpc.user.completeSignup.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
    },
    onError: () => toast.error("שגיאה בשמירת הפרופיל"),
  });

  const updateNotifPrefsMutation = trpc.user.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      toast.success("הגדרות ההתראות עודכנו");
      notifPrefsQuery.refetch();
    },
    onError: () => toast.error("שגיאה בשמירת הגדרות ההתראות"),
  });
  // ── Shared state ──────────────────────────────────────────────────────────────
  const searchString = useSearch();
  const initialTab = (() => {
    const t = new URLSearchParams(searchString).get("tab");
    return (["details", "work", "schedule", "settings"] as const).includes(t as any)
      ? (t as "details" | "work" | "schedule" | "settings")
      : "details";
  })();
  const [activeTab, setActiveTab] = useState<"details" | "work" | "schedule" | "settings">(initialTab);
  const [name, setName] = useState("");  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [workerBio, setWorkerBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [preferenceText, setPreferenceText] = useState("");
  const [locationMode, setLocationMode] = useState<"city" | "radius">("city");
  const [preferredCity, setPreferredCity] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);
  const [workerLatitude, setWorkerLatitude] = useState<string | null>(null);
  const [workerLongitude, setWorkerLongitude] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);
  const [preferredCities, setPreferredCities] = useState<number[]>([]);
  const [notifPref, setNotifPref] = useState<NotifPref>("both");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [phoneChangeModalOpen, setPhoneChangeModalOpen] = useState(false);
  // Track original phone to detect changes
  const [originalPhoneVal, setOriginalPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });

  // ── Dirty-state tracking ─────────────────────────────────────────────────────
  // Snapshot of last-saved values (initialised from server data, reset on save)
  const savedSnapshot = useRef<{
    name: string; email: string; workerBio: string;
    selectedCategories: string[]; preferenceText: string;
    locationMode: string; preferredCity: string; searchRadiusKm: number;
    preferredDays: string[]; preferredTimeSlots: string[];
    preferredCities: number[];
    workerLatitude: string | null; workerLongitude: string | null;
    phoneVal: PhoneValue;
  } | null>(null);

  const isDirty = useMemo(() => {
    if (!savedSnapshot.current) return false;
    const s = savedSnapshot.current;
    return (
      name !== s.name ||
      email !== s.email ||
      workerBio !== s.workerBio ||
      preferenceText !== s.preferenceText ||
      locationMode !== s.locationMode ||
      preferredCity !== s.preferredCity ||
      searchRadiusKm !== s.searchRadiusKm ||
      workerLatitude !== s.workerLatitude ||
      workerLongitude !== s.workerLongitude ||
      phoneVal.prefix !== s.phoneVal.prefix ||
      phoneVal.number !== s.phoneVal.number ||
      JSON.stringify(selectedCategories.slice().sort()) !== JSON.stringify(s.selectedCategories.slice().sort()) ||
      JSON.stringify(preferredDays.slice().sort()) !== JSON.stringify(s.preferredDays.slice().sort()) ||
      JSON.stringify(preferredTimeSlots.slice().sort()) !== JSON.stringify(s.preferredTimeSlots.slice().sort()) ||
      JSON.stringify(preferredCities.slice().sort()) !== JSON.stringify(s.preferredCities.slice().sort())
    );
  }, [name, email, workerBio, preferenceText, locationMode, preferredCity, searchRadiusKm,
      workerLatitude, workerLongitude, phoneVal, selectedCategories,
      preferredDays, preferredTimeSlots, preferredCities]);

  const uploadPhoto = async (base64: string, mimeType: string) => {
    const res = await fetch("/api/upload-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType }),
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json() as { url: string };
    setProfilePhoto(data.url);
    toast.success("תמונת הפרופיל עודכנה!");
  };

  // ── Wizard state ─────────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDone, setWizardDone] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Collapsible sections — default collapsed
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Populate from server
  useEffect(() => {
    if (profileQuery.data) {
      const d = profileQuery.data;
      const newName = d.name ?? "";
      const newBio = d.workerBio ?? "";
      const newCats = d.preferredCategories ?? [];
      const newPrefText = d.preferenceText ?? "";
      const newLocMode = (d.locationMode as "city" | "radius") ?? "city";
      const newCity = d.preferredCity ?? "";
      const newRadius = d.searchRadiusKm ?? 5;
      const newDays = (d.preferredDays as string[]) ?? [];
      const newSlots = (d.preferredTimeSlots as string[]) ?? [];
      const newCities = (d.preferredCities as number[]) ?? [];
      const newLat = (d as any).workerLatitude ?? null;
      const newLng = (d as any).workerLongitude ?? null;
      const newEmail = user?.email ?? "";

      setName(newName);
      setPhone(d.phone ?? "");
      // Populate split phone fields from DB or parse from combined phone
      let pv: PhoneValue = { prefix: "", number: "" };
      if ((d as any).phonePrefix && (d as any).phoneNumber) {
        pv = { prefix: (d as any).phonePrefix, number: (d as any).phoneNumber };
      } else if (d.phone) {
        pv = parseIsraeliPhone(d.phone);
      }
      setPhoneVal(pv);
      setOriginalPhoneVal(pv);
      setWorkerBio(newBio);
      setSelectedCategories(newCats);
      setPreferenceText(newPrefText);
      setLocationMode(newLocMode);
      setPreferredCity(newCity);
      setSearchRadiusKm(newRadius);
      setPreferredDays(newDays);
      setPreferredTimeSlots(newSlots);
      setPreferredCities(newCities);
      setWorkerLatitude(newLat);
      setWorkerLongitude(newLng);
      setProfilePhoto((d as { profilePhoto?: string | null }).profilePhoto ?? null);

      // Initialise snapshot (only once — first load)
      if (!savedSnapshot.current) {
        savedSnapshot.current = {
          name: newName, email: newEmail, workerBio: newBio,
          selectedCategories: newCats, preferenceText: newPrefText,
          locationMode: newLocMode, preferredCity: newCity,
          searchRadiusKm: newRadius, preferredDays: newDays,
          preferredTimeSlots: newSlots, preferredCities: newCities,
          workerLatitude: newLat, workerLongitude: newLng, phoneVal: pv,
        };
      }
    }
    if (user?.email) setEmail(user.email);
  }, [profileQuery.data, user]);

  useEffect(() => {
    if (notifPrefsQuery.data) setNotifPref(notifPrefsQuery.data.prefs);
  }, [notifPrefsQuery.data]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">יש להתחבר כדי לצפות בפרופיל</p>
        <AppButton variant="brand" className="mt-4" onClick={() => navigate("/")}>
          חזרה לדף הבית
        </AppButton>
      </div>
    );
  }

  const isLoading = profileQuery.isLoading;
  const isNewWorker = !profileQuery.isLoading && profileQuery.data && !profileQuery.data.signupCompleted;

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  // ── Profile completion score — uses shared utility (single source of truth) ──
  const completionScore = () => calcProfileScore({
    name,
    profilePhoto,
    preferredCategories: selectedCategories,
    preferredCity: preferredCity || (preferredCities.length > 0 ? String(preferredCities[0]) : null),
    workerLatitude: null,
    workerBio,
    preferenceText,
    preferredDays,
  });

  // ── Wizard submit ────────────────────────────────────────────────────────────
  const handleWizardSubmit = async () => {
    try {
      await completeSignupMutation.mutateAsync({
        name: name.trim() || (user?.name ?? ""),
        // Pass phone only for OAuth users (Google) who don't have a phone yet
        phone: (!user?.phone && phone.trim()) ? phone.trim() : undefined,
        locationMode,
        preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
        searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
        preferredCategories: selectedCategories,
        preferenceText: preferenceText.trim() || null,
        workerBio: workerBio.trim() || null,
        preferredDays,
        preferredTimeSlots,
        preferredCities,
      });
      setWizardDone(true);
    } catch {
      // error handled by mutation
    }
  };

  // ── Profile save ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    // Detect phone change: if user already has a phone and the new value differs, require OTP
    const hasFullPhone = phoneVal.prefix.length === 3 && phoneVal.number.length === 7;
    const phoneChanged = hasFullPhone && (
      phoneVal.prefix !== originalPhoneVal.prefix ||
      phoneVal.number !== originalPhoneVal.number
    );
    const userAlreadyHasPhone = !!(originalPhoneVal.prefix && originalPhoneVal.number);

    if (phoneChanged && userAlreadyHasPhone) {
      // Phone changed — require OTP verification first
      setPhoneChangeModalOpen(true);
      return;
    }

    // Build phone update payload for new users (no existing phone)
    const isPhoneOtp = user?.loginMethod === "phone_otp";
    const phonePayload = (!isPhoneOtp && !user?.phone && hasFullPhone)
      ? { phone: combinePhone(phoneVal), phonePrefix: phoneVal.prefix, phoneNumber: phoneVal.number }
      : {};
    updateMutation.mutate({
      name: name.trim() || undefined,
      ...phonePayload,
      workerBio: workerBio.trim() || null,
      preferredCategories: selectedCategories,
      preferenceText: preferenceText.trim() || null,
      locationMode,
      preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
      searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
      workerLatitude: locationMode === "radius" ? workerLatitude : null,
      workerLongitude: locationMode === "radius" ? workerLongitude : null,
      preferredDays,
      preferredTimeSlots,
      preferredCities: locationMode === "city" ? preferredCities : [],
      // Only pass email for non-Google users (Google email comes from OAuth)
      email: !user?.email ? (email.trim() || null) : undefined,
    });
  };

  const handleNotifPrefChange = (pref: NotifPref) => {
    setNotifPref(pref);
    updateNotifPrefsMutation.mutate({ prefs: pref });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <BrandLoader size="md" />
      </div>
    );
  }

  // ── Error state (transient server error — show retry instead of broken page) ──
  if (profileQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4" dir="rtl">
        <p className="text-muted-foreground text-sm">שגיאה בטעינת הפרופיל. אנא נסה שוב.</p>
        <button
          onClick={() => profileQuery.refetch()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  // ── Wizard done screen ───────────────────────────────────────────────────────
  if (wizardDone) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="h-20 w-20 mx-auto mb-6" style={{ color: "oklch(0.55 0.15 145)" }} />
        </motion.div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "oklch(0.25 0.05 91)" }}>
          ברוך הבא ל-<BrandName />! 🎉
        </h1>
        <p className="text-muted-foreground mb-8">הפרופיל שלך מוכן. נתחיל לחפש עבודות מתאימות.</p>
        <AppButton variant="brand" size="xl" className="w-full" onClick={() => navigate("/")}>
          התחל לעבוד
        </AppButton>
      </div>
    );
  }

  // ── WIZARD MODE (new worker) ─────────────────────────────────────────────────
  if (isNewWorker) {
    const canProceedStep1 = name.trim().length >= 2;
    // Birth-date is required before the wizard can proceed.
    // hasBirthDate is false while the query is loading (undefined) — treat as not-yet-declared.
    const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
    const birthDateLoading = birthDateInfoQuery.isLoading;

    return (
      <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
        {/* ── Mandatory birth-date gate ─────────────────────────────────────── */}
        {!birthDateLoading && !hasBirthDate && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)" }}
          >
            <div
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-4"
              style={{ background: "white", boxShadow: "0 -4px 32px rgba(0,0,0,0.18)", marginBottom: 0 }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: "oklch(0.88 0.02 100)" }} />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
                  <Calendar className="h-5 w-5" style={{ color: "#4F583B" }} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">נדרש תאריך לידה</h3>
                  <p className="text-xs text-muted-foreground">לפני שממשיכים במילוי הפרופיל</p>
                </div>
              </div>

              <p className="text-sm text-foreground leading-relaxed" dir="rtl">
                המערכת משתמשת בתאריך הלידה כדי להציג לך משרות מתאימות ולוודא עמידה בדרישות חוק עבודת נוער.
                לא ניתן להמשיך בלי הזנת תאריך לידה.
              </p>

              {/* Date input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">תאריך לידה</label>
                <input
                  type="date"
                  value={bdEditDate}
                  placeholder="DD/MM/YYYY"
                  onChange={(e) => setBdEditDate(normalizeDateInput(e.target.value))}
                  max={new Date().toISOString().split("T")[0]}
                  min="1920-01-01"
                  className="w-full h-12 px-3 rounded-xl border text-base"
                  style={{
                    background: "white",
                    borderColor: bdEditDate && !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) ? "oklch(0.55 0.2 25)" : "oklch(0.88 0.04 100)",
                    color: "var(--foreground)",
                    fontSize: "16px",
                    direction: "ltr",
                  }}
                />
                {bdEditDate && !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) && (
                  <p className="text-xs text-red-500" dir="rtl">פורמט לא תקין. הזן בפורמט DD/MM/YYYY</p>
                )}
                {bdEditDate && /^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) && bdEditDate > new Date().toISOString().split("T")[0] && (
                  <p className="text-xs text-red-500" dir="rtl">תאריך לידה לא יכול להיות בעתיד</p>
                )}
              </div>

              <AppButton
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!bdEditDate || !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) || bdEditDate > new Date().toISOString().split("T")[0] || updateBirthDateMutation.isPending}
                onClick={() => setBdConfirmOpen(true)}
              >
                <Calendar className="h-4 w-4" />
                אישור תאריך לידה והמשך
              </AppButton>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-black" style={{ color: "oklch(0.25 0.05 91)" }}>
            התחל לעבוד איתנו
          </h1>
          <p className="text-sm text-muted-foreground mt-1">פחות מ-30 שניות להרשמה</p>
        </div>

        <WizardProgress step={wizardStep} total={TOTAL_WIZARD_STEPS} />

        <AnimatePresence mode="wait">
          {/* ── Step 1: Basic info ── */}
          {wizardStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <h2 className="font-bold text-foreground">פרטים בסיסיים</h2>
                </div>

                {/* Photo upload */}
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="relative">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="תמונת פרופיל" loading="lazy" decoding="async" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-dashed border-border bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {photoUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <BrandLoader size="sm" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="wizard-photo-upload" className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-medium">
                    <Camera className="h-3.5 w-3.5" />
                    {profilePhoto ? "החלף תמונה" : "הוסף תמונה (לא חובה)"}
                  </label>
                  <input
                    id="wizard-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error("התמונה גדולה מדי. מקסימום 5MB."); return; }
                      setPhotoUploading(true);
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result as string).split(",")[1];
                        const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
                        await uploadPhoto(base64, mimeType);
                        setPhotoUploading(false);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <p className="text-xs text-center mt-1">
                    {profilePhoto ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">📢 התמונה תוצג למעסיקים פוטנציאלים</span>
                    ) : (
                      <span className="text-muted-foreground">עובדים עם תמונה מקבלים פי 3 יותר פניות 📸</span>
                    )}
                  </p>
                </div>

                <AppInput
                  label="שם מלא"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  dir="rtl"
                  autoFocus
                  icon={<User className="h-4 w-4" />}
                />

                <AppInput
                  id="email"
                  label={
                    <>
                      כתובת מייל
                      {user?.email && (
                        <span className="mr-2 text-xs text-green-600 font-normal">נילא מחשבון Google</span>
                      )}
                    </>
                  }
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!user?.email}
                  dir="ltr"
                />

                <div>
                  {/* Phone field in wizard: OTP users have it read-only, OAuth users can enter */}
                  {user?.loginMethod === "phone_otp" || user?.phone ? (
                    <>
                      <IsraeliPhoneInput
                        value={phoneVal.prefix ? phoneVal : parseIsraeliPhone(user?.phone)}
                        onChange={() => {}}
                        readOnly
                        label="מספר טלפון"
                      />
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> מאומת
                      </p>
                    </>
                  ) : (
                    <>
                      <IsraeliPhoneInput
                        value={phoneVal}
                        onChange={setPhoneVal}
                        label="מספר טלפון"
                      />
                      <p className="text-xs text-muted-foreground mt-1">מספר הטלפון ישמש ליצירת קשר עם מעסיקים (לא חובה)</p>
                    </>
                  )}
                </div>
              </div>

              <AppButton
                variant="brand"
                size="xl"
                className="w-full mt-4"
                disabled={!canProceedStep1}
                onClick={() => setWizardStep(2)}
              >
                המשך
                <ArrowLeft className="h-4 w-4" />
              </AppButton>
            </motion.div>
          )}

          {/* ── Step 2: Location ── */}
          {wizardStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h2 className="font-bold text-foreground">איפה תרצה לעבוד?</h2>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">בחר אחת מהאפשרויות</p>

                <div className="space-y-3">
                  {/* Option A: Radius */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setLocationMode("radius")}
                    onKeyDown={(e) => e.key === "Enter" && setLocationMode("radius")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      locationMode === "radius"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Crosshair className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">עבודות לפי מרחק ממני</p>
                        <p className="text-xs text-muted-foreground">מציג עבודות קרובות למיקומך</p>
                      </div>
                    </div>
                    {locationMode === "radius" && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">בחר רדיוס:</p>
                        <div className="flex gap-2">
                          {[2, 5, 10, 20, 50].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSearchRadiusKm(r); }}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                searchRadiusKm === r
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {r} ק"מ
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option B: City multi-select */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all ${
                      locationMode === "city"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setLocationMode("city")}
                      onKeyDown={(e) => e.key === "Enter" && setLocationMode("city")}
                      className="flex items-center gap-3 mb-2 cursor-pointer"
                    >
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">עבודות בערים מסוימות</p>
                        <p className="text-xs text-muted-foreground">בחר ערים אחת או יותר</p>
                      </div>
                    </div>
                    {locationMode === "city" && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <CityPicker
                          selectedCityIds={preferredCities}
                          onChange={setPreferredCities}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <AppButton variant="outline" size="xl" className="flex-1" onClick={() => setWizardStep(1)}>
                  <ArrowRight className="h-4 w-4" />
                  חזור
                </AppButton>
                <AppButton
                  variant="brand"
                  size="xl"
                  className="flex-1"
                  disabled={false}
                  onClick={() => setWizardStep(3)}
                >
                  המשך
                  <ArrowLeft className="h-4 w-4" />
                </AppButton>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Categories (optional) ── */}
          {wizardStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h2 className="font-bold text-foreground">איזה עבודות מעניינות אותך?</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">ניתן לבחור מספר קטגוריות · לא חובה</p>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERENCE_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-right ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-xl shrink-0">{cat.icon}</span>
                        <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedCategories.length > 0 && (
                  <p className="text-xs text-primary mt-3 font-medium">{selectedCategories.length} קטגוריות נבחרו</p>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <AppButton variant="outline" size="xl" className="flex-1" onClick={() => setWizardStep(2)}>
                  <ArrowRight className="h-4 w-4" />
                  חזור
                </AppButton>
                <AppButton variant="brand" size="xl" className="flex-1" onClick={() => setWizardStep(4)}>
                  המשך
                  <ArrowLeft className="h-4 w-4" />
                </AppButton>
              </div>
              <button
                className="w-full text-center text-xs text-muted-foreground mt-3 underline underline-offset-2"
                onClick={() => setWizardStep(4)}
              >
                דלג
              </button>
            </motion.div>
          )}

          {/* ── Step 4: Work schedule (optional) ── */}
          {wizardStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-4 w-4 text-primary" />
                  <h2 className="font-bold text-foreground">מתי אתה מועדף לעבוד?</h2>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">לא חובה — ניתן לעדכן בהמשך</p>

                {/* Days */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">ימי עבודה:</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => {
                      const isSelected = preferredDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            setPreferredDays((prev) =>
                              prev.includes(day.value)
                                ? prev.filter((d) => d !== day.value)
                                : [...prev, day.value]
                            )
                          }
                          className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">שעות עבודה:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.filter(slot => !isCurrentUserMinor || !slot.isNight).map((slot) => {
                      const isSelected = preferredTimeSlots.includes(slot.value);
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() =>
                            setPreferredTimeSlots((prev) =>
                              prev.includes(slot.value)
                                ? prev.filter((s) => s !== slot.value)
                                : [...prev, slot.value]
                            )
                          }
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          <span className="text-lg">{slot.icon}</span>
                          <div className="text-right">
                            <div className="font-bold text-sm">{slot.label}</div>
                            <div className="text-xs opacity-70">{slot.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <AppButton variant="outline" size="xl" className="flex-1" onClick={() => setWizardStep(3)}>
                  <ArrowRight className="h-4 w-4" />
                  חזור
                </AppButton>
                <AppButton variant="brand" size="xl" className="flex-1" onClick={() => setWizardStep(5)}>
                  המשך
                  <ArrowLeft className="h-4 w-4" />
                </AppButton>
              </div>
              <button
                className="w-full text-center text-xs text-muted-foreground mt-3 underline underline-offset-2"
                onClick={() => setWizardStep(5)}
              >
                דלג
              </button>
            </motion.div>
          )}

          {/* ── Step 5: Preference text + finish ── */}
          {wizardStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="font-bold text-foreground">ספר לנו איזה עבודות אתה מחפש</h2>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  המערכת תשתמש בתיאור כדי להציע לך עבודות מתאימות · לא חובה
                </p>
                <AppTextarea
                  value={preferenceText}
                  onChange={(e) => setPreferenceText(e.target.value)}
                  placeholder='לדוגמה: "מחפש עבודה עם כלבים או שליחויות"'
                  dir="rtl"
                  rows={4}
                  maxLength={1000}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-left">{preferenceText.length}/1000</p>
              </div>

              <div className="flex gap-3 mt-4">
                <AppButton variant="outline" size="xl" className="flex-1" onClick={() => setWizardStep(4)}>
                  <ArrowRight className="h-4 w-4" />
                  חזור
                </AppButton>
                <AppButton
                  variant="brand"
                  size="xl"
                  className="flex-1"
                  onClick={handleWizardSubmit}
                  disabled={completeSignupMutation.isPending}
                >
                  {completeSignupMutation.isPending ? <BrandLoader size="sm" /> : "התחל לעבוד 🚀"}
                </AppButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── EDIT MODE (existing worker) ──────────────────────────────────────────────
  const TABS = [
    { id: "details" as const, label: "פרטים", icon: User },
    { id: "work" as const, label: "עבודה", icon: Briefcase },
    { id: "schedule" as const, label: "זמינות", icon: Bell },
    { id: "settings" as const, label: "הגדרות", icon: BellOff },
  ];

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: "var(--page-bg)" }}>
      {/* ── Hero Header + Tabs ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ backgroundColor: "var(--page-bg)", borderBottom: "1px solid oklch(0.92 0.02 100)" }}>
        {/* Accent bar matching HomeWorker brand */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4F583B 0%, oklch(0.68 0.14 80.8) 100%)" }} />

        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          {/* Back button + Preview button */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
              style={{ color: "#4F583B" }}
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{ background: "oklch(0.93 0.04 122)", color: "#4F583B", border: "1px solid oklch(0.85 0.06 122)" }}
            >
              <Eye className="h-3.5 w-3.5" />
              תצוגת מעסיק
            </button>
          </div>

          {/* Avatar + info row */}
          <div className="flex items-center gap-4 mb-5">
            {/* Circular avatar with upload */}
            <div className="relative shrink-0">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="תמונת פרופיל"
                  loading="lazy"
                  decoding="async"
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ border: "3px solid oklch(0.55 0.12 88)", boxShadow: "0 2px 12px oklch(0.45 0.12 88 / 0.25)" }}
                />
              ) : (
                <label
                  htmlFor="photo-upload-hero"
                  className="w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all hover:opacity-80"
                  style={{ background: "oklch(0.93 0.04 88)", border: "2px dashed oklch(0.60 0.10 88)" }}
                >
                  <Camera className="h-5 w-5 mb-0.5" style={{ color: "oklch(0.50 0.12 88)" }} />
                  <span className="text-xs font-medium" style={{ color: "oklch(0.50 0.12 88)" }}>הוסף</span>
                </label>
              )}
              {profilePhoto && (
                <label
                  htmlFor="photo-upload-hero"
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-110"
                  style={{ background: "oklch(0.50 0.14 85)" }}
                  title="שנה תמונה"
                >
                  <Camera className="h-3 w-3 text-white" />
                </label>
              )}
              <input
                id="photo-upload-hero"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { toast.error("התמונה גדולה מדי. מקסימום 5MB."); return; }
                  setPhotoUploading(true);
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const base64 = (reader.result as string).split(",")[1];
                    const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
                    await uploadPhoto(base64, mimeType);
                    setPhotoUploading(false);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {photoUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <BrandLoader size="sm" />
                </div>
              )}
            </div>

            {/* Name + meta + photo notice */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black leading-tight truncate" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>
                {name || user?.name || "פרופיל שלי"}
              </h1>
              {profileQuery.data?.phone && (
                <p className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.06 122)" }}>
                  {profileQuery.data.phone}
                </p>
              )}
              {selectedCategories.length > 0 && (
                <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.50 0.06 122)" }}>
                  {selectedCategories.slice(0, 2).map(v => PREFERENCE_CATEGORIES.find(c => c.value === v)?.label).filter(Boolean).join(" · ")}
                  {selectedCategories.length > 2 && ` +${selectedCategories.length - 2}`}
                </p>
              )}
              {/* Employer photo notice */}
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "oklch(0.68 0.14 80.8)" }}>
                📸 התמונה תוצג למעסיקים פוטנציאליים
              </p>
            </div>
          </div>

          {/* ── Tab Bar ──────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-1 flex gap-1"
            style={{ background: "oklch(0.93 0.02 100)", border: "1px solid oklch(0.89 0.03 100)" }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all"
                  style={isActive
                    ? { background: "#4F583B", color: "white", boxShadow: "0 2px 8px rgba(79,88,59,0.35)" }
                    : { color: "oklch(0.50 0.06 122)" }
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 mt-3 pb-10">

        {/* ── Profile Completion Banner ──────────────────────────────────────────── */}
        {(() => {
          const score = completionScore();
          if (score >= 100) return null;
          const missingItems = [
            !name.trim() && "שם מלא",
            !profilePhoto && "תמונת פרופיל",
            selectedCategories.length === 0 && "קטגוריות עבודה",
            !preferredCity && preferredCities.length === 0 && "אזור מועדף",
            !workerBio.trim() && "ביו קצר",
          ].filter(Boolean) as string[];
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl p-4"
              style={{
                background: score >= 70
                  ? "oklch(0.97 0.04 122 / 0.9)"
                  : "oklch(0.97 0.06 80 / 0.9)",
                border: score >= 70
                  ? "1px solid oklch(0.85 0.08 122)"
                  : "1px solid oklch(0.85 0.10 80)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {score >= 70
                    ? <TrendingUp className="h-4 w-4" style={{ color: "oklch(0.50 0.09 124.9)" }} />
                    : <AlertTriangle className="h-4 w-4" style={{ color: "oklch(0.55 0.12 76.7)" }} />}
                  <span className="text-sm font-bold" style={{ color: score >= 70 ? "oklch(0.40 0.09 124.9)" : "oklch(0.45 0.12 76.7)" }}>
                    פרופיל {score}% מושלם
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {score >= 70 ? "כמעט שם!" : "השלם להגדיל חשיפות"}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full mb-3" style={{ background: "oklch(0.90 0.03 100)" }}>
                <motion.div
                  className="h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    background: score >= 70
                      ? "linear-gradient(90deg, oklch(0.50 0.09 124.9), oklch(0.60 0.12 88))"
                      : "linear-gradient(90deg, oklch(0.55 0.12 76.7), oklch(0.68 0.14 80.8))",
                  }}
                />
              </div>
              {missingItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>חסר:</span>
                  {missingItems.map(item => (
                    <span
                      key={item}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: score >= 70 ? "oklch(0.88 0.06 122)" : "oklch(0.90 0.08 80)",
                        color: score >= 70 ? "oklch(0.40 0.09 124.9)" : "oklch(0.45 0.12 76.7)",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })()}{/* ── TAB: פרטים ─────────────────────────────────────────────── */}
        {activeTab === "details" && (
        <div className="space-y-4">
        {/* ── Basic info card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 1px 4px rgba(79,88,59,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
              <User className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
            </div>
            <h2 className="font-bold text-foreground text-sm">פרטים אישיים</h2>
          </div>
          <div className="space-y-3">
            <AppInput
              label="שם"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="השם שלך"
              dir="rtl"
              icon={<User className="h-4 w-4" />}
            />
            <div>
              {/* Phone field: read-only for OTP users, editable split input for OAuth users */}
              {user?.loginMethod === "phone_otp" ? (
                <>
                  <AppLabel>טלפון</AppLabel>
                  <IsraeliPhoneInput
                    value={phoneVal.prefix ? phoneVal : parseIsraeliPhone(profileQuery.data?.phone)}
                    onChange={() => {}}
                    readOnly
                    showLabel={false}
                  />
                  <p className="text-xs text-muted-foreground mt-1">מספר הטלפון אינו ניתן לשינוי</p>
                </>
              ) : (
                <IsraeliPhoneInput
                  value={phoneVal}
                  onChange={setPhoneVal}
                  disabled={!!user?.phone}
                  readOnly={!!user?.phone}
                  label="מספר טלפון"
                />
              )}
            </div>
            <div>
              <AppInput
                id="email"
                label={
                  <>
                    כתובת מייל
                    {user?.email && (
                      <span className="mr-2 text-xs text-green-600 font-normal">נלקח מחשבון Google</span>
                    )}
                  </>
                }
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!user?.email}
                dir="ltr"
              />
              {!user?.email && (
                <p className="text-xs text-muted-foreground mt-1">כתובת המייל תשמש לקבלת עדכונים על משרות</p>
              )}
            </div>
            <div>
              <AppTextarea
                label="אודות"
                value={workerBio}
                onChange={(e) => setWorkerBio(e.target.value)}
                placeholder="ספר קצת על עצמך — ניסיון, כישורים, זמינות..."
                dir="rtl"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left">{workerBio.length}/500</p>
            </div>
          </div>
        </div>
        {/* Legal notice — profile */}
        <p className="text-xs text-muted-foreground text-center mt-2" dir="rtl">
          שמירת הפרופיל מסכימה ל{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">תנאי השימוש</a>
          {" "}ול{" "}
          <a href="/user-content-policy" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">מדיניות תוכן</a>.
          {" "}המידע יהיה גלוי למעסיקים שיצורו קשר איתך.
        </p>

        {/* Save button for details tab */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="relative">
            <AppButton
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <BrandLoader size="sm" /> : <Save className="h-4 w-4" />}
              שמור
            </AppButton>
            {isDirty && !updateMutation.isPending && (
              <span
                className="absolute top-1.5 left-3 h-2.5 w-2.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.72 0.18 50)" }}
                title="יש שינויים שלא נשמרו"
              />
            )}
          </div>
          <button
            onClick={() => window.history.back()}
            disabled={updateMutation.isPending}
            type="button"
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "oklch(0.35 0.08 122)" }}
          >
            <ArrowRight className="h-4 w-4" />
            יציאה ללא שמירה
          </button>
        </div>
        </div>
        )}

        {/* ── TAB: עבודה ─────────────────────────────────────────────── */}
        {activeTab === "work" && (
        <div className="space-y-4">
        {/* ── Work Preferences Card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl" style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 1px 4px rgba(79,88,59,0.06)" }}>

          {/* ── Sub-section: תחומי עיסוק מועדפים ── */}
          <button
            type="button"
            onClick={() => toggleSection("work-categories")}
            className="w-full flex items-center gap-2 px-5 py-4 text-right"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
              <Briefcase className="h-3 w-3" style={{ color: "#4F583B" }} />
            </div>
            <span className="font-bold text-foreground text-sm flex-1">תחומי עיסוק מועדפים</span>
            {selectedCategories.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(0.92 0.04 122)", color: "#4F583B" }}>
                {selectedCategories.length}
              </span>
            )}
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform duration-200"
              style={{ transform: openSections["work-categories"] ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateRows: openSections["work-categories"] ? "1fr" : "0fr",
              transition: "grid-template-rows 0.25s ease",
            }}
          >
          <div className="overflow-hidden">
          <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "oklch(0.94 0.02 100)" }}>
            {/* Preference text */}
            <div className="pt-4">
              <AppLabel style={{ display: "flex", alignItems: "center", gap: 6 }}><FileText className="h-3.5 w-3.5" style={{ color: "var(--muted-foreground)" }} />תיאור חופשי</AppLabel>
              <AppTextarea
                value={preferenceText}
                onChange={(e) => setPreferenceText(e.target.value)}
                placeholder='לדוגמא: מחפש עבודה בשעות הבוקר, מוכן לנסוע עד 10 ק"מ, ניסיון בשמירה ובנייה...'
                dir="rtl"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left">{preferenceText.length}/1000</p>
            </div>
            {/* Categories */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">בחר את הקטגוריות שאתה מוכן לעבוד בהן</p>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ borderTop: "1px solid oklch(0.94 0.02 100)" }} />

          {/* ── Sub-section: מצב חיפוש עבודה ── */}
          <button
            type="button"
            onClick={() => toggleSection("work-location")}
            className="w-full flex items-center gap-2 px-5 py-4 text-right"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
              <MapPin className="h-3 w-3" style={{ color: "#4F583B" }} />
            </div>
            <span className="font-bold text-foreground text-sm">מצב חיפוש עבודה</span>
            <span
              className="flex-1 text-xs text-muted-foreground truncate text-right"
              style={{
                opacity: openSections["work-location"] ? 0 : 1,
                transition: "opacity 0.2s ease",
                pointerEvents: "none",
              }}
            >
              {locationMode === "radius"
                ? `לפי רדיוס · ${searchRadiusKm} ק"מ`
                : preferredCities.length === 0
                ? "לפי עיר"
                : `לפי עיר · ${(citiesQuery.data ?? []).filter((c) => preferredCities.includes(c.id)).map((c) => c.nameHe).join(", ")}`}
            </span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform duration-200"
              style={{ transform: openSections["work-location"] ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateRows: openSections["work-location"] ? "1fr" : "0fr",
              transition: "grid-template-rows 0.25s ease",
            }}
          >
          <div className="overflow-hidden">
          <div className="px-5 pb-5 border-t" style={{ borderColor: "oklch(0.94 0.02 100)" }}>
            <div className="grid grid-cols-2 gap-2 mt-4 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (locationMode !== "radius") {
                    setLocationMode("radius");
                    setPreferredCities([]);
                  }
                }}
                className={`relative flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  locationMode === "radius"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Crosshair className="h-4 w-4" />
                לפי רדיוס
              </button>
              <button
                type="button"
                onClick={() => {
                  if (locationMode !== "city") {
                    setLocationMode("city");
                    setSearchRadiusKm(10);
                  }
                }}
                className={`relative flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  locationMode === "city"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Building2 className="h-4 w-4" />
                לפי עיר
              </button>
            </div>
            {/* ── Radius content ── */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: locationMode === "radius" ? "1fr" : "0fr",
                transition: "grid-template-rows 0.25s ease",
              }}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground">רדיוס חיפוש מהמיקום שלי:</p>
                  <div className="flex gap-2">
                    {[2, 5, 10, 20, 50].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSearchRadiusKm(r)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                          searchRadiusKm === r
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {r} ק"מ
                      </button>
                    ))}
                  </div>
                  {/* Geolocation button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("הדפדפן שלך לא תומך באיתור מיקום");
                        return;
                      }
                      setGeoLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setWorkerLatitude(String(pos.coords.latitude));
                          setWorkerLongitude(String(pos.coords.longitude));
                          setGeoLoading(false);
                          toast.success("מיקום נשמר בהצלחה!");
                        },
                        () => {
                          setGeoLoading(false);
                          toast.error("לא ניתן לאתר את המיקום. אנא אפשר גישה למיקום בהגדרות הדפדפן.");
                        },
                        { timeout: 10000 }
                      );
                    }}
                    disabled={geoLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all disabled:opacity-60"
                    style={{
                      borderColor: workerLatitude ? "oklch(0.55 0.14 145)" : "oklch(0.88 0.03 122)",
                      background: workerLatitude ? "oklch(0.97 0.03 145)" : "oklch(0.98 0.01 122)",
                      color: workerLatitude ? "oklch(0.35 0.12 145)" : "#4F583B",
                    }}
                  >
                    {geoLoading ? (
                      <><BrandLoader size="sm" /> מאתר...’</>
                    ) : workerLatitude ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> מיקום נשמר — לחץ לעדכון</>
                    ) : (
                      <><Crosshair className="h-3.5 w-3.5" /> השתמש במיקום הנוכחי שלי</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── City content ── */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: locationMode === "city" ? "1fr" : "0fr",
                transition: "grid-template-rows 0.25s ease",
              }}
            >
              <div className="overflow-hidden">
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-2">בחר ערים מועדפות (עד 5):</p>
                  <CityPicker
                    selectedCityIds={preferredCities}
                    onChange={(ids) => {
                      if (ids.length > 5) {
                        toast.warning("ניתן לבחור עד 5 ערים בלבד");
                        return;
                      }
                      setPreferredCities(ids);
                    }}
                  />
                  {preferredCities.length >= 5 && (
                    <p className="text-xs mt-2 font-medium" style={{ color: "oklch(0.55 0.14 30)" }}>
                      ⚠️ הגעת למקסימום של 5 ערים
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
        {/* Save button for work tab */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <AppButton
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <BrandLoader size="sm" /> : <Save className="h-4 w-4" />}
              שמור
            </AppButton>
            {isDirty && !updateMutation.isPending && (
              <span
                className="absolute top-1.5 left-3 h-2.5 w-2.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.72 0.18 50)" }}
                title="יש שינויים שלא נשמרו"
              />
            )}
          </div>
          <button
            onClick={() => window.history.back()}
            disabled={updateMutation.isPending}
            type="button"
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "oklch(0.35 0.08 122)" }}
          >
            <ArrowRight className="h-4 w-4" />
            יציאה ללא שמירה
          </button>
        </div>
        </div>
        )}

        {/* ── TAB: זמינות ─────────────────────────────────────────────── */}
        {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 1px 4px rgba(79,88,59,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
              <Bell className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
            </div>
            <h2 className="font-bold text-foreground text-sm">זמינות לעבודה</h2>
          </div>

          {/* Preferred Schedule */}
          <div>
            <AppLabel>זמני עבודה מועדפים</AppLabel>
            <p className="text-xs text-muted-foreground mb-3">
              בחר את הימים ושעות שאתה מוכן לעבוד בהם
            </p>

            <p className="text-xs font-medium text-muted-foreground mb-2">ימי עבודה:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {DAYS.map((day) => {
                const isSelected = preferredDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setPreferredDays((prev) =>
                        prev.includes(day.value)
                          ? prev.filter((d) => d !== day.value)
                          : [...prev, day.value]
                      )
                    }
                    className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-muted-foreground mb-2">שעות עבודה:</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = preferredTimeSlots.includes(slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() =>
                      setPreferredTimeSlots((prev) =>
                        prev.includes(slot.value)
                          ? prev.filter((s) => s !== slot.value)
                          : [...prev, slot.value]
                      )
                    }
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    <span className="text-lg">{slot.icon}</span>
                    <div className="text-right">
                      <div className="font-bold text-sm">{slot.label}</div>
                      <div className="text-xs opacity-70">{slot.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Save button for schedule tab */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <AppButton
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <BrandLoader size="sm" /> : <Save className="h-4 w-4" />}
              שמור
            </AppButton>
            {isDirty && !updateMutation.isPending && (
              <span
                className="absolute top-1.5 left-3 h-2.5 w-2.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.72 0.18 50)" }}
                title="יש שינויים שלא נשמרו"
              />
            )}
          </div>
          <button
            onClick={() => window.history.back()}
            disabled={updateMutation.isPending}
            type="button"
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "oklch(0.35 0.08 122)" }}
          >
            <ArrowRight className="h-4 w-4" />
            יציאה ללא שמירה
          </button>
        </div>
        </div>
        )}

        {/* ── TAB: הגדרות ─────────────────────────────────────────────── */}
        {activeTab === "settings" && (
        <div className="space-y-4">
        {/* ── Notification Settings ─────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 1px 4px rgba(79,88,59,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
              <Bell className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">הגדרות התראות</h2>
              <p className="text-xs text-muted-foreground">בחר כיצד תרצה לקבל עדכונים</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NOTIF_OPTIONS.map((opt) => {
              const isActive = notifPref === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleNotifPrefChange(opt.value)}
                  disabled={updateNotifPrefsMutation.isPending}
                  className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-right transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    {opt.icon}
                    {opt.label}
                  </div>
                  <span className="text-xs opacity-70">{opt.description}</span>
                </button>
              );
            })}
          </div>
          {notifPref === "none" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
              ⚠️ לא תקבל שום עדכון על מועמדויות ומשרות חדשות
            </p>
          )}
          {notifPref === "push_only" && (
            <p className="text-xs text-muted-foreground mt-3">
              💡 ודא שהתראות דפדפן מופעלות בדף "מועמדויות שלי"
            </p>
          )}
        </div>
        {/* ── BirthDate Section ─────────────────────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 1px 4px rgba(79,88,59,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
              <Calendar className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">תאריך לידה</h2>
              <p className="text-xs text-muted-foreground">משמש לאימות גיל ולסינון משרות</p>
            </div>
          </div>

          {/* Current value */}
          {birthDateInfoQuery.data?.birthDate ? (
            <div className="flex items-center gap-2 mb-3 p-3 rounded-xl" style={{ background: "oklch(0.96 0.03 122)", border: "1px solid oklch(0.88 0.06 122)" }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#4F583B" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "#4F583B" }}>תאריך לידה מאומת</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(birthDateInfoQuery.data.birthDate).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })}
                  {birthDateInfoQuery.data.age != null && ` · גיל ${birthDateInfoQuery.data.age}`}
                </p>
              </div>
              {birthDateInfoQuery.data.lastChangedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Lock className="h-3 w-3" />
                  <span>עודכן {new Date(birthDateInfoQuery.data.lastChangedAt).toLocaleDateString("he-IL")}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 p-3 rounded-xl" style={{ background: "oklch(0.97 0.06 80 / 0.5)", border: "1px solid oklch(0.85 0.10 80)" }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "oklch(0.55 0.12 76.7)" }} />
              <p className="text-xs" style={{ color: "oklch(0.45 0.12 76.7)" }}>תאריך לידה לא הוגדר עדיין</p>
            </div>
          )}

          {/* Rate-limit warning */}
          {birthDateInfoQuery.data?.canChangeAfter && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200 mb-3">
              ⏳ ניתן לשנות תאריך לידה שוב החל מ-{new Date(birthDateInfoQuery.data.canChangeAfter).toLocaleDateString("he-IL")}
            </p>
          )}

          {/* Date input */}
          <div className="space-y-2">
            <AppLabel>תאריך לידה חדש</AppLabel>
            <input
              type="date"
              value={bdEditDate}
              placeholder="DD/MM/YYYY"
              onChange={(e) => setBdEditDate(normalizeDateInput(e.target.value))}
              max={new Date().toISOString().split("T")[0]}
              min="1920-01-01"
              disabled={!!birthDateInfoQuery.data?.canChangeAfter}
              className="w-full h-12 px-3 rounded-xl border text-base"
              style={{
                background: birthDateInfoQuery.data?.canChangeAfter ? "oklch(0.96 0.01 100)" : "white",
                borderColor: bdEditDate && !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) ? "oklch(0.55 0.2 25)" : "oklch(0.88 0.04 100)",
                color: "var(--foreground)",
                fontSize: "16px", // prevent iOS zoom
                direction: "ltr",
              }}
            />
            {bdEditDate && !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) && (
              <p className="text-xs text-red-500" dir="rtl">פורמט לא תקין. הזן בפורמט DD/MM/YYYY</p>
            )}
            {bdEditDate && /^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) && bdEditDate > new Date().toISOString().split("T")[0] && (
              <p className="text-xs text-red-500" dir="rtl">תאריך לידה לא יכול להיות בעתיד</p>
            )}
          </div>

          <AppButton
            variant="brand"
            size="lg"
            className="w-full mt-3"
            disabled={
              !bdEditDate ||
              !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) ||
              bdEditDate > new Date().toISOString().split("T")[0] ||
              !!birthDateInfoQuery.data?.canChangeAfter ||
              updateBirthDateMutation.isPending
            }
            onClick={() => setBdConfirmOpen(true)}
          >
            <Calendar className="h-4 w-4" />
            עדכן תאריך לידה
          </AppButton>
        </div>

        {/* ── BirthDate Confirmation Dialog ─────────────────────────────────── */}
        {bdConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setBdConfirmOpen(false); setBdDeclared(false); } }}
          >
            <div
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-4"
              style={{ background: "white", boxShadow: "0 -4px 32px rgba(0,0,0,0.15)", marginBottom: 0 }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: "oklch(0.88 0.02 100)" }} />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
                  <Calendar className="h-5 w-5" style={{ color: "#4F583B" }} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">שינוי תאריך לידה</h3>
                  <p className="text-xs text-muted-foreground">{bdEditDate ? new Date(bdEditDate + "T00:00:00").toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" }) : ""}</p>
                </div>
              </div>

              <p className="text-sm text-foreground leading-relaxed" dir="rtl">
                הנך מצהיר כי תאריך הלידה שהוזן נכון ומדויק.
              </p>
              <p className="text-xs text-muted-foreground" dir="rtl">
                המערכת משתמשת במידע זה לצורך הצגת עבודות והפעלת מגבלות גיל בהתאם לחוק.
                שינוי תאריך לידה מוגבל לפעם ב-30 יום.
              </p>

              {/* Declaration checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bdDeclared}
                  onChange={(e) => setBdDeclared(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
                />
                <span className="text-sm text-foreground" dir="rtl">אני מאשר/ת כי הפרטים נכונים</span>
              </label>

              <div className="flex gap-3">
                <AppButton
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => { setBdConfirmOpen(false); setBdDeclared(false); }}
                  disabled={updateBirthDateMutation.isPending}
                >
                  ביטול
                </AppButton>
                <AppButton
                  variant="brand"
                  size="lg"
                  className="flex-1"
                  disabled={!bdDeclared || updateBirthDateMutation.isPending}
                  onClick={() => {
                    if (!bdDeclared) return;
                    updateBirthDateMutation.mutate({ birthDate: bdEditDate, declarationConfirmed: true });
                  }}
                >
                  {updateBirthDateMutation.isPending ? <BrandLoader size="sm" /> : "אישור"}
                </AppButton>
              </div>
            </div>
          </div>
        )}

        {/* ── Account Deletion Section (Step 9) ────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: "#fff8f8", border: "1px solid #fecaca" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fee2e2" }}>
              <Trash2 className="h-3.5 w-3.5" style={{ color: "#dc2626" }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: "#dc2626" }}>מחיקת חשבון</h2>
              <p className="text-xs text-muted-foreground">פעולה בלתי הפיכה</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3" dir="rtl">
            מחיקת החשבון תמחק את כל הנתונים האישיים שלך בהתאם ל{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#4a5d23" }}>מדיניות הפרטיות</a>.
            {" "}הנתונים שנדרשים לפעילות הפלטפורמה (כמו דירוגים) עשויים להישמר בהתאם לדרישות החוק.
          </p>
          <a
            href="mailto:info@avodanow.co.il?subject=בקשה למחיקת חשבון"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition-all hover:opacity-80"
            style={{ color: "#dc2626", borderColor: "#fecaca", background: "white" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            בקשה למחיקת חשבון
          </a>
        </div>
        </div>
        )}

      </div>

      {/* ── Phone Change OTP Modal ──────────────────────────────────────────────────────────────── */}
      <PhoneChangeModal
        open={phoneChangeModalOpen}
        onClose={() => setPhoneChangeModalOpen(false)}
        onSuccess={(newPhoneVal) => {
          // Phone verified and updated — refresh profile and update original
          setOriginalPhoneVal(newPhoneVal);
          setPhoneVal(newPhoneVal);
          profileQuery.refetch();
          setPhoneChangeModalOpen(false);
          // Now save the rest of the profile (without phone payload)
          updateMutation.mutate({
            name: name.trim() || undefined,
            workerBio: workerBio.trim() || null,
            preferredCategories: selectedCategories,
            preferenceText: preferenceText.trim() || null,
            locationMode,
            preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
            searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
            workerLatitude: locationMode === "radius" ? workerLatitude : null,
            workerLongitude: locationMode === "radius" ? workerLongitude : null,
            preferredDays,
            preferredTimeSlots,
            preferredCities: locationMode === "city" ? preferredCities : [],
            email: !user?.email ? (email.trim() || null) : undefined,
          });
        }}
      />

      {/* ── Preview Modal ──────────────────────────────────────────────────────────────── */}
      <WorkerProfilePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        name={name || user?.name || ""}
        photo={profilePhoto}
        bio={workerBio}
        categories={selectedCategories}
        categoryLabels={PREFERENCE_CATEGORIES}
        preferredDays={preferredDays}
        preferredTimeSlots={preferredTimeSlots}
        dayLabels={DAYS}
        timeSlotLabels={TIME_SLOTS}
        locationMode={locationMode}
        preferredCities={preferredCities}
        cityNames={(citiesQuery.data ?? []).filter((c) => preferredCities.includes(c.id)).map((c) => c.nameHe)}
        searchRadiusKm={searchRadiusKm}
        phone={profileQuery.data?.phone}
        workerRating={profileQuery.data?.workerRating}
        completedJobsCount={profileQuery.data?.completedJobsCount ?? 0}
        availabilityStatus={profileQuery.data?.availabilityStatus ?? null}
      />
    </div>
  );
}

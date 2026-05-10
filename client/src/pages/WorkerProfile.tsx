import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { useLocation, useSearch } from "wouter";
import { AppButton } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppInput, AppTextarea, AppLabel } from "@/components/ui";
import { toast } from "sonner";
import {
  User, MapPin, Briefcase, Save, ArrowRight, ArrowLeft,
  Bell, MessageSquare, BellOff, Crosshair, Building2, FileText,
  CheckCircle2, Camera, X, AlertTriangle, TrendingUp, Calendar, Lock,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { CityPicker } from "@/components/CityPicker";
import { WorkerProfilePreviewModal } from "@/components/WorkerProfilePreviewModal";
import { Eye, Trash2 } from "lucide-react";
import { IsraeliPhoneInput, parseIsraeliPhone, combinePhone, isValidPhoneValue, type PhoneValue } from "@/components/IsraeliPhoneInput";
import { PhoneChangeModal } from "@/components/PhoneChangeModal";
import { useCategories } from "@/hooks/useCategories";
import { calcProfileScore } from "@/shared/profileScore";
import { normalizeDateInput } from "@shared/ageUtils";
import { SHIFT_PRESETS, type LegalConsentType } from "@shared/const";
import { LegalConsentLinks } from "@/components/ui/legalConsentText";

const DAYS = [
  { value: "sunday", label: "א׳" },
  { value: "monday", label: "ב׳" },
  { value: "tuesday", label: "ג׳" },
  { value: "wednesday", label: "ד׳" },
  { value: "thursday", label: "ה׳" },
  { value: "friday", label: "ש׳" },
  { value: "saturday", label: "שבת" },
];

// TIME_SLOTS replaced by SHIFT_PRESETS imported from @shared/const

type NotifPref = "both" | "push_only" | "sms_only" | "none";

const NOTIF_OPTIONS: { value: NotifPref; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "both", label: "הכל", description: "Push + SMS", icon: <Bell className="h-4 w-4" /> },
  { value: "push_only", label: "Push בלבד", description: "התראות דפדפן בלבד", icon: <Bell className="h-4 w-4" /> },
  { value: "sms_only", label: "SMS בלבד", description: "הודעות טקסט בלבד", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "none", label: "כבוי", description: "ללא הודעות", icon: <BellOff className="h-4 w-4" /> },
];

const PROFILE_DESIGN = {
  background: "#faf9f5",
  surface: "#faf9f5",
  surfaceLow: "#f4f4f0",
  surfaceContainer: "#efeeea",
  surfaceHigh: "#e9e8e4",
  surfaceBright: "#ffffff",
  text: "#1b1c1a",
  textMuted: "#46483d",
  primary: "#48522a",
  primaryDark: "#313b15",
  primaryFixed: "#dce8b3",
  secondaryFixed: "#ffdfa0",
  secondaryText: "#5c4300",
  error: "#ba1a1a",
  ghostBorder: "rgba(119, 120, 108, 0.2)",
};

const profileCardStyle: React.CSSProperties = {
  background: PROFILE_DESIGN.surfaceBright,
  border: `1px solid ${PROFILE_DESIGN.ghostBorder}`,
  borderRadius: "1.5rem",
  boxShadow: "none",
};

const profileIconStyle: React.CSSProperties = {
  background: PROFILE_DESIGN.primaryFixed,
  color: PROFILE_DESIGN.primaryDark,
};

export default function WorkerProfile() {
  const { isAuthenticated, user, refetch: refetchAuth } = useAuth();
  const authQuery = useAuthQuery();
  const [, navigate] = useLocation();

  useSEO({
    title: "הפרופיל שלי",
    description: "עדכן את פרופיל העובד שלך וקבל התראויות למשרות זמניות.",
    canonical: "/worker-profile",
    noIndex: true,
  });

  const { categories: dbCategories } = useCategories();
  const profileQuery = trpc.user.getProfile.useQuery(undefined, authQuery());
  const citiesQuery = trpc.user.getCities.useQuery(undefined, { staleTime: 60_000 });
  const notifPrefsQuery = trpc.user.getNotificationPrefs.useQuery(undefined, authQuery());
  const birthDateInfoQuery = trpc.user.getBirthDateInfo.useQuery(undefined, authQuery());
  const outdatedConsentsQuery = trpc.user.checkOutdatedConsents.useQuery(undefined, authQuery());

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
  const maxBirthDate = new Date().toISOString().split("T")[0];
  const birthDateFormatInvalid = bdEditDate !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(bdEditDate);
  const birthDateIsFuture = /^\d{4}-\d{2}-\d{2}$/.test(bdEditDate) && bdEditDate > maxBirthDate;
  const birthDateInputError = birthDateFormatInvalid
    ? "פורמט לא תקין. הזן בפורמט DD/MM/YYYY"
    : birthDateIsFuture
      ? "תאריך לידה לא יכול להיות בעתיד"
      : undefined;
  // saveBirthDate - used in the wizard gate (first-time entry, no rate limit)
  const saveBirthDateMutation = trpc.user.saveBirthDate.useMutation({
    onSuccess: () => {
      toast.success("תאריך לידה נשמר בהצלחה");
      utils.user.getBirthDateInfo.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  // updateBirthDate - used in edit mode (change existing, 30-day rate limit)
  const updateBirthDateMutation = trpc.user.updateBirthDate.useMutation({
    onSuccess: () => {
      toast.success("תאריך לידה עודכן בהצלחה");
      setBdConfirmOpen(false);
      setBdDeclared(false);
      setFieldErrors(p => ({ ...p, birthDate: undefined }));
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

  const recordConsentMutation = trpc.user.recordConsent.useMutation();

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
  const [preferredCityPlaceId, setPreferredCityPlaceId] = useState<string | null>(null);
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
  // שגיאות שדות חובה - מוצגות רק לאחר ניסיון שמירה
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; birthDate?: string }>({});
  // הסכמה לתקנון - נדרש כשחסרה רשומת consent
  const [consentChecked, setConsentChecked] = useState<Record<string, boolean>>({});

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

  const [showPreview, setShowPreview] = useState(false);
  // Collapsible sections - default collapsed


  // Populate from server - only initialise once to avoid overwriting user-entered values
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

      // Populate split phone fields from DB or parse from combined phone
      let pv: PhoneValue = { prefix: "", number: "" };
      if ((d as any).phonePrefix && (d as any).phoneNumber) {
        pv = { prefix: (d as any).phonePrefix, number: (d as any).phoneNumber };
      } else if (d.phone) {
        pv = parseIsraeliPhone(d.phone);
      }

      // Always prefer server data over blank defaults, but NEVER overwrite
      // values the user has already typed - regardless of whether this is the
      // first load or a subsequent refetch.
      // Rule: only apply a server value when (a) it is non-empty AND (b) the
      // current state is still the initial blank/default value.
      if (newName) setName(prev => prev || newName);
      if (d.phone) {
        setPhone(prev => prev || (d.phone ?? ""));
        setPhoneVal(prev => (prev.prefix || prev.number) ? prev : pv);
        setOriginalPhoneVal(prev => (prev.prefix || prev.number) ? prev : pv);
      }
      if (newBio) setWorkerBio(prev => prev || newBio);
      if (newCats.length) setSelectedCategories(prev => prev.length ? prev : newCats);
      if (newPrefText) setPreferenceText(prev => prev || newPrefText);
      setLocationMode(prev => prev || newLocMode);
      if (newCity) setPreferredCity(prev => prev || newCity);
      const newCityPlaceId = (d as any).preferredCityPlaceId ?? null;
      if (newCityPlaceId) setPreferredCityPlaceId(prev => prev ?? newCityPlaceId);
      setSearchRadiusKm(prev => prev !== 5 ? prev : newRadius);
      if (newDays.length) setPreferredDays(prev => prev.length ? prev : newDays);
      if (newSlots.length) setPreferredTimeSlots(prev => prev.length ? prev : newSlots);
      if (newCities.length) setPreferredCities(prev => prev.length ? prev : newCities);
      if (newLat) setWorkerLatitude(prev => prev ?? newLat);
      if (newLng) setWorkerLongitude(prev => prev ?? newLng);
      const photo = (d as { profilePhoto?: string | null }).profilePhoto;
      if (photo) setProfilePhoto(prev => prev ?? photo);

      // Initialise the dirty-state snapshot once (first time we have server data)
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
      <div className="max-w-lg mx-auto px-4 py-16 text-center" dir="rtl" style={{ background: PROFILE_DESIGN.background, color: PROFILE_DESIGN.text }}>
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">יש להתחבר כדי לצפות בפרופיל</p>
        <AppButton variant="brand" className="mt-4" onClick={() => navigate("/")}>
          חזרה לדף הבית
        </AppButton>
      </div>
    );
  }

  const isLoading = profileQuery.isLoading;
  const signupCompleted = profileQuery.data?.signupCompleted ?? false;

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  // ── Profile completion score - uses shared utility (single source of truth) ──
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

  // ── Profile save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // וולידציית שדות חובה
    const errors: { name?: string; phone?: string; birthDate?: string } = {};
    if (name.trim().length < 2) errors.name = "שם הוא שדה חובה";
    // טלפון חובה רק למשתמש שכבר השלים הרשמה
    if (signupCompleted && !isValidPhoneValue(phoneVal)) errors.phone = "מספר טלפון הוא שדה חובה";
    if (!birthDateInfoQuery.data?.birthDate) errors.birthDate = "תאריך לידה הוא שדה חובה";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("יש למלא את כל שדות החובה");
      setActiveTab("details");
      return;
    }
    setFieldErrors({});

    // אכיפת הסכמה לתקנון - אחיד לכל המצבים
    const consentTypes: LegalConsentType[] = !signupCompleted
      ? ["terms", "privacy"]
      : (outdatedConsentsQuery.data?.outdated ?? []) as LegalConsentType[];

    if (consentTypes.length > 0 && !consentTypes.every((t) => !!consentChecked[t])) {
      toast.error("יש לאשר את התקנון לפני שמירת הפרופיל");
      setActiveTab("settings");
      return;
    }

    if (locationMode === "radius" && !workerLatitude) {
      toast.error("חובה לשתף מיקום לפני שמירת הפרופיל");
      return;
    }

    // משתמש חדש - completeSignup (כולל רישום consent בשרת)
    if (!signupCompleted) {
      const hasFullPhoneVal = isValidPhoneValue(phoneVal);
      const combinedPhone = hasFullPhoneVal ? combinePhone(phoneVal) : (phone.trim() || undefined);
      try {
        await completeSignupMutation.mutateAsync({
          name: name.trim() || (user?.name ?? ""),
          termsAccepted: true,
          phone: !user?.phone ? combinedPhone : undefined,
          locationMode,
          preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
          preferredCityPlaceId: locationMode === "city" ? (preferredCityPlaceId || null) : null,
          searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
          preferredCategories: selectedCategories,
          preferenceText: preferenceText.trim() || null,
          workerBio: workerBio.trim() || null,
          preferredDays,
          preferredTimeSlots,
          preferredCities,
        });
        toast.success("ברוך הבא! הפרופיל נשמר בהצלחה 🎉");
        outdatedConsentsQuery.refetch();
      } catch {
        // error handled by mutation
      }
      return;
    }

    // משתמש קיים - רישום consent לסוגים outdated, ואז updateProfile
    const outdated = outdatedConsentsQuery.data?.outdated ?? [];
    const currentVersions = outdatedConsentsQuery.data?.currentVersions;
    if (outdated.length > 0) {
      try {
        await Promise.all(
          outdated.map((type) =>
            recordConsentMutation.mutateAsync({
              consentType: type as LegalConsentType,
              documentVersion: currentVersions?.[type as LegalConsentType],
            })
          )
        );
        outdatedConsentsQuery.refetch();
      } catch {
        toast.error("שגיאה בשמירת ההסכמה. אנא נסה שנית.");
        return;
      }
    }

    const hasFullPhone = isValidPhoneValue(phoneVal);
    const phoneChanged =
      hasFullPhone &&
      (phoneVal.prefix !== originalPhoneVal.prefix ||
        phoneVal.number !== originalPhoneVal.number);
    const userAlreadyHasPhone = !!(originalPhoneVal.prefix && originalPhoneVal.number);
    const isPhoneOtp = user?.loginMethod === "phone_otp";
    const isNewUserAddingPhone = !isPhoneOtp && !user?.phone && hasFullPhone;

    if ((phoneChanged && userAlreadyHasPhone) || isNewUserAddingPhone) {
      setPhoneChangeModalOpen(true);
      return;
    }

    updateMutation.mutate({
      name: name.trim() || undefined,
      workerBio: workerBio.trim() || null,
      preferredCategories: selectedCategories,
      preferenceText: preferenceText.trim() || null,
      locationMode,
      preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
      preferredCityPlaceId: locationMode === "city" ? (preferredCityPlaceId || null) : null,
      searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
      workerLatitude: locationMode === "radius" ? workerLatitude : null,
      workerLongitude: locationMode === "radius" ? workerLongitude : null,
      preferredDays,
      preferredTimeSlots,
      preferredCities: locationMode === "city" ? preferredCities : [],
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

  // ── Error state (transient server error - show retry instead of broken page) ──
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


  // ── EDIT MODE (existing worker) ──────────────────────────────────────────────
  const TABS = [
    { id: "details" as const, label: "פרטים", icon: User },
    { id: "work" as const, label: "עבודה", icon: Briefcase },
    { id: "schedule" as const, label: "זמינות", icon: Bell },
    { id: "settings" as const, label: "הגדרות", icon: BellOff },
  ];

  const TAB_ORDER = ["details", "work", "schedule", "settings"] as const;
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TAB_ORDER.length - 1;
  const goNext = () => setActiveTab(TAB_ORDER[currentTabIndex + 1]);
  const goPrev = () => setActiveTab(TAB_ORDER[currentTabIndex - 1]);

  const outdatedForEdit = outdatedConsentsQuery.data?.outdated ?? [];
  const consentTypes: LegalConsentType[] = !signupCompleted
    ? ["terms", "privacy"]
    : outdatedForEdit as LegalConsentType[];
  const needsConsent = consentTypes.length > 0;
  const allConsentChecked = consentTypes.every((t) => !!consentChecked[t]);

  const isSaving = completeSignupMutation.isPending || updateMutation.isPending;

  const navBlock = (
    <div className="flex flex-col gap-2 mt-2">
      {isLastTab && needsConsent && (
        <div className="rounded-2xl px-4 py-3" dir="rtl" style={{ background: PROFILE_DESIGN.surfaceContainer, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }}>
          <label className="flex items-start gap-3 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={allConsentChecked}
              onChange={(e) => {
                const next = e.target.checked;
                setConsentChecked((prev) => {
                  const updated = { ...prev };
                  consentTypes.forEach((t) => { updated[t] = next; });
                  return updated;
                });
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-olive"
            />
            <span><LegalConsentLinks types={consentTypes} /></span>
          </label>
        </div>
      )}
      {isLastTab && !needsConsent && (
        <p className="text-xs text-muted-foreground text-center" dir="rtl">
          שמירת הפרופיל מסכימה ל{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">תנאי השימוש</a>
          {" "}ול{" "}
          <a href="/user-content-policy" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">מדיניות תוכן</a>.
          {" "}המידע יהיה גלוי למעסיקים שיצורו קשר איתך.
        </p>
      )}
      <div className="flex gap-3">
        {!isFirstTab && (
          <AppButton variant="outline" size="lg" className="flex-1" onClick={goPrev}>
            <ArrowRight className="h-4 w-4" />
            הקודם
          </AppButton>
        )}
        {isLastTab ? (
          <div className="relative flex-1">
            <AppButton
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={
                isSaving ||
                (needsConsent && !allConsentChecked)
              }
            >
              {isSaving ? <BrandLoader size="sm" /> : <Save className="h-4 w-4" />}
              {!signupCompleted ? "התחל לעבוד 🚀" : "שמור"}
            </AppButton>
            {isDirty && !updateMutation.isPending && (
              <span
                className="absolute top-1.5 left-3 h-2.5 w-2.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.72 0.18 50)" }}
                title="יש שינויים שלא נשמרו"
              />
            )}
          </div>
        ) : (
          <AppButton variant="brand" size="lg" className="flex-1" onClick={goNext}>
            הבא
            <ArrowLeft className="h-4 w-4" />
          </AppButton>
        )}
      </div>
      {signupCompleted && (
        <button
          onClick={() => window.history.back()}
          disabled={isSaving}
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ color: PROFILE_DESIGN.primaryDark, fontFamily: "var(--font-rubik)" }}
        >
          <ArrowRight className="h-4 w-4" />
          יציאה ללא שמירה
        </button>
      )}
    </div>
  );

  const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
  const birthDateLoading = birthDateInfoQuery.isLoading;

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: PROFILE_DESIGN.background, color: PROFILE_DESIGN.text }}>
      {/* ── שער תאריך לידה - חוסם עד הזנה ─────────────────────────────────── */}
      {!birthDateLoading && !hasBirthDate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-4"
            style={{ background: "rgba(250, 249, 245, 0.94)", backdropFilter: "blur(20px)", boxShadow: "0 -8px 32px rgba(27, 28, 26, 0.08)", marginBottom: 0 }}
          >
            <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: PROFILE_DESIGN.surfaceHigh }} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={profileIconStyle}>
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>נדרש תאריך לידה</h3>
                <p className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>לפני שממשיכים במילוי הפרופיל</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed" dir="rtl" style={{ color: PROFILE_DESIGN.text }}>
              המערכת משתמשת בתאריך הלידה כדי להציג לך משרות מתאימות ולוודא עמידה בדרישות חוק עבודת נוער.
              לא ניתן להמשיך בלי הזנת תאריך לידה.
            </p>
            <AppInput
              id="birthDate"
              label="תאריך לידה"
              type="date"
              value={bdEditDate}
              placeholder="DD/MM/YYYY"
              onChange={(e) => setBdEditDate(normalizeDateInput(e.target.value))}
              max={maxBirthDate}
              min="1920-01-01"
              dir="ltr"
              error={birthDateInputError}
            />
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl" style={{ background: PROFILE_DESIGN.surfaceLow }}>
              <input
                type="checkbox"
                checked={bdDeclared}
                onChange={(e) => setBdDeclared(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
              />
              <span className="text-sm text-foreground" dir="rtl">אני מאשר/ת כי תאריך הלידה שהזנתי נכון ומדויק</span>
            </label>
            <AppButton
              variant="brand"
              size="lg"
              className="w-full"
              disabled={!bdEditDate || birthDateFormatInvalid || birthDateIsFuture || !bdDeclared || saveBirthDateMutation.isPending}
              onClick={() => saveBirthDateMutation.mutate({ birthDate: bdEditDate })}
            >
              {saveBirthDateMutation.isPending ? <BrandLoader size="sm" /> : <><Calendar className="h-4 w-4" /> אישור תאריך לידה והמשך</>}
            </AppButton>
          </div>
        </div>
      )}
      {/* ── Hero Header + Tabs ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${PROFILE_DESIGN.surfaceBright} 0%, ${PROFILE_DESIGN.surface} 100%)` }}>
        {/* Accent bar matching HomeWorker brand */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${PROFILE_DESIGN.primaryDark} 0%, ${PROFILE_DESIGN.primary} 58%, #8b6914 100%)` }} />

        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          {/* Back button + Preview button */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
              style={{ color: PROFILE_DESIGN.primaryDark, fontFamily: "var(--font-rubik)" }}
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{ background: PROFILE_DESIGN.surfaceContainer, color: PROFILE_DESIGN.primaryDark, border: `1px solid ${PROFILE_DESIGN.ghostBorder}`, fontFamily: "var(--font-rubik)" }}
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
                  style={{ border: `3px solid ${PROFILE_DESIGN.surfaceBright}`, boxShadow: "0 10px 24px rgba(27, 28, 26, 0.08)" }}
                />
              ) : (
                <label
                  htmlFor="photo-upload-hero"
                  className="w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all hover:opacity-80"
                  style={{ background: PROFILE_DESIGN.secondaryFixed, border: `1px solid ${PROFILE_DESIGN.ghostBorder}` }}
                >
                  <Camera className="h-5 w-5 mb-0.5" style={{ color: PROFILE_DESIGN.secondaryText }} />
                  <span className="text-xs font-medium" style={{ color: PROFILE_DESIGN.secondaryText, fontFamily: "var(--font-rubik)" }}>הוסף</span>
                </label>
              )}
              {profilePhoto && (
                <label
                  htmlFor="photo-upload-hero"
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{ background: PROFILE_DESIGN.primary }}
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
              <h1 className="text-2xl font-black leading-tight truncate" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-rubik)" }}>
                {name || user?.name || "פרופיל שלי"}
              </h1>
              {profileQuery.data?.phone && (
                <p className="text-sm mt-0.5" style={{ color: PROFILE_DESIGN.textMuted }}>
                  {profileQuery.data.phone}
                </p>
              )}
              {selectedCategories.length > 0 && (
                <p className="text-xs mt-0.5 truncate" style={{ color: PROFILE_DESIGN.textMuted }}>
                  {selectedCategories.slice(0, 2).map(v => PREFERENCE_CATEGORIES.find(c => c.value === v)?.label).filter(Boolean).join(" · ")}
                  {selectedCategories.length > 2 && ` +${selectedCategories.length - 2}`}
                </p>
              )}
              {/* Employer photo notice */}
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: PROFILE_DESIGN.secondaryText }}>
                📸 התמונה תוצג למעסיקים פוטנציאליים
              </p>
            </div>
          </div>

          {/* ── Tab Bar ──────────────────────────────────────────────── */}
          <div
            className="rounded-3xl p-1.5 flex gap-1"
            style={{ background: PROFILE_DESIGN.surfaceContainer, border: `1px solid ${PROFILE_DESIGN.ghostBorder}` }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-2xl text-xs font-semibold transition-all"
                  style={isActive
                    ? { background: PROFILE_DESIGN.primary, color: "#ffffff", boxShadow: "0 10px 24px rgba(27, 28, 26, 0.08)", fontFamily: "var(--font-rubik)" }
                    : { color: PROFILE_DESIGN.textMuted, fontFamily: "var(--font-rubik)" }
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
      <div className="max-w-lg mx-auto px-4 mt-6 pb-12">

        {/* ── Profile Completion Banner ──────────────────────────────────────────── */}
        {(() => {
          const score = completionScore();
          if (score >= 100) return null;
          // Each missing item knows which tab and optional section anchor to navigate to
          type MissingItem = { label: string; tab: "details" | "work" | "schedule" | "settings"; sectionId?: string; highlight?: boolean };
          const missingItems: MissingItem[] = ([
            !name.trim() && { label: "שם מלא", tab: "details" as const },
            !profilePhoto && { label: "תמונת פרופיל", tab: "details" as const },
            selectedCategories.length === 0 && { label: "קטגוריות עבודה", tab: "work" as const },
            !preferredCity && preferredCities.length === 0 && { label: "אזור מועדף", tab: "work" as const },
            !workerBio.trim() && { label: "ביו קצר", tab: "details" as const },
            !birthDateInfoQuery.data?.birthDate && { label: "תאריך לידה", tab: "details" as const, sectionId: "birthdate-section", highlight: true },
          ] as (MissingItem | false)[]).filter(Boolean) as MissingItem[];
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl p-4"
              style={{
                background: score >= 70
                  ? PROFILE_DESIGN.primaryFixed
                  : PROFILE_DESIGN.secondaryFixed,
                border: `1px solid ${PROFILE_DESIGN.ghostBorder}`,
                boxShadow: "none",
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
                <span className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>
                  {score >= 70 ? "כמעט שם!" : "השלם להגדיל חשיפות"}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full mb-3" style={{ background: "rgba(255, 255, 255, 0.55)" }}>
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
                  <span className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>חסר:</span>
                  {missingItems.map(({ label, tab, sectionId, highlight }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab);
                        if (sectionId) {
                          setTimeout(() => {
                            document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 120);
                        }
                      }}
                      className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background: highlight ? PROFILE_DESIGN.secondaryFixed : score >= 70 ? PROFILE_DESIGN.surfaceBright : PROFILE_DESIGN.surfaceLow,
                        color: highlight ? PROFILE_DESIGN.secondaryText : PROFILE_DESIGN.primaryDark,
                        boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}`,
                      }}
                    >
                      {highlight ? `👁 ${label}` : label}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })()}{/* ── TAB: פרטים ─────────────────────────────────────────────── */}
        {activeTab === "details" && (
        <div className="space-y-4">
        {/* ── Basic info card ─────────────────────────────────────────────── */}
        <div className="p-6" style={profileCardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={profileIconStyle}>
              <User className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>פרטים אישיים</h2>
          </div>
          <div className="space-y-3">
            <AppInput
              label="שם"
              required
              value={name}
              onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: undefined })); }}
              placeholder="השם שלך"
              dir="rtl"
              icon={<User className="h-4 w-4" />}
              error={fieldErrors.name}
            />
            <div>
              {/* Phone field: read-only for OTP users, editable split input for OAuth users */}
              {user?.loginMethod === "phone_otp" ? (
                <>
                  <AppLabel required>טלפון</AppLabel>
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
                  onChange={(v) => { setPhoneVal(v); if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: undefined })); }}
                  disabled={!!user?.phone}
                  readOnly={!!user?.phone}
                  label="מספר טלפון"
                  required
                  error={fieldErrors.phone}
                />
              )}
            </div>
            <div>
              <AppInput
                id="email"
                label="כתובת מייל"
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
                placeholder="ספר קצת על עצמך - ניסיון, כישורים, זמינות..."
                dir="rtl"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left">{workerBio.length}/500</p>
            </div>
          </div>
        </div>
        {/* ── BirthDate Section ─────────────────────────────────────────── */}
        <div
          id="birthdate-section"
          className="p-6"
          style={{
            ...profileCardStyle,
            borderColor: fieldErrors.birthDate ? "rgba(186, 26, 26, 0.35)" : PROFILE_DESIGN.ghostBorder,
            boxShadow: fieldErrors.birthDate ? "0 0 0 3px rgba(186, 26, 26, 0.08)" : "none",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={profileIconStyle}>
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>תאריך לידה <span style={{ color: PROFILE_DESIGN.error }}>*</span></h2>
              <p className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>משמש לאימות גיל ולסינון משרות - משפיע על חשיפות אצל מעסיקים</p>
            </div>
          </div>

          {fieldErrors.birthDate && (
            <p style={{ fontSize: 12, color: PROFILE_DESIGN.error, marginBottom: 8, textAlign: "right" }} role="alert">{fieldErrors.birthDate}</p>
          )}
          {/* Current value */}
          {birthDateInfoQuery.data?.birthDate ? (
            <div className="flex items-center gap-2 mb-3 p-3 rounded-2xl" style={{ background: PROFILE_DESIGN.surfaceLow }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: PROFILE_DESIGN.primary }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: PROFILE_DESIGN.primaryDark }}>תאריך לידה מאומת</p>
                <p className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>
                  {new Date(birthDateInfoQuery.data.birthDate).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })}
                  {birthDateInfoQuery.data.age != null && ` · גיל ${birthDateInfoQuery.data.age}`}
                </p>
              </div>
              {birthDateInfoQuery.data.lastChangedAt && (
                <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: PROFILE_DESIGN.textMuted }}>
                  <Lock className="h-3 w-3" />
                  <span>עודכן {new Date(birthDateInfoQuery.data.lastChangedAt).toLocaleDateString("he-IL")}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-2xl" style={{ background: PROFILE_DESIGN.secondaryFixed }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: PROFILE_DESIGN.secondaryText }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: PROFILE_DESIGN.secondaryText }}>תאריך לידה לא הוגדר</p>
                <p className="text-xs mt-0.5" style={{ color: PROFILE_DESIGN.secondaryText }}>מעסיקים שהגדירו גיל מינימלי לא יוכלו לראות אותך ברשימת העובדים הזמינים. הוסף כדי להיות גלוי ליותר מעסיקים.</p>
              </div>
            </div>
          )}

          {/* Rate-limit warning */}
          {birthDateInfoQuery.data?.canChangeAfter && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200 mb-3">
              ⏳ ניתן לשנות תאריך לידה שוב החל מ-{new Date(birthDateInfoQuery.data.canChangeAfter).toLocaleDateString("he-IL")}
            </p>
          )}

          {/* שדה תאריך - מוסתר כשיש חסימת rate-limit */}
          {!birthDateInfoQuery.data?.canChangeAfter && (
            <>
              <AppInput
                id="birthDateUpdate"
                label="תאריך לידה "
                type="date"
                value={bdEditDate}
                placeholder="DD/MM/YYYY"
                onChange={(e) => setBdEditDate(normalizeDateInput(e.target.value))}
                max={maxBirthDate}
                min="1920-01-01"
                dir="ltr"
                error={birthDateInputError}
              />

              <AppButton
                variant="brand"
                size="lg"
                className="w-full mt-3"
                disabled={
                  !bdEditDate ||
                  birthDateFormatInvalid ||
                  birthDateIsFuture ||
                  updateBirthDateMutation.isPending
                }
                onClick={() => setBdConfirmOpen(true)}
              >
                <Calendar className="h-4 w-4" />
                עדכן תאריך לידה
              </AppButton>
            </>
          )}
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
              style={{ background: "rgba(250, 249, 245, 0.94)", backdropFilter: "blur(20px)", boxShadow: "0 -8px 32px rgba(27, 28, 26, 0.08)", marginBottom: 0 }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto sm:hidden" style={{ background: PROFILE_DESIGN.surfaceHigh }} />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={profileIconStyle}>
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>שינוי תאריך לידה</h3>
                  <p className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>{bdEditDate ? new Date(bdEditDate + "T00:00:00").toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" }) : ""}</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed" dir="rtl" style={{ color: PROFILE_DESIGN.text }}>
                הנך מצהיר כי תאריך הלידה שהוזן נכון ומדויק.
              </p>

              <p className="text-xs" dir="rtl" style={{ color: PROFILE_DESIGN.textMuted }}>
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

        {navBlock}
        </div>
        )}

        {/* ── TAB: עבודה ─────────────────────────────────────────────── */}
        {activeTab === "work" && (
        <div className="space-y-4">
        <div className="p-6 space-y-5" style={profileCardStyle}>

          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={profileIconStyle}>
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>עבודה ואזור</h2>
          </div>

          {/* ── תחומי עיסוק מועדפים ── */}
          <div className="space-y-4">
            {/* Preference text */}
            <div>
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
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={isSelected
                        ? { background: PROFILE_DESIGN.primary, color: "#ffffff" }
                        : { background: PROFILE_DESIGN.surfaceBright, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                      }
                    >
                      {cat.icon} {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: PROFILE_DESIGN.ghostBorder }} />

          {/* ── מצב חיפוש עבודה ── */}
          <div>
            <AppLabel style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin className="h-3.5 w-3.5" style={{ color: "var(--muted-foreground)" }} />מצב חיפוש עבודה</AppLabel>
            <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (locationMode !== "radius") {
                    setLocationMode("radius");
                    setPreferredCities([]);
                  }
                }}
                className="relative flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all"
                style={locationMode === "radius"
                  ? { background: PROFILE_DESIGN.primary, color: "#ffffff" }
                  : { background: PROFILE_DESIGN.surfaceBright, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                }
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
                className="relative flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all"
                style={locationMode === "city"
                  ? { background: PROFILE_DESIGN.primary, color: "#ffffff" }
                  : { background: PROFILE_DESIGN.surfaceBright, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                }
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
                        className="flex-1 py-2 rounded-full text-xs font-bold transition-all"
                        style={searchRadiusKm === r
                          ? { background: PROFILE_DESIGN.primary, color: "#ffffff" }
                          : { background: PROFILE_DESIGN.surfaceBright, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                        }
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
                    style={{
                      background: workerLatitude ? PROFILE_DESIGN.primaryFixed : PROFILE_DESIGN.surfaceBright,
                      color: workerLatitude ? PROFILE_DESIGN.primaryDark : PROFILE_DESIGN.primary,
                      boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}`,
                    }}
                  >
                    {geoLoading ? (
                      <><BrandLoader size="sm" /> מאתר...’</>
                    ) : workerLatitude ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> מיקום נשמר - לחץ לעדכון</>
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
                    onCitySelect={(city) => {
                      // Save the first selected city's coordinates for future distance calculations
                      if (city.latitude && city.longitude) {
                        setWorkerLatitude(city.latitude);
                        setWorkerLongitude(city.longitude);
                      }
                      if (city.placeId) setPreferredCityPlaceId(city.placeId);
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
        {navBlock}
        </div>
        )}

        {/* ── TAB: זמינות ─────────────────────────────────────────────── */}
        {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="p-6" style={profileCardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={profileIconStyle}>
              <Bell className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>זמינות לעבודה</h2>
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
                    className="w-10 h-10 rounded-full text-sm font-bold transition-all"
                    style={isSelected
                      ? { background: PROFILE_DESIGN.primary, color: "#ffffff" }
                      : { background: PROFILE_DESIGN.surfaceLow, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-muted-foreground mb-2">שעות עבודה:</p>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_PRESETS.map((slot) => {
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
                    className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all"
                    style={isSelected
                      ? { background: PROFILE_DESIGN.primaryFixed, color: PROFILE_DESIGN.primaryDark }
                      : { background: PROFILE_DESIGN.surfaceLow, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                    }
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
        {navBlock}
        </div>
        )}

        {/* ── TAB: הגדרות ─────────────────────────────────────────────── */}
        {activeTab === "settings" && (
        <div className="space-y-4">
        {/* ── Notification Settings ─────────────────────────────────────────────── */}
        <div className="p-6" style={profileCardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={profileIconStyle}>
              <Bell className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.text, fontFamily: "var(--font-secular)" }}>הגדרות התראות</h2>
              <p className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>בחר כיצד תרצה לקבל עדכונים</p>
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
                  className="flex flex-col items-start gap-1 p-3 rounded-xl text-right transition-all"
                  style={isActive
                    ? { background: PROFILE_DESIGN.primaryFixed, color: PROFILE_DESIGN.primaryDark }
                    : { background: PROFILE_DESIGN.surfaceLow, color: PROFILE_DESIGN.textMuted, boxShadow: `inset 0 0 0 1px ${PROFILE_DESIGN.ghostBorder}` }
                  }
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
        {/* ── Account Deletion Section (Step 9) ────────────────────────── */}
        <div className="p-6" style={{ ...profileCardStyle, background: "#fff8f8", borderColor: "rgba(186, 26, 26, 0.18)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "#ffdad6" }}>
              <Trash2 className="h-3.5 w-3.5" style={{ color: PROFILE_DESIGN.error }} />
            </div>
            <div>
              <h2 className="font-semibold text-xl" style={{ color: PROFILE_DESIGN.error, fontFamily: "var(--font-secular)" }}>מחיקת חשבון</h2>
              <p className="text-xs" style={{ color: PROFILE_DESIGN.textMuted }}>פעולה בלתי הפיכה</p>
            </div>
          </div>
          <p className="text-xs mb-3" dir="rtl" style={{ color: PROFILE_DESIGN.textMuted }}>
            מחיקת החשבון תמחק את כל הנתונים האישיים שלך בהתאם ל{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: PROFILE_DESIGN.primary }}>מדיניות הפרטיות</a>.
            {" "}הנתונים שנדרשים לפעילות הפלטפורמה (כמו דירוגים) עשויים להישמר בהתאם לדרישות החוק.
          </p>
          <a
            href="mailto:info@avoda-go.co.il?subject=בקשה למחיקת חשבון"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition-all hover:opacity-80"
            style={{ color: PROFILE_DESIGN.error, borderColor: "rgba(186, 26, 26, 0.18)", background: PROFILE_DESIGN.surfaceBright, fontFamily: "var(--font-rubik)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            בקשה למחיקת חשבון
          </a>
        </div>
        {navBlock}
        </div>
        )}

      </div>

      {/* ── Phone Change OTP Modal ──────────────────────────────────────────────────────────────── */}
      <PhoneChangeModal
        open={phoneChangeModalOpen}
        onClose={() => setPhoneChangeModalOpen(false)}
        initialPhone={phoneVal}
        onSuccess={(newPhoneVal) => {
          // Phone verified and updated - refresh profile and update original
          setOriginalPhoneVal(newPhoneVal);
          setPhoneVal(newPhoneVal);
          profileQuery.refetch();
          refetchAuth();
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
        timeSlotLabels={SHIFT_PRESETS}
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

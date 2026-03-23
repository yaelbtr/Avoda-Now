import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AppButton } from "@/components/ui";
import { AppInput, AppTextarea, AppLabel } from "@/components/ui";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { ensureMapsLoaded } from "@/lib/mapsLoader";
import { toast } from "sonner";
import {
  User, MapPin, Save, ArrowRight, Bell, MessageSquare,
  BellOff, Crosshair, Building2, Camera, CheckCircle2, AlertTriangle,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { CityPicker } from "@/components/CityPicker";
import { IsraeliPhoneInput, parseIsraeliPhone, combinePhone, isValidPhoneValue, type PhoneValue } from "@/components/IsraeliPhoneInput";

// ── Constants ──────────────────────────────────────────────────────────────────
type NotifPref = "both" | "push_only" | "sms_only" | "none";
const NOTIF_OPTIONS: { value: NotifPref; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "both", label: "הכל", description: "Push + SMS", icon: <Bell className="h-4 w-4" /> },
  { value: "push_only", label: "Push בלבד", description: "התראות דפדפן בלבד", icon: <Bell className="h-4 w-4" /> },
  { value: "sms_only", label: "SMS בלבד", description: "הודעות טקסט בלבד", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "none", label: "ללא", description: "כבוי לחלוטין", icon: <BellOff className="h-4 w-4" /> },
];

const MIN_AGE_OPTIONS = [
  { value: null, label: "ללא הגבלה", description: "כל הגילאים (מעל 16)" },
  { value: 16, label: "מעל 16", description: "עובדים מגיל 16 ומעלה" },
  { value: 18, label: "מעל 18", description: "עובדים בוגרים בלבד" },
];

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];

// ── Section Card wrapper ───────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "white", border: "1px solid oklch(0.92 0.02 100)", boxShadow: "0 1px 4px rgba(79,88,59,0.06)" }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.04 122)" }}>
        <Icon className="h-3.5 w-3.5" style={{ color: "#4F583B" }} />
      </div>
      <div>
        <h2 className="font-bold text-foreground text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EmployerProfile() {
  useSEO({ title: "פרופיל מעסיק | AvodaNow" });
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<"details" | "location" | "settings">("details");

  // ── Details state ──
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [employerBio, setEmployerBio] = useState("");
  const [phoneVal, setPhoneVal] = useState<PhoneValue>({ prefix: "", number: "" });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // ── Location state ──
  // Worker search location (where employer wants to find workers)
  const [workerSearchMode, setWorkerSearchMode] = useState<"city" | "radius">("city");
  const [workerSearchCity, setWorkerSearchCity] = useState("");
  const [workerSearchCityId, setWorkerSearchCityId] = useState<number | null>(null);
  const [workerSearchRadiusKm, setWorkerSearchRadiusKm] = useState(10);
  const [workerSearchLatitude, setWorkerSearchLatitude] = useState<string | null>(null);
  const [workerSearchLongitude, setWorkerSearchLongitude] = useState<string | null>(null);
  // Default job location
  const [defaultJobCity, setDefaultJobCity] = useState("");
  const [defaultJobCityId, setDefaultJobCityId] = useState<number | null>(null);
  const [defaultJobLatitude, setDefaultJobLatitude] = useState<string | null>(null);
  const [defaultJobLongitude, setDefaultJobLongitude] = useState<string | null>(null);
  const [jobGeoLoading, setJobGeoLoading] = useState(false);
  const [workerGeoLoading, setWorkerGeoLoading] = useState(false);
  // ── Settings state ──
  const [notifPref, setNotifPref] = useState<NotifPref>("both");
  const [minWorkerAge, setMinWorkerAge] = useState<16 | 18 | null>(null);

  // ── tRPC queries ──
  const profileQuery = trpc.user.getEmployerProfile.useQuery(undefined, { staleTime: 30_000 });
  const notifPrefsQuery = trpc.user.getNotificationPrefs.useQuery(undefined, { staleTime: 30_000 });

  // ── tRPC mutations ──
  const updateMutation = trpc.user.updateEmployerProfile.useMutation({
    onSuccess: () => {
      toast.success("הפרופיל נשמר בהצלחה");
      profileQuery.refetch();
    },
    onError: (err: { message?: string }) => toast.error(err.message || "שגיאה בשמירת הפרופיל"),
  });
  const uploadPhotoMutation = trpc.user.uploadEmployerProfilePhoto.useMutation({
    onSuccess: ({ url }: { url: string }) => {
      setProfilePhoto(url);
      toast.success("התמונה הועלתה בהצלחה");
    },
    onError: () => toast.error("שגיאה בהעלאת התמונה"),
  });
  const updateNotifPrefsMutation = trpc.user.updateNotificationPrefs.useMutation({
    onSuccess: () => { toast.success("הגדרות ההתראות עודכנו"); notifPrefsQuery.refetch(); },
    onError: () => toast.error("שגיאה בעדכון הגדרות"),
  });

  // ── Populate from server ──
  useEffect(() => {
    const d = profileQuery.data;
    if (!d) return;
    setName(d.name ?? "");
    setEmail(d.email ?? "");
    setCompanyName(d.companyName ?? "");
    setEmployerBio(d.employerBio ?? "");
    setProfilePhoto(d.profilePhoto ?? null);
    if (d.phonePrefix && d.phoneNumber) {
      setPhoneVal({ prefix: d.phonePrefix, number: d.phoneNumber });
    } else if (d.phone) {
      setPhoneVal(parseIsraeliPhone(d.phone));
    }
    setWorkerSearchMode((d.workerSearchLocationMode as "city" | "radius") ?? "city");
    setWorkerSearchCity(d.workerSearchCity ?? "");
    setWorkerSearchCityId(d.workerSearchCityId ?? null);
    setWorkerSearchRadiusKm(d.workerSearchRadiusKm ?? 10);
    setWorkerSearchLatitude(d.workerSearchLatitude ?? null);
    setWorkerSearchLongitude(d.workerSearchLongitude ?? null);
    setDefaultJobCity(d.defaultJobCity ?? "");
    setDefaultJobCityId(d.defaultJobCityId ?? null);
    setDefaultJobLatitude(d.defaultJobLatitude ?? null);
    setDefaultJobLongitude(d.defaultJobLongitude ?? null);
    setMinWorkerAge((d.minWorkerAge as 16 | 18 | null) ?? null);
  }, [profileQuery.data]);

  useEffect(() => {
    if (notifPrefsQuery.data?.prefs) {
      setNotifPref((notifPrefsQuery.data.prefs as NotifPref) ?? "both");
    }
  }, [notifPrefsQuery.data]);

  // ── Dirty detection ──
  const isDirty = useMemo(() => {
    const d = profileQuery.data;
    if (!d) return false;
    const combined = combinePhone(phoneVal);
    return (
      name !== (d.name ?? "") ||
      email !== (d.email ?? "") ||
      companyName !== (d.companyName ?? "") ||
      employerBio !== (d.employerBio ?? "") ||
      (combined !== d.phone && combined !== "") ||
      workerSearchMode !== (d.workerSearchLocationMode ?? "city") ||
      workerSearchCity !== (d.workerSearchCity ?? "") ||
      workerSearchCityId !== (d.workerSearchCityId ?? null) ||
      workerSearchRadiusKm !== (d.workerSearchRadiusKm ?? 10) ||
      defaultJobCity !== (d.defaultJobCity ?? "") ||
      defaultJobCityId !== (d.defaultJobCityId ?? null) ||
      minWorkerAge !== ((d.minWorkerAge as 16 | 18 | null) ?? null)
    );
  }, [name, email, companyName, employerBio, phoneVal, workerSearchMode, workerSearchCity, workerSearchCityId, workerSearchRadiusKm, defaultJobCity, defaultJobCityId, minWorkerAge, profileQuery.data]);

  // ── Save handler ──
  const handleSave = useCallback(() => {
    if (!name.trim()) { toast.error("שם הוא שדה חובה"); return; }
    const combined = combinePhone(phoneVal);
    const isPhoneEditable = user?.loginMethod !== "phone_otp";
    updateMutation.mutate({
      name: name.trim(),
      email: email.trim() || null,
      companyName: companyName.trim() || null,
      employerBio: employerBio.trim() || null,
      ...(isPhoneEditable && isValidPhoneValue(phoneVal) ? {
        phonePrefix: phoneVal.prefix,
        phoneNumber: phoneVal.number,
        phone: combined,
      } : {}),
      workerSearchLocationMode: workerSearchMode,
      workerSearchCity: workerSearchMode === "city" ? (workerSearchCity.trim() || null) : null,
      workerSearchCityId: workerSearchMode === "city" ? workerSearchCityId : null,
      workerSearchRadiusKm: workerSearchMode === "radius" ? workerSearchRadiusKm : null,
      // Always persist coordinates regardless of mode — city selection also sets these
      workerSearchLatitude: workerSearchLatitude,
      workerSearchLongitude: workerSearchLongitude,
      defaultJobCity: defaultJobCity.trim() || null,
      defaultJobCityId: defaultJobCityId,
      defaultJobLatitude: defaultJobLatitude,
      defaultJobLongitude: defaultJobLongitude,
      minWorkerAge: minWorkerAge,
    });
  }, [name, email, companyName, employerBio, phoneVal, workerSearchMode, workerSearchCity, workerSearchCityId, workerSearchRadiusKm, workerSearchLatitude, workerSearchLongitude, defaultJobCity, defaultJobCityId, defaultJobLatitude, defaultJobLongitude, minWorkerAge, user, updateMutation]);

  // ── Photo upload ──
  const handlePhotoUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("התמונה גדולה מדי. מקסימום 5MB."); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      await uploadPhotoMutation.mutateAsync({ base64, mimeType });
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  }, [uploadPhotoMutation]);

  const handleNotifPrefChange = useCallback((val: NotifPref) => {
    setNotifPref(val);
    updateNotifPrefsMutation.mutate({ prefs: val });
  }, [updateNotifPrefsMutation]);

  // ── Tabs config ──
  const TABS = [
    { id: "details" as const, label: "פרטים", icon: User },
    { id: "location" as const, label: "מיקום", icon: MapPin },
    { id: "settings" as const, label: "הגדרות", icon: Bell },
  ];

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--page-bg)" }}>
        <BrandLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: "var(--page-bg)" }}>
      {/* ── Hero Header + Tabs ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ backgroundColor: "var(--page-bg)", borderBottom: "1px solid oklch(0.92 0.02 100)" }}>
        {/* Accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4F583B 0%, oklch(0.68 0.14 80.8) 100%)" }} />
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          {/* Back button */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
              style={{ color: "#4F583B" }}
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
          </div>
          {/* Photo + name row */}
          <div className="flex items-center gap-4 mb-5">
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
                  htmlFor="employer-photo-upload"
                  className="w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all hover:opacity-80"
                  style={{ background: "oklch(0.93 0.04 88)", border: "2px dashed oklch(0.60 0.10 88)" }}
                >
                  <Camera className="h-5 w-5 mb-0.5" style={{ color: "oklch(0.50 0.12 88)" }} />
                  <span className="text-xs font-medium" style={{ color: "oklch(0.50 0.12 88)" }}>הוסף</span>
                </label>
              )}
              {profilePhoto && (
                <label
                  htmlFor="employer-photo-upload"
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-110"
                  style={{ background: "oklch(0.50 0.14 85)" }}
                  title="שנה תמונה"
                >
                  <Camera className="h-3 w-3 text-white" />
                </label>
              )}
              <input
                id="employer-photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
              />
              {photoUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <BrandLoader size="sm" />
                </div>
              )}
            </div>
            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black leading-tight truncate" style={{ color: "#4F583B", fontFamily: "'Heebo', sans-serif" }}>
                {name || user?.name || "פרופיל מעסיק"}
              </h1>
              {companyName && (
                <p className="text-sm mt-0.5 flex items-center gap-1" style={{ color: "oklch(0.45 0.06 122)" }}>
                  <Building2 className="h-3.5 w-3.5" />
                  {companyName}
                </p>
              )}
              {profileQuery.data?.phone && (
                <p className="text-sm mt-0.5" style={{ color: "oklch(0.45 0.06 122)" }}>
                  {profileQuery.data.phone}
                </p>
              )}
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "oklch(0.68 0.14 80.8)" }}>
                📸 התמונה תוצג לעובדים פוטנציאליים
              </p>
            </div>
          </div>
          {/* Tab Bar */}
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

      {/* ── Tab Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <AnimatePresence mode="wait">
          {/* ── TAB: פרטים ─────────────────────────────────────────────────────── */}
          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <SectionCard>
                <SectionHeader icon={User} title="פרטים אישיים" />
                <div className="space-y-3">
                  <AppInput
                    label="שם מלא"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="השם שלך"
                    dir="rtl"
                    icon={<User className="h-4 w-4" />}
                  />
                  {/* Phone */}
                  {user?.loginMethod === "phone_otp" ? (
                    <div>
                      <AppLabel>טלפון</AppLabel>
                      <IsraeliPhoneInput
                        value={phoneVal.prefix ? phoneVal : parseIsraeliPhone(profileQuery.data?.phone)}
                        onChange={() => {}}
                        readOnly
                        showLabel={false}
                      />
                      <p className="text-xs text-muted-foreground mt-1">מספר הטלפון אינו ניתן לשינוי</p>
                    </div>
                  ) : (
                    <IsraeliPhoneInput
                      value={phoneVal}
                      onChange={setPhoneVal}
                      disabled={!!user?.phone}
                      readOnly={!!user?.phone}
                      label="מספר טלפון"
                    />
                  )}
                  {/* Email */}
                  <AppInput
                    label="כתובת מייל"
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={!!user?.email}
                    dir="ltr"
                  />
                </div>
              </SectionCard>

              {/* Company details */}
              <SectionCard>
                <SectionHeader icon={Building2} title="פרטי חברה" subtitle="אופציונלי — יוצג לעובדים" />
                <div className="space-y-3">
                  <AppInput
                    label="שם חברה"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="שם החברה שלך (אופציונלי)"
                    dir="rtl"
                    icon={<Building2 className="h-4 w-4" />}
                  />
                  <div>
                    <AppTextarea
                      label="אודות"
                      value={employerBio}
                      onChange={(e) => setEmployerBio(e.target.value)}
                      placeholder="ספר קצת על העסק שלך — תחום, גודל, אווירה..."
                      dir="rtl"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-left">{employerBio.length}/500</p>
                  </div>
                </div>
              </SectionCard>

              {/* Legal notice */}
              <p className="text-xs text-muted-foreground text-center mt-2" dir="rtl">
                שמירת הפרופיל מסכימה ל{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">תנאי השימוש</a>
                {" "}ול{" "}
                <a href="/user-content-policy" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">מדיניות תוכן</a>.
              </p>

              {/* Save button */}
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
            </motion.div>
          )}

          {/* ── TAB: מיקום ─────────────────────────────────────────────────────── */}
          {activeTab === "location" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Worker search location */}
              <SectionCard>
                <SectionHeader
                  icon={Crosshair}
                  title="מיקום חיפוש עובדים"
                  subtitle="איפה תרצה למצוא עובדים?"
                />
                <p className="text-xs text-muted-foreground -mt-2 mb-3">בחר אחת מהאפשרויות</p>
                <div className="space-y-3">
                  {/* Option A: Radius */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setWorkerSearchMode("radius")}
                    onKeyDown={(e) => e.key === "Enter" && setWorkerSearchMode("radius")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      workerSearchMode === "radius"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Crosshair className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">עובדים לפי מרחק</p>
                        <p className="text-xs text-muted-foreground">חפש עובדים קרובים למיקומך</p>
                      </div>
                    </div>
                    {workerSearchMode === "radius" && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">בחר רדיוס:</p>
                        <div className="flex gap-2">
                          {RADIUS_OPTIONS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setWorkerSearchRadiusKm(r); }}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                workerSearchRadiusKm === r
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {r} ק"מ
                            </button>
                          ))}
                        </div>
                        {/* GPS button for worker search radius */}
                        <button
                          type="button"
                          disabled={workerGeoLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!navigator.geolocation) { toast.error("הדפדפן שלך אינו תומך באיתור מיקום"); return; }
                            setWorkerGeoLoading(true);
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setWorkerSearchLatitude(String(pos.coords.latitude));
                                setWorkerSearchLongitude(String(pos.coords.longitude));
                                setWorkerGeoLoading(false);
                                toast.success("מיקום נשמר בהצלחה");
                              },
                              (err) => {
                                setWorkerGeoLoading(false);
                                toast.error(`שגיאה באיתור מיקום: ${err.message}`);
                              },
                              { enableHighAccuracy: true, timeout: 10000 }
                            );
                          }}
                          className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border-2 transition-all border-primary/40 text-primary hover:bg-primary/10"
                        >
                          {workerGeoLoading
                            ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> מאתר מיקום...</>
                            : <><Crosshair className="h-3.5 w-3.5" /> {workerSearchLatitude ? "עדכן מיקום" : "בחר את המיקום שלי"}</>}
                        </button>
                        {workerSearchLatitude && (
                          <p className="text-xs text-green-600 mt-1 text-center">✓ מיקום נשמר</p>
                        )}
                        {!workerSearchLatitude && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 המיקום שלך ישמש לחישוב המרחק
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Option B: City */}
                  <div
                    className={`p-4 rounded-xl border-2 transition-all ${
                      workerSearchMode === "city"
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setWorkerSearchMode("city")}
                      onKeyDown={(e) => e.key === "Enter" && setWorkerSearchMode("city")}
                      className="flex items-center gap-3 mb-2 cursor-pointer"
                    >
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">עובדים בעיר מסוימת</p>
                        <p className="text-xs text-muted-foreground">בחר עיר לחיפוש עובדים</p>
                      </div>
                    </div>
                    {workerSearchMode === "city" && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <CityPicker
                          selectedCityIds={workerSearchCityId ? [workerSearchCityId] : []}
                          onChange={(ids) => {
                            const id = ids[0] ?? null;
                            setWorkerSearchCityId(id);
                            // Clear coordinates when city is deselected
                            if (!id) {
                              setWorkerSearchLatitude(null);
                              setWorkerSearchLongitude(null);
                            }
                          }}
                          onCitySelect={(city) => {
                            // Save city coordinates for distance calculations
                            setWorkerSearchLatitude(city.latitude);
                            setWorkerSearchLongitude(city.longitude);
                          }}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Default job location */}
              <SectionCard>
                <SectionHeader
                  icon={MapPin}
                  title="מיקום ברירת מחדל למשרה"
                  subtitle="ימולא אוטומטית בעת פרסום משרה"
                />
                <div className="space-y-3">
                  {/* GPS button */}
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={jobGeoLoading}
                    onClick={() => {
                      if (!navigator.geolocation) { toast.error("הדפדפן אינו תומך ב-GPS"); return; }
                      setJobGeoLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = pos.coords.latitude;
                          const lng = pos.coords.longitude;
                          try {
                            await ensureMapsLoaded();
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                              setJobGeoLoading(false);
                              if (status === "OK" && results?.[0]) {
                                setDefaultJobLatitude(String(lat));
                                setDefaultJobLongitude(String(lng));
                                setDefaultJobCity(results[0].formatted_address);
                                toast.success("מיקום נמצא!");
                              } else {
                                toast.error("לא ניתן לאתר כתובת למיקום זה");
                              }
                            });
                          } catch {
                            setJobGeoLoading(false);
                            toast.error("שגיאה בטעינת שירות המפות");
                          }
                        },
                        () => { setJobGeoLoading(false); toast.error("לא ניתן לאתר מיקום"); },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                    className="gap-2 w-full"
                  >
                    {jobGeoLoading
                      ? <><span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> מאתר מיקום...</>
                      : <><Crosshair className="h-4 w-4" /> השתמש במיקום שלי</>}
                  </AppButton>

                  {/* Places Autocomplete */}
                  <PlacesAutocomplete
                    value={defaultJobCity}
                    onChange={(val) => {
                      setDefaultJobCity(val);
                      // Clear coords if user manually clears the field
                      if (!val) {
                        setDefaultJobLatitude(null);
                        setDefaultJobLongitude(null);
                        setDefaultJobCityId(null);
                      }
                    }}
                    onPlaceSelect={({ lat, lng, formattedAddress }) => {
                      setDefaultJobLatitude(String(lat));
                      setDefaultJobLongitude(String(lng));
                      setDefaultJobCity(formattedAddress);
                    }}
                    placeholder="חפש כתובת..."
                  />
                </div>
              </SectionCard>

              {/* Save button */}
              <div className="relative">
                <AppButton
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <BrandLoader size="sm" /> : <Save className="h-4 w-4" />}
                  שמור הגדרות מיקום
                </AppButton>
                {isDirty && !updateMutation.isPending && (
                  <span
                    className="absolute top-1.5 left-3 h-2.5 w-2.5 rounded-full animate-pulse"
                    style={{ background: "oklch(0.72 0.18 50)" }}
                    title="יש שינויים שלא נשמרו"
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* ── TAB: הגדרות ────────────────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Min worker age */}
              <SectionCard>
                <SectionHeader
                  icon={User}
                  title="גיל מינימלי לעובדים"
                  subtitle="סנן עובדים לפי גיל"
                />
                <div className="space-y-2">
                  {MIN_AGE_OPTIONS.map((opt) => {
                    const isActive = minWorkerAge === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setMinWorkerAge(opt.value as 16 | 18 | null)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-right transition-all ${
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className={`font-semibold text-sm ${isActive ? "text-primary" : "text-foreground"}`}>
                            {opt.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{opt.description}</span>
                        </div>
                        {isActive && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#4F583B" }} />}
                      </button>
                    );
                  })}
                </div>
                {minWorkerAge === 18 && (
                  <div className="mt-3 p-2.5 rounded-xl flex items-start gap-2" style={{ background: "oklch(0.97 0.06 80 / 0.5)", border: "1px solid oklch(0.85 0.10 80)" }}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "oklch(0.55 0.12 76.7)" }} />
                    <p className="text-xs" style={{ color: "oklch(0.45 0.12 76.7)" }}>
                      עובדים מתחת לגיל 18 לא יוצגו לך בתוצאות החיפוש
                    </p>
                  </div>
                )}
                <div className="mt-4">
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
                </div>
              </SectionCard>

              {/* Notification preferences */}
              <SectionCard>
                <SectionHeader
                  icon={Bell}
                  title="הגדרות התראות"
                  subtitle="בחר כיצד תרצה לקבל עדכונים"
                />
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
              </SectionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

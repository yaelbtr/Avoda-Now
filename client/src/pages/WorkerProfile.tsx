import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AppButton } from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, MapPin, Briefcase, Save, ArrowRight, ArrowLeft,
  Bell, MessageSquare, BellOff, Crosshair, Building2, FileText,
  CheckCircle2, Camera,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

// Spec-required preference categories for worker profile matching
const PREFERENCE_CATEGORIES = [
  { value: "delivery", label: "שליחויות", icon: "🚴" },
  { value: "warehouse", label: "מחסן ולוגיסטיקה", icon: "📦" },
  { value: "cleaning", label: "ניקיון וסידור", icon: "🧹" },
  { value: "kitchen", label: "מסעדות ואירועים", icon: "🍳" },
  { value: "childcare", label: "טיפול בילדים", icon: "👶" },
  { value: "petcare", label: "טיפול בבעלי חיים", icon: "🐾" },
  { value: "homehelp", label: "עזרה בבית", icon: "🏠" },
  { value: "moving", label: "הובלות וסבלים", icon: "🚚" },
  { value: "maintenance", label: "תחזוקה ותיקונים", icon: "🔧" },
  { value: "office", label: "עבודה משרדית", icon: "💻" },
  { value: "sales", label: "מכירות ושירות", icon: "🛍️" },
  { value: "construction", label: "בנייה", icon: "🏗️" },
  { value: "security", label: "אבטחה", icon: "🛡️" },
  { value: "eldercare", label: "טיפול בקשישים", icon: "🧓" },
  { value: "agriculture", label: "חקלאות", icon: "🌾" },
  { value: "other", label: "אחר", icon: "💼" },
];

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
  { value: "morning", label: "בוקר", sub: "06:00–12:00", icon: "🌅" },
  { value: "afternoon", label: "צהריים", sub: "12:00–17:00", icon: "☀️" },
  { value: "evening", label: "ערב", sub: "17:00–22:00", icon: "🌆" },
  { value: "night", label: "לילה", sub: "22:00–06:00", icon: "🌙" },
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

  const profileQuery = trpc.user.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const notifPrefsQuery = trpc.user.getNotificationPrefs.useQuery(undefined, { enabled: isAuthenticated });

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("הפרופיל עודכן בהצלחה");
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

  // ── Shared state ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workerBio, setWorkerBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [preferenceText, setPreferenceText] = useState("");
  const [locationMode, setLocationMode] = useState<"city" | "radius">("city");
  const [preferredCity, setPreferredCity] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);
  const [notifPref, setNotifPref] = useState<NotifPref>("both");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const uploadPhotoMutation = trpc.user.uploadProfilePhoto.useMutation({
    onSuccess: (data) => { setProfilePhoto(data.url); toast.success("תמונת הפרופיל עודכנה!"); },
    onError: () => toast.error("שגיאה בהעלאת התמונה"),
  });

  // ── Wizard state ─────────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDone, setWizardDone] = useState(false);

  // Populate from server
  useEffect(() => {
    if (profileQuery.data) {
      const d = profileQuery.data;
      setName(d.name ?? "");
      setWorkerBio(d.workerBio ?? "");
      setSelectedCategories(d.preferredCategories ?? []);
      setPreferenceText(d.preferenceText ?? "");
      setLocationMode((d.locationMode as "city" | "radius") ?? "city");
      setPreferredCity(d.preferredCity ?? "");
      setSearchRadiusKm(d.searchRadiusKm ?? 5);
      setPreferredDays((d.preferredDays as string[]) ?? []);
      setPreferredTimeSlots((d.preferredTimeSlots as string[]) ?? []);
      setProfilePhoto((d as { profilePhoto?: string | null }).profilePhoto ?? null);
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

  // ── Wizard submit ────────────────────────────────────────────────────────────
  const handleWizardSubmit = async () => {
    try {
      await completeSignupMutation.mutateAsync({
        name: name.trim() || (user?.name ?? ""),
        locationMode,
        preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
        searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
        preferredCategories: selectedCategories,
        preferenceText: preferenceText.trim() || null,
        workerBio: workerBio.trim() || null,
        preferredDays,
        preferredTimeSlots,
      });
      setWizardDone(true);
    } catch {
      // error handled by mutation
    }
  };

  // ── Profile save ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    updateMutation.mutate({
      name: name.trim() || undefined,
      workerBio: workerBio.trim() || null,
      preferredCategories: selectedCategories,
      preferenceText: preferenceText.trim() || null,
      locationMode,
      preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
      searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
      preferredDays,
      preferredTimeSlots,
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
          ברוך הבא ל-AvodaNow! 🎉
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

    return (
      <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
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

                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">
                    שם מלא <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="text-right"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">
                    כתובת מייל
                    {user?.email && (
                      <span className="mr-2 text-xs text-green-600 font-normal">נילא מחשבון Google</span>
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={!!user?.email}
                    className={`text-right ${user?.email ? "bg-muted text-muted-foreground" : ""}`}
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">מספר טלפון</Label>
                  <Input
                    value={profileQuery.data?.phone ?? ""}
                    disabled
                    className="text-right bg-muted text-muted-foreground"
                    dir="ltr"
                  />
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> מאומת
                  </p>
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

                  {/* Option B: City */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setLocationMode("city")}
                    onKeyDown={(e) => e.key === "Enter" && setLocationMode("city")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      locationMode === "city"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">עבודות בעיר מסוימת</p>
                        <p className="text-xs text-muted-foreground">הגבל חיפוש לעיר ספציפית</p>
                      </div>
                    </div>
                    {locationMode === "city" && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={preferredCity}
                          onChange={(e) => setPreferredCity(e.target.value)}
                          placeholder="לדוגמה: תל אביב, חיפה, ירושלים..."
                          className="text-right"
                          autoFocus
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
                <Textarea
                  value={preferenceText}
                  onChange={(e) => setPreferenceText(e.target.value)}
                  placeholder='לדוגמה: "מחפש עבודה עם כלבים או שליחויות"'
                  className="text-right resize-none"
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
  return (
    <div className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">הפרופיל שלי</h1>
      </div>

      <div className="space-y-6">
        {/* ── Profile Photo ───────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            תמונת פרופיל
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            עובדים עם תמונה מקבלים פי 3 יותר פניות ממעסיקים — תמונה מקצועית בונה אמון ומגדילה את הסיכוי שיבחרו בך 📸
          </p>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {profilePhoto ? (
                <img src={profilePhoto} alt="תמונת פרופיל" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
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
            <div className="flex-1">
              <label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium">
                <Camera className="h-4 w-4" />
                {profilePhoto ? "החלף תמונה" : "העלה תמונה"}
              </label>
              <input
                id="photo-upload"
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
                    await uploadPhotoMutation.mutateAsync({ base64, mimeType });
                    setPhotoUploading(false);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, WEBP · עד 5MB</p>
            </div>
          </div>
        </div>

        {/* ── Basic info ─────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            פרטים אישיים
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">שם</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="השם שלך"
                className="text-right"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">טלפון</label>
              <Input
                value={profileQuery.data?.phone ?? ""}
                disabled
                className="text-right bg-muted text-muted-foreground"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">מספר הטלפון אינו ניתן לשינוי</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">אודות</label>
              <Textarea
                value={workerBio}
                onChange={(e) => setWorkerBio(e.target.value)}
                placeholder="ספר קצת על עצמך — ניסיון, כישורים, זמינות..."
                className="text-right resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left">{workerBio.length}/500</p>
            </div>
          </div>
        </div>

        {/* ── Matching Preferences ────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            העדפות התאמה
          </h2>

          {/* Preference text */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              תיאור חופשי
            </label>
            <Textarea
              value={preferenceText}
              onChange={(e) => setPreferenceText(e.target.value)}
              placeholder='לדוגמה: מחפש עבודה בשעות הבוקר, מוכן לנסוע עד 10 ק"מ, ניסיון בשמירה ובנייה...'
              className="text-right resize-none"
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1 text-left">{preferenceText.length}/1000</p>
          </div>

          {/* Categories */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              תחומי עיסוק מועדפים
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              בחר את הקטגוריות שאתה מוכן לעבוד בהן
            </p>
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
            {selectedCategories.length > 0 && (
              <p className="text-xs text-primary mt-3 font-medium">
                {selectedCategories.length} קטגוריות נבחרו
              </p>
            )}
          </div>

          {/* Location mode */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              מצב חיפוש עבודה
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setLocationMode("radius")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  locationMode === "radius"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Crosshair className="h-4 w-4" />
                לפי רדיוס
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("city")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  locationMode === "city"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Building2 className="h-4 w-4" />
                לפי עיר
              </button>
            </div>

            {locationMode === "radius" && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">רדיוס חיפוש מהמיקום שלי:</p>
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
              </div>
            )}

            {locationMode === "city" && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">עיר מועדפת:</p>
                <Input
                  value={preferredCity}
                  onChange={(e) => setPreferredCity(e.target.value)}
                  placeholder="לדוגמה: תל אביב, חיפה, ירושלים..."
                  className="text-right"
                />
              </div>
            )}
          </div>

          {/* Preferred Schedule */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              זמני עבודה מועדפים
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              בחר את הימים ושעות שאתה מעדיף לעבוד בהם
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

        {/* ── Save button ──────────────────────────────────────────────────── */}
        <AppButton
          variant="brand"
          size="xl"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full gap-2"
        >
          {updateMutation.isPending ? <BrandLoader size="sm" /> : <Save className="h-5 w-5" />}
          שמור פרופיל
        </AppButton>

        {/* ── Notification Settings ───────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            הגדרות התראות
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            בחר כיצד תרצה לקבל עדכונים על מועמדויות ומשרות
          </p>
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
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AppButton } from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import {
  User, MapPin, Briefcase, Save, ArrowRight,
  Bell, MessageSquare, BellOff, Crosshair, Building2, FileText,
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

type NotifPref = "both" | "push_only" | "sms_only" | "none";

const NOTIF_OPTIONS: { value: NotifPref; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "both", label: "הכל", description: "Push + SMS", icon: <Bell className="h-4 w-4" /> },
  { value: "push_only", label: "Push בלבד", description: "התראות דפדפן בלבד", icon: <Bell className="h-4 w-4" /> },
  { value: "sms_only", label: "SMS בלבד", description: "הודעות טקסט בלבד", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "none", label: "כבוי", description: "ללא הודעות", icon: <BellOff className="h-4 w-4" /> },
];

export default function WorkerProfile() {
  const { isAuthenticated } = useAuth();
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

  const updateNotifPrefsMutation = trpc.user.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      toast.success("הגדרות ההתראות עודכנו");
      notifPrefsQuery.refetch();
    },
    onError: () => toast.error("שגיאה בשמירת הגדרות ההתראות"),
  });

  // ── Basic info ──────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [workerBio, setWorkerBio] = useState("");

  // ── Matching preferences ────────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [preferenceText, setPreferenceText] = useState("");

  const [locationMode, setLocationMode] = useState<"city" | "radius">("city");
  const [preferredCity, setPreferredCity] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);

  // ── Schedule preferences ────────────────────────────────────────────────────
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifPref, setNotifPref] = useState<NotifPref>("both");

  // Populate form from server data
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
    }
  }, [profileQuery.data]);

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

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleSave = () => {
    updateMutation.mutate({
      name: name.trim() || undefined,
      workerBio: workerBio.trim() || null,
      // Matching preferences
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

  const isLoading = profileQuery.isLoading;

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

      {isLoading ? (
        <div className="flex justify-center py-16">
          <BrandLoader size="md" />
        </div>
      ) : (
        <div className="space-y-6">

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
                placeholder="לדוגמה: מחפש עבודה בשעות הבוקר, מוכן לנסוע עד 10 ק&quot;מ, ניסיון בשמירה ובנייה..."
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

            {/* ── Preferred Schedule ──────────────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                זמני עבודה מועדפים
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                בחר את הימים ושעות שאתה מעדיף לעבוד בהם
              </p>

              {/* Days */}
              <p className="text-xs font-medium text-muted-foreground mb-2">ימי עבודה:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: "sunday", label: "א׳" },
                  { value: "monday", label: "ב׳" },
                  { value: "tuesday", label: "ג׳" },
                  { value: "wednesday", label: "ד׳" },
                  { value: "thursday", label: "ה׳" },
                  { value: "friday", label: "ש׳" },
                  { value: "saturday", label: "שבת" },
                ].map((day) => {
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

              {/* Time slots */}
              <p className="text-xs font-medium text-muted-foreground mb-2">שעות עבודה:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "morning", label: "בוקר", sub: "06:00–12:00", icon: "🌅" },
                  { value: "afternoon", label: "צהריים", sub: "12:00–17:00", icon: "☀️" },
                  { value: "evening", label: "ערב", sub: "17:00–22:00", icon: "🌆" },
                  { value: "night", label: "לילה", sub: "22:00–06:00", icon: "🌙" },
                ].map((slot) => {
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
      )}
    </div>
  );
}

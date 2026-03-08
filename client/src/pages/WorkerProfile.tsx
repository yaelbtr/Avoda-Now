import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AppButton } from "@/components/AppButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES } from "@shared/categories";
import {
  User, MapPin, Briefcase, Save, ArrowRight,
  Bell, MessageSquare, BellOff, Crosshair, Building2, FileText, Plus, X,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

const ALL_CATEGORIES = [
  ...JOB_CATEGORIES,
  ...SPECIAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon })),
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
  const [workerTags, setWorkerTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [locationMode, setLocationMode] = useState<"city" | "radius">("city");
  const [preferredCity, setPreferredCity] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);

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
      setWorkerTags(d.workerTags ?? []);
      setLocationMode((d.locationMode as "city" | "radius") ?? "city");
      setPreferredCity(d.preferredCity ?? "");
      setSearchRadiusKm(d.searchRadiusKm ?? 5);
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
      workerTags,
      locationMode,
      preferredCity: locationMode === "city" ? (preferredCity.trim() || null) : null,
      searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
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

            {/* Custom tags */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                תחומי עיסוק חופשיים
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                הוסף תחומים שאינם ברשימה — לדוגמה: "מלגזן", "גינון", "מוסך"
              </p>
              {/* Tag chips */}
              {workerTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {workerTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setWorkerTags((prev) => prev.filter((t) => t !== tag))}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Tag input */}
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim().replace(/,$/, "");
                      if (newTag && !workerTags.includes(newTag) && workerTags.length < 20) {
                        setWorkerTags((prev) => [...prev, newTag]);
                      }
                      setTagInput("");
                    }
                  }}
                  placeholder="הקלד תחום ולחץ Enter..."
                  className="text-right flex-1"
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newTag = tagInput.trim();
                    if (newTag && !workerTags.includes(newTag) && workerTags.length < 20) {
                      setWorkerTags((prev) => [...prev, newTag]);
                    }
                    setTagInput("");
                  }}
                  className="px-3 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{workerTags.length}/20 תגיות</p>
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
                {ALL_CATEGORIES.map((cat) => {
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
          </div>

          {/* ── Save button ─────────────────────────────────────────────────── */}
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

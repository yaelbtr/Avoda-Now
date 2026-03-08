import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronRight,
  MapPin,
  Crosshair,
  Building2,
  CheckCircle2,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const C_BG = "#fefcf4";
const C_DARK = "oklch(0.28 0.06 122)";
const C_GREEN = "oklch(0.38 0.10 125)";
const C_LIGHT_GREEN = "oklch(0.92 0.05 122)";
const C_BORDER = "oklch(0.90 0.04 91.6)";

const CATEGORIES = [
  { value: "delivery", label: "שליחויות", emoji: "🛵" },
  { value: "warehouse", label: "מחסן ולוגיסטיקה", emoji: "📦" },
  { value: "cleaning", label: "ניקיון וסידור", emoji: "🧹" },
  { value: "events", label: "מסעדות ואירועים", emoji: "🍽️" },
  { value: "childcare", label: "טיפול בילדים", emoji: "👶" },
  { value: "eldercare", label: "טיפול בקשישים", emoji: "🧓" },
  { value: "agriculture", label: "עזרה בבית", emoji: "🏠" },
  { value: "construction", label: "הובלות וסבלים", emoji: "🚛" },
  { value: "security", label: "תחזוקה ותיקונים", emoji: "🔧" },
  { value: "retail", label: "עבודה משרדית", emoji: "💼" },
  { value: "kitchen", label: "מכירות ושירות", emoji: "🛍️" },
  { value: "other", label: "אחר", emoji: "✨" },
];

const RADIUS_OPTIONS = [
  { value: 2, label: "2 ק\"מ" },
  { value: 5, label: "5 ק\"מ" },
  { value: 10, label: "10 ק\"מ" },
  { value: 20, label: "20 ק\"מ" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkerPreferences() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading: profileLoading } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  // ─── Form state ──────────────────────────────────────────────────────────────
  const [preferenceText, setPreferenceText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"city" | "radius">("city");
  const [preferredCity, setPreferredCity] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saved, setSaved] = useState(false);

  // Populate from existing profile
  useEffect(() => {
    if (!profile) return;
    setPreferenceText(profile.preferenceText ?? "");
    setSelectedCategories((profile.preferredCategories as string[]) ?? []);
    setLocationMode((profile.locationMode as "city" | "radius") ?? "city");
    setPreferredCity(profile.preferredCity ?? "");
    setSearchRadiusKm(profile.searchRadiusKm ?? 5);
    if (profile.workerLatitude && profile.workerLongitude) {
      setGpsCoords({
        lat: parseFloat(profile.workerLatitude),
        lng: parseFloat(profile.workerLongitude),
      });
    }
  }, [profile]);

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const getGpsLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => setGpsLoading(false)
    );
  };

  const handleSave = () => {
    updateProfile.mutate({
      preferenceText: preferenceText || null,
      preferredCategories: selectedCategories,
      locationMode,
      preferredCity: locationMode === "city" ? preferredCity || null : null,
      workerLatitude: locationMode === "radius" && gpsCoords ? gpsCoords.lat.toString() : null,
      workerLongitude: locationMode === "radius" && gpsCoords ? gpsCoords.lng.toString() : null,
      searchRadiusKm: locationMode === "radius" ? searchRadiusKm : null,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C_BG }}>
        <p className="text-gray-500">יש להתחבר כדי לגשת להגדרות</p>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C_BG }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C_GREEN }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: C_BG }} dir="rtl">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: C_BG, borderBottom: `1px solid ${C_BORDER}` }}
      >
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: C_LIGHT_GREEN }}
        >
          <ChevronRight className="h-5 w-5" style={{ color: C_DARK }} />
        </button>
        <div>
          <h1 className="text-[17px] font-black" style={{ color: C_DARK }}>
            העדפות עבודה
          </h1>
          <p className="text-xs" style={{ color: "oklch(0.55 0.04 122)" }}>
            הגדר מה מתאים לך
          </p>
        </div>
        <div className="flex-1" />
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: C_LIGHT_GREEN, color: C_DARK }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              נשמר!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* ── Section 1: Preference Text ─────────────────────────────────────── */}
        <section
          className="rounded-2xl p-5"
          style={{ background: "white", border: `1px solid ${C_BORDER}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: C_LIGHT_GREEN }}
            >
              <Sparkles className="h-4 w-4" style={{ color: C_DARK }} />
            </div>
            <div>
              <h2 className="text-[15px] font-black" style={{ color: C_DARK }}>
                איזה סוג עבודות תרצה לעשות?
              </h2>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 122)" }}>
                תיאור חופשי — ישמש למנוע ה-AI
              </p>
            </div>
          </div>
          <textarea
            value={preferenceText}
            onChange={(e) => setPreferenceText(e.target.value)}
            placeholder='לדוגמה: "מחפש עבודה עם כלבים או שליחויות"'
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
            style={{
              background: C_BG,
              border: `1px solid ${C_BORDER}`,
              color: C_DARK,
            }}
          />
          <p className="text-xs mt-1.5" style={{ color: "oklch(0.65 0.03 100)" }}>
            {preferenceText.length}/1000
          </p>
        </section>

        {/* ── Section 2: Category Selection ──────────────────────────────────── */}
        <section
          className="rounded-2xl p-5"
          style={{ background: "white", border: `1px solid ${C_BORDER}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: C_LIGHT_GREEN }}
            >
              <Tag className="h-4 w-4" style={{ color: C_DARK }} />
            </div>
            <div>
              <h2 className="text-[15px] font-black" style={{ color: C_DARK }}>
                קטגוריות מועדפות
              </h2>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 122)" }}>
                ניתן לבחור מספר קטגוריות
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-right"
                  style={{
                    background: isSelected ? C_LIGHT_GREEN : C_BG,
                    border: `1.5px solid ${isSelected ? C_GREEN : C_BORDER}`,
                    color: isSelected ? C_DARK : "oklch(0.50 0.04 122)",
                  }}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="flex-1 text-right">{cat.label}</span>
                  {isSelected && (
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: C_GREEN }} />
                  )}
                </button>
              );
            })}
          </div>
          {selectedCategories.length > 0 && (
            <p className="text-xs mt-3 font-semibold" style={{ color: C_GREEN }}>
              {selectedCategories.length} קטגוריות נבחרו
            </p>
          )}
        </section>

        {/* ── Section 3: Location Preference ─────────────────────────────────── */}
        <section
          className="rounded-2xl p-5"
          style={{ background: "white", border: `1px solid ${C_BORDER}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: C_LIGHT_GREEN }}
            >
              <MapPin className="h-4 w-4" style={{ color: C_DARK }} />
            </div>
            <div>
              <h2 className="text-[15px] font-black" style={{ color: C_DARK }}>
                איך תרצה לקבל עבודות?
              </h2>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 122)" }}>
                בחר מצב אחד בלבד
              </p>
            </div>
          </div>

          {/* Radio options */}
          <div className="space-y-3">
            {/* Option 1: Radius */}
            <button
              onClick={() => setLocationMode("radius")}
              className="w-full flex items-center gap-3 p-4 rounded-xl transition-all text-right"
              style={{
                background: locationMode === "radius" ? C_LIGHT_GREEN : C_BG,
                border: `1.5px solid ${locationMode === "radius" ? C_GREEN : C_BORDER}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: locationMode === "radius" ? C_GREEN : "oklch(0.92 0.02 100)",
                }}
              >
                <Crosshair className="h-4 w-4" style={{ color: locationMode === "radius" ? "white" : "oklch(0.55 0.04 100)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black" style={{ color: C_DARK }}>
                  חיפוש לפי מרחק
                </p>
                <p className="text-xs" style={{ color: "oklch(0.55 0.04 122)" }}>
                  עבודות בקרבת מיקומך הנוכחי
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: locationMode === "radius" ? C_GREEN : C_BORDER,
                  background: locationMode === "radius" ? C_GREEN : "transparent",
                }}
              >
                {locationMode === "radius" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* Radius sub-fields */}
            <AnimatePresence>
              {locationMode === "radius" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pr-4 pl-2 pb-2 space-y-3">
                    {/* GPS button */}
                    <button
                      onClick={getGpsLocation}
                      disabled={gpsLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: gpsCoords ? C_LIGHT_GREEN : "oklch(0.96 0.02 91.6)",
                        border: `1px solid ${gpsCoords ? C_GREEN : C_BORDER}`,
                        color: gpsCoords ? C_DARK : "oklch(0.45 0.04 100)",
                      }}
                    >
                      {gpsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crosshair className="h-4 w-4" />
                      )}
                      {gpsCoords
                        ? `📍 מיקום נקלט (${gpsCoords.lat.toFixed(3)}, ${gpsCoords.lng.toFixed(3)})`
                        : "קלוט מיקום GPS"}
                    </button>

                    {/* Radius selector */}
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.55 0.04 122)" }}>
                        רדיוס חיפוש
                      </p>
                      <div className="flex gap-2">
                        {RADIUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSearchRadiusKm(opt.value)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{
                              background: searchRadiusKm === opt.value ? C_GREEN : C_BG,
                              border: `1.5px solid ${searchRadiusKm === opt.value ? C_GREEN : C_BORDER}`,
                              color: searchRadiusKm === opt.value ? "white" : "oklch(0.45 0.04 100)",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Option 2: City */}
            <button
              onClick={() => setLocationMode("city")}
              className="w-full flex items-center gap-3 p-4 rounded-xl transition-all text-right"
              style={{
                background: locationMode === "city" ? C_LIGHT_GREEN : C_BG,
                border: `1.5px solid ${locationMode === "city" ? C_GREEN : C_BORDER}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: locationMode === "city" ? C_GREEN : "oklch(0.92 0.02 100)",
                }}
              >
                <Building2 className="h-4 w-4" style={{ color: locationMode === "city" ? "white" : "oklch(0.55 0.04 100)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black" style={{ color: C_DARK }}>
                  חיפוש לפי עיר
                </p>
                <p className="text-xs" style={{ color: "oklch(0.55 0.04 122)" }}>
                  עבודות בעיר מסוימת
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: locationMode === "city" ? C_GREEN : C_BORDER,
                  background: locationMode === "city" ? C_GREEN : "transparent",
                }}
              >
                {locationMode === "city" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* City sub-field */}
            <AnimatePresence>
              {locationMode === "city" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pr-4 pl-2 pb-2">
                    <input
                      type="text"
                      value={preferredCity}
                      onChange={(e) => setPreferredCity(e.target.value)}
                      placeholder="שם העיר, לדוגמה: תל אביב"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: C_BG,
                        border: `1px solid ${C_BORDER}`,
                        color: C_DARK,
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* ── Sticky Save Button ─────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
        style={{ background: `linear-gradient(to top, ${C_BG} 80%, transparent)` }}
      >
        <motion.button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[15px]"
          style={{
            background: `linear-gradient(135deg, oklch(0.38 0.10 125) 0%, oklch(0.28 0.06 122) 100%)`,
            color: "white",
            boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.35)",
            display: "flex",
          }}
        >
          {updateProfile.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              שמור העדפות
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

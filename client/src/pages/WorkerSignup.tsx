/**
 * WorkerSignup — Fast 5-step worker onboarding flow.
 * Goal: complete required fields in under 30 seconds.
 *
 * Step 1: Name + Phone OTP (required)
 * Step 2: Location preference — radius or city (required)
 * Step 3: Category selection (required)
 * Step 4: Preference text (optional but recommended)
 * Step 5: Optional details (hourly rate, bio, availability)
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppButton } from "@/components/AppButton";
import CityAutocomplete from "@/components/CityAutocomplete";
import { toast } from "sonner";
import {
  MapPin, LocateFixed, ChevronRight, ChevronLeft,
  Check, Loader2, User, Phone, Briefcase, Heart,
  Clock, Star,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";

// ─── Categories for step 3 ────────────────────────────────────────────────────
const SIGNUP_CATEGORIES = [
  { value: "delivery",   label: "שליחויות",           icon: "🚴" },
  { value: "warehouse",  label: "מחסן ולוגיסטיקה",    icon: "📦" },
  { value: "cleaning",   label: "ניקיון וסידור",       icon: "🧹" },
  { value: "kitchen",    label: "מסעדות ואירועים",     icon: "🍳" },
  { value: "childcare",  label: "טיפול בילדים",        icon: "👶" },
  { value: "eldercare",  label: "טיפול בבעלי חיים",   icon: "🐾" },
  { value: "retail",     label: "עזרה בבית",           icon: "🏠" },
  { value: "construction", label: "הובלות וסבלים",    icon: "🚛" },
  { value: "security",   label: "תחזוקה ותיקונים",    icon: "🔧" },
  { value: "events",     label: "עבודה משרדית",        icon: "💼" },
  { value: "other",      label: "מכירות ושירות",       icon: "🛍️" },
  { value: "agriculture","label": "חקלאות",            icon: "🌾" },
] as const;

const RADIUS_OPTIONS = [
  { value: 2,  label: "2 ק\"מ" },
  { value: 5,  label: "5 ק\"מ" },
  { value: 10, label: "10 ק\"מ" },
];

const AVAILABILITY_OPTIONS = [
  { value: "available_now",   label: "פנוי עכשיו",          icon: "🟢" },
  { value: "available_today", label: "פנוי היום",            icon: "🟡" },
  { value: "available_hours", label: "פנוי בשעות מסוימות",  icon: "🕐" },
];

const TOTAL_STEPS = 5;

// ─── Step progress bar ────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const labels = ["פרטים בסיסיים", "מיקום", "סוגי עבודה", "העדפות", "פרטים נוספים"];
  return (
    <div className="mb-8">
      {/* Bar */}
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-500"
            style={{
              background: i < step
                ? "linear-gradient(90deg, #3c83f6, #2563eb)"
                : i === step - 1
                ? "linear-gradient(90deg, #3c83f6, #2563eb)"
                : "#e2e8f0",
            }}
          />
        ))}
      </div>
      {/* Label */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-600">{labels[step - 1]}</p>
        <p className="text-xs text-gray-400">שלב {step} מתוך {TOTAL_STEPS}</p>
      </div>
    </div>
  );
}

// ─── Slide animation wrapper ──────────────────────────────────────────────────
function StepSlide({ children, dir }: { children: React.ReactNode; dir: number }) {
  return (
    <motion.div
      key={dir}
      initial={{ opacity: 0, x: dir > 0 ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir > 0 ? -40 : 40 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkerSignup() {
  const [, navigate] = useLocation();
  const { user, refetch } = useAuth();

  // Step tracking
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back

  // Step 1 — Basic info
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone?.replace("+972", "0") ?? "");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(!!user); // already logged in = verified
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Step 2 — Location
  const [locationMode, setLocationMode] = useState<"radius" | "city">("radius");
  const [radiusKm, setRadiusKm] = useState(5);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityLat, setCityLat] = useState<number | null>(null);
  const [cityLng, setCityLng] = useState<number | null>(null);
  const [preferredCity, setPreferredCity] = useState("");
  const cityInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 4 — Preference text
  const [preferenceText, setPreferenceText] = useState("");

  // Step 5 — Optional
  const [expectedRate, setExpectedRate] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState<string | null>(null);

  // Mutations
  const sendOtp = trpc.auth.sendOtp.useMutation();
  const verifyOtp = trpc.auth.verifyOtp.useMutation();
  const completeSignup = trpc.user.completeSignup.useMutation();

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goNext = () => { setDir(1); setStep(s => s + 1); };
  const goBack = () => { setDir(-1); setStep(s => s - 1); };

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("הכנס שם מלא (לפחות 2 תווים)");
      return;
    }
    setSendingOtp(true);
    try {
      await sendOtp.mutateAsync({ phone });
      setOtpSent(true);
      toast.success("קוד נשלח ל-SMS");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה בשליחת קוד";
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Step 1: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setVerifyingOtp(true);
    try {
      await verifyOtp.mutateAsync({ phone, code: otpCode, name: name.trim() });
      setOtpVerified(true);
      await refetch?.();
      toast.success("אומת בהצלחה!");
      goNext();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "קוד שגוי";
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── Step 1: Already logged in — just update name ────────────────────────────
  const handleStep1Continue = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("הכנס שם מלא");
      return;
    }
    goNext();
  };

  // ── Step 2: GPS ─────────────────────────────────────────────────────────────
  const handleGetGps = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setLocating(false);
        toast.success("מיקום נמצא");
      },
      () => {
        setLocating(false);
        toast.error("לא ניתן לאתר מיקום — נסה ידנית");
      }
    );
  };

  // ── Step 2: Validate ────────────────────────────────────────────────────────
  const step2Valid = locationMode === "radius"
    ? (gpsLat !== null)
    : (preferredCity.trim().length > 0);

  // ── Step 3: Toggle category ─────────────────────────────────────────────────
  const toggleCategory = (val: string) => {
    setSelectedCategories(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    );
  };

  // ── Final submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      await completeSignup.mutateAsync({
        name: name.trim(),
        locationMode,
        preferredCity: locationMode === "city" ? preferredCity : null,
        workerLatitude: locationMode === "radius" && gpsLat ? gpsLat.toString() : null,
        workerLongitude: locationMode === "radius" && gpsLng ? gpsLng.toString() : null,
        searchRadiusKm: locationMode === "radius" ? radiusKm : null,
        preferredCategories: selectedCategories,
        preferenceText: preferenceText.trim() || null,
        expectedHourlyRate: expectedRate ? parseFloat(expectedRate) : null,
        workerBio: bio.trim() || null,
        availabilityStatus: (availability as "available_now" | "available_today" | "available_hours" | null) ?? null,
      });
      await refetch?.();
      toast.success("הפרופיל נשמר! ברוך הבא 🎉");
      navigate("/home-worker");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה בשמירה";
      toast.error(msg);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-start"
      style={{ background: "linear-gradient(160deg, #f0f6ff 0%, #fafafa 60%)" }}
    >
      {/* Header */}
      <div className="w-full max-w-md px-5 pt-8 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)",
              boxShadow: "0 4px 16px rgba(60,131,246,0.3)",
            }}
          >
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">התחל לעבוד איתנו</h1>
            <p className="text-xs text-gray-500">פחות מ-30 שניות להרשמה</p>
          </div>
        </div>

        <ProgressBar step={step} />
      </div>

      {/* Step content */}
      <div className="w-full max-w-md px-5 flex-1">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Basic info ── */}
          {step === 1 && (
            <StepSlide dir={dir} key="step1">
              <div
                className="rounded-2xl p-6"
                style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #e8edf5" }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <User className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900">פרטים בסיסיים</h2>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                      שם מלא <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="ישראל ישראלי"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="text-base h-12 rounded-xl border-gray-200"
                      autoFocus
                    />
                  </div>

                  {/* Phone — only if not already logged in */}
                  {!user && (
                    <div>
                      <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        מספר טלפון <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="050-1234567"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          disabled={otpSent}
                          className="text-base h-12 rounded-xl border-gray-200 flex-1"
                          dir="ltr"
                        />
                        {!otpSent && (
                          <AppButton
                            variant="brand"
                            className="h-12 px-4 rounded-xl shrink-0"
                            onClick={handleSendOtp}
                            disabled={sendingOtp || phone.length < 9}
                          >
                            {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                              <><Phone className="h-4 w-4 ml-1" />שלח קוד</>
                            )}
                          </AppButton>
                        )}
                      </div>

                      {/* OTP input */}
                      <AnimatePresence>
                        {otpSent && !otpVerified && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 space-y-2 overflow-hidden"
                          >
                            <Label className="text-sm text-gray-600 block">
                              קוד אימות נשלח לטלפון
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="123456"
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                maxLength={6}
                                className="text-xl h-12 rounded-xl text-center tracking-widest border-blue-200 flex-1"
                                dir="ltr"
                                autoFocus
                              />
                              <AppButton
                                variant="brand"
                                className="h-12 px-4 rounded-xl shrink-0"
                                onClick={handleVerifyOtp}
                                disabled={verifyingOtp || otpCode.length < 4}
                              >
                                {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                  <><Check className="h-4 w-4 ml-1" />אמת</>
                                )}
                              </AppButton>
                            </div>
                            <button
                              className="text-xs text-blue-500 hover:underline"
                              onClick={() => { setOtpSent(false); setOtpCode(""); }}
                            >
                              שלח קוד חדש
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {otpVerified && (
                        <div className="mt-2 flex items-center gap-1.5 text-green-600 text-sm">
                          <Check className="h-4 w-4" />
                          טלפון אומת בהצלחה
                        </div>
                      )}
                    </div>
                  )}

                  {/* Already logged in — show phone read-only */}
                  {user && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        מספר טלפון
                      </Label>
                      <div className="flex items-center gap-2 h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {user.phone ?? "מחובר"}
                      </div>
                    </div>
                  )}
                </div>

                <AppButton
                  variant="brand"
                  className="w-full h-13 mt-6 rounded-xl text-base font-bold"
                  onClick={user ? handleStep1Continue : (otpVerified ? goNext : undefined)}
                  disabled={
                    !name.trim() || name.trim().length < 2 ||
                    (!user && !otpVerified)
                  }
                >
                  המשך
                  <ChevronLeft className="h-5 w-5 mr-1" />
                </AppButton>
              </div>
            </StepSlide>
          )}

          {/* ── STEP 2: Location ── */}
          {step === 2 && (
            <StepSlide dir={dir} key="step2">
              <div
                className="rounded-2xl p-6"
                style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #e8edf5" }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900">איפה תרצה לעבוד?</h2>
                </div>

                <div className="space-y-3">
                  {/* Option A — Radius */}
                  <button
                    onClick={() => setLocationMode("radius")}
                    className="w-full text-right rounded-xl border-2 p-4 transition-all"
                    style={{
                      borderColor: locationMode === "radius" ? "#3c83f6" : "#e2e8f0",
                      background: locationMode === "radius" ? "#eff6ff" : "white",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: locationMode === "radius" ? "#3c83f6" : "#cbd5e1",
                          background: locationMode === "radius" ? "#3c83f6" : "white",
                        }}
                      >
                        {locationMode === "radius" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">עבודות לפי מרחק ממני</p>
                        <p className="text-xs text-gray-500 mt-0.5">מציג עבודות קרובות לפי GPS</p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {locationMode === "radius" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          {/* GPS button */}
                          <AppButton
                            variant={gpsLat ? "brand" : "outline"}
                            size="sm"
                            className="w-full mb-3 gap-2"
                            onClick={(e) => { e.stopPropagation(); handleGetGps(); }}
                            disabled={locating}
                          >
                            {locating ? <BrandLoader size="sm" /> : <LocateFixed className="h-4 w-4" />}
                            {locating ? "מאתר..." : gpsLat ? "✓ מיקום נמצא" : "📍 זהה מיקום"}
                          </AppButton>

                          {/* Radius selector */}
                          <div>
                            <p className="text-xs text-gray-500 mb-2">רדיוס חיפוש:</p>
                            <div className="flex gap-2">
                              {RADIUS_OPTIONS.map(r => (
                                <button
                                  key={r.value}
                                  onClick={(e) => { e.stopPropagation(); setRadiusKm(r.value); }}
                                  className="flex-1 py-2 rounded-lg text-sm font-semibold border transition-all"
                                  style={radiusKm === r.value ? {
                                    background: "#3c83f6",
                                    color: "white",
                                    borderColor: "#3c83f6",
                                  } : {
                                    background: "white",
                                    color: "#64748b",
                                    borderColor: "#e2e8f0",
                                  }}
                                >
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* Option B — City */}
                  <button
                    onClick={() => setLocationMode("city")}
                    className="w-full text-right rounded-xl border-2 p-4 transition-all"
                    style={{
                      borderColor: locationMode === "city" ? "#3c83f6" : "#e2e8f0",
                      background: locationMode === "city" ? "#eff6ff" : "white",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: locationMode === "city" ? "#3c83f6" : "#cbd5e1",
                          background: locationMode === "city" ? "#3c83f6" : "white",
                        }}
                      >
                        {locationMode === "city" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">עבודות בעיר מסוימת</p>
                        <p className="text-xs text-gray-500 mt-0.5">בחר עיר ספציפית</p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {locationMode === "city" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                          onClick={e => e.stopPropagation()}
                        >
                          <CityAutocomplete
                            value={citySearch}
                            onChange={setCitySearch}
                            onSelect={(city, lat, lng) => {
                              setPreferredCity(city);
                              setCityLat(lat);
                              setCityLng(lng);
                            }}
                            inputRef={cityInputRef}
                          />
                          {preferredCity && (
                            <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              {preferredCity}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <div className="flex gap-3 mt-6">
                  <AppButton variant="outline" className="flex-1 h-12 rounded-xl" onClick={goBack}>
                    <ChevronRight className="h-5 w-5 ml-1" />
                    חזור
                  </AppButton>
                  <AppButton
                    variant="brand"
                    className="flex-1 h-12 rounded-xl font-bold"
                    onClick={goNext}
                    disabled={!step2Valid}
                  >
                    המשך
                    <ChevronLeft className="h-5 w-5 mr-1" />
                  </AppButton>
                </div>
              </div>
            </StepSlide>
          )}

          {/* ── STEP 3: Categories ── */}
          {step === 3 && (
            <StepSlide dir={dir} key="step3">
              <div
                className="rounded-2xl p-6"
                style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #e8edf5" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900">איזה עבודות מעניינות אותך?</h2>
                </div>
                <p className="text-xs text-gray-500 mb-5">ניתן לבחור מספר קטגוריות</p>

                <div className="grid grid-cols-2 gap-2.5">
                  {SIGNUP_CATEGORIES.map(cat => {
                    const isActive = selectedCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        onClick={() => toggleCategory(cat.value)}
                        className="flex items-center gap-2.5 p-3 rounded-xl border-2 text-right transition-all"
                        style={isActive ? {
                          borderColor: "#3c83f6",
                          background: "#eff6ff",
                        } : {
                          borderColor: "#e2e8f0",
                          background: "white",
                        }}
                      >
                        <span className="text-xl shrink-0">{cat.icon}</span>
                        <span
                          className="text-xs font-semibold leading-tight"
                          style={{ color: isActive ? "#1d4ed8" : "#374151" }}
                        >
                          {cat.label}
                        </span>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-blue-500 mr-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6">
                  <AppButton variant="outline" className="flex-1 h-12 rounded-xl" onClick={goBack}>
                    <ChevronRight className="h-5 w-5 ml-1" />
                    חזור
                  </AppButton>
                  <AppButton
                    variant="brand"
                    className="flex-1 h-12 rounded-xl font-bold"
                    onClick={goNext}
                    disabled={selectedCategories.length === 0}
                  >
                    המשך
                    <ChevronLeft className="h-5 w-5 mr-1" />
                  </AppButton>
                </div>
              </div>
            </StepSlide>
          )}

          {/* ── STEP 4: Preference text (optional) ── */}
          {step === 4 && (
            <StepSlide dir={dir} key="step4">
              <div
                className="rounded-2xl p-6"
                style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #e8edf5" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900">ספר לנו איזה עבודות אתה מחפש</h2>
                </div>
                <div
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mb-4"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
                >
                  <Star className="h-3 w-3" />
                  מומלץ — לא חובה
                </div>

                <Textarea
                  placeholder="מחפש עבודה עם כלבים או שליחויות..."
                  value={preferenceText}
                  onChange={e => setPreferenceText(e.target.value)}
                  className="min-h-[120px] rounded-xl border-gray-200 text-base resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-gray-400 mt-2">
                  המערכת תשתמש בתיאור כדי להציע לך עבודות מתאימות
                </p>

                <div className="flex gap-3 mt-6">
                  <AppButton variant="outline" className="flex-1 h-12 rounded-xl" onClick={goBack}>
                    <ChevronRight className="h-5 w-5 ml-1" />
                    חזור
                  </AppButton>
                  <AppButton
                    variant="brand"
                    className="flex-1 h-12 rounded-xl font-bold"
                    onClick={goNext}
                  >
                    המשך
                    <ChevronLeft className="h-5 w-5 mr-1" />
                  </AppButton>
                </div>
              </div>
            </StepSlide>
          )}

          {/* ── STEP 5: Optional details ── */}
          {step === 5 && (
            <StepSlide dir={dir} key="step5">
              <div
                className="rounded-2xl p-6"
                style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #e8edf5" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900">פרטים נוספים</h2>
                </div>
                <div
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mb-5"
                  style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
                >
                  לא חובה — ניתן להשלים מאוחר יותר
                </div>

                {/* Availability */}
                <div className="mb-5">
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">זמינות</Label>
                  <div className="flex flex-col gap-2">
                    {AVAILABILITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setAvailability(availability === opt.value ? null : opt.value)}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all"
                        style={availability === opt.value ? {
                          borderColor: "#3c83f6",
                          background: "#eff6ff",
                        } : {
                          borderColor: "#e2e8f0",
                          background: "white",
                        }}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                        {availability === opt.value && (
                          <Check className="h-4 w-4 text-blue-500 mr-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected rate */}
                <div className="mb-4">
                  <Label htmlFor="rate" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    שכר שעתי מצופה (₪)
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    placeholder="40"
                    value={expectedRate}
                    onChange={e => setExpectedRate(e.target.value)}
                    className="h-12 rounded-xl border-gray-200"
                    min={0}
                    max={500}
                    dir="ltr"
                  />
                </div>

                {/* Bio */}
                <div className="mb-2">
                  <Label htmlFor="bio" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    כמה מילים עליך
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="אדם אמין, עובד קשה, ניסיון בשליחויות..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="min-h-[80px] rounded-xl border-gray-200 resize-none"
                    maxLength={500}
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <AppButton variant="outline" className="flex-1 h-12 rounded-xl" onClick={goBack}>
                    <ChevronRight className="h-5 w-5 ml-1" />
                    חזור
                  </AppButton>
                  <AppButton
                    variant="brand"
                    className="flex-1 h-13 rounded-xl font-bold text-base"
                    onClick={handleSubmit}
                    disabled={completeSignup.isPending}
                  >
                    {completeSignup.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>התחל לעבוד 🚀</>
                    )}
                  </AppButton>
                </div>
              </div>
            </StepSlide>
          )}
        </AnimatePresence>

        {/* Skip optional steps */}
        {(step === 4 || step === 5) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            {step === 4 && (
              <button
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={goNext}
              >
                דלג על שלב זה ←
              </button>
            )}
            {step === 5 && (
              <button
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={handleSubmit}
                disabled={completeSignup.isPending}
              >
                דלג ועבור לדף הבית ←
              </button>
            )}
          </motion.div>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}

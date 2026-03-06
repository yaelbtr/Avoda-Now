import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JobCard from "@/components/JobCard";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import LoginModal from "@/components/LoginModal";
import CityAutocomplete from "@/components/CityAutocomplete";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES, RADIUS_OPTIONS } from "@shared/categories";
import {
  MapPin, Search, Briefcase, LocateFixed, Flame, X,
  Navigation, AlertCircle, SlidersHorizontal,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  C_BRAND_HEX, C_BRAND_DARK_HEX, C_BORDER, C_PAGE_BG_HEX,
  C_DANGER_HEX, C_TEXT_MUTED, C_SUCCESS_HEX,
} from "@/lib/colors";

const LOCATION_CACHE_KEY = "findJobs_location";
const LOCATION_CACHE_TTL = 60 * 60 * 1000;

interface CachedLocation { lat: number; lng: number; savedAt: number; }

function loadCachedLocation(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedLocation = JSON.parse(raw);
    if (Date.now() - cached.savedAt > LOCATION_CACHE_TTL) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    return { lat: cached.lat, lng: cached.lng };
  } catch { return null; }
}

function saveLocationCache(lat: number, lng: number) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lng, savedAt: Date.now() }));
  } catch {}
}

function clearLocationCache() {
  try { localStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
}

// ── Animation variants ──────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ── Light panel style helper ─────────────────────────────────────────────
const lightPanel = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "1rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
} as React.CSSProperties;

export default function FindJobs() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get("category") ?? "all";

  const [category, setCategory] = useState(initialCategory);
  const [radiusKm, setRadiusKm] = useState(10);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [showCityInput, setShowCityInput] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showUrgentToday, setShowUrgentToday] = useState(
    params.get("urgent") === "1" || params.get("help") === "1"
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [autoExpandedRadius, setAutoExpandedRadius] = useState(false);
  const [, navigate] = useLocation();
  const cityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cached = loadCachedLocation();
    if (cached) { setUserLat(cached.lat); setUserLng(cached.lng); }
  }, []);

  const requireLogin = (message: string) => { setLoginMessage(message); setLoginOpen(true); };

  const doGetLocation = () => {
    setLocating(true);
    setShowLocationDialog(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude); setUserLng(longitude);
        saveLocationCache(latitude, longitude);
        setLocating(false); setLocationDenied(false); setAutoExpandedRadius(false);
        toast.success("מיקום נמצא — מציג עבודות קרובות אליך");
      },
      () => {
        setLocating(false); setLocationDenied(true); setShowCityInput(true);
        toast.error("לא ניתן לאתר מיקום אוטומטית — הזן עיר ידנית");
      }
    );
  };

  const handleLocationButtonClick = () => {
    if (userLat) {
      setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false);
      toast("מיקום בוטל"); return;
    }
    setShowLocationDialog(true);
  };

  const handleCitySelect = (city: string, lat: number, lng: number) => {
    setUserLat(lat); setUserLng(lng); saveLocationCache(lat, lng);
    setShowCityInput(false); setAutoExpandedRadius(false);
    toast.success(`מציג עבודות קרוב ל${city}`);
  };

  const searchQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm, category: category === "all" ? undefined : category, limit: 50 },
    { enabled: true }
  );
  const listQuery = trpc.jobs.list.useQuery(
    { category: category === "all" ? undefined : category, limit: 50 },
    { enabled: !userLat }
  );
  const todayQuery = trpc.jobs.listToday.useQuery(
    { category: category === "all" ? undefined : category, limit: 50 },
    { enabled: showUrgentToday }
  );

  type AnyJob = NonNullable<typeof searchQuery.data>[number] | NonNullable<typeof listQuery.data>[number];
  let jobs: AnyJob[] = userLat ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const isLoading = userLat ? searchQuery.isLoading : listQuery.isLoading;

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.address.toLowerCase().includes(q)
    );
  }

  if (showUrgentToday) {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    const todayJobIds = new Set((todayQuery.data ?? []).map(j => j.id));
    jobs = jobs.filter(j => {
      const isUrgentJob = (j as { isUrgent?: boolean | null }).isUrgent;
      const isToday = todayJobIds.has(j.id);
      const startDt = (j as { startDateTime?: string | null }).startDateTime;
      const startsWithin24h = startDt ? new Date(startDt).getTime() <= in24h : false;
      return isUrgentJob || isToday || startsWithin24h;
    });
  }

  jobs = [...jobs].sort((a, b) => {
    const aUrgent = (a as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    const bUrgent = (b as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    return bUrgent - aUrgent;
  });

  useEffect(() => {
    if (!isLoading && userLat && jobs.length === 0 && radiusKm < 50 && !autoExpandedRadius) {
      setAutoExpandedRadius(true);
    }
  }, [isLoading, userLat, jobs.length, radiusKm, autoExpandedRadius]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f5f7f8]"
    >


      <div className="relative max-w-2xl mx-auto px-4 py-8">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)",
                boxShadow: "0 4px 16px rgba(60,131,246,0.3)",
              }}
            >
              <Search className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              חפש עבודה
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            מצא עבודות זמניות ודחופות באזורך
          </p>
        </motion.div>

        {/* ── Location Permission Dialog ── */}
        <AnimatePresence>
          {showLocationDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowLocationDialog(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ ...lightPanel, maxWidth: 360, width: "100%", padding: "1.5rem" }}
                onClick={e => e.stopPropagation()}
                dir="rtl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-50 border border-blue-200">
                    <Navigation className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">גישה למיקום</h3>
                    <p className="text-xs text-gray-500">כדי להציג עבודות קרובות אליך</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-5 text-gray-600">
                  נשתמש במיקומך <strong className="text-gray-900">כדי להציג עבודות קרובות אליך בלבד</strong>. המיקום לא נשמר בשרת ולא מועבר לצדדים שלישיים.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={doGetLocation} className="w-full gap-2">
                    <LocateFixed className="h-4 w-4" />
                    אפשר גישה למיקום
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => { setShowLocationDialog(false); setShowCityInput(true); setTimeout(() => cityInputRef.current?.focus(), 100); }}
                  >
                    <Search className="h-4 w-4" />
                    הזן עיר ידנית
                  </Button>
                  <button
                    onClick={() => setShowLocationDialog(false)}
                    className="text-xs py-1 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    ביטול
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filters panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          style={{ ...lightPanel, padding: "1.25rem", marginBottom: "1.5rem" }}
          dir="rtl"
        >
          {/* Filter header */}
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">
              סינון וחיפוש
            </span>
          </div>

          {/* 1. Search */}
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
            <Input
              placeholder="חפש לפי תפקיד, עיר או מילת מפתח..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pr-10 text-right bg-[#f5f7f8] border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* 2. Quick filter: urgent today */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2 text-gray-500">סינון מהיר</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUrgentToday(!showUrgentToday)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={showUrgentToday ? {
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "1px solid #ef4444",
                boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
              } : {
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <Flame className="h-4 w-4" />
              דחוף להיום
              <span className="text-xs font-normal opacity-80">— עבודות דחופות ועבודות שמתחילות היום</span>
            </motion.button>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mb-4" />

          {/* 3. Category */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2 text-gray-500">קטגוריה</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory("all")}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={category === "all" ? {
                  background: C_BRAND_HEX,
                  color: "white",
                  border: `1px solid ${C_BRAND_HEX}`,
                  boxShadow: `0 2px 8px ${C_BRAND_HEX}4d`,
                } : {
                  background: C_PAGE_BG_HEX,
                  color: C_TEXT_MUTED,
                  border: `1px solid ${C_BORDER}`,
                }}
              >
                הכל
              </button>
              {JOB_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={category === cat.value ? {
                    background: C_BRAND_HEX,
                    color: "white",
                    border: `1px solid ${C_BRAND_HEX}`,
                    boxShadow: `0 2px 8px ${C_BRAND_HEX}4d`,
                  } : {
                    background: C_BRAND_HEX,
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Special categories */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2 text-gray-500">קטגוריות מיוחדות</p>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_CATEGORIES.map(cat => {
                const isActive = category === cat.value;
                  const colorMap: Record<string, { activeBg: string; activeColor: string; inactiveBg: string; inactiveColor: string; inactiveBorder: string; activeBorder: string; glow: string }> = {
                  purple: {
                    activeBg: "#7c3aed",
                    activeColor: "white",
                    activeBorder: "#7c3aed",
                    inactiveBg: "rgba(124,58,237,0.08)",
                    inactiveColor: "#7c3aed",
                    inactiveBorder: "rgba(124,58,237,0.3)",
                    glow: "0 2px 8px rgba(124,58,237,0.3)",
                  },
                  amber: {
                    activeBg: "#d97706",
                    activeColor: "white",
                    activeBorder: "#d97706",
                    inactiveBg: "rgba(217,119,6,0.08)",
                    inactiveColor: "#d97706",
                    inactiveBorder: "rgba(217,119,6,0.3)",
                    glow: "0 2px 8px rgba(217,119,6,0.3)",
                  },
                  green: {
                    activeBg: "#16a34a",
                    activeColor: "white",
                    activeBorder: "#16a34a",
                    inactiveBg: "rgba(22,163,74,0.08)",
                    inactiveColor: "#16a34a",
                    inactiveBorder: "rgba(22,163,74,0.3)",
                    glow: "0 2px 8px rgba(22,163,74,0.3)",
                  },
                };
                const c = colorMap[cat.color] ?? colorMap.purple;
                return (
                  <motion.button
                    key={cat.value}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setCategory(isActive ? "all" : cat.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={isActive ? {
                      background: c.activeBg,
                      color: c.activeColor,
                      border: `1px solid ${c.activeBorder}`,
                      boxShadow: c.glow,
                    } : {
                      background: c.inactiveBg,
                      color: c.inactiveColor,
                      border: `1px solid ${c.inactiveBorder}`,
                    }}
                  >
                    {cat.icon} {cat.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 5. Location */}
          <div>
            <p className="text-xs font-semibold mb-2 text-gray-500">מיקום</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant={userLat ? "default" : "outline"}
                    size="sm"
                    onClick={handleLocationButtonClick}
                    disabled={locating}
                    className="gap-2 shrink-0"
                    style={userLat ? {
                      background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)",
                      boxShadow: "0 4px 12px rgba(60,131,246,0.3)",
                    } : {}}
                  >
                    {locating ? <BrandLoader size="sm" />
                      : userLat ? <MapPin className="h-4 w-4" />
                      : <LocateFixed className="h-4 w-4" />}
                    {locating ? "מאתר מיקום..." : userLat ? "ממוין לפי מרחק ממך" : "📍 הצג עבודות קרובות אלי"}
                  </Button>
                </motion.div>

                {userLat && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => { setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false); toast("מיקום בוטל"); }}
                    className="flex items-center gap-1 text-xs rounded-full px-2 py-1 transition-colors text-gray-500 border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <X className="h-3 w-3" />
                    בטל מיקום
                  </motion.button>
                )}

                {!userLat && !showCityInput && (
                  <button
                    onClick={() => { setShowCityInput(true); setTimeout(() => cityInputRef.current?.focus(), 100); }}
                    className="text-xs transition-colors text-blue-600 hover:text-blue-800"
                  >
                    הזן עיר ידנית
                  </button>
                )}
              </div>

              {/* Radius selector */}
              <AnimatePresence>
                {userLat && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-1.5 flex-wrap overflow-hidden"
                  >
                    {RADIUS_OPTIONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={radiusKm === r.value ? {
                          background: C_BRAND_HEX,
                          color: "white",
                          border: "1px solid #3c83f6",
                        } : {
                    background: C_PAGE_BG_HEX,
                    color: C_TEXT_MUTED,
                    border: `1px solid ${C_BORDER}`,

                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* City autocomplete */}
              <AnimatePresence>
                {showCityInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 items-start overflow-hidden"
                  >
                    <div className="flex-1">
                      <CityAutocomplete
                        value={citySearch}
                        onChange={setCitySearch}
                        onSelect={handleCitySelect}
                        inputRef={cityInputRef}
                      />
                    </div>
                    <button
                      onClick={() => { setShowCityInput(false); setCitySearch(""); }}
                      className="mt-2 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── Smart radius expand suggestion ── */}
        <AnimatePresence>
          {autoExpandedRadius && userLat && jobs.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 rounded-xl p-4 mb-4"
              style={{
                background: "rgba(251,146,60,0.06)",
                border: "1px solid rgba(251,146,60,0.2)",
              }}
              dir="rtl"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-700">
                  לא נמצאו עבודות בטווח {radiusKm} ק"מ
                </p>
                <p className="text-xs mt-0.5 text-gray-500">רוצה להרחיב את החיפוש?</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {RADIUS_OPTIONS.filter(r => r.value > radiusKm).map(r => (
                    <button
                      key={r.value}
                      onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-colors bg-orange-500 text-white hover:bg-orange-600"
                    >
                      הרחב ל-{r.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results header ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mb-4"
        >
          <p className="text-sm text-gray-500">
            {isLoading ? "מחפש..." : `${jobs.length} משרות נמצאו`}
          </p>
          {userLat && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <MapPin className="h-3 w-3" />
              ממוין לפי מרחק ממך
            </div>
          )}
        </motion.div>

        {/* ── Job list ── */}
        {isLoading ? (
          <JobCardSkeletonList count={4} />
        ) : jobs.length === 0 && !autoExpandedRadius ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white border border-gray-200 shadow-sm"
            >
              <Briefcase className="h-8 w-8 text-gray-300" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">לא נמצאו משרות</p>
              <p className="text-sm mt-1 text-gray-400">נסה לשנות את הפילטרים</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {jobs.map(job => (
              <motion.div key={job.id} variants={itemVariants}>
                <JobCard
                  job={{
                    ...job,
                    salary: job.salary ?? null,
                    businessName: job.businessName ?? null,
                    distance: "distance" in job ? (job as { distance: number }).distance : undefined,
                  }}
                  showDistance={!!userLat}
                  onLoginRequired={requireLogin}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message={loginMessage}
      />
    </div>
  );
}

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
  MapPin, Search, Loader2, Briefcase, LocateFixed, Flame, X,
  Navigation, AlertCircle, SlidersHorizontal,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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

// ── Glassmorphism style helpers ─────────────────────────────────────────────
const glassPanel = {
  background: "oklch(1 0 0 / 5%)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: "1rem",
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
      className="min-h-screen"
      style={{ background: "oklch(0.10 0.015 265)" }}
    >
      {/* ── Floating background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500,
            top: -100, right: -100,
            background: "radial-gradient(circle, oklch(0.62 0.22 255 / 0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400,
            bottom: 100, left: -80,
            background: "radial-gradient(circle, oklch(0.78 0.17 65 / 0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8" style={{ zIndex: 1 }}>

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
                background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                boxShadow: "0 0 20px oklch(0.62 0.22 255 / 0.3)",
              }}
            >
              <Search className="h-5 w-5 text-white" />
            </div>
            <h1
              className="text-2xl font-black"
              style={{ color: "oklch(0.95 0.005 80)" }}
            >
              חפש עבודה
            </h1>
          </div>
          <p className="text-sm" style={{ color: "oklch(1 0 0 / 40%)" }}>
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
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(8px)" }}
              onClick={() => setShowLocationDialog(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ ...glassPanel, maxWidth: 360, width: "100%", padding: "1.5rem" }}
                onClick={e => e.stopPropagation()}
                dir="rtl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "oklch(0.62 0.22 255 / 0.15)",
                      border: "1px solid oklch(0.62 0.22 255 / 0.3)",
                    }}
                  >
                    <Navigation className="h-6 w-6" style={{ color: "oklch(0.72 0.22 240)" }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "oklch(0.95 0.005 80)" }}>גישה למיקום</h3>
                    <p className="text-xs" style={{ color: "oklch(1 0 0 / 45%)" }}>כדי להציג עבודות קרובות אליך</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "oklch(1 0 0 / 55%)" }}>
                  נשתמש במיקומך <strong style={{ color: "oklch(0.95 0.005 80)" }}>כדי להציג עבודות קרובות אליך בלבד</strong>. המיקום לא נשמר בשרת ולא מועבר לצדדים שלישיים.
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
                    className="text-xs py-1 transition-colors"
                    style={{ color: "oklch(1 0 0 / 35%)" }}
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
          style={{ ...glassPanel, padding: "1.25rem", marginBottom: "1.5rem" }}
          dir="rtl"
        >
          {/* Filter header */}
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4" style={{ color: "oklch(0.72 0.22 240)" }} />
            <span className="text-sm font-bold" style={{ color: "oklch(0.95 0.005 80)" }}>
              סינון וחיפוש
            </span>
          </div>

          {/* 1. Search */}
          <div className="relative mb-4">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "oklch(1 0 0 / 35%)" }}
            />
            <Input
              placeholder="חפש לפי תפקיד, עיר או מילת מפתח..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pr-10 text-right"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: "1px solid oklch(1 0 0 / 12%)",
                color: "oklch(0.95 0.005 80)",
              }}
            />
          </div>

          {/* 2. Quick filter: urgent today */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "oklch(1 0 0 / 40%)" }}>סינון מהיר</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUrgentToday(!showUrgentToday)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={showUrgentToday ? {
                background: "linear-gradient(135deg, oklch(0.60 0.22 25) 0%, oklch(0.55 0.25 15) 100%)",
                color: "white",
                border: "1px solid oklch(0.65 0.22 25 / 0.5)",
                boxShadow: "0 0 16px oklch(0.60 0.22 25 / 0.3)",
              } : {
                background: "oklch(0.60 0.22 25 / 0.08)",
                color: "oklch(0.72 0.22 25)",
                border: "1px solid oklch(0.60 0.22 25 / 0.25)",
              }}
            >
              <Flame className="h-4 w-4" />
              דחוף להיום
              <span className="text-xs font-normal opacity-80">— עבודות דחופות ועבודות שמתחילות היום</span>
            </motion.button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "oklch(1 0 0 / 8%)", marginBottom: "1rem" }} />

          {/* 3. Category */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "oklch(1 0 0 / 40%)" }}>קטגוריה</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory("all")}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={category === "all" ? {
                  background: "oklch(0.62 0.22 255)",
                  color: "white",
                  border: "1px solid oklch(0.62 0.22 255)",
                  boxShadow: "0 0 10px oklch(0.62 0.22 255 / 0.3)",
                } : {
                  background: "oklch(1 0 0 / 5%)",
                  color: "oklch(1 0 0 / 50%)",
                  border: "1px solid oklch(1 0 0 / 12%)",
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
                    background: "oklch(0.62 0.22 255)",
                    color: "white",
                    border: "1px solid oklch(0.62 0.22 255)",
                    boxShadow: "0 0 10px oklch(0.62 0.22 255 / 0.3)",
                  } : {
                    background: "oklch(1 0 0 / 5%)",
                    color: "oklch(1 0 0 / 50%)",
                    border: "1px solid oklch(1 0 0 / 12%)",
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Special categories */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "oklch(1 0 0 / 40%)" }}>קטגוריות מיוחדות</p>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_CATEGORIES.map(cat => {
                const isActive = category === cat.value;
                const colorMap: Record<string, { activeBg: string; activeColor: string; inactiveBg: string; inactiveColor: string; inactiveBorder: string; activeBorder: string; glow: string }> = {
                  purple: {
                    activeBg: "oklch(0.55 0.22 290)",
                    activeColor: "white",
                    activeBorder: "oklch(0.55 0.22 290)",
                    inactiveBg: "oklch(0.55 0.22 290 / 0.1)",
                    inactiveColor: "oklch(0.72 0.20 290)",
                    inactiveBorder: "oklch(0.55 0.22 290 / 0.3)",
                    glow: "0 0 12px oklch(0.55 0.22 290 / 0.3)",
                  },
                  amber: {
                    activeBg: "oklch(0.72 0.18 65)",
                    activeColor: "oklch(0.10 0.015 265)",
                    activeBorder: "oklch(0.72 0.18 65)",
                    inactiveBg: "oklch(0.72 0.18 65 / 0.1)",
                    inactiveColor: "oklch(0.78 0.17 65)",
                    inactiveBorder: "oklch(0.72 0.18 65 / 0.3)",
                    glow: "0 0 12px oklch(0.72 0.18 65 / 0.3)",
                  },
                  green: {
                    activeBg: "oklch(0.60 0.22 160)",
                    activeColor: "white",
                    activeBorder: "oklch(0.60 0.22 160)",
                    inactiveBg: "oklch(0.60 0.22 160 / 0.1)",
                    inactiveColor: "oklch(0.68 0.20 160)",
                    inactiveBorder: "oklch(0.60 0.22 160 / 0.3)",
                    glow: "0 0 12px oklch(0.60 0.22 160 / 0.3)",
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
            <p className="text-xs font-semibold mb-2" style={{ color: "oklch(1 0 0 / 40%)" }}>מיקום</p>
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
                      background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                      boxShadow: "0 0 16px oklch(0.62 0.22 255 / 0.3)",
                    } : {}}
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" />
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
                    className="flex items-center gap-1 text-xs rounded-full px-2 py-1 transition-colors"
                    style={{
                      color: "oklch(1 0 0 / 40%)",
                      border: "1px solid oklch(1 0 0 / 12%)",
                      background: "oklch(1 0 0 / 4%)",
                    }}
                  >
                    <X className="h-3 w-3" />
                    בטל מיקום
                  </motion.button>
                )}

                {!userLat && !showCityInput && (
                  <button
                    onClick={() => { setShowCityInput(true); setTimeout(() => cityInputRef.current?.focus(), 100); }}
                    className="text-xs transition-colors"
                    style={{ color: "oklch(0.72 0.22 240)" }}
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
                          background: "oklch(0.62 0.22 255)",
                          color: "white",
                          border: "1px solid oklch(0.62 0.22 255)",
                        } : {
                          background: "oklch(1 0 0 / 5%)",
                          color: "oklch(1 0 0 / 50%)",
                          border: "1px solid oklch(1 0 0 / 12%)",
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
                      className="mt-2 transition-colors"
                      style={{ color: "oklch(1 0 0 / 40%)" }}
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
                background: "oklch(0.72 0.18 65 / 0.08)",
                border: "1px solid oklch(0.72 0.18 65 / 0.2)",
              }}
              dir="rtl"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "oklch(0.78 0.17 65)" }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "oklch(0.88 0.14 75)" }}>
                  לא נמצאו עבודות בטווח {radiusKm} ק"מ
                </p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(1 0 0 / 45%)" }}>רוצה להרחיב את החיפוש?</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {RADIUS_OPTIONS.filter(r => r.value > radiusKm).map(r => (
                    <button
                      key={r.value}
                      onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-colors"
                      style={{
                        background: "oklch(0.72 0.18 65)",
                        color: "oklch(0.10 0.015 265)",
                      }}
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
          <p className="text-sm" style={{ color: "oklch(1 0 0 / 40%)" }}>
            {isLoading ? "מחפש..." : `${jobs.length} משרות נמצאו`}
          </p>
          {userLat && (
            <div className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.72 0.22 240)" }}>
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
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              <Briefcase className="h-8 w-8" style={{ color: "oklch(1 0 0 / 20%)" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "oklch(0.95 0.005 80)" }}>לא נמצאו משרות</p>
              <p className="text-sm mt-1" style={{ color: "oklch(1 0 0 / 35%)" }}>נסה לשנות את הפילטרים</p>
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

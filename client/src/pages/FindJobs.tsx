import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JobCard from "@/components/JobCard";
import LoginModal from "@/components/LoginModal";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES, RADIUS_OPTIONS } from "@shared/categories";
import { MapPin, Search, Loader2, Briefcase, LocateFixed, Flame, X, Navigation, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const LOCATION_CACHE_KEY = "findJobs_location";
const LOCATION_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedLocation {
  lat: number;
  lng: number;
  savedAt: number;
}

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
  } catch {
    return null;
  }
}

function saveLocationCache(lat: number, lng: number) {
  try {
    const data: CachedLocation = { lat, lng, savedAt: Date.now() };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function clearLocationCache() {
  try { localStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
}

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
  const [geocoding, setGeocoding] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showUrgentToday, setShowUrgentToday] = useState(
    params.get("urgent") === "1" || params.get("help") === "1"
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [autoExpandedRadius, setAutoExpandedRadius] = useState(false);
  const [, navigate] = useLocation();
  const cityInputRef = useRef<HTMLInputElement>(null);

  // Load cached location on mount
  useEffect(() => {
    const cached = loadCachedLocation();
    if (cached) {
      setUserLat(cached.lat);
      setUserLng(cached.lng);
    }
  }, []);

  const requireLogin = (message: string) => {
    setLoginMessage(message);
    setLoginOpen(true);
  };

  const doGetLocation = () => {
    setLocating(true);
    setShowLocationDialog(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        saveLocationCache(latitude, longitude);
        setLocating(false);
        setLocationDenied(false);
        setAutoExpandedRadius(false);
        toast.success("מיקום נמצא — מציג עבודות קרובות אליך");
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
        setShowCityInput(true);
        toast.error("לא ניתן לאתר מיקום אוטומטית — הזן עיר ידנית");
      }
    );
  };

  const handleLocationButtonClick = () => {
    if (userLat) {
      // Already active — clear location
      setUserLat(null);
      setUserLng(null);
      clearLocationCache();
      setAutoExpandedRadius(false);
      toast("מיקום בוטל");
      return;
    }
    // Show explanation dialog first
    setShowLocationDialog(true);
  };

  const handleCitySearch = async () => {
    if (!citySearch.trim()) return;
    setGeocoding(true);
    try {
      // Use Google Maps Geocoding via the Maps proxy
      const res = await fetch(
        `/api/maps/geocode?address=${encodeURIComponent(citySearch + ", ישראל")}`
      );
      if (!res.ok) throw new Error("geocode failed");
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        setUserLat(loc.lat);
        setUserLng(loc.lng);
        saveLocationCache(loc.lat, loc.lng);
        setShowCityInput(false);
        setAutoExpandedRadius(false);
        toast.success(`מציג עבודות קרוב ל${citySearch}`);
      } else {
        toast.error("לא נמצאה העיר — נסה שם אחר");
      }
    } catch {
      toast.error("שגיאה בחיפוש מיקום");
    } finally {
      setGeocoding(false);
    }
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
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q)
    );
  }

  if (showUrgentToday) {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    const todayJobIds = new Set((todayQuery.data ?? []).map((j) => j.id));
    jobs = jobs.filter((j) => {
      const isUrgentJob = (j as { isUrgent?: boolean | null }).isUrgent;
      const isToday = todayJobIds.has(j.id);
      const startDt = (j as { startDateTime?: string | null }).startDateTime;
      const startsWithin24h = startDt ? new Date(startDt).getTime() <= in24h : false;
      return isUrgentJob || isToday || startsWithin24h;
    });
  }

  // Sort urgent jobs to top
  jobs = [...jobs].sort((a, b) => {
    const aUrgent = (a as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    const bUrgent = (b as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    return bUrgent - aUrgent;
  });

  // Smart radius auto-expand: if 0 results with location active, suggest expanding
  useEffect(() => {
    if (!isLoading && userLat && jobs.length === 0 && radiusKm < 50 && !autoExpandedRadius) {
      setAutoExpandedRadius(true);
    }
  }, [isLoading, userLat, jobs.length, radiusKm, autoExpandedRadius]);

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6 text-right">חפש עבודה</h1>

      {/* Location Permission Dialog */}
      {showLocationDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLocationDialog(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">גישה למיקום</h3>
                <p className="text-xs text-muted-foreground">כדי להציג עבודות קרובות אליך</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              נשתמש במיקומך <strong>כדי להציג עבודות קרובות אליך בלבד</strong>. המיקום לא נשמר בשרת ולא מועבר לצדדים שלישיים.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={doGetLocation} className="w-full gap-2">
                <LocateFixed className="h-4 w-4" />
                אפשר גישה למיקום
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setShowLocationDialog(false);
                  setShowCityInput(true);
                  setTimeout(() => cityInputRef.current?.focus(), 100);
                }}
              >
                <Search className="h-4 w-4" />
                הזן עיר ידנית
              </Button>
              <button
                onClick={() => setShowLocationDialog(false)}
                className="text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-5" dir="rtl">

        {/* 1. Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="חפש לפי תפקיד, עיר או מילת מפתח..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pr-10 text-right"
          />
        </div>

        {/* 2. Quick filter: urgent today */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">סינון מהיר</p>
          <button
            onClick={() => setShowUrgentToday(!showUrgentToday)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
              showUrgentToday
                ? "bg-red-500 text-white border-red-500 shadow-sm"
                : "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
            }`}
          >
            <Flame className="h-4 w-4" />
            דחוף להיום
            <span className="text-xs font-normal opacity-80">— עבודות דחופות ועבודות שמתחילות היום</span>
          </button>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* 3. Category */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">קטגוריה</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              הכל
            </button>
            {JOB_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  category === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Special categories */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">קטגוריות מיוחדות</p>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_CATEGORIES.map((cat) => {
              const colorMap: Record<string, { active: string; inactive: string }> = {
                purple: { active: "bg-purple-600 text-white border-purple-600", inactive: "border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100" },
                amber:  { active: "bg-amber-500 text-white border-amber-500",   inactive: "border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100" },
                green:  { active: "bg-green-600 text-white border-green-600",   inactive: "border-green-400 text-green-700 bg-green-50 hover:bg-green-100" },
              };
              const colors = colorMap[cat.color] ?? colorMap.purple;
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(isActive ? "all" : cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                    isActive ? colors.active : colors.inactive
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Location */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">מיקום</p>
          <div className="space-y-2">
            {/* Location button row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={userLat ? "default" : "outline"}
                size="sm"
                onClick={handleLocationButtonClick}
                disabled={locating}
                className="gap-2 shrink-0"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : userLat ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
                {locating ? "מאתר מיקום..." : userLat ? "ממוין לפי מרחק ממך" : "📍 הצג עבודות קרובות אלי"}
              </Button>

              {/* Clear location button */}
              {userLat && (
                <button
                  onClick={() => {
                    setUserLat(null);
                    setUserLng(null);
                    clearLocationCache();
                    setAutoExpandedRadius(false);
                    toast("מיקום בוטל");
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive border border-border rounded-full px-2 py-1 transition-colors"
                  title="בטל מיקום"
                >
                  <X className="h-3 w-3" />
                  בטל מיקום
                </button>
              )}

              {/* Manual city search toggle */}
              {!userLat && !showCityInput && (
                <button
                  onClick={() => {
                    setShowCityInput(true);
                    setTimeout(() => cityInputRef.current?.focus(), 100);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  הזן עיר ידנית
                </button>
              )}
            </div>

            {/* Radius selector */}
            {userLat && (
              <div className="flex gap-1.5 flex-wrap">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      radiusKm === r.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Manual city input */}
            {showCityInput && (
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={cityInputRef}
                    placeholder="לדוגמה: תל אביב, חיפה, ירושלים..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
                    className="pr-10 text-right text-sm"
                  />
                </div>
                <Button size="sm" onClick={handleCitySearch} disabled={geocoding || !citySearch.trim()}>
                  {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "חפש"}
                </Button>
                <button onClick={() => { setShowCityInput(false); setCitySearch(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Smart radius expand suggestion */}
      {autoExpandedRadius && userLat && jobs.length === 0 && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3" dir="rtl">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">לא נמצאו עבודות בטווח {radiusKm} ק"מ</p>
            <p className="text-xs text-amber-700 mt-0.5">רוצה להרחיב את החיפוש?</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {RADIUS_OPTIONS.filter((r) => r.value > radiusKm).map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  הרחב ל-{r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground text-right">
          {isLoading ? "מחפש..." : `${jobs.length} משרות נמצאו`}
        </p>
        {userLat && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <MapPin className="h-3 w-3" />
            ממוין לפי מרחק ממך
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 && !autoExpandedRadius ? (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">לא נמצאו משרות</p>
          <p className="text-sm mt-1">נסה לשנות את הפילטרים</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={{
                ...job,
                salary: job.salary ?? null,
                businessName: job.businessName ?? null,
                distance: "distance" in job ? (job as { distance: number }).distance : undefined,
              }}
              showDistance={!!userLat}
              onLoginRequired={requireLogin}
            />
          ))}
        </div>
      )}

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message={loginMessage}
      />
    </div>
  );
}

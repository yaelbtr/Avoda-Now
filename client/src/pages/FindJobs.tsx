import { useState, useEffect, useRef } from "react";
import { useSearch, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { getCategoryLabel } from "@shared/categories";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import JobBottomSheet from "@/components/JobBottomSheet";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import { useAuth } from "@/contexts/AuthContext";
import CityAutocomplete from "@/components/CityAutocomplete";
import { JOB_CATEGORIES, SPECIAL_CATEGORIES, RADIUS_OPTIONS } from "@shared/categories";
import {
  MapPin, Search, Briefcase, LocateFixed, Flame, X,
  Navigation, AlertCircle, SlidersHorizontal, UserCheck, ChevronDown,
  Clock, Zap, BadgePercent, ChevronLeft,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  C_BRAND_HEX, C_BORDER, C_TEXT_MUTED, C_SUCCESS_HEX, C_DANGER_HEX,
} from "@/lib/colors";
import { reverseGeocode } from "@/lib/reverseGeocode";

const LOCATION_CACHE_KEY = "findJobs_location";
const LOCATION_CACHE_TTL = 60 * 60 * 1000;
const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-workers-city_4c4f6dc8.jpg";

const SEO_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
  "חולון", "רחובות", "אשקלון", "בת ים", "הרצליה",
];

interface CachedLocation { lat: number; lng: number; cityName?: string; savedAt: number; }

function loadCachedLocation(): { lat: number; lng: number; cityName?: string } | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedLocation = JSON.parse(raw);
    if (Date.now() - cached.savedAt > LOCATION_CACHE_TTL) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    return { lat: cached.lat, lng: cached.lng, cityName: cached.cityName };
  } catch { return null; }
}
function saveLocationCache(lat: number, lng: number, cityName?: string) {
  try { localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lng, cityName, savedAt: Date.now() })); } catch {}
}
function clearLocationCache() {
  try { localStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
}

// ── Save preferences button ──────────────────────────────────────────────────
function UpdatePrefsBtn({ category, selectedCity }: { category: string; selectedCity: string | null }) {
  const utils = trpc.useUtils();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => { utils.user.getProfile.invalidate(); toast.success("העדפות עודכנו בהצלחה"); },
    onError: () => toast.error("שגיאה בעדכון העדפות"),
  });
  return (
    <button
      type="button"
      disabled={updateProfile.isPending}
      onClick={() => updateProfile.mutate({
        preferredCategories: category && category !== "all" ? [category] : [],
        preferredCity: selectedCity ?? null,
      })}
      className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
        color: "oklch(0.96 0.04 80)",
        boxShadow: "0 4px 16px oklch(0.28 0.06 122 / 0.35)",
      }}
    >
      {updateProfile.isPending
        ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        : <UserCheck className="h-4 w-4" />}
      שמור כהעדפות שלי
    </button>
  );
}

// ── Quick stats bar ──────────────────────────────────────────────────────────
function QuickStats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20px 0px" });
  const [jobCount, setJobCount] = useState(500);
  useEffect(() => {
    if (!inView) return;
    let cur = 500;
    const end = 750;
    const step = Math.ceil((end - cur) / 20);
    const t = setInterval(() => {
      cur = Math.min(cur + step, end);
      setJobCount(cur);
      if (cur >= end) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, [inView]);
  const stats = [
    { display: `+${jobCount}`, label: "משרות פעילות", Icon: Briefcase },
    { display: "100%", label: "ללא עמלות", Icon: BadgePercent },
    { display: "24/7", label: "זמין תמיד", Icon: Clock },
  ];
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.15 }}
      dir="rtl"
      className="flex items-stretch justify-between gap-0 rounded-2xl px-2 py-3 w-full"
      style={{
        background: "oklch(0.32 0.08 122 / 0.88)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        border: "1px solid oklch(0.55 0.09 122 / 0.40)",
        boxShadow: "0 4px 24px oklch(0.28 0.06 122 / 0.30), inset 0 1px 0 oklch(0.70 0.06 122 / 0.20)",
      }}
    >
      {stats.map(({ display, label, Icon }, i) => (
        <div key={label} className="flex items-stretch">
          {i > 0 && (
            <div style={{
              width: "1px", height: "44px", flexShrink: 0, alignSelf: "center",
              background: "linear-gradient(to bottom, transparent 0%, oklch(0.60 0.06 122 / 0.35) 30%, oklch(0.60 0.06 122 / 0.35) 70%, transparent 100%)",
            }} />
          )}
          <div className="text-center flex-1 flex flex-col items-center gap-0.5 py-1 px-3">
            <Icon size={14} style={{ color: "oklch(0.97 0.12 80.8)" }} />
            <div className="text-[19px] font-black leading-none tabular-nums" style={{ color: "oklch(0.97 0.02 91)" }}>{display}</div>
            <div className="text-[10px] font-semibold" style={{ color: "oklch(0.90 0.02 91 / 0.85)" }}>{label}</div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ── Category chip ────────────────────────────────────────────────────────────
function CategoryChip({ value, label, icon, active, onClick }: {
  value: string; label: string; icon: string; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all border-2 shrink-0"
      style={active ? {
        background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
        borderColor: "transparent",
        color: "oklch(0.96 0.04 80)",
        boxShadow: "0 3px 10px oklch(0.28 0.06 122 / 0.30)",
      } : {
        background: "white",
        borderColor: C_BORDER,
        color: "oklch(0.30 0.05 122)",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function FindJobs() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get("category") ?? "all";
  const { isAuthenticated } = useAuth();

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
  const filterParam = params.get("filter");
  const [showUrgentToday, setShowUrgentToday] = useState(
    params.get("urgent") === "1" || params.get("help") === "1" || filterParam === "today"
  );
  const [autoNearby] = useState(filterParam === "nearby");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [bottomSheetJob, setBottomSheetJob] = useState<null | {
    id: number; title: string; category: string; address: string; city?: string | null;
    salary?: string | null; salaryType: string; contactPhone: string | null | undefined;
    showPhone?: boolean | null; businessName?: string | null; startTime: string;
    startDateTime?: Date | string | null; isUrgent?: boolean | null; workersNeeded: number;
    createdAt: Date | string; expiresAt?: Date | string | null; distance?: number;
    description?: string | null;
  }>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [autoExpandedRadius, setAutoExpandedRadius] = useState(false);
  const [geoCity, setGeoCity] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [openFilterSection, setOpenFilterSection] = useState<"categories" | "location" | null>(null);
  const initialCity = params.get("city") ?? null;
  const [selectedCity, setSelectedCity] = useState<string | null>(initialCity);
  const [, navigate] = useLocation();
  const cityInputRef = useRef<HTMLInputElement>(null);

  const seoTitle = selectedCity ? `עבודות ב${selectedCity}` : category !== "all" ? `עבודות ${getCategoryLabel(category)}` : "חיפוש עבודה";
  const seoDescription = selectedCity
    ? `מצא עבודות זמניות ב${selectedCity}. משרות להיום, שליחויות, מחסן, מטבח ועוד.`
    : category !== "all"
    ? `מצא עבודות ${getCategoryLabel(category)} קרוב אליך. לוח דרושים מהיר ופשוט.`
    : "לוח דרושים מהיר ופשוט. מצא עבודות זמניות קרוב אליך — שליחויות, מחסן, מטבח ועוד.";
  const seoCanonical = selectedCity
    ? `/find-jobs?city=${encodeURIComponent(selectedCity)}`
    : category !== "all" ? `/find-jobs?category=${encodeURIComponent(category)}` : "/find-jobs";
  const hasActiveFilter = selectedCity !== "" || category !== "all";
  const [noIndexReady, setNoIndexReady] = useState(false);
  useSEO({ title: seoTitle, description: seoDescription, canonical: seoCanonical, noIndex: noIndexReady });

  const profileQuery = trpc.user.getProfile.useQuery(undefined, { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 });
  const { loading: authLoading } = useAuth();
  const filterInitialized = useRef(false);

  useEffect(() => {
    if (filterInitialized.current) return;
    if (authLoading) return;
    if (!isAuthenticated) { filterInitialized.current = true; setFilterOpen(true); return; }
    if (profileQuery.isLoading) return;
    const profile = profileQuery.data;
    const hasProfile = (profile?.preferredCategories && profile.preferredCategories.length > 0) || !!profile?.preferredCity;
    filterInitialized.current = true;
    if (!hasProfile) setFilterOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, profileQuery.isLoading, profileQuery.data]);

  const citiesQuery = trpc.user.getCities.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const popularCities = (citiesQuery.data ?? []).slice(0, 8).map((c: { nameHe: string }) => c.nameHe);

  useEffect(() => {
    const cached = loadCachedLocation();
    if (cached) {
      setUserLat(cached.lat); setUserLng(cached.lng);
      if (cached.cityName) setGeoCity(cached.cityName);
    } else if (autoNearby) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLat(latitude); setUserLng(longitude); setLocating(false); setLocationDenied(false);
          const city = await reverseGeocode(latitude, longitude);
          setGeoCity(city); saveLocationCache(latitude, longitude, city ?? undefined);
          toast.success(city ? `מיקום נמצא — מציג עבודות ליד ${city}` : "מיקום נמצא");
        },
        () => { setLocating(false); setLocationDenied(true); setShowCityInput(true); toast.error("לא ניתן לאתר מיקום — הזן עיר ידנית"); }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireLogin = (message: string) => { saveReturnPath(); setLoginMessage(message); setLoginOpen(true); };

  const doGetLocation = () => {
    setLocating(true); setShowLocationDialog(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude); setUserLng(longitude); setLocating(false); setLocationDenied(false); setAutoExpandedRadius(false);
        const city = await reverseGeocode(latitude, longitude);
        setGeoCity(city); saveLocationCache(latitude, longitude, city ?? undefined);
        toast.success(city ? `מיקום נמצא — מציג עבודות ליד ${city}` : "מיקום נמצא");
      },
      () => { setLocating(false); setLocationDenied(true); setShowCityInput(true); toast.error("לא ניתן לאתר מיקום — הזן עיר ידנית"); }
    );
  };

  const handleLocationButtonClick = () => {
    if (userLat) { setUserLat(null); setUserLng(null); setGeoCity(null); clearLocationCache(); setAutoExpandedRadius(false); toast("מיקום בוטל"); return; }
    setShowLocationDialog(true);
  };

  const handleCitySelect = (city: string, lat: number, lng: number) => {
    setUserLat(lat); setUserLng(lng); setGeoCity(city); saveLocationCache(lat, lng, city);
    setShowCityInput(false); setAutoExpandedRadius(false); toast.success(`מציג עבודות קרוב ל${city}`);
  };

  const searchQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm, category: category === "all" ? undefined : category, limit: 50, city: selectedCity ?? undefined },
    { enabled: true }
  );
  const listQuery = trpc.jobs.list.useQuery(
    { category: category === "all" ? undefined : category, limit: 50, city: selectedCity ?? undefined },
    { enabled: !userLat }
  );
  const todayQuery = trpc.jobs.listToday.useQuery(
    { category: category === "all" ? undefined : category, limit: 50 },
    { enabled: showUrgentToday }
  );
  const savedIdsQuery = trpc.savedJobs.getSavedIds.useQuery(undefined, { enabled: isAuthenticated });
  const savedIds = new Set(savedIdsQuery.data?.ids ?? []);
  const utilsFj = trpc.useUtils();
  const saveMutationFj = trpc.savedJobs.save.useMutation({ onSuccess: () => utilsFj.savedJobs.getSavedIds.invalidate() });
  const unsaveMutationFj = trpc.savedJobs.unsave.useMutation({ onSuccess: () => utilsFj.savedJobs.getSavedIds.invalidate() });
  const myAppsQueryFj = trpc.jobs.myApplications.useQuery(undefined, { enabled: isAuthenticated });
  const appliedJobIdsFj = new Set((myAppsQueryFj.data ?? []).map((a: { jobId: number }) => a.jobId));
  const applyMutationFj = trpc.jobs.applyToJob.useMutation({
    onSuccess: () => { utilsFj.jobs.myApplications.invalidate(); toast.success("מועמדות הוגשה בהצלחה!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const handleApplyFj = (jobId: number, message: string | undefined, origin: string) => {
    if (!isAuthenticated) { requireLogin("כדי להגיש מועמדות יש להתחבר"); return; }
    applyMutationFj.mutate({ jobId, message, origin });
  };
  const handleSaveToggle = (jobId: number, save: boolean) => {
    if (!isAuthenticated) { requireLogin("כדי לשמור משרות יש להתחבר למערכת"); return; }
    if (save) saveMutationFj.mutate({ jobId }); else unsaveMutationFj.mutate({ jobId });
  };

  type AnyJob = NonNullable<typeof searchQuery.data>[number] | NonNullable<typeof listQuery.data>[number];
  let jobs: AnyJob[] = userLat ? (searchQuery.data ?? []) : (listQuery.data ?? []);
  const isLoading = userLat ? searchQuery.isLoading : listQuery.isLoading;

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    jobs = jobs.filter(j => j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || j.address.toLowerCase().includes(q));
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
  if (selectedTimeSlots.length > 0) {
    const slotRanges: Record<string, [number, number]> = { morning: [6, 12], afternoon: [12, 17], evening: [17, 22], night: [22, 30] };
    jobs = jobs.filter(j => {
      const wh = (j as { workingHours?: string | null }).workingHours;
      if (!wh) return false;
      const match = wh.match(/(\d{1,2}):(\d{2})/);
      if (!match) return false;
      const startHour = parseInt(match[1], 10);
      return selectedTimeSlots.some(slot => {
        const [from, to] = slotRanges[slot];
        if (slot === "night") return startHour >= 22 || startHour < 6;
        return startHour >= from && startHour < to;
      });
    });
  }
  jobs = [...jobs].sort((a, b) => {
    if (userLat) {
      const aDist = (a as { distance?: number | null }).distance ?? Infinity;
      const bDist = (b as { distance?: number | null }).distance ?? Infinity;
      if (aDist !== bDist) return aDist - bDist;
    }
    const aUrgent = (a as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    const bUrgent = (b as { isUrgent?: boolean | null }).isUrgent ? 1 : 0;
    return bUrgent - aUrgent;
  });

  useEffect(() => {
    if (!isLoading && userLat && jobs.length === 0 && radiusKm < 50 && !autoExpandedRadius) setAutoExpandedRadius(true);
  }, [isLoading, userLat, jobs.length, radiusKm, autoExpandedRadius]);

  useEffect(() => {
    if (!isLoading && hasActiveFilter && jobs.length === 0) setNoIndexReady(true);
    else setNoIndexReady(false);
  }, [isLoading, hasActiveFilter, jobs.length]);

  const activeFilterCount = [category !== "all", !!selectedCity || !!userLat, showUrgentToday, selectedTimeSlots.length > 0].filter(Boolean).length;

  // ── Pill style helper ──────────────────────────────────────────────────────
  const activePill = {
    background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
    borderColor: "transparent",
    color: "oklch(0.96 0.04 80)",
    boxShadow: "0 3px 10px oklch(0.28 0.06 122 / 0.28)",
  } as React.CSSProperties;
  const inactivePill = { background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" } as React.CSSProperties;

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: "var(--page-bg)" }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "300px" }}>
        <img
          src={HERO_IMG}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Dark olive overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to left, oklch(0.22 0.08 122 / 0.80) 0%, oklch(0.22 0.08 122 / 0.55) 55%, oklch(0.22 0.08 122 / 0.35) 100%)",
        }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
          height: "110px",
          background: "linear-gradient(to bottom, transparent 0%, var(--page-bg) 100%)",
        }} />

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-16 text-right">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{
              background: "oklch(0.32 0.07 122)",
              border: "1px solid oklch(0.45 0.09 122 / 0.5)",
              boxShadow: "0 2px 10px oklch(0.28 0.06 122 / 0.30)",
            }}
          >
            <Zap className="h-3 w-3" style={{ color: "oklch(0.85 0.16 80)" }} />
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "oklch(0.92 0.04 80)", letterSpacing: "0.05em" }}>
              לוח דרושים מהיר ופשוט
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-[32px] sm:text-[42px] leading-[1.1] font-black mb-3"
            style={{
              color: "oklch(0.97 0.02 91)",
              fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
              textShadow: "0 2px 16px oklch(0.12 0.06 122 / 0.60)",
            }}
          >
            {selectedCity ? (
              <>עבודות ב<span style={{ color: "oklch(0.85 0.14 80.8)" }}>{selectedCity}</span></>
            ) : category !== "all" ? (
              <>עבודות <span style={{ color: "oklch(0.85 0.14 80.8)" }}>{getCategoryLabel(category)}</span></>
            ) : (
              <>מצא עבודה<br /><span style={{ color: "oklch(0.85 0.14 80.8)" }}>שמתאימה לך</span></>
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[14px] font-semibold leading-relaxed mb-5 max-w-[280px]"
            style={{ color: "oklch(0.90 0.02 91 / 0.85)" }}
          >
            קשר ישיר עם מעסיקים — ללא עמלות, ללא בירוקרטיה
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-[300px]"
          >
            <QuickStats />
          </motion.div>
        </div>
      </section>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 pb-16 -mt-4 relative z-10">

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
          className="mb-4"
        >
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{
              background: "white",
              border: `1.5px solid ${C_BORDER}`,
              boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.12)",
            }}
          >
            <Search className="h-5 w-5 shrink-0" style={{ color: C_BRAND_HEX }} />
            <input
              type="search"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="חפש לפי תפקיד, עיר, מילת מפתח..."
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
              style={{ color: "oklch(0.22 0.03 122.3)" }}
              dir="rtl"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Category chips */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}
          className="mb-4"
        >
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <CategoryChip value="all" label="הכל" icon="✨" active={category === "all"} onClick={() => setCategory("all")} />
            {JOB_CATEGORIES.map(cat => (
              <CategoryChip key={cat.value} value={cat.value} label={cat.label} icon={cat.icon} active={category === cat.value} onClick={() => setCategory(cat.value)} />
            ))}
          </div>
        </motion.div>

        {/* Quick action row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="flex gap-2 mb-4"
        >
          {/* Location */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleLocationButtonClick}
            disabled={locating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm relative overflow-hidden transition-all"
            style={userLat ? {
              background: "linear-gradient(135deg, oklch(0.50 0.18 160) 0%, oklch(0.42 0.18 155) 100%)",
              color: "white", boxShadow: "0 4px 16px oklch(0.50 0.18 160 / 0.35)",
            } : {
              background: "white", border: `1.5px solid ${C_BORDER}`,
              color: "oklch(0.30 0.05 122)", boxShadow: "0 2px 8px oklch(0.28 0.06 122 / 0.08)",
            }}
          >
            {locating ? (
              <><BrandLoader size="sm" /><span>מאתר...</span></>
            ) : userLat ? (
              <><LocateFixed className="h-4 w-4" /><span>{geoCity ?? "קרוב אלי"} · {radiusKm} ק"מ</span><X className="h-3.5 w-3.5 opacity-70" /></>
            ) : (
              <>
                <span className="absolute right-3 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-20" style={{ background: C_SUCCESS_HEX }} />
                </span>
                <MapPin className="h-4 w-4 mr-4" style={{ color: C_SUCCESS_HEX }} />
                <span>עבודות קרוב אלי</span>
              </>
            )}
          </motion.button>

          {/* Urgent */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowUrgentToday(v => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all"
            style={showUrgentToday ? {
              background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
              color: "white", boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
            } : { background: "white", border: `1.5px solid ${C_BORDER}`, color: "oklch(0.30 0.05 122)" }}
          >
            <Flame className="h-4 w-4" />
            <span>דחוף</span>
          </motion.button>

          {/* Filter */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setFilterOpen(v => !v)}
            className="relative flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all"
            style={filterOpen ? {
              background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
              color: "oklch(0.96 0.04 80)", boxShadow: "0 4px 16px oklch(0.28 0.06 122 / 0.35)",
            } : { background: "white", border: `1.5px solid ${C_BORDER}`, color: "oklch(0.30 0.05 122)" }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                style={{ background: C_DANGER_HEX, color: "white" }}
              >
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </motion.div>

        {/* Location dialog */}
        <AnimatePresence>
          {showLocationDialog && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 rounded-2xl p-4"
              style={{ background: "white", border: `1.5px solid ${C_BORDER}`, boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.12)" }}
            >
              <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>אפשר גישה למיקום?</p>
              <p className="text-xs mb-3" style={{ color: C_TEXT_MUTED }}>נשתמש במיקום שלך כדי להציג עבודות קרובות אליך בלבד</p>
              <div className="flex gap-2">
                <button onClick={doGetLocation} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg, oklch(0.50 0.18 160) 0%, oklch(0.42 0.18 155) 100%)" }}>
                  אפשר גישה
                </button>
                <button onClick={() => { setShowLocationDialog(false); setShowCityInput(true); }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm border"
                  style={{ borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                  הזן עיר ידנית
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* City input */}
        <AnimatePresence>
          {showCityInput && !userLat && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4">
              <CityAutocomplete inputRef={cityInputRef} value={citySearch} onChange={setCitySearch} onSelect={handleCitySelect} placeholder="הזן שם עיר..." />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active geo bar */}
        <AnimatePresence>
          {userLat && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "oklch(0.50 0.18 160 / 0.08)", border: "1px solid oklch(0.50 0.18 160 / 0.25)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">{geoCity ? `מציג עבודות ליד ${geoCity}` : "מציג עבודות קרוב אליך"}</p>
                  <p className="text-xs text-green-600">בטווח {radiusKm} ק"מ</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {RADIUS_OPTIONS.map(r => (
                  <button key={r.value} onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                    className="px-2 py-1 rounded-full text-xs font-medium transition-all"
                    style={radiusKm === r.value ? { background: C_SUCCESS_HEX, color: "white" } : { background: "white", color: "#15803d", border: "1px solid #bbf7d0" }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl p-4" style={{ background: "white", border: `1.5px solid ${C_BORDER}`, boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.10)" }}>

                {/* Profile recommendation */}
                {isAuthenticated && !profileQuery.isLoading && (() => {
                  const profile = profileQuery.data;
                  const hasProfile = (profile?.preferredCategories && profile.preferredCategories.length > 0) || !!profile?.preferredCity;
                  return !hasProfile ? (
                    <Link href="/profile">
                      <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl cursor-pointer hover:opacity-90 transition-all"
                        style={{ background: "oklch(0.96 0.03 122 / 0.6)", border: "1px solid oklch(0.88 0.05 122 / 0.6)" }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "oklch(0.92 0.04 122)", border: "1px solid oklch(0.82 0.06 122)" }}>
                          <UserCheck className="h-4 w-4" style={{ color: C_BRAND_HEX }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.06 122)" }}>מלא את הפרופיל שלך</p>
                          <p className="text-xs" style={{ color: "oklch(0.42 0.05 122)" }}>הגדר קטגוריות ועיר מועדפת לסינון אוטומטי</p>
                        </div>
                        <ChevronLeft className="h-4 w-4 shrink-0" style={{ color: C_BRAND_HEX }} />
                      </div>
                    </Link>
                  ) : null;
                })()}

                {/* Categories section */}
                <div style={{ borderBottom: "1px solid oklch(0.94 0.02 100)" }} className="pb-4 mb-4">
                  <button type="button" onClick={() => setOpenFilterSection(s => s === "categories" ? null : "categories")}
                    className="w-full flex items-center gap-2 py-2 text-right">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
                      <Briefcase className="h-3 w-3" style={{ color: C_BRAND_HEX }} />
                    </div>
                    <span className="font-bold text-sm flex-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>תחומי עיסוק</span>
                    {category !== "all" && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX }}>
                        {JOB_CATEGORIES.find(c => c.value === category)?.icon} {JOB_CATEGORIES.find(c => c.value === category)?.label}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: openFilterSection === "categories" ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateRows: openFilterSection === "categories" ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                    <div className="overflow-hidden">
                      <div className="pt-3 flex flex-wrap gap-2">
                        {[{ value: "all", label: "הכל", icon: "✨" }, ...JOB_CATEGORIES].map(cat => (
                          <button key={cat.value} onClick={() => setCategory(cat.value)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2"
                            style={category === cat.value ? activePill : inactivePill}>
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                        {SPECIAL_CATEGORIES.map(cat => (
                          <button key={cat.value} onClick={() => setCategory(cat.value)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2"
                            style={category === cat.value ? activePill : {
                              background: cat.color === "purple" ? "oklch(0.97 0.02 300)" : cat.color === "amber" ? "oklch(0.97 0.03 80)" : "oklch(0.97 0.04 160)",
                              borderColor: cat.color === "purple" ? "oklch(0.80 0.08 300)" : cat.color === "amber" ? "oklch(0.80 0.10 80)" : "oklch(0.80 0.12 160)",
                              color: cat.color === "purple" ? "oklch(0.40 0.15 300)" : cat.color === "amber" ? "oklch(0.40 0.12 80)" : "oklch(0.35 0.15 160)",
                            }}>
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location section */}
                <div style={{ borderBottom: "1px solid oklch(0.94 0.02 100)" }} className="pb-4 mb-4">
                  <button type="button" onClick={() => setOpenFilterSection(s => s === "location" ? null : "location")}
                    className="w-full flex items-center gap-2 py-2 text-right">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
                      <MapPin className="h-3 w-3" style={{ color: C_BRAND_HEX }} />
                    </div>
                    <span className="font-bold text-sm flex-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>מיקום</span>
                    <span className="text-xs" style={{ color: C_TEXT_MUTED }}>
                      {userLat ? `${radiusKm} ק"מ${geoCity ? ` · ${geoCity}` : ""}` : selectedCity ?? "לא נבחר"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: openFilterSection === "location" ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateRows: openFilterSection === "location" ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                    <div className="overflow-hidden">
                      <div className="pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => { if (!userLat) handleLocationButtonClick(); }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${userLat ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            <LocateFixed className="h-4 w-4" />
                            {locating ? "מאתר..." : userLat ? `${radiusKm} ק"מ ממני` : "לפי מיקום"}
                          </button>
                          <button type="button"
                            onClick={() => { if (userLat) { setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false); } setShowCityInput(true); setTimeout(() => cityInputRef.current?.focus(), 100); }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${!userLat && (selectedCity || showCityInput) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            <MapPin className="h-4 w-4" />
                            {selectedCity ?? "לפי עיר"}
                          </button>
                        </div>
                        {userLat && (
                          <div className="flex gap-1.5 flex-wrap">
                            {RADIUS_OPTIONS.map(r => (
                              <button key={r.value} onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border-2"
                                style={radiusKm === r.value ? activePill : inactivePill}>
                                {r.label}
                              </button>
                            ))}
                            <button onClick={() => { setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false); toast("מיקום בוטל"); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                              style={{ borderColor: C_BORDER, color: C_TEXT_MUTED }}>
                              <X className="h-3 w-3" /> בטל
                            </button>
                          </div>
                        )}
                        {showCityInput && !userLat && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <CityAutocomplete inputRef={cityInputRef} value={citySearch} onChange={setCitySearch} onSelect={handleCitySelect} placeholder="הזן שם עיר..." />
                            </div>
                            <button onClick={() => { setShowCityInput(false); setCitySearch(""); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {popularCities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {popularCities.map((city: string) => (
                              <button key={city} onClick={() => { setSelectedCity(city); setShowCityInput(false); }}
                                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                                style={selectedCity === city ? { background: "oklch(0.92 0.04 122)", borderColor: "oklch(0.70 0.07 122)", color: C_BRAND_HEX } : inactivePill}>
                                {city}
                              </button>
                            ))}
                            {selectedCity && (
                              <button onClick={() => setSelectedCity(null)} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                                style={{ borderColor: C_BORDER, color: C_TEXT_MUTED }}>
                                <X className="h-3 w-3" /> נקה
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time of day */}
                <div className="mb-4">
                  <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.40 0.03 122.3)" }}>שעות עבודה (אופציונלי)</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "morning", label: "בוקר", sub: "06–12", icon: "🌅" },
                      { value: "afternoon", label: "צהריים", sub: "12–17", icon: "☀️" },
                      { value: "evening", label: "ערב", sub: "17–22", icon: "🌆" },
                      { value: "night", label: "לילה", sub: "22–06", icon: "🌙" },
                    ].map(slot => {
                      const isActive = selectedTimeSlots.includes(slot.value);
                      return (
                        <button key={slot.value}
                          onClick={() => setSelectedTimeSlots(prev => prev.includes(slot.value) ? prev.filter(s => s !== slot.value) : [...prev, slot.value])}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2"
                          style={isActive ? activePill : inactivePill}>
                          <span>{slot.icon}</span>
                          <span>{slot.label}</span>
                          <span className="opacity-60 text-[10px]">{slot.sub}</span>
                        </button>
                      );
                    })}
                    {selectedTimeSlots.length > 0 && (
                      <button onClick={() => setSelectedTimeSlots([])} className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs border"
                        style={{ borderColor: C_BORDER, color: C_TEXT_MUTED }}>
                        <X className="h-3 w-3" /> נקה
                      </button>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <UpdatePrefsBtn category={category} selectedCity={selectedCity} />
                  <button type="button" onClick={() => { setFilterOpen(false); toast.success("מציג תוצאות מסוננות"); }}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "oklch(0.96 0.02 122)", color: C_BRAND_HEX, border: `1.5px solid oklch(0.88 0.05 122)` }}>
                    <Search className="h-4 w-4" />
                    הצג תוצאות
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Radius expand suggestion */}
        <AnimatePresence>
          {autoExpandedRadius && userLat && jobs.length === 0 && !isLoading && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 rounded-2xl p-4 mb-4"
              style={{ background: "oklch(0.78 0.17 65 / 0.08)", border: "1px solid oklch(0.78 0.17 65 / 0.25)" }}>
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.17 65)" }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "oklch(0.40 0.12 65)" }}>לא נמצאו עבודות בטווח {radiusKm} ק"מ</p>
                <p className="text-xs mt-0.5" style={{ color: C_TEXT_MUTED }}>הרחב את החיפוש?</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {RADIUS_OPTIONS.filter(r => r.value > radiusKm).map(r => (
                    <button key={r.value} onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                      style={{ background: "white", borderColor: "oklch(0.78 0.17 65 / 0.4)", color: "oklch(0.40 0.12 65)" }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black" style={{ color: "oklch(0.22 0.03 122.3)" }}>
              {isLoading ? "מחפש משרות..." : jobs.length === 0 ? "לא נמצאו משרות" : `${jobs.length} משרות`}
            </h2>
            {showUrgentToday && !isLoading && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                🔥 דחוף
              </span>
            )}
          </div>
          {/* Active filter chips */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {category !== "all" && (
              <button onClick={() => setCategory("all")}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX }}>
                {JOB_CATEGORIES.find(c => c.value === category)?.icon} {JOB_CATEGORIES.find(c => c.value === category)?.label}
                <X className="h-2.5 w-2.5" />
              </button>
            )}
            {selectedCity && (
              <button onClick={() => setSelectedCity(null)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "oklch(0.94 0.03 210)", color: "oklch(0.35 0.12 210)" }}>
                📍 {selectedCity} <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Job list */}
        {isLoading ? (
          <JobCardSkeletonList count={4} />
        ) : jobs.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(0.92 0.04 122)" }}>
              <Search className="h-8 w-8" style={{ color: C_BRAND_HEX }} />
            </div>
            <h3 className="text-lg font-black mb-2" style={{ color: "oklch(0.22 0.03 122.3)" }}>לא נמצאו משרות</h3>
            <p className="text-sm mb-6" style={{ color: C_TEXT_MUTED }}>נסה לשנות את הסינון או להרחיב את אזור החיפוש</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              {category !== "all" && (
                <button onClick={() => setCategory("all")} className="py-3 rounded-2xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)", color: "oklch(0.96 0.04 80)" }}>
                  הצג כל הקטגוריות
                </button>
              )}
              {selectedCity && (
                <button onClick={() => setSelectedCity(null)} className="py-3 rounded-2xl font-bold text-sm border"
                  style={{ borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                  הסר סינון עיר
                </button>
              )}
            </div>
            <div className="mt-8">
              <p className="text-xs font-bold mb-3" style={{ color: C_TEXT_MUTED }}>חיפושים פופולריים:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SEO_CITIES.slice(0, 6).map(city => (
                  <Link key={city} href={`/jobs/${encodeURIComponent(city)}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                    עבודות ב{city}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
            className="space-y-3"
          >
            {jobs.map(job => {
              const j = job as unknown as JobCardJob & { distance?: number };
              return (
                <motion.div key={j.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
                  <JobCard
                    job={j}
                    isSaved={savedIds.has(j.id)}
                    isApplied={appliedJobIdsFj.has(j.id)}
                    onSaveToggle={handleSaveToggle}
                    onApply={handleApplyFj}
                    onCardClick={() => { setBottomSheetJob(j); setBottomSheetOpen(true); }}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Location prompt when no geo */}
        {!userLat && !selectedCity && !isLoading && jobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
            <button onClick={handleLocationButtonClick} disabled={locating}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-right transition-all hover:opacity-90"
              style={{ background: "oklch(0.50 0.18 160 / 0.06)", border: "1.5px dashed oklch(0.50 0.18 160 / 0.4)" }}>
              <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                <LocateFixed className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-800">עבודות קרוב אלי</p>
                <p className="text-xs text-green-600">אפשר גישה למיקום להצגת משרות בסביבתך</p>
              </div>
              <Navigation className="h-4 w-4 text-green-500 shrink-0" />
            </button>
          </motion.div>
        )}

        {/* ══ SEO INTERNAL LINKS ══════════════════════════════════════════════ */}
        <div className="mt-12 space-y-8">
          {selectedCity && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4" style={{ color: C_BRAND_HEX }} />
                <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 122)" }}>עוד משרות ב{selectedCity}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {JOB_CATEGORIES.map(cat => (
                  <Link key={cat.value} href={`/jobs/${cat.value}/${encodeURIComponent(selectedCity)}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                    style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                    {cat.icon} עבודות {cat.label} ב{selectedCity}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {category !== "all" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4" style={{ color: C_BRAND_HEX }} />
                <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 122)" }}>עבודות {getCategoryLabel(category)} לפי עיר</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {SEO_CITIES.map(city => (
                  <Link key={city} href={`/jobs/${category}/${encodeURIComponent(city)}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                    style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                    עבודות {getCategoryLabel(category)} ב{city}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4" style={{ color: C_BRAND_HEX }} />
              <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 122)" }}>חיפוש לפי עיר</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEO_CITIES.filter(c => c !== selectedCity).map(city => (
                <Link key={city} href={`/jobs/${encodeURIComponent(city)}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                  עבודות ב{city}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-4 w-4" style={{ color: C_BRAND_HEX }} />
              <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 122)" }}>חיפוש לפי קטגוריה</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.filter(c => c.value !== category).map(cat => (
                <Link key={cat.value} href={`/jobs/${cat.value}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                  {cat.icon} עבודות {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
      <JobBottomSheet
        job={bottomSheetJob}
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onLoginRequired={requireLogin}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}

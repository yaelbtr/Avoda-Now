import { useState, useEffect, useRef } from "react";
import { useSearch, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import JobBottomSheet from "@/components/JobBottomSheet";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import EmptyStateCarousel from "@/components/EmptyStateCarousel";
import LoginModal from "@/components/LoginModal";
import { saveReturnPath } from "@/const";
import { useAuth } from "@/contexts/AuthContext";
import CityAutocomplete from "@/components/CityAutocomplete";
import { RADIUS_OPTIONS } from "@shared/categories";
import { useCategories } from "@/hooks/useCategories";
import {
  MapPin, Search, Briefcase, LocateFixed, Flame, X,
  Navigation, AlertCircle, SlidersHorizontal, UserCheck, ChevronDown,
  Clock, Zap, BadgePercent, ChevronLeft, ArrowUp, CalendarDays,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import BrandLoader from "@/components/BrandLoader";
import { AppButton } from "@/components/AppButton";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  C_BRAND_HEX, C_BORDER, C_TEXT_MUTED, C_SUCCESS_HEX, C_DANGER_HEX,
} from "@/lib/colors";
import { reverseGeocode } from "@/lib/reverseGeocode";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

const LOCATION_CACHE_KEY = "findJobs_location";
const LOCATION_CACHE_TTL = 60 * 60 * 1000;
const FILTER_PREFS_KEY = "findJobs_filters";

// ── Filter persistence helpers ────────────────────────────────────────────────
interface SavedFilters {
  category: string;               // legacy — kept for backward-compat (first of selectedCategories)
  selectedCategories: string[];   // multi-category filter (primary)
  selectedCity: string | null;    // legacy — kept for backward-compat
  selectedCities: string[];       // multi-city filter (primary)
  selectedTimeSlots: string[];
  selectedDays: string[];
  sortBy: "distance" | "salary" | "date" | "default";
  savedAt: number;
}

function loadSavedFilters(): Partial<SavedFilters> | null {
  try {
    const raw = localStorage.getItem(FILTER_PREFS_KEY);
    if (!raw) return null;
    const parsed: SavedFilters = JSON.parse(raw);
    // Expire after 7 days
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(FILTER_PREFS_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

function saveFiltersToStorage(filters: Omit<SavedFilters, 'savedAt'>) {
  try { localStorage.setItem(FILTER_PREFS_KEY, JSON.stringify({ ...filters, savedAt: Date.now() })); } catch {}
}

function clearSavedFilters() {
  try { localStorage.removeItem(FILTER_PREFS_KEY); } catch {}
}
const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/hero-home-services-YoZj9FcDmwCDxbV9srgi42.webp";

/** Maps day name strings to JS day numbers (0=Sun, 1=Mon, ..., 6=Sat) */
const DAY_NAME_TO_NUM: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const SEO_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
  "חולון", "רחובות", "אשקלון", "בת ים", "הרצליה",
];

// Nearby cities map for smart empty-state suggestions
const NEARBY_CITIES: Record<string, string[]> = {
  "תל אביב": ["רמת גן", "בני ברק", "חולון", "בת ים", "הרצליה"],
  "ירושלים": ["בית שמש", "מודיעין", "רמלה", "קריית ענבים"],
  "חיפה": ["קריית אתא", "נשר", "טירת הכרמל", "אור עקיבא"],
  "ראשון לציון": ["תל אביב", "חולון", "בת ים", "רחובות"],
  "פתח תקווה": ["תל אביב", "בני ברק", "רמת גן", "הרצליה"],
  "אשדוד": ["אשקלון", "קריית גת", "נתיבות"],
  "נתניה": ["הרצליה", "ראשון לציון", "חדרה", "קדימה"],
  "באר שבע": ["דימונה", "נתיבות", "עומר"],
  "בני ברק": ["תל אביב", "רמת גן", "פתח תקווה"],
  "רמת גן": ["תל אביב", "בני ברק", "גבעתיים"],
  "חולון": ["תל אביב", "בת ים", "ראשון לציון"],
  "הרצליה": ["תל אביב", "ראשון לציון", "נתניה", "רמת השרון"],
};

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
      className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
      style={{
        background: "transparent",
        color: "oklch(0.38 0.07 122)",
        border: "1.5px dashed oklch(0.72 0.07 122)",
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

  // Fetch real counts for conditional display
  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // refresh every 5 min
  });
  const hs = heroStatsQuery.data;

  // Determine the dynamic stat to show (priority order)
  const dynamicStat: { display: string; label: string; Icon: typeof Briefcase } | null = (() => {
    if (!hs) return null;
    if (hs.activeJobs > 50)      return { display: `+${hs.activeJobs}`, label: "משרות פעילות",  Icon: Briefcase };
    if (hs.closedJobs > 50)      return { display: `+${hs.closedJobs}`, label: "משרות שנסגרו",  Icon: Briefcase };
    if (hs.registeredWorkers > 100) return { display: `+${hs.registeredWorkers}`, label: "עובדים רשומים", Icon: UserCheck };
    return null; // hide the stat entirely
  })();

  const stats = [
    ...(dynamicStat ? [dynamicStat] : []),
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


// ── Smart Empty State (delegated to EmptyStateCarousel) ─────────────────────
interface SmartEmptyStateProps {
  category: string;
  catName: string;
  catIcon?: string;
  selectedCity: string | null;
  dateFilter: string | null;
  selectedTimeSlots: string[];
  selectedDays: string[];
  showUrgentToday: boolean;
  searchText: string;
  isAuthenticated: boolean;
  onClearCategory: () => void;
  onClearCity: () => void;
  onClearDateFilter: () => void;
  onClearTimeSlots: () => void;
  onClearDays: () => void;
  onClearUrgent: () => void;
  onClearSearch: () => void;
  onSelectCity: (city: string) => void;
  onShowTomorrow: () => void;
  onShowThisWeek: () => void;
  onClearAllFilters: () => void;
  showGeoNoResults?: boolean;
  radiusKm?: number;
  expandRadiusOptions?: { value: number; label: string }[];
  onExpandRadius?: (km: number) => void;
}

const DATE_FILTER_LABELS: Record<string, string> = {
  today: "היום",
  tomorrow: "מחר",
  this_week: "השבוע",
};

/** Format a dateFilter string for display: handles preset keys, ISO dates, and date ranges */
function formatDateFilterLabel(df: string | null): string {
  if (!df) return "";
  if (DATE_FILTER_LABELS[df]) return DATE_FILTER_LABELS[df];
  if (df.includes(":")) {
    const [from, to] = df.split(":");
    const fmt = (s: string) => new Date(s).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
    return `${fmt(from)} – ${fmt(to)}`;
  }
  return new Date(df).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

function SmartEmptyState({
  category, catName, catIcon, selectedCity, dateFilter,
  selectedTimeSlots, selectedDays, showUrgentToday, searchText,
  isAuthenticated, onClearCategory, onClearCity, onClearDateFilter,
  onClearTimeSlots, onClearDays, onClearUrgent, onClearSearch,
  onSelectCity, onShowTomorrow, onShowThisWeek, onClearAllFilters,
  showGeoNoResults, radiusKm, expandRadiusOptions, onExpandRadius,
}: SmartEmptyStateProps) {
  const hasAnyFilter = category !== "all" || !!selectedCity || !!dateFilter ||
    selectedTimeSlots.length > 0 || selectedDays.length > 0 || showUrgentToday || !!searchText;
  const nearbyCities = selectedCity ? (NEARBY_CITIES[selectedCity] ?? []) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-4 px-2"
      dir="rtl"
    >
      {/* Single auto-rotating carousel replaces all separate info cards */}
      <EmptyStateCarousel
        showUrgentToday={showUrgentToday}
        dateFilter={dateFilter}
        category={category}
        catName={catName}
        catIcon={catIcon}
        selectedCity={selectedCity}
        selectedTimeSlots={selectedTimeSlots}
        selectedDays={selectedDays}
        searchText={searchText}
        isAuthenticated={isAuthenticated}
        nearbyCities={nearbyCities}
        hasAnyFilter={hasAnyFilter}
        onShowTomorrow={onShowTomorrow}
        onShowThisWeek={onShowThisWeek}
        onClearCategory={onClearCategory}
        onSelectCity={onSelectCity}
        onClearAllFilters={onClearAllFilters}
        showGeoNoResults={showGeoNoResults}
        radiusKm={radiusKm}
        expandRadiusOptions={expandRadiusOptions}
        onExpandRadius={onExpandRadius}
      />

      {/* Active filter pills — quick remove */}
      {hasAnyFilter && (
        <div className="mb-5">
          <p className="text-xs font-bold mb-2 text-center" style={{ color: C_TEXT_MUTED }}>סינונים פעילים:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {searchText && (
              <button onClick={onClearSearch}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.94 0.02 84)", color: "oklch(0.35 0.06 84)", border: "1px solid oklch(0.86 0.04 84)" }}>
                🔍 {searchText} <X className="h-3 w-3" />
              </button>
            )}
            {category !== "all" && (
              <button onClick={onClearCategory}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX, border: "1px solid oklch(0.82 0.06 122)" }}>
                {catIcon} {catName} <X className="h-3 w-3" />
              </button>
            )}
            {selectedCity && (
              <button onClick={onClearCity}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.94 0.03 210)", color: "oklch(0.35 0.12 210)", border: "1px solid oklch(0.82 0.08 210)" }}>
                📍 {selectedCity} <X className="h-3 w-3" />
              </button>
            )}
            {dateFilter && (
              <button onClick={onClearDateFilter}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.94 0.04 55)", color: "oklch(0.38 0.12 55)", border: "1px solid oklch(0.82 0.08 55)" }}>
                📅 {formatDateFilterLabel(dateFilter)} <X className="h-3 w-3" />
              </button>
            )}
            {showUrgentToday && (
              <button onClick={onClearUrgent}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.96 0.04 25)", color: "oklch(0.45 0.18 25)", border: "1px solid oklch(0.82 0.10 25)" }}>
                🔥 דחוף <X className="h-3 w-3" />
              </button>
            )}
            {selectedTimeSlots.length > 0 && (
              <button onClick={onClearTimeSlots}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.94 0.03 270)", color: "oklch(0.38 0.12 270)", border: "1px solid oklch(0.82 0.08 270)" }}>
                ⏰ שעות ({selectedTimeSlots.length}) <X className="h-3 w-3" />
              </button>
            )}
            {selectedDays.length > 0 && (
              <button onClick={onClearDays}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: "oklch(0.94 0.03 180)", color: "oklch(0.38 0.12 180)", border: "1px solid oklch(0.82 0.08 180)" }}>
                📆 ימים ({selectedDays.length}) <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clear all */}
      {hasAnyFilter && (
        <div className="text-center mb-5">
          <button
            onClick={onClearAllFilters}
            className="px-6 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: "white", color: "oklch(0.45 0.06 122)", border: "1.5px solid oklch(0.88 0.04 122)" }}
          >
            <X className="h-3.5 w-3.5 inline ml-1" />
            נקה כל הסינונים
          </button>
        </div>
      )}

      {/* Popular cities */}
      <div>
        <p className="text-xs font-bold mb-3 text-center" style={{ color: C_TEXT_MUTED }}>חיפושים פופולריים:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {SEO_CITIES.slice(0, 8).map(city => (
            <button
              key={city}
              onClick={() => onSelectCity(city)}
              className="city-chip"
            >
              עבודות ב{city}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function FindJobs() {
  const { categories: dbCategories, isLoading: catsLoading } = useCategories();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get("category") ?? "all";
  const { isAuthenticated } = useAuth();

  // Load saved filters from localStorage (URL params take priority)
  const _savedFilters = loadSavedFilters();
  const filterParam = params.get("filter");
  // Multi-city: URL ?city=X seeds a single city; saved filters may have array
  const urlCity = params.get("city");
  const initialCities: string[] = urlCity
    ? [urlCity]
    : (_savedFilters?.selectedCities ?? (_savedFilters?.selectedCity ? [_savedFilters.selectedCity] : []));
  const initialCity = initialCities[0] ?? null; // legacy single-city compat
  const resolvedCategory = initialCategory !== "all" ? initialCategory : (_savedFilters?.category ?? "all");
  // Multi-category: seed from URL ?category=X or saved filters
  const initialCategories: string[] = resolvedCategory !== "all"
    ? [resolvedCategory]
    : (_savedFilters?.selectedCategories ?? []);

  const [category, setCategory] = useState(resolvedCategory); // legacy — kept for SEO/URL/SmartEmptyState
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories); // multi-category (primary)
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
    params.get("urgent") === "1" || params.get("help") === "1" || filterParam === "today"
  );
  const [autoNearby] = useState(filterParam === "nearby");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(_savedFilters?.selectedTimeSlots ?? []);
  const [selectedDays, setSelectedDays] = useState<string[]>(_savedFilters?.selectedDays ?? []);
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
  const filterSheetRef = useRef<HTMLDivElement>(null);
  const filterSwipeStartY = useRef<number | null>(null);
  const filterSwipeDy = useRef<number>(0);
  const handleFilterTouchStart = (e: React.TouchEvent) => {
    filterSwipeStartY.current = e.touches[0].clientY;
  };
  const handleFilterTouchMove = (e: React.TouchEvent) => {
    if (filterSwipeStartY.current === null) return;
    const dy = e.touches[0].clientY - filterSwipeStartY.current;
    filterSwipeDy.current = dy;
    if (dy > 0 && filterSheetRef.current) {
      filterSheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleFilterTouchEnd = () => {
    if (filterSwipeDy.current > 80) {
      setFilterOpen(false);
    } else if (filterSheetRef.current) {
      filterSheetRef.current.style.transform = "translateY(0)";
    }
    filterSwipeStartY.current = null;
    filterSwipeDy.current = 0;
  };
  // Calendar bottom-sheet swipe (mobile)
  const calSheetRef = useRef<HTMLDivElement>(null);
  const calSwipeStartY = useRef<number | null>(null);
  const calSwipeDy = useRef<number>(0);
  const handleCalTouchStart = (e: React.TouchEvent) => { calSwipeStartY.current = e.touches[0].clientY; };
  const handleCalTouchMove = (e: React.TouchEvent) => {
    if (calSwipeStartY.current === null) return;
    const dy = e.touches[0].clientY - calSwipeStartY.current;
    calSwipeDy.current = dy;
    if (dy > 0 && calSheetRef.current) calSheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const handleCalTouchEnd = () => {
    if (calSwipeDy.current > 80) {
      setCalendarOpen(false);
    } else if (calSheetRef.current) {
      calSheetRef.current.style.transform = "translateY(0)";
    }
    calSwipeStartY.current = null;
    calSwipeDy.current = 0;
  };
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"distance" | "salary" | "date" | "default">(_savedFilters?.sortBy ?? "date");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toolbarScrolled, setToolbarScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setShowScrollTop(y > 320);
      setToolbarScrolled(y > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Chip row: track whether there is hidden content to the left (RTL end side)
  useEffect(() => {
    const el = chipRowRef.current;
    if (!el) return;
    const check = () => {
      // In RTL, scrollLeft can be negative (Firefox) or positive (Chrome) depending on browser
      // scrollLeft === 0 means scrolled to the rightmost position (start in RTL)
      // Any non-zero value means there is content hidden to the left
      const hasLeft = Math.abs(el.scrollLeft) > 4;
      setChipRowCanScrollLeft(hasLeft);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    // Also re-check when chips change (resize observer)
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  // AnyJob type — defined here so it can be used in state declarations below
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyJob = { id: number; title: string; description: string; category: string; address: string; city?: string | null; salary?: string | null; salaryType: string; contactPhone: null; businessName?: string | null; startTime: string; startDateTime?: Date | string | null; isUrgent?: boolean | null; workersNeeded: number; createdAt: Date | string; expiresAt?: Date | string | null; distance?: number; latitude?: number | string | null; longitude?: number | string | null; workingHours?: string | null; jobDate?: string | null; images?: string[] | null };
  // Accumulated jobs across pages for infinite scroll
  const [accumulatedJobs, setAccumulatedJobs] = useState<AnyJob[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const chipRowRef = useRef<HTMLDivElement | null>(null);
  const [chipRowCanScrollLeft, setChipRowCanScrollLeft] = useState(false);
  const [openFilterSection, setOpenFilterSection] = useState<"categories" | "location" | "hours" | "days" | "date" | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(initialCity); // legacy — kept for SEO/URL
  const [selectedCities, setSelectedCities] = useState<string[]>(initialCities); // multi-city (primary)
  // Keep selectedCity in sync with selectedCities[0] for SEO/URL/legacy usage
  // Computed: whether current filters match saved filters (for UI indicator)
  const hasSavedFilters = (selectedCategories.length > 0 || selectedCities.length > 0 || selectedTimeSlots.length > 0 || selectedDays.length > 0 || sortBy !== "default") && loadSavedFilters() !== null;
  const [, navigate] = useLocation();
  const cityInputRef = useRef<HTMLInputElement>(null);

  const catName = dbCategories.find(c => c.slug === category)?.name ?? category;
  const seoTitle = selectedCity ? `עבודות ב${selectedCity}` : category !== "all" ? `עבודות ${catName}` : "עבודות בית ואירועים";
  const seoDescription = selectedCity
    ? `מצא עבודות זמניות ב${selectedCity}. משרות להיום, שליחויות, מחסן, מטבח ועוד.`
    : category !== "all"
    ? `עובדים ל${catName} זמינים תוך דקות — הגדר זמינות וקבל פנייה ישירות.`
    : "AvodaNow — עובדים לבית ואירועים תוך דקות. ניקיון, שירותי אירועים, תיקונים ועוד — הגדר זמינות וקבל עבודה.";
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

  const activeCitiesQuery = trpc.regions.getActiveCities.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const popularCities = activeCitiesQuery.data ?? [];

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

  const handleCitySelect = (city: string, _lat: number, _lng: number) => {
    // Multi-city mode: toggle city in selectedCities array
    setSelectedCities(prev => {
      const already = prev.includes(city);
      const next = already ? prev.filter(c => c !== city) : [...prev, city];
      setSelectedCity(next[0] ?? null); // keep legacy selectedCity in sync
      return next;
    });
    setUserLat(null); setUserLng(null); setGeoCity(null); clearLocationCache(); setAutoExpandedRadius(false);
    setShowCityInput(false); setCitySearch("");
    toast.success(`עיר ${selectedCities.includes(city) ? 'הוסרה' : 'נוספה'}: ${city}`);
  };

  // Convert selectedDays (string names) to JS day numbers (0=Sun..6=Sat) for backend
  // DAY_NAME_TO_NUM is defined as a module-level constant (see top of file)
  const dayOfWeekParam = selectedDays.length > 0 ? selectedDays.map(d => DAY_NAME_TO_NUM[d]).filter((n): n is number => n !== undefined) : undefined;

  // Use multi-city array for queries; fall back to single city for backward-compat
  const citiesParam = selectedCities.length > 0 ? selectedCities : undefined;
  // Use multi-category array for queries; fall back to single category for backward-compat
  const categoriesParam = selectedCategories.length > 0 ? selectedCategories : undefined;
  const legacyCategoryParam = selectedCategories.length === 1 ? selectedCategories[0] : (category === "all" ? undefined : category);
  const searchQuery = trpc.jobs.search.useQuery(
    { lat: userLat ?? 31.7683, lng: userLng ?? 35.2137, radiusKm, category: legacyCategoryParam, categories: categoriesParam, limit: PAGE_SIZE, page: currentPage, cities: citiesParam, dateFilter: dateFilter ?? undefined, dayOfWeek: dayOfWeekParam },
    { enabled: true }
  );
  const listQuery = trpc.jobs.list.useQuery(
    { category: legacyCategoryParam, categories: categoriesParam, limit: PAGE_SIZE, page: currentPage, cities: citiesParam, dateFilter: dateFilter ?? undefined, dayOfWeek: dayOfWeekParam },
    { enabled: !userLat }
  );
  const todayQuery = trpc.jobs.listToday.useQuery(
    { category: legacyCategoryParam, limit: 50 },
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

  // Extract jobs array from paginated response (jobs.list/jobs.search return { jobs, total, page, limit })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeQueryData = userLat ? (searchQuery.data as any) : (listQuery.data as any);
  const currentPageJobs: AnyJob[] = (activeQueryData?.jobs ?? []) as AnyJob[];
  const serverTotal: number = activeQueryData?.total ?? 0;
  // Append new page results to accumulated list (avoid duplicates by id)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (currentPageJobs.length === 0) return;
    setAccumulatedJobs(prev => {
      const existingIds = new Set(prev.map(j => j.id));
      const newJobs = currentPageJobs.filter(j => !existingIds.has(j.id));
      return newJobs.length > 0 ? [...prev, ...newJobs] : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQueryData]);
  let jobs: AnyJob[] = accumulatedJobs;
  const isLoading = userLat ? searchQuery.isLoading : listQuery.isLoading;
  const isFetching = userLat ? searchQuery.isFetching : listQuery.isFetching;
  // Show full skeleton on first load; show overlay shimmer on subsequent refetches
  const showSkeleton = isLoading;
  const showRefetchOverlay = !isLoading && isFetching;

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
  // Day-of-week filtering is now handled server-side via dayOfWeekParam in the query
  jobs = [...jobs].sort((a, b) => {
    if (sortBy === "salary") {
      const aSal = (a as { salary?: number | null }).salary ?? 0;
      const bSal = (b as { salary?: number | null }).salary ?? 0;
      return bSal - aSal;
    }
    if (sortBy === "date") {
      const aRaw = (a as unknown as { createdAt?: Date | number | null }).createdAt;
      const bRaw = (b as unknown as { createdAt?: Date | number | null }).createdAt;
      const aDate = aRaw instanceof Date ? aRaw.getTime() : (typeof aRaw === "number" ? aRaw : 0);
      const bDate = bRaw instanceof Date ? bRaw.getTime() : (typeof bRaw === "number" ? bRaw : 0);
      return bDate - aDate;
    }
    if (sortBy === "distance" && userLat) {
      const aDist = (a as { distance?: number | null }).distance ?? Infinity;
      const bDist = (b as { distance?: number | null }).distance ?? Infinity;
      return aDist - bDist;
    }
    // default: distance first (if available), then urgent
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
  // Reset accumulated jobs + page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setAccumulatedJobs([]);
  }, [category, selectedCity, userLat, showUrgentToday, selectedTimeSlots.length, selectedDays.length, sortBy, dateFilter, searchText]);
  // Auto-save non-trivial filters to localStorage
  useEffect(() => {
    const hasFilters = selectedCategories.length > 0 || selectedCities.length > 0 || selectedTimeSlots.length > 0 || selectedDays.length > 0 || sortBy !== "default";
    if (hasFilters) {
      saveFiltersToStorage({
        category: selectedCategories[0] ?? "all",
        selectedCategories,
        selectedCity: selectedCities[0] ?? null,
        selectedCities,
        selectedTimeSlots,
        selectedDays,
        sortBy,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, selectedCities, selectedTimeSlots, selectedDays, sortBy]);
  // Infinite scroll: load next page when sentinel enters viewport
  const hasMore = accumulatedJobs.length < serverTotal;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching && !isLoading) {
          setCurrentPage(p => p + 1);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetching, isLoading]);
  const totalPages = Math.ceil(serverTotal / PAGE_SIZE);
  const pagedJobs = jobs;
  // Total active filters: panel filters + quick chips (location, urgent, date)
  const activeFilterCount = [
    selectedCategories.length > 0,
    !!selectedCity || !!userLat,
    showUrgentToday,
    selectedTimeSlots.length > 0,
    selectedDays.length > 0,
    !!dateFilter,
  ].filter(Boolean).length;

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
      <section className="relative overflow-hidden">

        {/* Image block — compact 180px banner */}
        <div className="relative w-full" style={{ height: 180 }}>
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
          {/* Gradient: dark band in middle for text readability, fades to page-bg at bottom */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                "linear-gradient(to bottom,",
                "  transparent 0%,",
                "  oklch(0.10 0.06 122 / 0.00) 35%,",
                "  oklch(0.10 0.06 122 / 0.55) 50%,",
                "  oklch(0.10 0.06 122 / 0.65) 62%,",
                "  oklch(0.10 0.06 122 / 0.20) 72%,",
                "  oklch(0.95 0.03 91.6 / 0.80) 88%,",
                "  oklch(0.95 0.03 91.6) 100%)",
              ].join(" "),
            }}
          />
          {/* Badge removed per design */}
          {/* Headline — centered, single line */}
          <div className="absolute inset-x-0 z-10 flex flex-col items-center text-center px-5" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="text-[26px] leading-[1.15] font-black"
              style={{ color: "oklch(0.98 0.01 80)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif", textShadow: "0 2px 12px oklch(0.10 0.06 122 / 0.70)" }}
            >
              {selectedCity ? (
                <>עבודות ב<span style={{ color: "oklch(0.88 0.13 70)" }}>{selectedCity}</span></>
              ) : category !== "all" ? (
                <>עבודות <span style={{ color: "oklch(0.88 0.13 70)" }}>{catName}</span></>
              ) : (
                <>מצא <span style={{ color: "oklch(0.88 0.13 70)" }}>עבודה זמנית</span> תוך דקות</>
              )}
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4 pb-16 pt-3 relative z-10">

        {/* ── Profile completion banner (above search bar) ── */}
        <AnimatePresence>
          {isAuthenticated && !profileQuery.isLoading && (() => {
            const profile = profileQuery.data;
            const isProfileComplete = (profile?.preferredCategories && profile.preferredCategories.length > 0) && (!!profile?.preferredCity || !!profile?.workerLatitude);
            if (isProfileComplete) return null;
            return (
              <motion.div
                key="profile-banner-top"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mb-4"
              >
                <Link href="/worker-profile">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all hover:opacity-90 active:scale-[0.99]"
                    style={{
                      background: "oklch(0.96 0.04 122)",
                      border: "1.5px solid oklch(0.88 0.08 122)",
                      boxShadow: "0 2px 12px oklch(0.50 0.14 85 / 0.10)",
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.50 0.14 85)", color: "white" }}>
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "oklch(0.28 0.06 122)" }}>השלם את הפרופיל שלך</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.06 122)" }}>הוסף קטגוריות ומיקום להתאמות טובות יותר</p>
                    </div>
                    <span className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.50 0.14 85)", color: "white" }}>עדכן</span>
                  </div>
                </Link>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Search bar */}
        {/* ── TOOLBAR: sticky wrapper with frosted-glass on scroll ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}
          className="flex flex-col gap-0 mb-3 sticky top-0 z-30 -mx-4 px-4 pt-3"
          style={{
            background: toolbarScrolled ? "rgba(255,255,255,0.82)" : "transparent",
            backdropFilter: toolbarScrolled ? "blur(14px) saturate(1.6)" : "none",
            WebkitBackdropFilter: toolbarScrolled ? "blur(14px) saturate(1.6)" : "none",
            boxShadow: toolbarScrolled ? "0 2px 12px oklch(0.38 0.07 125.0 / 0.08)" : "none",
            borderBottom: toolbarScrolled ? "1px solid oklch(0.92 0.03 91.6 / 0.7)" : "none",
            transition: "background 0.25s ease, backdrop-filter 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
          }}
        >
          {/* Row 1: Search input first (RTL: right), then filter button (left) */}
          <div className="flex items-center gap-2 pb-3">
            {/* Search input — flex-1, placed first in DOM = rightmost in RTL */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl flex-1 min-w-0"
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
                placeholder="חפש תפקיד, עיר..."
                className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                style={{ color: "oklch(0.22 0.03 122.3)" }}
                dir="rtl"
              />
              {searchText && (
                <button onClick={() => setSearchText("")} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter button — identical border/shadow/height to search box, placed second = leftmost in RTL */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setFilterOpen(v => !v)}
              className="relative flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 transition-all"
              style={filterOpen || activeFilterCount > 0
                ? { background: "white", color: "var(--brand)", border: `1.5px solid var(--brand)`, boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.12)" }
                : { background: "white", color: "var(--muted-foreground)", border: `1.5px solid ${C_BORDER}`, boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.12)" }}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: C_DANGER_HEX, color: "white" }}
                >{activeFilterCount}</span>
              )}
            </motion.button>
          </div>

          {/* Row 2: Quick filter chip pills — full-bleed scroll so pills never get clipped on mobile */}
          {/* Outer wrapper: relative + mask-image fade on left edge when scrolled */}
          <div
            className="relative -mx-4"
            style={{
              maskImage: chipRowCanScrollLeft
                ? "linear-gradient(to right, transparent 0px, black 48px)"
                : undefined,
              WebkitMaskImage: chipRowCanScrollLeft
                ? "linear-gradient(to right, transparent 0px, black 48px)"
                : undefined,
            }}
          >
          <div ref={chipRowRef} className="flex items-center gap-2 pb-3 overflow-x-auto px-4" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {/* קרוב אלי */}
            <button
              onClick={handleLocationButtonClick}
              disabled={locating}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={userLat
                ? { background: "var(--brand)", color: "white", border: "1px solid var(--brand)" }
                : { background: "var(--brand)", color: "white", border: "1px solid var(--brand)" }}
            >
              {locating ? <BrandLoader size="sm" /> : <Navigation className="h-3 w-3" />}
              <span>{userLat ? (geoCity ?? "קרוב אלי") : "קרוב אלי"}</span>
              {userLat && (
                <X className="h-3 w-3 opacity-70" onClick={e => { e.stopPropagation(); setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false); }} />
              )}
            </button>

            {/* דחוף */}
            <button
              onClick={() => setShowUrgentToday(v => !v)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={showUrgentToday
                ? { background: "var(--brand)", color: "white", border: "1px solid var(--brand)" }
                : { background: "white", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
            >
              <Zap className="h-3 w-3" style={showUrgentToday ? {} : { color: "#f59e0b" }} />
              <span>דחוף</span>
            </button>

            {/* Date picker button — opens bottom sheet on mobile, Popover on desktop */}
            <button
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all"
              style={dateFilter
                ? { background: "var(--brand)", color: "white", border: "1px solid var(--brand)" }
                : { background: "white", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              onClick={() => setCalendarOpen(true)}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{dateFilter ? formatDateFilterLabel(dateFilter) : "תאריך"}</span>
              {dateFilter && (
                <X className="h-3 w-3 opacity-70" onClick={e => { e.stopPropagation(); setDateFilter(null); setCalendarRange(undefined); }} />
              )}
            </button>

            {/* Clear all — shown at end of row when any filter is active */}
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.button
                  key="clear-all-chip"
                  initial={{ opacity: 0, scale: 0.82, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                  exit={{ opacity: 0, scale: 0.82, width: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={() => {
                    setCategory("all");
                    setSelectedCategories([]);
                    setSelectedCity(null);
                    setSelectedCities([]);
                    setSelectedTimeSlots([]);
                    setSelectedDays([]);
                    setDateFilter(null);
                    setCalendarRange(undefined);
                    setShowUrgentToday(false);
                    setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false);
                    clearSavedFilters();
                    toast("הסינונים נוקו");
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all overflow-hidden"
                  style={{ background: "white", color: "oklch(0.45 0.05 122)", border: `1px solid ${C_BORDER}` }}
                >
                  <X className="h-3 w-3" />
                  <span>נקה סינונים</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          </div>{/* end chip row outer wrapper */}


        </motion.div>

        {/* Progress bar — shown during refetch */}
        <AnimatePresence>
          {isFetching && !isLoading && (
            <motion.div
              key="progress-bar"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="-mx-4 mb-2 h-0.5 origin-right"
              style={{ background: "linear-gradient(to left, oklch(0.82 0.13 84), oklch(0.50 0.18 160))" }}
            />
          )}
        </AnimatePresence>

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

        {/* Geo card — shown when geo is active (no-results case is handled inside EmptyStateCarousel) */}
        <AnimatePresence mode="wait">
          {userLat ? (
            /* Geo card: shown when geo is active and there are results (or still loading) */
            <motion.div
              key="geo-card"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-3 rounded-2xl overflow-hidden"
              style={showUrgentToday
                ? { border: "1px solid oklch(0.78 0.17 65 / 0.35)" }
                : { border: "1px solid oklch(0.50 0.18 160 / 0.25)" }}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3"
                style={showUrgentToday
                  ? { background: "oklch(0.78 0.17 65 / 0.09)" }
                  : { background: "oklch(0.50 0.18 160 / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={showUrgentToday
                      ? { background: "oklch(0.78 0.17 65 / 0.18)", border: "1px solid oklch(0.78 0.17 65 / 0.35)" }
                      : { background: "oklch(0.50 0.18 160 / 0.12)", border: "1px solid #bbf7d0" }}>
                    <MapPin className="h-4 w-4" style={{ color: showUrgentToday ? "oklch(0.50 0.14 65)" : "#16a34a" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold"
                      style={{ color: showUrgentToday ? "oklch(0.35 0.12 65)" : "#166534" }}>
                      {geoCity ? `מציג עבודות ליד ${geoCity}` : "מציג עבודות קרוב אליך"}
                    </p>
                    <p className="text-xs" style={{ color: showUrgentToday ? "oklch(0.55 0.10 65)" : "#16a34a" }}>בטווח {radiusKm} ק"מ</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {RADIUS_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                      className="px-2 py-1 rounded-full text-xs font-medium transition-all"
                      style={radiusKm === r.value
                        ? { background: showUrgentToday ? "oklch(0.60 0.14 65)" : C_SUCCESS_HEX, color: "white" }
                        : { background: "white",
                            color: showUrgentToday ? "oklch(0.45 0.12 65)" : "#15803d",
                            border: showUrgentToday ? "1px solid oklch(0.78 0.17 65 / 0.40)" : "1px solid #bbf7d0" }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="filter-backdrop"
                onClick={() => setFilterOpen(false)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.40)", zIndex: 60 }}
              />
              {/* Bottom sheet */}
              <motion.div
                key="filter-sheet"
                dir="rtl"
                ref={filterSheetRef}
                onTouchStart={handleFilterTouchStart}
                onTouchMove={handleFilterTouchMove}
                onTouchEnd={handleFilterTouchEnd}
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.9 }}
                style={{
                  position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 61,
                  background: "#ffffff",
                  borderRadius: "24px 24px 0 0",
                  boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                  maxHeight: "92vh",
                  height: "auto",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Drag handle */}
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                  <div style={{ width: 40, height: 4, borderRadius: 99, background: "#d1cdc4" }} />
                </div>
                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-4 pb-2">

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

                {/* Categories section — multi-select */}
                <div style={{ borderBottom: "1px solid oklch(0.94 0.02 100)" }} className="pb-4 mb-4">
                  <button type="button" onClick={() => setOpenFilterSection(s => s === "categories" ? null : "categories")}
                    className="w-full flex items-center gap-2 py-2 text-right">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
                      <Briefcase className="h-3 w-3" style={{ color: C_BRAND_HEX }} />
                    </div>
                    <span className="font-bold text-sm flex-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>תחומי עיסוק</span>
                    {selectedCategories.length > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX }}>
                        {selectedCategories.length === 1
                          ? `${dbCategories.find(c => c.slug === selectedCategories[0])?.icon ?? ""} ${dbCategories.find(c => c.slug === selectedCategories[0])?.name ?? selectedCategories[0]}`
                          : `${selectedCategories.length} תחומים`}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: openFilterSection === "categories" ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateRows: openFilterSection === "categories" ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                    <div className="overflow-hidden">
                      <div className="pt-3 flex flex-wrap gap-2">
                        {/* "הכל" clears all selected categories */}
                        <button
                          onClick={() => { setSelectedCategories([]); setCategory("all"); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2"
                          style={selectedCategories.length === 0 ? activePill : inactivePill}>
                          ✨ הכל
                        </button>
                        {dbCategories.map(cat => {
                          const isActive = selectedCategories.includes(cat.slug);
                          return (
                            <button key={cat.slug}
                              onClick={() => {
                                setSelectedCategories(prev =>
                                  isActive ? prev.filter(s => s !== cat.slug) : [...prev, cat.slug]
                                );
                                // Keep legacy category in sync (first selected, or "all")
                                setCategory(isActive
                                  ? (selectedCategories.filter(s => s !== cat.slug)[0] ?? "all")
                                  : cat.slug
                                );
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2"
                              style={isActive ? activePill : inactivePill}>
                              {cat.icon} {cat.name}
                            </button>
                          );
                        })}
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
                          {/* ── לפי מיקום button ── */}
                          <button type="button"
                            onClick={() => {
                              if (userLat) {
                                // Cancel location mode
                                setUserLat(null); setUserLng(null); setGeoCity(null);
                                clearLocationCache(); setAutoExpandedRadius(false);
                                toast("מיקום בוטל");
                              } else {
                                // Switch to location mode: clear city selection first
                                setSelectedCity(null); setShowCityInput(false); setCitySearch("");
                                doGetLocation();
                              }
                            }}
                            disabled={locating}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${userLat ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            {locating ? <BrandLoader size="sm" /> : <LocateFixed className="h-4 w-4" />}
                            {locating ? "מאתר..." : userLat ? `${radiusKm} ק"מ ממני` : "לפי מיקום"}
                          </button>
                          {/* ── לפי עיר button ── */}
                          <button type="button"
                            onClick={() => {
                              // Switch to city mode: clear location first
                              if (userLat) { setUserLat(null); setUserLng(null); setGeoCity(null); clearLocationCache(); setAutoExpandedRadius(false); }
                              setShowCityInput(true);
                              setTimeout(() => cityInputRef.current?.focus(), 100);
                            }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${!userLat && (selectedCity || showCityInput) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            <MapPin className="h-4 w-4" />
                            {selectedCity ?? "לפי עיר"}
                          </button>
                        </div>
                        {/* ── Location mode: show ONLY km-radius chips ── */}
                        {userLat && (
                          <div className="flex gap-1.5 flex-wrap">
                            {RADIUS_OPTIONS.map(r => (
                              <button key={r.value} onClick={() => { setRadiusKm(r.value); setAutoExpandedRadius(false); }}
                                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border-2"
                                style={radiusKm === r.value ? activePill : inactivePill}>
                                {r.label}
                              </button>
                            ))}
                            <button onClick={() => { setUserLat(null); setUserLng(null); setGeoCity(null); clearLocationCache(); setAutoExpandedRadius(false); toast("מיקום בוטל"); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                              style={{ borderColor: C_BORDER, color: C_TEXT_MUTED }}>
                              <X className="h-3 w-3" /> בטל
                            </button>
                          </div>
                        )}
                        {/* ── City mode: show ONLY city controls (hidden when location active) ── */}
                        {!userLat && showCityInput && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <CityAutocomplete inputRef={cityInputRef} value={citySearch} onChange={setCitySearch} onSelect={handleCitySelect} placeholder="הזן שם עיר..." />
                            </div>
                            <button onClick={() => { setShowCityInput(false); setCitySearch(""); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {!userLat && popularCities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {popularCities.map((city: string) => (
                              <button key={city} onClick={() => {
                                setSelectedCities(prev => {
                                  const next = prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city];
                                  setSelectedCity(next[0] ?? null);
                                  return next;
                                });
                                setShowCityInput(false); setUserLat(null); setUserLng(null); setGeoCity(null); clearLocationCache(); setAutoExpandedRadius(false);
                              }}
                                className={`city-chip${selectedCities.includes(city) ? " active" : ""}`}>
                                {city}
                              </button>
                            ))}
                            {selectedCities.length > 0 && (
                              <button onClick={() => { setSelectedCities([]); setSelectedCity(null); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
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

                {/* Date filter — collapsible */}
                <div style={{ borderBottom: "1px solid oklch(0.94 0.02 100)" }} className="pb-4 mb-4">
                  <button type="button" onClick={() => setOpenFilterSection(s => s === "date" ? null : "date")}
                    className="w-full flex items-center gap-2 py-2 text-right">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
                      <CalendarDays className="h-3 w-3" style={{ color: C_BRAND_HEX }} />
                    </div>
                    <span className="font-bold text-sm flex-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>תאריך</span>
                    {dateFilter && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX }}>
                        {formatDateFilterLabel(dateFilter)}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: openFilterSection === "date" ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateRows: openFilterSection === "date" ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                    <div className="overflow-hidden">
                      <div className="pt-3 space-y-3">
                        {/* Quick presets */}
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { key: "today", label: "היום" },
                            { key: "tomorrow", label: "מחר" },
                            { key: "this_week", label: "השבוע" },
                          ].map(({ key, label }) => (
                            <button key={key}
                              onClick={() => { setDateFilter(dateFilter === key ? null : key); setCalendarRange(undefined); }}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2"
                              style={dateFilter === key ? activePill : inactivePill}
                            >{label}</button>
                          ))}
                        </div>
                        {/* Inline calendar for specific date / range */}
                        <div dir="ltr" className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid oklch(0.88 0.04 122)" }}>
                          <Calendar
                            mode="range"
                            selected={calendarRange}
                            onSelect={(range) => {
                              setCalendarRange(range);
                              if (range?.from && range?.to) {
                                const fmt = (d: Date) => d.toISOString().slice(0, 10);
                                setDateFilter(`${fmt(range.from)}:${fmt(range.to)}`);
                              } else if (range?.from && !range?.to) {
                                const fmt = (d: Date) => d.toISOString().slice(0, 10);
                                setDateFilter(fmt(range.from));
                              } else {
                                setDateFilter(null);
                              }
                            }}
                            disabled={{ before: new Date() }}
                            numberOfMonths={1}
                          />
                        </div>
                        {(dateFilter || calendarRange) && (
                          <AppButton
                            variant="cta-outline"
                            size="sm"
                            className="w-full"
                            onClick={() => { setDateFilter(null); setCalendarRange(undefined); }}
                          >
                            <X className="h-3.5 w-3.5" /> נקה תאריך
                          </AppButton>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time of day — collapsible */}
                <div style={{ borderBottom: "1px solid oklch(0.94 0.02 100)" }} className="pb-4 mb-4">
                  <button type="button" onClick={() => setOpenFilterSection(s => s === "hours" ? null : "hours")}
                    className="w-full flex items-center gap-2 py-2 text-right">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
                      <span className="text-xs">⏰</span>
                    </div>
                    <span className="font-bold text-sm flex-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>שעות עבודה</span>
                    {selectedTimeSlots.length > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX }}>
                        {selectedTimeSlots.length} נבחרו
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: openFilterSection === "hours" ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateRows: openFilterSection === "hours" ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                    <div className="overflow-hidden">
                      <div className="pt-3 flex flex-wrap gap-2">
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
                  </div>
                </div>

                {/* Days of week — collapsible */}
                <div style={{ borderBottom: "1px solid oklch(0.94 0.02 100)" }} className="pb-4 mb-4">
                  <button type="button" onClick={() => setOpenFilterSection(s => s === "days" ? null : "days")}
                    className="w-full flex items-center gap-2 py-2 text-right">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.04 122)" }}>
                      <span className="text-xs">📅</span>
                    </div>
                    <span className="font-bold text-sm flex-1" style={{ color: "oklch(0.22 0.03 122.3)" }}>ימי עבודה</span>
                    {selectedDays.length > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(0.92 0.04 122)", color: C_BRAND_HEX }}>
                        {selectedDays.length} נבחרו
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: openFilterSection === "days" ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateRows: openFilterSection === "days" ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                    <div className="overflow-hidden">
                      <div className="pt-3 flex flex-wrap gap-2">
                        {[
                          { value: "sunday", label: "א׳" },
                          { value: "monday", label: "ב׳" },
                          { value: "tuesday", label: "ג׳" },
                          { value: "wednesday", label: "ד׳" },
                          { value: "thursday", label: "ה׳" },
                          { value: "friday", label: "ש׳" },
                          { value: "saturday", label: "שבת" },
                        ].map(day => {
                          const isActive = selectedDays.includes(day.value);
                          return (
                            <button key={day.value}
                              onClick={() => setSelectedDays(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])}
                              className="w-10 h-10 rounded-full text-sm font-bold transition-all border-2 flex items-center justify-center"
                              style={isActive ? activePill : inactivePill}>
                              {day.label}
                            </button>
                          );
                        })}
                        {selectedDays.length > 0 && (
                          <button onClick={() => setSelectedDays([])} className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs border"
                            style={{ borderColor: C_BORDER, color: C_TEXT_MUTED }}>
                            <X className="h-3 w-3" /> נקה
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </div>{/* end scrollable content */}

                {/* Sticky action bar at bottom of sheet */}
                <div className="px-4 pt-3 border-t" style={{ borderColor: "#f0ede8", flexShrink: 0, background: "white", paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => { setFilterOpen(false); toast.success("מציג תוצאות מסוננות"); }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      style={{ background: "#3a5c2e", color: "white", boxShadow: "0 3px 12px rgba(58,92,46,0.30)" }}>
                      <Search className="h-4 w-4" />
                      הצג תוצאות
                    </button>
                    <button type="button"
                      onClick={() => {
                        setCategory("all");
                        setSelectedCategories([]);
                        setSelectedCity(null);
                        setSelectedCities([]);
                        setSelectedTimeSlots([]);
                        setSelectedDays([]);
                        setDateFilter(null);
                        setShowUrgentToday(false);
                        setUserLat(null); setUserLng(null); clearLocationCache(); setAutoExpandedRadius(false);
                        clearSavedFilters();
                        toast("סינון נקא");
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      style={{ background: "#eef5e8", color: "#3a5c2e", border: "1.5px solid #c5dba8" }}>
                      <X className="h-4 w-4" />
                      נקה סינון
                    </button>
                  </div>
                  <UpdatePrefsBtn category={category} selectedCity={selectedCity} />
                </div>
              </motion.div>{/* end sheet */}
            </>
          )}
        </AnimatePresence>



        {/* ── (profile banner moved above search bar) ── */}

        {/* Results header — matches mockup: count right, סנן לפי sort left */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Sort selector — left side */}
            <span className="text-xs text-gray-400 font-medium">סנן לפי</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs font-semibold border-0 bg-transparent outline-none cursor-pointer"
              style={{ color: "#3a5c2e" }}
            >
              <option value="date">תאריך</option>
              <option value="salary">שכר</option>
              {userLat && <option value="distance">מרחק</option>}
            </select>
          </div>
          {/* Results count — right side */}
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <span className="text-sm text-gray-400">מחפש...</span>
            ) : (
              <span className="text-sm font-bold" style={{ color: "var(--brand)" }}>
                {serverTotal > 0 ? `${serverTotal} משרות נמצאו` : "לא נמצאו משרות"}
              </span>
            )}
            {showUrgentToday && !isLoading && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>דחוף</span>
            )}
          </div>
        </div>

        {/* Quick chips shown below results header when filter is closed */}

        {/* Job list — wrapped for refetch overlay */}
        <div className="relative">
          {/* Refetch overlay: subtle opacity fade when filter changes but data exists */}
          {showRefetchOverlay && (
            <div
              className="absolute inset-0 z-10 rounded-2xl pointer-events-none"
              style={{
                background: "oklch(0.97 0.01 122 / 0.55)",
                backdropFilter: "blur(1px)",
                animation: "pulse 1.2s ease-in-out infinite",
              }}
            />
          )}
        {showSkeleton ? (
          <JobCardSkeletonList count={5} />
        ) : jobs.length === 0 ? (
          <SmartEmptyState
            category={category}
            catName={catName}
            catIcon={dbCategories.find(c => c.slug === category)?.icon ?? undefined}
            selectedCity={selectedCity}
            dateFilter={dateFilter}
            selectedTimeSlots={selectedTimeSlots}
            selectedDays={selectedDays}
            showUrgentToday={showUrgentToday}
            searchText={searchText}
            isAuthenticated={isAuthenticated}
            onClearCategory={() => setCategory("all")}
            onClearCity={() => { setSelectedCity(null); setSelectedCities([]); }}
            onClearDateFilter={() => setDateFilter(null)}
            onClearTimeSlots={() => setSelectedTimeSlots([])}
            onClearDays={() => setSelectedDays([])}
            onClearUrgent={() => setShowUrgentToday(false)}
            onClearSearch={() => setSearchText("")}
            onSelectCity={(city) => {
              setSelectedCities([city]);
              setSelectedCity(city);
            }}
            onShowTomorrow={() => { setDateFilter("tomorrow"); }}
            onShowThisWeek={() => { setDateFilter("this_week"); }}
            onClearAllFilters={() => {
              setCategory("all"); setSelectedCategories([]); setSelectedCity(null); setSelectedCities([]);
              setSelectedTimeSlots([]); setSelectedDays([]); setDateFilter(null); setShowUrgentToday(false);
              setSearchText(""); clearSavedFilters();
            }}
            showGeoNoResults={userLat !== null && autoExpandedRadius && jobs.length === 0 && !isLoading}
            radiusKm={radiusKm}
            expandRadiusOptions={RADIUS_OPTIONS.filter(r => r.value > radiusKm) as { value: number; label: string }[]}
            onExpandRadius={(km) => { setRadiusKm(km); setAutoExpandedRadius(false); }}
          />
        ) : (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
            className="space-y-3"
          >
            {pagedJobs.map(job => {
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
        </div>{/* end job list wrapper */}

        {/* ── Infinite Scroll Sentinel ──────────────────────────────────────── */}
        {/* Sentinel div: IntersectionObserver watches this to trigger next page load */}
        <div ref={sentinelRef} className="h-4" aria-hidden="true" />
        {/* Loading indicator while fetching next page */}
        {isFetching && !isLoading && (
          <div className="flex items-center justify-center gap-2 py-4" aria-label="טוען משרות נוספות">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'oklch(0.45 0.10 122)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'oklch(0.55 0.04 122)' }}>טוען משרות נוספות...</span>
          </div>
        )}
        {/* End of results indicator */}
        {!hasMore && !isLoading && jobs.length > 0 && (
          <p className="text-center text-xs py-4" style={{ color: 'oklch(0.65 0.04 122)' }}>
            הוצגו כל {serverTotal} המשרות
          </p>
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

        {/* ── Push Notification Banner ──────────────────────────────────────── */}
        {!isLoading && jobs.length > 0 && (
          <div className="mt-4">
            <PushNotificationBanner
              category={category !== "all" ? category : null}
              city={selectedCity}
              compact
            />
          </div>
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
                {dbCategories.map(cat => (
                  <Link key={cat.slug} href={`/jobs/${cat.slug}/${encodeURIComponent(selectedCity!)}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                    style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                    {cat.icon} עבודות {cat.name} ב{selectedCity}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {category !== "all" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4" style={{ color: C_BRAND_HEX }} />
                <h2 className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 122)" }}>עבודות {catName} לפי עיר</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {SEO_CITIES.map(city => (
                  <Link key={city} href={`/jobs/${category}/${encodeURIComponent(city)}`}
                    className="city-chip">
                    עבודות {catName} ב{city}
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
                  className="city-chip">
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
              {dbCategories.filter(c => c.slug !== category).map(cat => (
                <Link key={cat.slug} href={`/jobs/${cat.slug}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ background: "white", borderColor: C_BORDER, color: "oklch(0.30 0.05 122)" }}>
                  {cat.icon} עבודות {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating scroll-to-top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            transition={{ duration: 0.22 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 left-4 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, oklch(0.38 0.07 125.0) 0%, oklch(0.28 0.06 122) 100%)",
              boxShadow: "0 4px 20px oklch(0.28 0.06 122 / 0.40)",
            }}
            aria-label="חזרה לראש הדף"
          >
            <ArrowUp className="h-5 w-5" style={{ color: "oklch(0.97 0.02 91)" }} />
          </motion.button>
        )}
      </AnimatePresence>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} message={loginMessage} />
      <JobBottomSheet
        job={bottomSheetJob}
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        onLoginRequired={requireLogin}
        isAuthenticated={isAuthenticated}
      />

      {/* ── Calendar Bottom Sheet (mobile & desktop) ─────────────────────── */}
      <AnimatePresence>
        {calendarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="cal-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.45)" }}
              onClick={() => setCalendarOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              key="cal-sheet"
              ref={calSheetRef}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl overflow-hidden"
              style={{ background: "var(--page-bg)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
              onTouchStart={handleCalTouchStart}
              onTouchMove={handleCalTouchMove}
              onTouchEnd={handleCalTouchEnd}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 cursor-grab">
                <div className="w-10 h-1 rounded-full" style={{ background: "oklch(0.80 0.03 122)" }} />
              </div>
              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-5 pb-6" dir="rtl">
                {/* Title row */}
                <div className="flex items-center justify-between mb-4 pt-2">
                  <p className="text-base font-bold" style={{ color: "#4F583B" }}>בחר תאריך או טווח</p>
                  <button onClick={() => setCalendarOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: "oklch(0.92 0.04 122 / 0.5)" }}>
                    <X className="h-4 w-4" style={{ color: "#4F583B" }} />
                  </button>
                </div>
                {/* Quick presets */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {[
                    { key: "today", label: "היום" },
                    { key: "tomorrow", label: "מחר" },
                    { key: "this_week", label: "השבוע" },
                  ].map(({ key, label }) => (
                    <button key={key}
                      onClick={() => { setDateFilter(dateFilter === key ? null : key); setCalendarRange(undefined); setCalendarOpen(false); }}
                      className="px-4 py-1.5 rounded-full text-sm font-bold transition-all"
                      style={dateFilter === key
                        ? { background: "oklch(0.50 0.14 85)", color: "white", border: "1px solid oklch(0.50 0.14 85)" }
                        : { background: "white", color: "#4F583B", border: "1px solid oklch(0.88 0.04 122)" }}
                    >{label}</button>
                  ))}
                </div>
                {/* Calendar */}
                <div dir="ltr" className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid oklch(0.88 0.04 122)" }}>
                  <Calendar
                    mode="range"
                    selected={calendarRange}
                    onSelect={(range) => {
                      setCalendarRange(range);
                      if (range?.from && range?.to) {
                        const fmt = (d: Date) => d.toISOString().slice(0, 10);
                        setDateFilter(`${fmt(range.from)}:${fmt(range.to)}`);
                        setCalendarOpen(false);
                      } else if (range?.from && !range?.to) {
                        const fmt = (d: Date) => d.toISOString().slice(0, 10);
                        setDateFilter(fmt(range.from));
                      }
                    }}
                    disabled={{ before: new Date() }}
                    numberOfMonths={1}
                  />
                </div>
                {/* Clear button */}
                {(dateFilter || calendarRange) && (
                  <button
                    className="mt-4 w-full py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2"
                    style={{ background: "#eef5e8", color: "#3a5c2e", border: "1.5px solid #c5dba8" }}
                    onClick={() => { setDateFilter(null); setCalendarRange(undefined); setCalendarOpen(false); }}
                  >
                    <X className="h-4 w-4" /> נקה תאריך
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

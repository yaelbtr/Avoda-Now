import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, X, MapPin, AlertCircle } from "lucide-react";
import { ensureMapsLoaded } from "@/lib/mapsLoader";
import { validateCityName } from "../../../shared/cityValidation";

/// <reference types="@types/google.maps" />

// ─── Module-level placeId cache (survives re-renders, cleared on page reload) ─
const placeIdCache = new Map<string, string>(); // cityName → placeId

/**
 * Resolves a Hebrew city name to a Google Maps place_id.
 * Uses AutocompleteService with a single prediction request.
 * Result is cached in-memory so repeated calls for the same city are O(1).
 */
async function resolvePlaceId(cityName: string): Promise<string | null> {
  const cached = placeIdCache.get(cityName);
  if (cached !== undefined) return cached;
  try {
    await ensureMapsLoaded();
    const svc = new google.maps.places.AutocompleteService();
    return new Promise((resolve) => {
      svc.getPlacePredictions(
        { input: cityName, componentRestrictions: { country: "il" }, types: ["(cities)"], language: "he" },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions[0]) {
            const id = predictions[0].place_id;
            placeIdCache.set(cityName, id);
            resolve(id);
          } else {
            resolve(null);
          }
        }
      );
    });
  } catch {
    return null;
  }
}

interface CityPickerProps {
  /** Currently selected city IDs */
  selectedCityIds: number[];
  /** Called when selection changes */
  onChange: (ids: number[]) => void;
  /** Max cities selectable (default: unlimited) */
  maxCities?: number;
  compact?: boolean;
  /** Optional: called when a city is selected, with the city's lat/lng, name, and Google Maps placeId */
  onCitySelect?: (city: { id: number; nameHe: string; latitude: string | null; longitude: string | null; placeId?: string }) => void;
}

/**
 * CityPicker — search-and-select for cities.
 *
 * The dropdown is rendered with `position: fixed` so it escapes any
 * `overflow-hidden` ancestor (e.g. accordion animation containers).
 * Its position is recalculated on every open via getBoundingClientRect.
 */
export function CityPicker({ selectedCityIds, onChange, maxCities, onCitySelect }: CityPickerProps) {
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allCities = [] } = trpc.user.getCities.useQuery();

  /** Compute fixed position from the input's bounding rect */
  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  const openDropdown = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updateDropdownPosition();
    setOpen(true);
  }, [updateDropdownPosition]);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      // Only close if focus is outside both input and dropdown
      const active = document.activeElement;
      const inputEl = inputRef.current;
      const dropdownEl = dropdownRef.current;
      if (
        active !== inputEl &&
        !(dropdownEl && dropdownEl.contains(active))
      ) {
        setOpen(false);
      }
    }, 150);
  }, []);

  // Reposition on scroll/resize so the dropdown tracks the input
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updateDropdownPosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, updateDropdownPosition]);

  // Filter cities based on search query — only show when user has typed something
  const suggestions = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return allCities
      .filter(
        (c) =>
          !selectedCityIds.includes(c.id) &&
          (c.nameHe.includes(q) ||
            (c.nameEn?.toLowerCase().includes(q.toLowerCase()) ?? false))
      )
      .slice(0, 8);
  }, [allCities, search, selectedCityIds]);

  const selectedCities = useMemo(
    () => allCities.filter((c) => selectedCityIds.includes(c.id)),
    [allCities, selectedCityIds]
  );

  const addCity = (id: number) => {
    if (maxCities && selectedCityIds.length >= maxCities) return;
    onChange([...selectedCityIds, id]);
    // Notify caller with lat/lng and placeId (resolved async, non-blocking)
    if (onCitySelect) {
      const city = allCities.find((c) => c.id === id);
      if (city) {
        // Fire-and-forget placeId resolution — call onCitySelect immediately with what we have,
        // then call again with placeId once resolved (callers should handle both calls).
        const basePayload = { id: city.id, nameHe: city.nameHe, latitude: city.latitude ?? null, longitude: city.longitude ?? null };
        onCitySelect(basePayload);
        resolvePlaceId(city.nameHe).then((placeId) => {
          if (placeId) onCitySelect({ ...basePayload, placeId });
        });
      }
    }
    setSearch("");
    setOpen(false);
  };

  const removeCity = (id: number) => {
    onChange(selectedCityIds.filter((x) => x !== id));
  };

  const isMaxReached = !!(maxCities && selectedCityIds.length >= maxCities);

  return (
    <div className="space-y-2">
      {/* Selected city chips */}
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCities.map((city) => (
            <span
              key={city.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {city.nameHe}
              <button
                type="button"
                onClick={() => removeCity(city.id)}
                className="ml-0.5 hover:opacity-60 transition-opacity"
                aria-label={`הסר ${city.nameHe}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedCities.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1 self-center"
            >
              נקה הכל
            </button>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            // Validate inline — only flag once user has typed enough (≥ 4 chars)
            if (v.trim().length >= 4) {
              const { error } = validateCityName(v);
              setSearchError(error);
            } else {
              setSearchError(null);
            }
            openDropdown();
          }}
          onFocus={openDropdown}
          onBlur={scheduleClose}
          placeholder={
            isMaxReached
              ? `בחרת ${maxCities} ערים (מקסימום)`
              : "הקלד שם עיר לחיפוש..."
          }
          disabled={isMaxReached}
          className={`pr-9 text-right text-sm ${searchError ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
          dir="rtl"
          autoComplete="off"
          aria-invalid={!!searchError}
          aria-describedby={searchError ? "city-picker-error" : undefined}
        />
        {search && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setSearch("");
              setSearchError(null);
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* Address-like input validation error */}
      {searchError && (
        <div
          id="city-picker-error"
          role="alert"
          className="flex items-center gap-1.5 mt-1 text-xs text-destructive text-right"
          dir="rtl"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Dropdown — rendered with position:fixed to escape overflow:hidden ancestors */}
      {open && (suggestions.length > 0 || search.trim()) && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
          onMouseDown={(e) => e.preventDefault()} // keep input focused during click
        >
          {suggestions.length > 0
            ? suggestions.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addCity(city.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-right hover:bg-muted transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-right">{city.nameHe}</span>
                  {city.district && (
                    <span className="text-xs text-muted-foreground">
                      {city.district}
                    </span>
                  )}
                </button>
              ))
            : (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                לא נמצאה עיר בשם "{search}"
              </div>
            )}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, X, MapPin } from "lucide-react";

interface CityPickerProps {
  /** Currently selected city IDs */
  selectedCityIds: number[];
  /** Called when selection changes */
  onChange: (ids: number[]) => void;
  /** Max cities selectable (default: unlimited) */
  maxCities?: number;
  compact?: boolean;
}

/**
 * CityPicker — search-and-select for cities.
 *
 * The dropdown is rendered with `position: fixed` so it escapes any
 * `overflow-hidden` ancestor (e.g. accordion animation containers).
 * Its position is recalculated on every open via getBoundingClientRect.
 */
export function CityPicker({ selectedCityIds, onChange, maxCities }: CityPickerProps) {
  const [search, setSearch] = useState("");
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
            setSearch(e.target.value);
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
          className="pr-9 text-right text-sm"
          dir="rtl"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setSearch("");
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

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

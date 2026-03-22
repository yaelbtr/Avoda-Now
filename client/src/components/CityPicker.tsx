import { useState, useMemo, useRef, useCallback } from "react";
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

export function CityPicker({ selectedCityIds, onChange, maxCities }: CityPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allCities = [] } = trpc.user.getCities.useQuery();

  // Close dropdown when focus leaves the entire container.
  // Using onBlur with a small delay so clicking a suggestion (which briefly
  // shifts focus away from the input) doesn't close before addCity fires.
  const handleBlur = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        setOpen(false);
      }
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    // Cancel any pending close when focus returns to the container
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [])

  // Filter cities based on search query — only show when user has typed something
  const suggestions = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return allCities
      .filter(
        (c) =>
          !selectedCityIds.includes(c.id) &&
          (c.nameHe.includes(q) || (c.nameEn?.toLowerCase().includes(q.toLowerCase()) ?? false))
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

  return (
    <div
      className="space-y-2"
      ref={containerRef}
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
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
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            maxCities && selectedCityIds.length >= maxCities
              ? `בחרת ${maxCities} ערים (מקסימום)`
              : "הקלד שם עיר לחיפוש..."
          }
          disabled={!!(maxCities && selectedCityIds.length >= maxCities)}
          className="pr-9 text-right text-sm"
          dir="rtl"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            onMouseDown={(e) => {
              // Prevent blur on the input before clearing
              e.preventDefault();
              setSearch("");
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Dropdown suggestions */}
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((city) => (
              <button
                key={city.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addCity(city.id); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-right hover:bg-muted transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-right">{city.nameHe}</span>
                {city.district && (
                  <span className="text-xs text-muted-foreground">{city.district}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {open && search.trim() && suggestions.length === 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
            לא נמצאה עיר בשם "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

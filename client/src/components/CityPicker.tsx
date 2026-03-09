import { useState, useMemo } from "react";
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
  /** Compact mode for wizard (shows fewer cities at once) */
  compact?: boolean;
}

const DISTRICT_ORDER = ["מרכז", "תל אביב", "ירושלים", "צפון", "דרום", "חיפה"];

export function CityPicker({ selectedCityIds, onChange, maxCities, compact = false }: CityPickerProps) {
  const [search, setSearch] = useState("");
  const [activeDistrict, setActiveDistrict] = useState<string | null>(null);

  const { data: allCities = [], isLoading } = trpc.user.getCities.useQuery();

  // Group cities by district
  const byDistrict = useMemo(() => {
    const map: Record<string, typeof allCities> = {};
    for (const city of allCities) {
      const d = city.district ?? "אחר";
      if (!map[d]) map[d] = [];
      map[d].push(city);
    }
    return map;
  }, [allCities]);

  const districts = useMemo(() => {
    const keys = Object.keys(byDistrict);
    return [...DISTRICT_ORDER.filter((d) => keys.includes(d)), ...keys.filter((d) => !DISTRICT_ORDER.includes(d))];
  }, [byDistrict]);

  // Filtered cities
  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCities.filter((c) => {
      const matchSearch = !q || c.nameHe.includes(q) || (c.nameEn?.toLowerCase().includes(q) ?? false);
      const matchDistrict = !activeDistrict || c.district === activeDistrict;
      return matchSearch && matchDistrict;
    });
  }, [allCities, search, activeDistrict]);

  const toggle = (id: number) => {
    if (selectedCityIds.includes(id)) {
      onChange(selectedCityIds.filter((x) => x !== id));
    } else {
      if (maxCities && selectedCityIds.length >= maxCities) return;
      onChange([...selectedCityIds, id]);
    }
  };

  const selectedCityNames = useMemo(() => {
    return allCities
      .filter((c) => selectedCityIds.includes(c.id))
      .map((c) => c.nameHe);
  }, [allCities, selectedCityIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
        טוען ערים...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selectedCityIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCityNames.map((name, i) => (
            <span
              key={selectedCityIds[i]}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "oklch(0.92 0.06 90)", color: "oklch(0.35 0.10 90)" }}
            >
              <MapPin className="h-2.5 w-2.5" />
              {name}
              <button
                type="button"
                onClick={() => toggle(selectedCityIds[i])}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                aria-label={`הסר ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1"
          >
            נקה הכל
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש עיר..."
          className="pr-9 text-right text-sm"
          dir="rtl"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* District filter tabs */}
      {!search && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveDistrict(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              !activeDistrict
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            הכל
          </button>
          {districts.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDistrict(activeDistrict === d ? null : d)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeDistrict === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* City grid */}
      <div
        className={`overflow-y-auto rounded-xl border border-border ${compact ? "max-h-52" : "max-h-72"}`}
      >
        {filteredCities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">לא נמצאו ערים</p>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-border">
            {filteredCities.map((city) => {
              const isSelected = selectedCityIds.includes(city.id);
              const isDisabled = !isSelected && !!maxCities && selectedCityIds.length >= maxCities;
              return (
                <button
                  key={city.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggle(city.id)}
                  className={`px-2 py-2.5 text-xs font-medium text-center transition-all bg-card ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isDisabled
                      ? "opacity-40 cursor-not-allowed text-muted-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {city.nameHe}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedCityIds.length > 0 && (
        <p className="text-xs text-primary font-medium">
          {selectedCityIds.length} {selectedCityIds.length === 1 ? "עיר נבחרה" : "ערים נבחרו"}
        </p>
      )}
    </div>
  );
}

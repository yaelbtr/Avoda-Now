/**
 * CityAutocomplete — Hebrew city search backed by the platform's cities table.
 *
 * Primary source: `trpc.user.searchCities` (DB lookup, always works).
 * Enhancement: Google Maps Places Autocomplete (loaded lazily, used when available).
 *
 * The component merges both sources, deduplicates by name, and shows up to 8 results.
 * Geocoding (lat/lng) is resolved from the DB row first; falls back to Google Geocoder.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ensureMapsLoaded } from "@/lib/mapsLoader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Suggestion {
  id: string; // "db-{id}" or "places-{placeId}"
  nameHe: string;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeId?: string; // only for Google Places results
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (city: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// ─── sessionStorage geocoding cache ─────────────────────────────────────────

const GEO_CACHE_PREFIX = "geo_cache_";

interface GeoResult { lat: number; lng: number; city: string; }

function getCachedGeo(placeId: string): GeoResult | null {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_PREFIX + placeId);
    if (raw) return JSON.parse(raw) as GeoResult;
  } catch {}
  return null;
}

function setCachedGeo(placeId: string, result: GeoResult) {
  try {
    sessionStorage.setItem(GEO_CACHE_PREFIX + placeId, JSON.stringify(result));
  } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "לדוגמה: תל אביב, חיפה, ירושלים...",
  className = "",
  inputRef: externalRef,
}: CityAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [mapsReady, setMapsReady] = useState(false);
  const [googleSuggestions, setGoogleSuggestions] = useState<Suggestion[]>([]);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // ── DB search (primary) ──────────────────────────────────────────────────
  const trimmedQuery = value.trim();
  const { data: dbResults = [], isFetching: dbLoading } = trpc.user.searchCities.useQuery(
    { query: trimmedQuery },
    {
      enabled: trimmedQuery.length >= 1,
      staleTime: 60_000,
    }
  );

  const dbSuggestions: Suggestion[] = useMemo(
    () =>
      dbResults.map((c) => ({
        id: `db-${c.id}`,
        nameHe: c.nameHe,
        district: c.district,
        lat: c.latitude ? parseFloat(String(c.latitude)) : null,
        lng: c.longitude ? parseFloat(String(c.longitude)) : null,
      })),
    [dbResults]
  );

  // ── Merge DB + Google, deduplicate by nameHe ─────────────────────────────
  const suggestions: Suggestion[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: Suggestion[] = [];
    for (const s of [...dbSuggestions, ...googleSuggestions]) {
      if (!seen.has(s.nameHe)) {
        seen.add(s.nameHe);
        merged.push(s);
      }
    }
    return merged.slice(0, 8);
  }, [dbSuggestions, googleSuggestions]);

  // ── Load Google Maps lazily ──────────────────────────────────────────────
  useEffect(() => {
    ensureMapsLoaded()
      .then(() => {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        geocoder.current = new google.maps.Geocoder();
        setMapsReady(true);
      })
      .catch(() => {
        // Maps unavailable — DB results are the sole source, which is fine
      });
  }, []);

  // ── Google Places fetch (enhancement) ────────────────────────────────────
  const fetchGoogleSuggestions = useCallback(
    (input: string) => {
      if (!mapsReady || !autocompleteService.current || input.length < 2) {
        setGoogleSuggestions([]);
        return;
      }
      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "il" },
          types: ["(cities)"],
          language: "he",
        },
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setGoogleSuggestions(
              predictions.map((p) => ({
                id: `places-${p.place_id}`,
                nameHe: p.structured_formatting.main_text,
                placeId: p.place_id,
              }))
            );
          } else {
            setGoogleSuggestions([]);
          }
        }
      );
    },
    [mapsReady]
  );

  // ── Show dropdown when results arrive ────────────────────────────────────
  useEffect(() => {
    if (suggestions.length > 0 && trimmedQuery.length >= 1) {
      setShowDropdown(true);
      setActiveSuggestionIndex(-1);
    }
  }, [suggestions, trimmedQuery]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Input change ─────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (!v.trim()) {
      setShowDropdown(false);
      setGoogleSuggestions([]);
      return;
    }
    // Debounce Google Places (DB is handled by tRPC's own debounce via staleTime)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchGoogleSuggestions(v), 300);
  };

  // ── Select suggestion ─────────────────────────────────────────────────────
  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.nameHe);
    setShowDropdown(false);
    setGoogleSuggestions([]);

    // If we have DB lat/lng, use them immediately
    if (suggestion.lat != null && suggestion.lng != null) {
      onSelect(suggestion.nameHe, suggestion.lat, suggestion.lng);
      return;
    }

    // Google Places result without lat/lng — geocode it
    if (suggestion.placeId) {
      const cached = getCachedGeo(suggestion.placeId);
      if (cached) {
        onSelect(cached.city, cached.lat, cached.lng);
        return;
      }
      if (geocoder.current) {
        geocoder.current.geocode({ placeId: suggestion.placeId }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const loc = results[0].geometry.location;
            const result: GeoResult = { city: suggestion.nameHe, lat: loc.lat(), lng: loc.lng() };
            setCachedGeo(suggestion.placeId!, result);
            onSelect(result.city, result.lat, result.lng);
          }
        });
      }
    } else {
      // No lat/lng available at all — pass 0,0 as fallback
      onSelect(suggestion.nameHe, 0, 0);
    }
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    onChange("");
    setShowDropdown(false);
    setGoogleSuggestions([]);
    inputRef.current?.focus();
  };

  const loading = dbLoading;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && trimmedQuery.length >= 1) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className={`pr-10 text-right text-sm ${value ? "pl-8" : ""}`}
          autoComplete="off"
          dir="rtl"
        />
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            tabIndex={-1}
            aria-label="נקה שדה עיר"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          dir="rtl"
        >
          {suggestions.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(s);
              }}
              className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                idx === activeSuggestionIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{s.nameHe}</span>
              {s.district && (
                <span className="text-muted-foreground text-xs truncate">{s.district}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results hint */}
      {showDropdown && trimmedQuery.length >= 1 && suggestions.length === 0 && !loading && (
        <div
          className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm text-muted-foreground text-right"
          dir="rtl"
        >
          לא נמצאה עיר בשם &ldquo;{trimmedQuery}&rdquo;
        </div>
      )}
    </div>
  );
}

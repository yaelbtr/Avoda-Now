/**
 * CityAutocomplete — Hebrew city search with Google Places Autocomplete suggestions.
 *
 * Uses the Google Maps Places library (already loaded by Map.tsx proxy) to provide
 * real-time city suggestions as the user types. Falls back to a plain input if the
 * Maps API is unavailable.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";
import { ensureMapsLoaded } from "@/lib/mapsLoader";

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (city: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "לדוגמה: תל אביב, חיפה, ירושלים...",
  className = "",
  inputRef: externalRef,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Maps API once
  useEffect(() => {
    ensureMapsLoaded()
      .then(() => {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        geocoder.current = new google.maps.Geocoder();
        setMapsReady(true);
      })
      .catch(() => {
        // Maps failed to load — component degrades to plain input
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    (input: string) => {
      if (!mapsReady || !autocompleteService.current || input.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "il" },
          types: ["(cities)"],
          language: "he",
        },
        (predictions, status) => {
          setLoading(false);
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(
              predictions.map((p) => ({
                placeId: p.place_id,
                description: p.description,
                mainText: p.structured_formatting.main_text,
              }))
            );
            setShowDropdown(true);
            setActiveSuggestionIndex(-1);
          } else {
            setSuggestions([]);
          }
        }
      );
    },
    [mapsReady]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(v), 250);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.mainText);
    setSuggestions([]);
    setShowDropdown(false);

    // Geocode the selected place to get lat/lng
    if (geocoder.current) {
      geocoder.current.geocode(
        { placeId: suggestion.placeId },
        (results, status) => {
          if (status === "OK" && results && results[0]) {
            const loc = results[0].geometry.location;
            onSelect(suggestion.mainText, loc.lat(), loc.lng());
          }
        }
      );
    }
  };

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
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

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
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className={`pr-10 text-right text-sm ${value ? "pl-8" : ""}`}
          autoComplete="off"
          dir="rtl"
        />
        {/* Loading spinner or clear button */}
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            tabIndex={-1}
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
              key={s.placeId}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur before click
                handleSelectSuggestion(s);
              }}
              className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                idx === activeSuggestionIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{s.mainText}</span>
              <span className="text-muted-foreground text-xs truncate">
                {s.description.replace(s.mainText, "").replace(/^,\s*/, "")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

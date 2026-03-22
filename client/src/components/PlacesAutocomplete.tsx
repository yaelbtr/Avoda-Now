/**
 * PlacesAutocomplete
 *
 * A styled address search input backed by google.maps.places.Autocomplete.
 * When the user selects a suggestion:
 *   - onPlaceSelect is called with { lat, lng, formattedAddress }
 *
 * The component lazy-loads the Maps SDK via the shared ensureMapsLoaded()
 * singleton — no duplicate script injection.
 *
 * Usage:
 *   <PlacesAutocomplete
 *     value={address}
 *     onChange={setAddress}
 *     onPlaceSelect={({ lat, lng, formattedAddress }) => { ... }}
 *     placeholder="חפש כתובת..."
 *   />
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ensureMapsLoaded } from "@/lib/mapsLoader";
import { cn } from "@/lib/utils";

export interface PlaceResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (result: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "חפש כתובת...",
  className,
  error,
  disabled,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  // Initialise Autocomplete once the Maps SDK is available
  useEffect(() => {
    let cancelled = false;
    ensureMapsLoaded().then(() => {
      if (cancelled || !inputRef.current) return;
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        // Bias results toward Israel
        componentRestrictions: { country: "il" },
        fields: ["geometry", "formatted_address"],
        types: ["address"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const formattedAddress = place.formatted_address ?? "";
        onChange(formattedAddress);
        onPlaceSelect({ lat, lng, formattedAddress });
      });
      autocompleteRef.current = ac;
      setReady(true);
    });
    return () => { cancelled = true; };
  // onPlaceSelect / onChange are stable refs — intentionally excluded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-sm font-medium leading-none" dir="rtl">
        כתובת <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        {/* Search icon */}
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ready ? placeholder : "טוען..."}
          disabled={disabled || !ready}
          dir="rtl"
          className={cn(
            "w-full rounded-md border bg-background px-9 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
            error ? "border-destructive focus:ring-destructive" : "border-input",
          )}
        />
        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label="נקה כתובת"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive" dir="rtl">{error}</p>
      )}
    </div>
  );
}

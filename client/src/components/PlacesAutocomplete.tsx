/**
 * PlacesAutocomplete
 *
 * A styled address input backed by google.maps.places.Autocomplete.
 * The Maps JS API is loaded through the shared singleton loader, and place
 * details are read only after the user selects a Google suggestion.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ensureMapsLoaded } from "@/lib/mapsLoader";
import { cn } from "@/lib/utils";

export interface PlaceAddressParts {
  city?: string;
  street?: string;
  houseNumber?: string;
}

export interface PlaceResult extends PlaceAddressParts {
  lat: number;
  lng: number;
  placeId: string;
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

const AUTOCOMPLETE_FIELDS: Array<keyof google.maps.places.PlaceResult> = [
  "place_id",
  "formatted_address",
  "geometry",
  "address_components",
];

function getAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  types: string[],
): string | undefined {
  const component = components?.find((item) =>
    types.some((type) => item.types.includes(type)),
  );
  return component?.long_name;
}

export function parseAddressParts(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): PlaceAddressParts {
  return {
    city: getAddressComponent(components, [
      "locality",
      "postal_town",
      "administrative_area_level_2",
      "administrative_area_level_1",
    ]),
    street: getAddressComponent(components, ["route"]),
    houseNumber: getAddressComponent(components, ["street_number"]),
  };
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

  useEffect(() => {
    let cancelled = false;

    ensureMapsLoaded()
      .then(() => {
        if (cancelled || !inputRef.current || autocompleteRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "il" },
          fields: AUTOCOMPLETE_FIELDS,
          types: ["address"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;

          if (!place.place_id || !location) return;

          const formattedAddress =
            place.formatted_address?.trim() || inputRef.current?.value.trim() || "";
          const result: PlaceResult = {
            ...parseAddressParts(place.address_components),
            lat: location.lat(),
            lng: location.lng(),
            placeId: place.place_id,
            formattedAddress,
          };

          onChange(formattedAddress);
          onPlaceSelect(result);
        });

        autocompleteRef.current = autocomplete;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  // onPlaceSelect / onChange are intentionally excluded because the autocomplete
  // listener is registered once per input element.
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
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ready ? placeholder : "טוען כתובות Google..."}
          disabled={disabled}
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

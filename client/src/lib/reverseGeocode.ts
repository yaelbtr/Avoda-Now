/**
 * Reverse geocode a lat/lng coordinate to a Hebrew city name using the
 * Google Maps Geocoder (loaded via the existing Manus proxy).
 *
 * Returns the Hebrew city name (e.g. "תל אביב") or null if it cannot be
 * resolved (network error, no results, permission denied, etc.).
 */

import { ensureMapsLoaded } from "@/lib/mapsLoader";

/**
 * Extract the most specific locality from a geocoder result.
 * Priority order: locality → sublocality_level_1 → administrative_area_level_2
 */
function extractCity(results: google.maps.GeocoderResult[]): string | null {
  const typePriority = [
    "locality",
    "sublocality_level_1",
    "sublocality",
    "administrative_area_level_2",
  ];

  for (const type of typePriority) {
    for (const result of results) {
      const component = result.address_components.find((c) =>
        c.types.includes(type)
      );
      if (component) {
        // Prefer the long_name in Hebrew if available, otherwise fall back
        return component.long_name;
      }
    }
  }
  return null;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    await ensureMapsLoaded();

    return await new Promise<string | null>((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        {
          location: { lat, lng },
          language: "he", // request Hebrew results
        } as google.maps.GeocoderRequest,
        (results, status) => {
          if (status === "OK" && results && results.length > 0) {
            resolve(extractCity(results));
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

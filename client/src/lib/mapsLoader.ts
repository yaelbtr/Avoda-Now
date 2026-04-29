/**
 * Singleton Google Maps loader.
 * Ensures the Maps JS API script is injected into the document exactly once,
 * no matter how many components call `ensureMapsLoaded()` simultaneously.
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function getMapsScriptUrl(): string | null {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
    libraries: "places",
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

let _mapsLoadPromise: Promise<void> | null = null;

export function ensureMapsLoaded(): Promise<void> {
  // Already loaded
  if (window.google?.maps?.places) return Promise.resolve();

  // In-flight — return the same promise so only one <script> is injected
  if (_mapsLoadPromise) return _mapsLoadPromise;

  _mapsLoadPromise = new Promise<void>((resolve, reject) => {
    // Double-check: another tab/frame may have loaded it between the checks above
    if (window.google?.maps?.places) { resolve(); return; }
    const scriptUrl = getMapsScriptUrl();
    if (!scriptUrl) {
      _mapsLoadPromise = null;
      reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not configured."));
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      _mapsLoadPromise = null; // allow retry on next call
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return _mapsLoadPromise;
}

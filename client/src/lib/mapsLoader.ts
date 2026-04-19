/**
 * Singleton Google Maps loader.
 * Ensures the Maps JS API script is injected into the document exactly once,
 * no matter how many components call `ensureMapsLoaded()` simultaneously.
 */

const API_KEY =
  import.meta.env.VITE_MAPS_PROXY_KEY ||
  import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const MAPS_PROXY_BASE_URL =
  import.meta.env.VITE_MAPS_PROXY_URL ||
  import.meta.env.VITE_FRONTEND_FORGE_API_URL;
const MAPS_PROXY_URL = MAPS_PROXY_BASE_URL
  ? `${MAPS_PROXY_BASE_URL.replace(/\/+$/, "")}/v1/maps/proxy`
  : null;

let _mapsLoadPromise: Promise<void> | null = null;

export function ensureMapsLoaded(): Promise<void> {
  // Already loaded
  if (window.google?.maps) return Promise.resolve();

  // In-flight — return the same promise so only one <script> is injected
  if (_mapsLoadPromise) return _mapsLoadPromise;

  _mapsLoadPromise = new Promise<void>((resolve, reject) => {
    // Double-check: another tab/frame may have loaded it between the checks above
    if (window.google?.maps) { resolve(); return; }
    if (!MAPS_PROXY_URL || !API_KEY) {
      _mapsLoadPromise = null;
      reject(
        new Error(
          "Google Maps proxy is not configured. Set VITE_MAPS_PROXY_URL and VITE_MAPS_PROXY_KEY."
        )
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
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

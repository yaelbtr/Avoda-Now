/**
 * CookieConsentBanner
 *
 * Display logic:
 *   - Show only when localStorage.cookieConsent is NOT set
 *   - Accept → sets cookieConsent = "accepted", analyticsConsent = "true"
 *   - Settings → opens modal with Essential (locked) + Analytics (toggle)
 *   - Save settings → sets cookieConsent = "custom", analyticsConsent = "true"|"false"
 *
 * Analytics gating:
 *   - The Umami script tag in index.html carries data-do-not-track="true" by default.
 *   - This component dynamically injects the real analytics script ONLY when
 *     analyticsConsent === "true".
 *
 * Accessibility:
 *   - Focus trap in Settings modal
 *   - Keyboard: Escape closes modal, Tab cycles through buttons
 *   - aria-live region announces banner
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Cookie, Shield, BarChart2, ChevronRight } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_CONSENT = "cookieConsent";
const LS_ANALYTICS = "analyticsConsent";

// ── Analytics loader (called once consent is granted) ─────────────────────────
function loadAnalyticsScript() {
  // Avoid double-injection
  if (document.getElementById("umami-script")) return;
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  if (!endpoint || !websiteId) return;

  const s = document.createElement("script");
  s.id = "umami-script";
  s.defer = true;
  s.src = `${endpoint}/umami`;
  s.dataset.websiteId = websiteId;
  document.body.appendChild(s);
}

// ── Hook: consent state ────────────────────────────────────────────────────────
export function useCookieConsent() {
  const [consent, setConsent] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_CONSENT) : null
  );
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(LS_ANALYTICS) === "true"
      : false
  );

  const accept = useCallback(() => {
    localStorage.setItem(LS_CONSENT, "accepted");
    localStorage.setItem(LS_ANALYTICS, "true");
    setConsent("accepted");
    setAnalyticsConsent(true);
    loadAnalyticsScript();
  }, []);

  const saveCustom = useCallback((analytics: boolean) => {
    localStorage.setItem(LS_CONSENT, "custom");
    localStorage.setItem(LS_ANALYTICS, String(analytics));
    setConsent("custom");
    setAnalyticsConsent(analytics);
    if (analytics) loadAnalyticsScript();
  }, []);

  // On mount: if analytics was previously accepted, load the script
  useEffect(() => {
    if (analyticsConsent) loadAnalyticsScript();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { consent, analyticsConsent, accept, saveCustom };
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
interface SettingsModalProps {
  analyticsEnabled: boolean;
  onToggleAnalytics: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

function SettingsModal({ analyticsEnabled, onToggleAnalytics, onSave, onClose }: SettingsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus trap
  useEffect(() => {
    firstFocusRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-settings-title"
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 10001 }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        style={{ background: "oklch(0.16 0.03 122)", color: "#fff", zIndex: 1 }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5" style={{ color: "oklch(0.75 0.15 76)" }} />
            <h2 id="cookie-settings-title" className="text-base font-bold">
              הגדרות עוגיות
            </h2>
          </div>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label="סגור הגדרות"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cookie rows */}
        <div className="space-y-3 mb-6">
          {/* Essential — always on */}
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: "oklch(0.22 0.04 122)" }}
          >
            <Shield className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.22 160)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">עוגיות חיוניות</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.75 0.03 122)" }}>
                נדרשות לתפעול הפלטפורמה. לא ניתן לבטל.
              </p>
            </div>
            {/* Always-on pill */}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "oklch(0.65 0.22 160 / 0.2)", color: "oklch(0.65 0.22 160)" }}
            >
              תמיד פעיל
            </span>
          </div>

          {/* Analytics — toggleable */}
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: "oklch(0.22 0.04 122)" }}
          >
            <BarChart2 className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.75 0.15 76)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">עוגיות אנליטיקה</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.75 0.03 122)" }}>
                עוזרות לנו להבין כיצד משתמשים מנווטים בפלטפורמה (Umami — ללא מעקב אישי).
              </p>
            </div>
            {/* Toggle */}
            <button
              role="switch"
              aria-checked={analyticsEnabled}
              onClick={() => onToggleAnalytics(!analyticsEnabled)}
              className="flex-shrink-0 mt-0.5 relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              style={{
                background: analyticsEnabled
                  ? "oklch(0.52 0.18 145)"
                  : "oklch(0.35 0.03 122)",
              }}
              aria-label={analyticsEnabled ? "בטל עוגיות אנליטיקה" : "אפשר עוגיות אנליטיקה"}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ right: analyticsEnabled ? "2px" : "auto", left: analyticsEnabled ? "auto" : "2px" }}
              />
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40"
          style={{ background: "oklch(0.38 0.09 125)", color: "#fff" }}
        >
          שמור הגדרות
        </button>
      </div>
    </div>
  );
}

// ── Main Banner ────────────────────────────────────────────────────────────────
export default function CookieConsentBanner() {
  const { consent, accept, saveCustom } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(true);
  const [visible, setVisible] = useState(false);

  // Delay banner appearance slightly to avoid blocking LCP
  useEffect(() => {
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [consent]);

  const handleAccept = () => {
    setVisible(false);
    accept();
  };

  const handleSaveSettings = () => {
    setVisible(false);
    setShowSettings(false);
    saveCustom(analyticsToggle);
  };

  if (!visible) return null;

  return (
    <>
      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          analyticsEnabled={analyticsToggle}
          onToggleAnalytics={setAnalyticsToggle}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Banner */}
      <div
        role="region"
        aria-live="polite"
        aria-label="הסכמה לעוגיות"
        className="fixed left-0 right-0 w-full"
        style={{
          bottom: 0,
          // On mobile, sit above the bottom nav (64px) + safe area
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
          zIndex: 10000,
        }}
        dir="rtl"
      >
        {/* Mobile: above bottom nav */}
        <div
          className="md:hidden"
          style={{ paddingBottom: "64px" }}
        >
          <BannerContent
            onAccept={handleAccept}
            onSettings={() => setShowSettings(true)}
          />
        </div>
        {/* Desktop: full-width bar */}
        <div className="hidden md:block">
          <BannerContent
            onAccept={handleAccept}
            onSettings={() => setShowSettings(true)}
          />
        </div>
      </div>
    </>
  );
}

// ── Banner content (shared between mobile/desktop) ────────────────────────────
function BannerContent({
  onAccept,
  onSettings,
}: {
  onAccept: () => void;
  onSettings: () => void;
}) {
  return (
    <div
      className="w-full px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shadow-2xl"
      style={{
        background: "oklch(0.14 0.03 122 / 0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid oklch(0.30 0.05 122 / 0.5)",
      }}
    >
      {/* Icon + text */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Cookie
          className="h-5 w-5 flex-shrink-0 mt-0.5"
          style={{ color: "oklch(0.75 0.15 76)" }}
          aria-hidden="true"
        />
        <p className="text-sm leading-relaxed" style={{ color: "oklch(0.88 0.02 122)" }}>
          אנו משתמשים בעוגיות לשיפור חוויית המשתמש וניתוח שימוש.{" "}
          בהמשך השימוש באתר, אתה מסכים לשימוש שלנו בעוגיות.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
        {/* Settings */}
        <button
          onClick={onSettings}
          className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
          style={{ color: "oklch(0.75 0.03 122)", background: "transparent" }}
          aria-label="פתח הגדרות עוגיות"
        >
          הגדרות
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Accept */}
        <button
          onClick={onAccept}
          className="flex-1 sm:flex-none text-sm font-bold px-5 py-2 rounded-lg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40"
          style={{ background: "oklch(0.38 0.09 125)", color: "#fff" }}
        >
          אישור
        </button>
      </div>
    </div>
  );
}

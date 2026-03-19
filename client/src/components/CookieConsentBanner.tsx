/**
 * CookieConsentBanner
 *
 * Styled to match the AvodaNow design language:
 *   - Banner bar: dark nav bg `oklch(0.28 0.06 122.3)` — same as Navbar
 *   - Settings modal: glass-modal + brand tokens
 *   - Buttons: AppButton cta / cta-outline variants
 *   - Typography: Heebo, RTL, brand label color
 *
 * Display logic:
 *   - Show only when localStorage.cookieConsent is NOT set
 *   - Accept → cookieConsent = "accepted", analyticsConsent = "true"
 *   - Settings → modal with Essential (locked) + Analytics (toggle)
 *   - Save settings → cookieConsent = "custom", analyticsConsent = "true"|"false"
 *
 * Analytics gating:
 *   - Umami script injected dynamically ONLY when analyticsConsent === "true"
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Cookie, Shield, BarChart2 } from "lucide-react";
import { AppButton } from "@/components/ui";

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_CONSENT = "cookieConsent";
const LS_ANALYTICS = "analyticsConsent";

// Dark nav background — same token as Navbar
const DARK_NAV = "oklch(0.28 0.06 122.3)";
// Brand olive for accents
const BRAND_OLIVE = "#3d4a28";
// Citrus gold — same as --citrus in index.css
const CITRUS = "oklch(0.75 0.15 76)";

// ── Analytics loader ──────────────────────────────────────────────────────────
function loadAnalyticsScript() {
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
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel — glass-modal matches LoginModal style */}
      <div
        className="glass-modal relative w-full sm:max-w-md shadow-2xl"
        style={{
          borderRadius: "20px 20px 0 0",
          padding: "24px 24px 32px",
          zIndex: 1,
        }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5" style={{ color: CITRUS }} />
            <h2
              id="cookie-settings-title"
              className="text-base font-bold"
              style={{ color: BRAND_OLIVE, fontFamily: "Heebo, sans-serif" }}
            >
              הגדרות עוגיות
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="סגור הגדרות"
            className="rounded-xl p-1.5 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2"
            style={{ color: "#6b7280" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cookie rows */}
        <div className="space-y-3 mb-6">
          {/* Essential — always on */}
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{
              background: "oklch(0.96 0.02 122 / 0.6)",
              border: "1px solid oklch(0.88 0.04 122)",
            }}
          >
            <Shield className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.52 0.22 150)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: BRAND_OLIVE }}>עוגיות חיוניות</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                נדרשות לתפעול הפלטפורמה. לא ניתן לבטל.
              </p>
            </div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: "oklch(0.52 0.22 150 / 0.12)",
                color: "oklch(0.42 0.18 150)",
              }}
            >
              תמיד פעיל
            </span>
          </div>

          {/* Analytics — toggleable */}
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{
              background: "oklch(0.96 0.02 122 / 0.6)",
              border: "1px solid oklch(0.88 0.04 122)",
            }}
          >
            <BarChart2 className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: CITRUS }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: BRAND_OLIVE }}>עוגיות אנליטיקה</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                עוזרות לנו לשפר את הפלטפורמה (Umami — ללא מעקב אישי).
              </p>
            </div>
            {/* Toggle — brand olive when active */}
            <button
              role="switch"
              aria-checked={analyticsEnabled}
              onClick={() => onToggleAnalytics(!analyticsEnabled)}
              className="flex-shrink-0 mt-0.5 relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2"
              style={{
                background: analyticsEnabled
                  ? "linear-gradient(135deg, #3d4a28 0%, #2e3a1c 100%)"
                  : "oklch(0.85 0.03 122)",
                boxShadow: analyticsEnabled
                  ? "0 2px 8px oklch(0.38 0.07 125.0 / 0.28)"
                  : "none",
              }}
              aria-label={analyticsEnabled ? "בטל עוגיות אנליטיקה" : "אפשר עוגיות אנליטיקה"}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{
                  right: analyticsEnabled ? "2px" : "auto",
                  left: analyticsEnabled ? "auto" : "2px",
                }}
              />
            </button>
          </div>
        </div>

        {/* Save button — CTA variant */}
        <AppButton
          variant="cta"
          size="lg"
          className="w-full"
          onClick={onSave}
        >
          שמור הגדרות
        </AppButton>
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

  // Delay to avoid blocking LCP
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
      {showSettings && (
        <SettingsModal
          analyticsEnabled={analyticsToggle}
          onToggleAnalytics={setAnalyticsToggle}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Banner — dark nav bg, above mobile bottom nav */}
      <div
        role="region"
        aria-live="polite"
        aria-label="הסכמה לעוגיות"
        className="fixed left-0 right-0 w-full"
        style={{ bottom: 0, zIndex: 10000 }}
        dir="rtl"
      >
        {/* Mobile: pad above bottom nav (64px) */}
        <div className="md:hidden" style={{ paddingBottom: "64px" }}>
          <BannerBar onAccept={handleAccept} onSettings={() => setShowSettings(true)} />
        </div>
        {/* Desktop: flush to bottom */}
        <div className="hidden md:block">
          <BannerBar onAccept={handleAccept} onSettings={() => setShowSettings(true)} />
        </div>
      </div>
    </>
  );
}

// ── Banner bar ─────────────────────────────────────────────────────────────────
function BannerBar({
  onAccept,
  onSettings,
}: {
  onAccept: () => void;
  onSettings: () => void;
}) {
  return (
    <div
      className="w-full px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
      style={{
        background: DARK_NAV,
        borderTop: `1px solid oklch(0.38 0.07 122 / 0.5)`,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {/* Icon + text */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Cookie
          className="h-4 w-4 flex-shrink-0 mt-0.5"
          style={{ color: CITRUS }}
          aria-hidden="true"
        />
        <p
          className="text-sm leading-relaxed"
          style={{
            color: "oklch(0.92 0.02 95)",
            fontFamily: "Heebo, sans-serif",
          }}
        >
          אנו משתמשים בעוגיות לשיפור חוויית המשתמש וניתוח שימוש.{" "}
          בהמשך השימוש באתר, אתה מסכים לשימוש שלנו בעוגיות.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
        {/* Settings — cta-outline style but adapted for dark bg */}
        <button
          onClick={onSettings}
          className="flex items-center gap-1 text-sm px-3 py-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          style={{
            color: "oklch(0.80 0.04 95)",
            background: "oklch(0.35 0.06 122 / 0.6)",
            border: "1px solid oklch(0.45 0.06 122 / 0.5)",
            fontFamily: "Heebo, sans-serif",
          }}
          aria-label="פתח הגדרות עוגיות"
        >
          הגדרות
        </button>

        {/* Accept — CTA variant */}
        <AppButton
          variant="cta"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={onAccept}
        >
          אישור
        </AppButton>
      </div>
    </div>
  );
}

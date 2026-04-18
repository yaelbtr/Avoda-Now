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
import { Cookie } from "lucide-react";
import { AppButton } from "@/components/ui";
import CookieSettingsModal from "@/components/CookieSettingsModal";

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_CONSENT = "cookieConsent";
const LS_ANALYTICS = "analyticsConsent";
const LS_VERSION = "cookieConsentVersion";

/**
 * Bump this version whenever new cookie categories are introduced.
 * Users who consented to an older version will see the banner again.
 * Format: YYYY-MM (e.g. "2026-03")
 */
export const CURRENT_COOKIE_VERSION = "2026-03";

// Dark nav background — same token as Navbar
const DARK_NAV = "oklch(0.28 0.06 122.3)";
// Brand olive for accents
const BRAND_OLIVE = "#3d4a28";
// Citrus gold — same as --citrus in index.css
const CITRUS = "oklch(0.75 0.15 76)";

// ── Analytics loader ──────────────────────────────────────────────────────────
// Step 5 (perf skill): defer analytics until browser is idle to avoid
// competing with the critical rendering path.
const rIC: (cb: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 200); // fallback for Safari

function loadAnalyticsScript() {
  if (document.getElementById("umami-script")) return;
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  if (!endpoint || !websiteId) return;
  // Defer until browser is idle so analytics never competes with LCP/FID
  rIC(() => {
    if (document.getElementById("umami-script")) return; // guard double-call
    const s = document.createElement("script");
    s.id = "umami-script";
    s.defer = true;
    s.src = `${endpoint}/umami`;
    s.dataset.websiteId = websiteId;
    document.body.appendChild(s);
  });
}

// ── Hook: consent state ────────────────────────────────────────────────────────
export function useCookieConsent() {
  const [consent, setConsent] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_CONSENT) : null
  );
  const [consentVersion, setConsentVersion] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_VERSION) : null
  );
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(LS_ANALYTICS) === "true"
      : false
  );

  // True when user has consented AND their version matches the current version
  const isConsentCurrent =
    !!consent && consentVersion === CURRENT_COOKIE_VERSION;

  const accept = useCallback(() => {
    localStorage.setItem(LS_CONSENT, "accepted");
    localStorage.setItem(LS_ANALYTICS, "true");
    localStorage.setItem(LS_VERSION, CURRENT_COOKIE_VERSION);
    setConsent("accepted");
    setConsentVersion(CURRENT_COOKIE_VERSION);
    setAnalyticsConsent(true);
    loadAnalyticsScript();
  }, []);

  const saveCustom = useCallback((analytics: boolean) => {
    localStorage.setItem(LS_CONSENT, "custom");
    localStorage.setItem(LS_ANALYTICS, String(analytics));
    localStorage.setItem(LS_VERSION, CURRENT_COOKIE_VERSION);
    setConsent("custom");
    setConsentVersion(CURRENT_COOKIE_VERSION);
    setAnalyticsConsent(analytics);
    if (analytics) loadAnalyticsScript();
  }, []);

  useEffect(() => {
    if (analyticsConsent) loadAnalyticsScript();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { consent, consentVersion, analyticsConsent, isConsentCurrent, accept, saveCustom };
}
// SettingsModal removed — use CookieSettingsModal from @/components/CookieSettingsModal (DRY)

// ── Main Banner ────────────────────────────────────────────────────────────────
export default function CookieConsentBanner() {
  const { isConsentCurrent, accept, saveCustom } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(true);
  const [visible, setVisible] = useState(false);

  // Delay to avoid blocking LCP
  // Show banner if no consent OR if consent version is outdated
  useEffect(() => {
    if (!isConsentCurrent) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [isConsentCurrent]);

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
        <CookieSettingsModal
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
          בהמשך השימוש באתר, אתה מסכים לשימוש שלנו בעוגיות.{" "}
          <a
            href="/cookies"
            className="underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: "var(--citrus)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            קרא עוד על מדיניות העוגיות שלנו
          </a>
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

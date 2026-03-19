/**
 * CookieSettingsModal
 *
 * Standalone reusable modal for managing cookie preferences.
 * Used by both CookieConsentBanner (first-time consent) and Footer (change preferences).
 *
 * DRY: extracted from CookieConsentBanner to avoid duplication.
 */

import { useEffect, useRef } from "react";
import { X, Shield, BarChart2 } from "lucide-react";
import { AppButton } from "@/components/ui";

const BRAND_OLIVE = "#3d4a28";
const CITRUS = "oklch(0.75 0.15 76)";

interface CookieSettingsModalProps {
  analyticsEnabled: boolean;
  onToggleAnalytics?: (v: boolean) => void;
  onSave: (analytics: boolean) => void;
  onClose: () => void;
}

export default function CookieSettingsModal({
  analyticsEnabled,
  onToggleAnalytics,
  onSave,
  onClose,
}: CookieSettingsModalProps) {
  // Internal toggle state — controlled externally if onToggleAnalytics provided
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleToggle = () => {
    if (onToggleAnalytics) {
      onToggleAnalytics(!analyticsEnabled);
    } else {
      onSave(!analyticsEnabled);
    }
  };

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
            <span style={{ color: CITRUS, fontSize: "18px" }}>🍪</span>
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
              onClick={handleToggle}
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

        {/* Link to full policy */}
        <p className="text-xs text-center mb-4" style={{ color: "#6b7280" }}>
          <a
            href="/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: BRAND_OLIVE }}
          >
            קרא את מדיניות העוגיות המלאה שלנו
          </a>
        </p>

        {/* Save button — CTA variant */}
        <AppButton
          variant="cta"
          size="lg"
          className="w-full"
          onClick={() => onSave(analyticsEnabled)}
        >
          שמור הגדרות
        </AppButton>
      </div>
    </div>
  );
}

/**
 * AvodaNow — Centralized Color Palette
 * ─────────────────────────────────────
 * All brand colors live here. To swap the palette, edit only this file.
 *
 * Convention:
 *   C.<TOKEN>        — raw oklch / hex string for use in inline `style={}`
 *   CSS custom props — defined in index.css under :root { --brand-* }
 *                      for use in Tailwind classes (bg-[var(--brand-primary)] etc.)
 */

// ─── Primary brand blue ───────────────────────────────────────────────────────
export const C_BRAND           = "oklch(0.58 0.20 255)";   // primary blue
export const C_BRAND_DARK      = "oklch(0.48 0.22 255)";   // pressed / gradient end
export const C_BRAND_MID       = "oklch(0.72 0.22 240)";   // icon tint / lighter blue
export const C_BRAND_LIGHT     = "oklch(0.94 0.03 255)";   // tinted background
export const C_BRAND_SUBTLE    = "oklch(0.62 0.22 255)";   // slightly brighter blue

// Hex equivalents (for inline styles that need hex)
export const C_BRAND_HEX       = "#3c83f6";                // ≈ oklch(0.58 0.20 255)
export const C_BRAND_DARK_HEX  = "#2563eb";                // ≈ oklch(0.48 0.22 255)

// ─── Success / green ─────────────────────────────────────────────────────────
export const C_SUCCESS         = "oklch(0.65 0.22 160)";   // green accent
export const C_SUCCESS_DARK    = "oklch(0.52 0.22 150)";   // pressed green
export const C_SUCCESS_LIGHT   = "oklch(0.65 0.22 160 / 0.12)"; // tinted bg
export const C_SUCCESS_BORDER  = "oklch(0.65 0.22 160 / 0.25)"; // border
export const C_SUCCESS_HEX     = "#16a34a";
export const C_SUCCESS_DARK_HEX = "#15803d";

// ─── Warning / orange ────────────────────────────────────────────────────────
export const C_WARNING         = "oklch(0.78 0.17 65)";    // amber / orange
export const C_WARNING_LIGHT   = "oklch(0.78 0.17 65 / 0.12)";
export const C_WARNING_BORDER  = "oklch(0.78 0.17 65 / 0.25)";

// ─── Danger / red ────────────────────────────────────────────────────────────
export const C_DANGER          = "oklch(0.65 0.22 25)";    // red / urgent
export const C_DANGER_LIGHT    = "oklch(0.65 0.22 25 / 0.12)";
export const C_DANGER_BORDER   = "oklch(0.65 0.22 25 / 0.25)";
export const C_DANGER_HEX      = "#ef4444";

// ─── WhatsApp green ──────────────────────────────────────────────────────────
export const C_WHATSAPP        = "#25D366";
export const C_WHATSAPP_DARK   = "#1da851";

// ─── Page / surface backgrounds ──────────────────────────────────────────────
export const C_PAGE_BG         = "oklch(0.97 0.006 247)";  // main page bg (light)
export const C_PAGE_BG_HEX     = "#f5f7f8";                // hex equivalent
export const C_SURFACE         = "oklch(1 0 0)";           // white card surface
export const C_SURFACE_HEX     = "#ffffff";

// Dark-mode surfaces (used in legacy dark-theme pages / components)
export const C_DARK_BG         = "oklch(0.10 0.015 265)";  // dark page bg
export const C_DARK_CARD       = "oklch(1 0 0 / 5%)";      // dark glass card
export const C_DARK_CARD_BORDER = "oklch(1 0 0 / 10%)";    // dark glass border

// ─── Border / divider ────────────────────────────────────────────────────────
export const C_BORDER          = "#e2e8f0";                 // light border
export const C_BORDER_OKLCH    = "oklch(0.93 0.006 247)";  // oklch equivalent
export const C_BRAND_ACTIVE_BORDER = "oklch(0.58 0.20 255 / 0.3)"; // brand border at 30% opacity

// ─── Text ────────────────────────────────────────────────────────────────────
export const C_TEXT_PRIMARY    = "oklch(0.18 0.015 265)";  // near-black
export const C_TEXT_SECONDARY  = "oklch(0.42 0.012 265)";  // medium gray
export const C_TEXT_MUTED      = "oklch(0.62 0.008 265)";  // light gray
export const C_TEXT_FAINT      = "oklch(0.65 0.008 265)";  // very faint
export const C_TEXT_ON_DARK    = "oklch(0.95 0.005 80)";   // near-white text on dark
export const C_TEXT_ON_DARK_MID = "oklch(1 0 0 / 55%)";   // semi-transparent white
export const C_TEXT_ON_DARK_FAINT = "oklch(1 0 0 / 35%)"; // faint white

// ─── Shimmer / skeleton ──────────────────────────────────────────────────────
export const C_SHIMMER_BASE    = "#e2e8f0";                 // skeleton base
export const C_SHIMMER_HIGHLIGHT = "rgba(255,255,255,0.9)"; // shimmer sweep peak

// ─── Gradient helpers (commonly reused) ──────────────────────────────────────
export const G_BRAND           = `linear-gradient(135deg, ${C_BRAND_HEX} 0%, ${C_BRAND_DARK_HEX} 100%)`;
export const G_SUCCESS         = `linear-gradient(135deg, ${C_SUCCESS_HEX} 0%, ${C_SUCCESS_DARK_HEX} 100%)`;
export const G_URGENT          = `linear-gradient(180deg, ${C_DANGER_HEX} 0%, #f97316 100%)`;
export const G_WHATSAPP        = `linear-gradient(135deg, ${C_WHATSAPP} 0%, ${C_WHATSAPP_DARK} 100%)`;

// ─── Box-shadow helpers ───────────────────────────────────────────────────────
export const S_BRAND_SM        = `0 3px 10px oklch(0.58 0.20 255 / 0.25)`;
export const S_BRAND_MD        = `0 4px 14px oklch(0.58 0.20 255 / 0.30)`;
export const S_BRAND_LG        = `0 8px 24px oklch(0.58 0.20 255 / 0.45)`;
export const S_CARD            = "0 1px 4px rgba(0,0,0,0.06)";
export const S_CARD_HOVER      = "0 4px 20px rgba(0,0,0,0.10)";

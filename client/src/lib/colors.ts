/**
 * YallaAvoda — Centralized Color Palette
 * ─────────────────────────────────────
 * Palette: Olive Grove / Amber Harvest / Sun-Kissed Citrus / Honey Wheat / Vanilla Linen
 *
 * All brand colors live here. To swap the palette, edit only this file.
 *
 * Convention:
 *   C.<TOKEN>        — raw oklch / hex string for use in inline `style={}`
 *   CSS custom props — defined in index.css under :root { --brand-* }
 *                      for use in Tailwind classes (bg-[var(--brand-primary)] etc.)
 */

// ─── Primary brand — Olive Grove #4F583B ─────────────────────────────────────
export const C_BRAND           = "oklch(0.38 0.07 125.0)";   // deep rich olive
export const C_BRAND_DARK      = "oklch(0.30 0.07 125.0)";   // very dark olive
export const C_BRAND_MID       = "oklch(0.50 0.07 125.0)";   // mid olive tint
export const C_BRAND_LIGHT     = "oklch(0.96 0.02 122.3)";   // very light olive bg
export const C_BRAND_SUBTLE    = "oklch(0.44 0.07 125.0)";   // slightly brighter olive

// Hex equivalents (for inline styles that need hex)
export const C_BRAND_HEX       = "#3d4a28";                  // deep rich olive
export const C_BRAND_DARK_HEX  = "#2e3a1c";                  // very dark olive

// ─── Accent — Amber Harvest #D9A450 ──────────────────────────────────────────
export const C_AMBER           = "oklch(0.75 0.12 76.7)";    // Amber Harvest
export const C_AMBER_DARK      = "oklch(0.65 0.13 76.7)";    // darker amber
export const C_AMBER_LIGHT     = "oklch(0.75 0.12 76.7 / 0.15)";
export const C_AMBER_HEX       = "#D9A450";

// ─── Highlight — Sun-Kissed Citrus #F4B840 ───────────────────────────────────
export const C_CITRUS          = "oklch(0.82 0.15 80.8)";    // Sun-Kissed Citrus
export const C_CITRUS_DARK     = "oklch(0.72 0.15 80.8)";    // darker citrus
export const C_CITRUS_LIGHT    = "oklch(0.82 0.15 80.8 / 0.15)";
export const C_CITRUS_HEX      = "#F4B840";

// ─── Neutral warm — Honey Wheat #EAD7B2 ──────────────────────────────────────
export const C_HONEY           = "oklch(0.89 0.05 84.0)";    // Honey Wheat
export const C_HONEY_DARK      = "oklch(0.80 0.06 84.0)";
export const C_HONEY_HEX       = "#EAD7B2";

// ─── Background — Vanilla Linen #F8F4E8 ──────────────────────────────────────
export const C_LINEN           = "oklch(0.97 0.02 91.6)";    // Vanilla Linen
export const C_LINEN_HEX       = "#F8F4E8";

// ─── Legacy aliases (kept for backward compatibility) ────────────────────────
// These map to the new palette so existing code continues to work
export const C_BRAND_ACTIVE_BORDER = "oklch(0.44 0.05 122.3 / 0.3)";

// ─── Success / green ─────────────────────────────────────────────────────────
export const C_SUCCESS         = "oklch(0.65 0.22 160)";
export const C_SUCCESS_DARK    = "oklch(0.52 0.22 150)";
export const C_SUCCESS_LIGHT   = "oklch(0.65 0.22 160 / 0.12)";
export const C_SUCCESS_BORDER  = "oklch(0.65 0.22 160 / 0.25)";
export const C_SUCCESS_HEX     = "#16a34a";
export const C_SUCCESS_DARK_HEX = "#15803d";

// ─── Warning / orange ────────────────────────────────────────────────────────
export const C_WARNING         = "oklch(0.78 0.17 65)";
export const C_WARNING_LIGHT   = "oklch(0.78 0.17 65 / 0.12)";
export const C_WARNING_BORDER  = "oklch(0.78 0.17 65 / 0.25)";

// ─── Danger / red ────────────────────────────────────────────────────────────
export const C_DANGER          = "oklch(0.65 0.22 25)";
export const C_DANGER_LIGHT    = "oklch(0.65 0.22 25 / 0.12)";
export const C_DANGER_BORDER   = "oklch(0.65 0.22 25 / 0.25)";
export const C_DANGER_HEX      = "#ef4444";

// ─── WhatsApp green ──────────────────────────────────────────────────────────
export const C_WHATSAPP        = "#25D366";
export const C_WHATSAPP_DARK   = "#1da851";

// ─── Page / surface backgrounds ──────────────────────────────────────────────
export const C_PAGE_BG         = "oklch(0.9904 0.0107 95.3)"; // #fefcf4 warm cream
export const C_PAGE_BG_HEX     = "#fefcf4";
export const C_SURFACE         = "oklch(1 0 0)";
export const C_SURFACE_HEX     = "#ffffff";

// Dark-mode surfaces
export const C_DARK_BG         = "oklch(0.18 0.06 125.0)";   // deep rich olive dark
export const C_DARK_CARD       = "oklch(1 0 0 / 5%)";
export const C_DARK_CARD_BORDER = "oklch(1 0 0 / 10%)";

// ─── Border / divider ────────────────────────────────────────────────────────
export const C_BORDER          = "#d4c799";                   // warm honey border (user-adjusted)
export const C_BORDER_OKLCH    = "oklch(0.87 0.04 84.0)";
export const C_BORDER_LIGHT    = "oklch(0.89 0.05 84.0)";

// ─── Text ────────────────────────────────────────────────────────────────────
export const C_TEXT_PRIMARY    = "oklch(0.22 0.03 122.3)";   // dark olive-tinted
export const C_TEXT_SECONDARY  = "oklch(0.40 0.03 122.3)";
export const C_TEXT_MUTED      = "oklch(0.50 0.02 100)";   // darkened from 0.58 to pass WCAG 4.5:1 on cream bg
export const C_TEXT_FAINT      = "oklch(0.65 0.015 100)";
export const C_TEXT_ON_DARK    = "oklch(0.97 0.02 91.6)";    // Vanilla Linen on dark
export const C_TEXT_ON_DARK_MID = "oklch(1 0 0 / 55%)";
export const C_TEXT_ON_DARK_FAINT = "oklch(1 0 0 / 35%)";

// ─── Shimmer / skeleton ──────────────────────────────────────────────────────
export const C_SHIMMER_BASE    = "#EAD7B2";                   // Honey Wheat shimmer
export const C_SHIMMER_HIGHLIGHT = "rgba(255,255,255,0.9)";

// ─── Gradient helpers (commonly reused) ──────────────────────────────────────
export const G_BRAND           = `linear-gradient(135deg, ${C_BRAND_HEX} 0%, ${C_BRAND_DARK_HEX} 100%)`;
export const G_AMBER           = `linear-gradient(135deg, ${C_AMBER_HEX} 0%, ${C_CITRUS_HEX} 100%)`;
export const G_SUCCESS         = `linear-gradient(135deg, ${C_SUCCESS_HEX} 0%, ${C_SUCCESS_DARK_HEX} 100%)`;
export const G_URGENT          = `linear-gradient(180deg, ${C_DANGER_HEX} 0%, #f97316 100%)`;
export const G_WHATSAPP        = `linear-gradient(135deg, ${C_WHATSAPP} 0%, ${C_WHATSAPP_DARK} 100%)`;

// ─── Box-shadow helpers ───────────────────────────────────────────────────────
export const S_BRAND_SM        = `0 3px 10px oklch(0.38 0.07 125.0 / 0.28)`;
export const S_BRAND_MD        = `0 4px 14px oklch(0.38 0.07 125.0 / 0.32)`;
export const S_BRAND_LG        = `0 8px 24px oklch(0.38 0.07 125.0 / 0.48)`;
export const S_CARD            = "0 1px 4px rgba(0,0,0,0.06)";
export const S_CARD_HOVER      = "0 4px 20px rgba(0,0,0,0.10)";
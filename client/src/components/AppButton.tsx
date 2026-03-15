/**
 * AppButton — מערכת כפתורים מרכזית
 *
 * כל הכפתורים באפליקציה משתמשים בקומפוננט זה.
 * כדי לשנות עיצוב כפתור — שנה רק כאן.
 *
 * Variants:
 *   primary      — כחול ראשי (CTA, שמירה, פרסום)
 *   secondary    — אפור / לבן (פעולות משניות)
 *   outline      — מסגרת בלבד
 *   ghost        — שקוף, ללא מסגרת
 *   destructive  — אדום (מחיקה, דיווח)
 *   success      — ירוק (אישור, WhatsApp)
 *   whatsapp     — ירוק WhatsApp עם גרדיאנט
 *   brand        — גרדיאנט כחול ראשי (hero CTA)
 *   cta          — כפתור ראשי כהה ("המשך כעובד" style): גרדיאנט זית כהה, טקסט לבן, font-black, צל עמוק
 *   cta-outline  — כפתור ניגודי ל-cta: רקע לבן, טקסט זית כהה, מסגרת זית כהה
 *   link         — טקסט בלבד כמו קישור
 *
 * Sizes:
 *   xs   — טקסט קטן מאוד (פילטרים, תגיות)
 *   sm   — כפתור קטן
 *   md   — ברירת מחדל
 *   lg   — גדול (hero, submit)
 *   icon — ריבוע / עגול לאייקון בלבד
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  G_BRAND, G_AMBER, G_SUCCESS, G_WHATSAPP,
  S_BRAND_MD, S_BRAND_LG,
  C_BRAND_HEX, C_BRAND_DARK_HEX, C_AMBER_HEX, C_CITRUS_HEX,
  C_SUCCESS_HEX,
} from "@/lib/colors";

// ─── CVA variants (Tailwind-only styles) ─────────────────────────────────────
const appButtonVariants = cva(
  // Base styles shared by ALL buttons
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-all duration-150 cursor-pointer select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // ── Solid variants ──────────────────────────────────────────────────
        primary:     "bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl",
        secondary:   "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 rounded-xl",
        outline:     "border border-border bg-transparent text-foreground hover:bg-secondary/60 rounded-xl",
        ghost:       "bg-transparent text-foreground/70 hover:bg-secondary/60 rounded-xl",
        destructive: "bg-destructive text-white hover:bg-destructive/90 rounded-xl",
        success:     "bg-green-600 text-white hover:bg-green-700 rounded-xl",
        // ── Special variants (use inline style for gradients) ───────────────────────────────────────────────────────
        whatsapp:    "text-white rounded-xl",   // bg via inline style
        brand:       "text-white rounded-xl overflow-hidden relative", // bg via inline style
        // כפתור ראשי כהה עם גרדיאנט זית כהה ("המשך כעובד" style)
        cta:         "text-white rounded-xl font-black", // bg + shadow via inline style
        // כפתור ניגודי ל-cta: רקע לבן, טקסט זית כהה, מסגרת זית כהה
        "cta-outline": "bg-white rounded-xl font-black", // text + border via inline style
        // ── Text-only ────────────────────────────────────────────────────────────────────
        link:        "bg-transparent underline-offset-4 hover:underline text-primary rounded-none p-0 h-auto",
        // ── Pill filter (toggle-able category/radius chips) ─────────────────
        "pill-active":   "rounded-full text-white",   // bg via inline style
        "pill-inactive": "rounded-full border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary",
      },
      size: {
        xs:   "h-7 px-2.5 text-xs rounded-lg gap-1",
        sm:   "h-8 px-3 text-xs",
        md:   "h-9 px-4 text-sm",
        lg:   "h-11 px-6 text-base font-bold",
        xl:   "h-12 px-8 text-base font-bold",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// ─── Inline style helpers (gradients / shadows) ───────────────────────────────
function getInlineStyle(variant: string | null | undefined, hovered = false): React.CSSProperties {
  switch (variant) {
    case "brand":
      return {
        background: G_BRAND,
        boxShadow: S_BRAND_MD,
        border: "none",
      };
    case "cta":
      // Matches the "המשך כעובד" button in RoleSelectionScreen
      // linear-gradient(135deg, C_BRAND 0%, C_BRAND_DARK 100%) + deep olive shadow
      return {
        background: `linear-gradient(135deg, ${C_BRAND_HEX} 0%, ${C_BRAND_DARK_HEX} 100%)`,
        boxShadow: `0 4px 14px oklch(0.38 0.07 125.0 / 0.28)`,
        border: "none",
      };
    case "cta-outline":
      // Inverse of cta: white background, dark olive text, dark olive border
      // On hover: fills with dark olive gradient (same as cta) + white text
      if (hovered) {
        return {
          background: `linear-gradient(135deg, ${C_BRAND_HEX} 0%, ${C_BRAND_DARK_HEX} 100%)`,
          color: "#ffffff",
          border: `2px solid ${C_BRAND_HEX}`,
          boxShadow: `0 4px 14px oklch(0.38 0.07 125.0 / 0.28)`,
        };
      }
      return {
        background: "#ffffff",
        color: C_BRAND_HEX,          // dark olive text
        border: `2px solid ${C_BRAND_HEX}`,
        boxShadow: `0 4px 14px oklch(0.38 0.07 125.0 / 0.14)`,
      };
    case "whatsapp":
      return {
        background: G_WHATSAPP,
        border: "none",
        boxShadow: "0 4px 14px rgba(37,211,102,0.30)",
      };
    case "success":
      return {
        background: G_SUCCESS,
        border: "none",
        boxShadow: `0 4px 14px ${C_SUCCESS_HEX}4d`,
      };
    case "pill-active":
      return {
        background: C_BRAND_HEX,
        border: `1px solid ${C_BRAND_HEX}`,
        boxShadow: `0 2px 8px ${C_BRAND_HEX}4d`,
      };
    default:
      return {};
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appButtonVariants> {
  asChild?: boolean;
  /** Override the inline gradient/shadow style (e.g. for custom brand colors) */
  styleOverride?: React.CSSProperties;
}

const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant, size, asChild = false, style, styleOverride, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // Track hover state only for variants that need dynamic inline-style hover effects
    const needsHoverState = variant === "cta-outline";
    const [hovered, setHovered] = React.useState(false);

    const inlineStyle: React.CSSProperties = {
      ...getInlineStyle(variant, needsHoverState ? hovered : false),
      ...style,
      ...styleOverride,
    };
    return (
      <Comp
        ref={ref}
        data-slot="app-button"
        className={cn(appButtonVariants({ variant, size, className }))}
        style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
        onMouseEnter={(e) => { if (needsHoverState) setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { if (needsHoverState) setHovered(false); onMouseLeave?.(e); }}
        {...props}
      />
    );
  }
);
AppButton.displayName = "AppButton";

export { AppButton, appButtonVariants };

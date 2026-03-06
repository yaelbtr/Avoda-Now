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
  G_BRAND, G_SUCCESS, G_WHATSAPP,
  S_BRAND_MD, S_BRAND_LG,
  C_BRAND_HEX, C_BRAND_DARK_HEX,
  C_SUCCESS_HEX, C_SUCCESS_DARK_HEX,
  C_WHATSAPP, C_WHATSAPP_DARK,
} from "@/lib/colors";

// ─── CVA variants (Tailwind-only styles) ─────────────────────────────────────
const appButtonVariants = cva(
  // Base styles shared by ALL buttons
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-all duration-150 cursor-pointer select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // ── Solid variants ──────────────────────────────────────────────────
        primary:     "bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl",
        secondary:   "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl",
        outline:     "border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50 rounded-xl",
        ghost:       "bg-transparent text-gray-500 hover:bg-gray-100 rounded-xl",
        destructive: "bg-destructive text-white hover:bg-destructive/90 rounded-xl",
        success:     "bg-green-600 text-white hover:bg-green-700 rounded-xl",
        // ── Special variants (use inline style for gradients) ───────────────
        whatsapp:    "text-white rounded-xl",   // bg via inline style
        brand:       "text-white rounded-xl overflow-hidden relative", // bg via inline style
        // ── Text-only ──────────────────────────────────────────────────────
        link:        "bg-transparent underline-offset-4 hover:underline text-primary rounded-none p-0 h-auto",
        // ── Pill filter (toggle-able category/radius chips) ─────────────────
        "pill-active":   "rounded-full text-white",   // bg via inline style
        "pill-inactive": "rounded-full border bg-white text-gray-500 hover:border-blue-400 hover:text-blue-600",
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
function getInlineStyle(variant: string | null | undefined): React.CSSProperties {
  switch (variant) {
    case "brand":
      return {
        background: G_BRAND,
        boxShadow: S_BRAND_MD,
        border: "none",
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
  ({ className, variant, size, asChild = false, style, styleOverride, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const inlineStyle: React.CSSProperties = {
      ...getInlineStyle(variant),
      ...style,
      ...styleOverride,
    };
    return (
      <Comp
        ref={ref}
        data-slot="app-button"
        className={cn(appButtonVariants({ variant, size, className }))}
        style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
        {...props}
      />
    );
  }
);
AppButton.displayName = "AppButton";

export { AppButton, appButtonVariants };

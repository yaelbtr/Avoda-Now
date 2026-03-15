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
        cta:         "text-white rounded-xl font-black hover:scale-[1.02] active:scale-[0.97]", // bg + shadow via inline style
        // כפתור ניגודי ל-cta: רקע לבן, טקסט זית כהה, מסגרת זית כהה
        "cta-outline": "bg-white rounded-xl font-black transition-colors duration-200", // text + border via inline style; transition-colors smooths hover color change
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
        border: `1.5px solid ${C_BRAND_HEX}`,
        boxShadow: `0 2px 8px oklch(0.38 0.07 125.0 / 0.10)`,
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

// ─── Ripple helpers ───────────────────────────────────────────────────────────────────
interface RippleItem { id: number; x: number; y: number; size: number; color: string; }

const CTA_RIPPLE_VARIANTS = new Set(["cta", "cta-outline"]);

// ─── Component ────────────────────────────────────────────────────────────────────
export interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appButtonVariants> {
  asChild?: boolean;
  /** Override the inline gradient/shadow style (e.g. for custom brand colors) */
  styleOverride?: React.CSSProperties;
}

const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant, size, asChild = false, style, styleOverride, onMouseEnter, onMouseLeave, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // ── Hover state (cta-outline only) ──────────────────────────────────────────────────
    const needsHoverState = variant === "cta-outline";
    const [hovered, setHovered] = React.useState(false);

    // ── Ripple state (cta + cta-outline) ───────────────────────────────────────────────
    const needsRipple = variant != null && CTA_RIPPLE_VARIANTS.has(variant);
    const [ripples, setRipples] = React.useState<RippleItem[]>([]);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (needsRipple) {
          const btn = e.currentTarget;
          const rect = btn.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height) * 2;
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top  - size / 2;
          // Ripple color: white for cta (dark bg), dark olive for cta-outline (light bg)
          const color = variant === "cta" ? "rgba(255,255,255,0.35)" : "rgba(61,74,40,0.18)";
          const id = Date.now();
          setRipples(prev => [...prev, { id, x, y, size, color }]);
          // Auto-remove after animation completes
          setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
        }
        onClick?.(e);
      },
      [needsRipple, variant, onClick]
    );

    const inlineStyle: React.CSSProperties = {
      ...getInlineStyle(variant, needsHoverState ? hovered : false),
      ...style,
      ...styleOverride,
    };

    return (
      <Comp
        ref={ref}
        data-slot="app-button"
        className={cn(
          appButtonVariants({ variant, size, className }),
          needsRipple && "btn-ripple-container"
        )}
        style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
        onMouseEnter={(e) => { if (needsHoverState) setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { if (needsHoverState) setHovered(false); onMouseLeave?.(e); }}
        onClick={handleClick}
        {...props}
      >
        {props.children}
        {needsRipple && ripples.map(r => (
          <span
            key={r.id}
            className="ripple-wave"
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              background: r.color,
            }}
          />
        ))}
      </Comp>
    );
  }
);
AppButton.displayName = "AppButton";

export { AppButton, appButtonVariants };

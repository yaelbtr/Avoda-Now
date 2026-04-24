/**
 * BrandName — renders "YallaAvoda" with the brand typography:
 *   "Avoda" → dark olive (light bg) / near-white (dark bg)
 *   "Now"   → citrus gold (always)
 *
 * Usage:
 *   <BrandName />                      → default span
 *   <BrandName as="h1" className="text-2xl" />
 */

import { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BrandNameProps extends HTMLAttributes<HTMLElement> {
  /** Render as any HTML element. Defaults to "span". */
  as?: ElementType;
}

export function BrandName({ as: Tag = "span", className, ...props }: BrandNameProps) {
  return (
    <Tag className={cn("brand-name", className)} {...props}>
      <span className="brand-yalla">Yalla</span>
      <span className="brand-avoda">Avoda</span>
    </Tag>
  );
}

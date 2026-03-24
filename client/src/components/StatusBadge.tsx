/**
 * StatusBadge — shared component for application/offer status display.
 *
 * Wraps the coloured badge in a Radix Tooltip so the descriptive text is
 * accessible on both desktop (hover) and mobile (long-press), replacing the
 * native `title` attribute which is invisible on touch devices.
 *
 * Usage:
 *   <StatusBadge status="offered" />
 *   <StatusBadge status={app.status} effectiveStatus="offered_accepted" className="text-xs" />
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getApplicationStatusLabel } from "@shared/const";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  /**
   * Raw application status from the DB (e.g. "pending", "offered").
   * Used as the lookup key unless `effectiveStatus` is provided.
   */
  status: string;
  /**
   * Override the lookup key — useful when the displayed status differs from
   * the raw DB value (e.g. "offered" + contactRevealed → "offered_accepted").
   */
  effectiveStatus?: string;
  className?: string;
}

export function StatusBadge({ status, effectiveStatus, className }: StatusBadgeProps) {
  const key = effectiveStatus ?? status;
  const cfg = getApplicationStatusLabel(key);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* asChild lets the <span> be the trigger without an extra wrapper */}
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-default select-none",
            className
          )}
          style={{ background: cfg.bg, color: cfg.color }}
          // Keep aria-label for screen readers
          aria-label={cfg.tooltip}
        >
          {cfg.label}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[220px] text-center leading-snug"
        dir="rtl"
      >
        {cfg.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

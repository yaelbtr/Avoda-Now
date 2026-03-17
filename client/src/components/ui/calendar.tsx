import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

// AvodaNow design tokens
const BRAND = "oklch(0.50 0.14 85)";          // #4a5d23 — brand primary
const BRAND_LIGHT = "oklch(0.92 0.04 122)";   // light olive tint — range middle
const BRAND_RING = "oklch(0.55 0.12 140 / 0.18)"; // focus ring
const LABEL_COLOR = "#4F583B";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar p-3 w-full [--cell-size:--spacing(9)]",
        // RTL chevron flip
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: date =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-3", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none rounded-full hover:bg-[oklch(0.92_0.04_122)]",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none rounded-full hover:bg-[oklch(0.92_0.04_122)]",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-semibold justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-bold text-sm",
          captionLayout !== "label" &&
            "rounded-md pl-2 pr-1 flex items-center gap-1 h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "rounded-md flex-1 font-semibold text-[0.72rem] select-none text-center",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-1", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center group/day aspect-square select-none",
          "[&:first-child[data-selected=true]_button]:rounded-r-full",
          "[&:last-child[data-selected=true]_button]:rounded-l-full",
          defaultClassNames.day
        ),
        range_start: cn("bg-[oklch(0.92_0.04_122)] rounded-r-full", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-[oklch(0.92_0.04_122)]", defaultClassNames.range_middle),
        range_end: cn("bg-[oklch(0.92_0.04_122)] rounded-l-full", defaultClassNames.range_end),
        today: cn(
          "font-bold text-[oklch(0.50_0.14_85)] data-[selected=true]:font-bold",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground opacity-40 aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-30",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        ),
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left")
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />;
          if (orientation === "right")
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />;
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  // Determine if this cell is today and not selected (selected state has its own bg)
  const isToday = modifiers.today;
  const isSelected = modifiers.selected || modifiers.range_start || modifiers.range_end || modifiers.range_middle;

  return (
    <div className="relative flex items-center justify-center w-full aspect-square">
      {/* Dashed circle for today — only when not selected */}
      {isToday && !isSelected && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            border: `1.5px dashed oklch(0.50 0.14 85)`,
            borderRadius: "50%",
          }}
        />
      )}
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString()}
        data-selected-single={
          modifiers.selected &&
          !modifiers.range_start &&
          !modifiers.range_end &&
          !modifiers.range_middle
        }
        data-range-start={modifiers.range_start}
        data-range-end={modifiers.range_end}
        data-range-middle={modifiers.range_middle}
        className={cn(
          // Base
          "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal rounded-full text-sm transition-all",
          // Hover
          "hover:bg-[oklch(0.92_0.04_122)] hover:text-[#1a2010]",
          // Single selected
          "data-[selected-single=true]:bg-[oklch(0.50_0.14_85)] data-[selected-single=true]:text-white data-[selected-single=true]:rounded-full data-[selected-single=true]:font-bold data-[selected-single=true]:shadow-sm",
          // Range start / end
          "data-[range-start=true]:bg-[oklch(0.50_0.14_85)] data-[range-start=true]:text-white data-[range-start=true]:rounded-r-full data-[range-start=true]:rounded-l-none data-[range-start=true]:font-bold",
          "data-[range-end=true]:bg-[oklch(0.50_0.14_85)] data-[range-end=true]:text-white data-[range-end=true]:rounded-l-full data-[range-end=true]:rounded-r-none data-[range-end=true]:font-bold",
          // Range middle
          "data-[range-middle=true]:bg-[oklch(0.92_0.04_122)] data-[range-middle=true]:text-[#1a2010] data-[range-middle=true]:rounded-none",
          // Focus ring
          "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-[oklch(0.55_0.12_140/0.18)] group-data-[focused=true]/day:border-[oklch(0.55_0.12_140)]",
          "[&>span]:text-xs [&>span]:opacity-70",
          defaultClassNames.day,
          className
        )}
        {...props}
      />
    </div>
  );
}

export { Calendar, CalendarDayButton };

/**
 * EmptyStateCarousel
 *
 * A single auto-rotating card that replaces the multiple separate info cards
 * in the FindJobs empty state. Cycles through contextual slides every 3 s.
 * Each slide has a uniform layout: illustration icon, headline, subtitle, and
 * one or two action buttons of identical height.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { C_BRAND_HEX, C_TEXT_MUTED } from "@/lib/colors";

// ── Slide definition ─────────────────────────────────────────────────────────

interface CarouselAction {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  variant: "primary" | "secondary";
}

interface CarouselSlide {
  id: string;
  /** Large emoji used as the illustration */
  emoji: string;
  /** Gradient background for the emoji bubble */
  bubbleBg: string;
  bubbleShadow: string;
  headline: string;
  subtitle: string;
  actions: CarouselAction[];
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface EmptyStateCarouselProps {
  showUrgentToday: boolean;
  dateFilter: string | null;
  category: string;
  catName: string;
  catIcon?: string;
  selectedCity: string | null;
  selectedTimeSlots: string[];
  selectedDays: string[];
  searchText: string;
  isAuthenticated: boolean;
  nearbyCities: string[];
  hasAnyFilter: boolean;
  onShowTomorrow: () => void;
  onShowThisWeek: () => void;
  onClearCategory: () => void;
  onSelectCity: (city: string) => void;
  onClearAllFilters: () => void;
  /** Geo-radius no-results slide */
  showGeoNoResults?: boolean;
  radiusKm?: number;
  expandRadiusOptions?: { value: number; label: string }[];
  onExpandRadius?: (km: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIMARY_BTN =
  "flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] text-center";
const SECONDARY_BTN =
  "flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] text-center border-[1.5px]";

// ── Component ────────────────────────────────────────────────────────────────

export default function EmptyStateCarousel({
  showUrgentToday,
  dateFilter,
  category,
  catName,
  catIcon,
  selectedCity,
  selectedTimeSlots,
  selectedDays,
  searchText,
  isAuthenticated,
  nearbyCities,
  hasAnyFilter,
  onShowTomorrow,
  onShowThisWeek,
  onClearCategory,
  onSelectCity,
  onClearAllFilters,
  showGeoNoResults = false,
  radiusKm = 10,
  expandRadiusOptions = [],
  onExpandRadius,
}: EmptyStateCarouselProps) {
  // ── Build slide list based on active context ────────────────────────────

  const slides: CarouselSlide[] = [];

  // Slide 1: primary reason (always first)
  if (showUrgentToday) {
    slides.push({
      id: "urgent",
      emoji: "⏰",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.06 65) 0%, oklch(0.90 0.08 55) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.55 0.14 65 / 0.20)",
      headline: "אין משרות דחופות כרגע",
      subtitle: "משרות דחופות מתפרסמות לעתים קרובות — נסה להרחיב את החיפוש",
      actions: [
        { id: "tomorrow", label: "משרות מחר", onClick: onShowTomorrow, variant: "primary" },
        { id: "week", label: "משרות השבוע", onClick: onShowThisWeek, variant: "secondary" },
      ] as CarouselAction[],
    });
  } else if (dateFilter === "today") {
    slides.push({
      id: "today",
      emoji: "📅",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 91) 0%, oklch(0.90 0.06 80) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.50 0.10 91 / 0.18)",
      headline: "אין משרות להיום כרגע",
      subtitle: "משרות חדשות מתפרסמות בכל רגע — בדוק מחר או בשבוע",
      actions: [
        { id: "tomorrow", label: "משרות מחר", onClick: onShowTomorrow, variant: "primary" },
        { id: "week", label: "משרות השבוע", onClick: onShowThisWeek, variant: "secondary" },
      ] as CarouselAction[],
    });
  } else if (searchText) {
    slides.push({
      id: "search",
      emoji: "🔍",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 122) 0%, oklch(0.90 0.06 91) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      headline: `לא נמצאו תוצאות`,
      subtitle: `לא נמצאו משרות עבור "${searchText}" — נסה מילים אחרות`,
      actions: hasAnyFilter
        ? [{ id: "clear", label: "נקה כל הסינונים", onClick: onClearAllFilters, variant: "primary" }]
        : [],
    });
  } else if (category !== "all") {
    slides.push({
      id: "category",
      emoji: catIcon ?? "💼",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 122) 0%, oklch(0.90 0.06 91) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      headline: `אין משרות בקטגוריית ${catName}`,
      subtitle: "נסה קטגוריה אחרת או בדוק כל המשרות",
      actions: [
        { id: "allCats", label: "הצג כל הקטגוריות", onClick: onClearCategory, variant: "primary" },
      ],
    });
  } else if (selectedCity) {
    slides.push({
      id: "city",
      emoji: "📍",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 210) 0%, oklch(0.90 0.06 200) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.10 210 / 0.14)",
      headline: `אין משרות ב${selectedCity}`,
      subtitle: "נסה עיר קרובה או הרחב את החיפוש",
      actions: nearbyCities.slice(0, 2).map((city) => ({
        id: `city-${city}`,
        label: city,
        onClick: () => onSelectCity(city),
        variant: "secondary" as const,
      })),
    });
  } else if (selectedTimeSlots.length > 0) {
    slides.push({
      id: "timeSlots",
      emoji: "🕐",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 122) 0%, oklch(0.90 0.06 91) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      headline: "אין משרות בשעות הנבחרות",
      subtitle: "נסה להסיר סינון שעות או לבחור טווח רחב יותר",
      actions: hasAnyFilter
        ? [{ id: "clear", label: "נקה כל הסינונים", onClick: onClearAllFilters, variant: "primary" }]
        : [],
    });
  } else if (selectedDays.length > 0) {
    slides.push({
      id: "days",
      emoji: "📆",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 122) 0%, oklch(0.90 0.06 91) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      headline: "אין משרות בימים הנבחרים",
      subtitle: "נסה להסיר סינון ימים או לבחור יותר ימים",
      actions: hasAnyFilter
        ? [{ id: "clear", label: "נקה כל הסינונים", onClick: onClearAllFilters, variant: "primary" }]
        : [],
    });
  } else {
    slides.push({
      id: "general",
      emoji: "💼",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 122) 0%, oklch(0.90 0.06 91) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      headline: "לא נמצאו משרות",
      subtitle: "נסה לשנות את הסינון או לחפש בעיר אחרת",
      actions: hasAnyFilter
        ? [{ id: "clear", label: "נקה סינון", onClick: onClearAllFilters, variant: "primary" }]
        : [],
    });
  }

  // Slide: try another date (if not already the primary)
  if (!showUrgentToday && dateFilter !== "today" && !searchText) {
    slides.push({
      id: "try-date",
      emoji: "📅",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 91) 0%, oklch(0.90 0.06 80) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.50 0.10 91 / 0.18)",
      headline: "נסה תאריך אחר",
      subtitle: "משרות חדשות מתפרסמות כל יום — בדוק מחר או בשבוע",
      actions: [
        { id: "tomorrow", label: "משרות מחר", onClick: onShowTomorrow, variant: "primary" },
        { id: "week", label: "משרות השבוע", onClick: onShowThisWeek, variant: "secondary" },
      ] as CarouselAction[],
    });
  }

  // Slide: expand category (if not already the primary)
  if (category !== "all" && slides[0]?.id !== "category") {
    slides.push({
      id: "expand-cat",
      emoji: catIcon ?? "💼",
      bubbleBg: "linear-gradient(135deg, oklch(0.94 0.04 122) 0%, oklch(0.90 0.06 91) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.38 0.07 122 / 0.12)",
      headline: "נסה קטגוריה רחבה יותר",
      subtitle: `כרגע מסננים לפי "${catName}" — הצג כל הקטגוריות`,
      actions: [
        { id: "allCats", label: "הצג כל הקטגוריות", onClick: onClearCategory, variant: "primary" },
      ],
    });
  }

  // Slide: geo no-results (when geo is active but no jobs found in current radius)
  if (showGeoNoResults && expandRadiusOptions.length > 0) {
    slides.push({
      id: "geo-no-results",
      emoji: "📍",
      bubbleBg: "linear-gradient(135deg, oklch(0.96 0.06 65 / 0.7) 0%, oklch(0.92 0.10 55 / 0.7) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.55 0.14 65 / 0.18)",
      headline: `לא נמצאו עבודות בטווח ${radiusKm} ק"מ`,
      subtitle: "הרחב את החיפוש לטווח גדול יותר",
      actions: expandRadiusOptions.map((r) => ({
        id: `radius-${r.value}`,
        label: r.label,
        onClick: () => onExpandRadius?.(r.value),
        variant: "secondary" as const,
      })),
    });
  }

  // Slide: notifications (authenticated users only)
  if (isAuthenticated) {
    slides.push({
      id: "notifications",
      emoji: "🔔",
      bubbleBg: "linear-gradient(135deg, oklch(0.96 0.04 280 / 0.6) 0%, oklch(0.94 0.06 260 / 0.6) 100%)",
      bubbleShadow: "0 4px 16px oklch(0.50 0.18 280 / 0.18)",
      headline: "קבל התראה על משרות חדשות",
      subtitle: "הפעל התראות בדף הפרופיל שלך ואל תפספס הזדמנויות",
      actions: [
        { id: "profile", label: "עבר להגדרות התראות ←", href: "/profile", variant: "primary" },
      ],
    });
  }

  // ── Auto-rotate & swipe ─────────────────────────────────────────────────
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = forward (RTL: swipe right→left), -1 = back
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = slides.length;

  const goTo = useCallback((idx: number, dir: 1 | -1) => {
    setDirection(dir);
    setActiveIdx(idx);
  }, []);

  const advance = useCallback(() => {
    setDirection(1);
    setActiveIdx((i) => (i + 1) % total);
  }, [total]);

  /** Called after a drag ends — decide whether to advance/retreat based on offset */
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const { offset, velocity } = info;
      const SWIPE_THRESHOLD = 50; // px
      const VELOCITY_THRESHOLD = 300; // px/s
      const isRTL = true; // app is RTL — positive x = swipe toward start (previous)

      // In RTL: dragging left (negative x) = advancing forward
      const shouldAdvance =
        offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;
      const shouldRetreat =
        offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;

      if (shouldAdvance && total > 1) {
        goTo((activeIdx + 1) % total, 1);
      } else if (shouldRetreat && total > 1) {
        goTo((activeIdx - 1 + total) % total, -1);
      }

      // Pause auto-rotate for 5 s after manual swipe
      setPaused(true);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => setPaused(false), 5000);
    },
    [activeIdx, total, goTo]
  );

  useEffect(() => {
    // Reset to first slide when context changes
    setActiveIdx(0);
  }, [showUrgentToday, dateFilter, category, selectedCity, searchText]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const t = setInterval(advance, 3000);
    return () => clearInterval(t);
  }, [paused, total, advance]);

  if (slides.length === 0) return null;

  const slide = slides[activeIdx];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="mb-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
      dir="rtl"
    >
      {/* Card */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          border: "1.5px solid oklch(0.88 0.04 122 / 0.6)",
          boxShadow: "0 2px 12px oklch(0.38 0.07 122 / 0.08)",
          background: "white",
          minHeight: 220,
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * -40 }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: dir * 40 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            className="p-5 flex flex-col items-center text-center cursor-grab active:cursor-grabbing"
            style={{ touchAction: "pan-y" }}
          >
            {/* Illustration emoji — scale-in on each slide entry */}
            <motion.span
              key={slide.id + "-emoji"}
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.08 }}
              className="text-5xl leading-none select-none mb-4 mt-1 inline-block"
            >
              {slide.emoji}
            </motion.span>

            {/* Text */}
            <h3
              className="text-lg font-black mb-1.5 leading-snug"
              style={{ color: "oklch(0.22 0.03 122.3)" }}
            >
              {slide.headline}
            </h3>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: C_TEXT_MUTED }}>
              {slide.subtitle}
            </p>

            {/* Actions — uniform height, full width */}
            {slide.actions.length > 0 && (
              <div className="flex gap-2.5 w-full">
                {slide.actions.map((action) =>
                  action.href ? (
                    <Link
                      key={action.id}
                      href={action.href}
                      className={action.variant === "primary" ? PRIMARY_BTN : SECONDARY_BTN}
                      style={
                        action.variant === "primary"
                          ? { background: "oklch(0.35 0.08 122)", color: "oklch(0.96 0.04 80)" }
                          : { borderColor: "oklch(0.82 0.06 122)", color: "oklch(0.35 0.08 122)", background: "white" }
                      }
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={action.variant === "primary" ? PRIMARY_BTN : SECONDARY_BTN}
                      style={
                        action.variant === "primary"
                          ? { background: "oklch(0.35 0.08 122)", color: "oklch(0.96 0.04 80)" }
                          : { borderColor: "oklch(0.82 0.06 122)", color: "oklch(0.35 0.08 122)", background: "white" }
                      }
                    >
                      {action.label}
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { goTo(i, i > activeIdx ? 1 : -1); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === activeIdx ? 20 : 6,
                height: 6,
                background: i === activeIdx ? C_BRAND_HEX : "oklch(0.82 0.04 122)",
              }}
              aria-label={`מצגת ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

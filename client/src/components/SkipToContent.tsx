/**
 * SkipToContent — accessibility skip link
 *
 * Visually hidden at all times EXCEPT when it receives keyboard focus,
 * at which point it slides into view so keyboard/screen-reader users can
 * jump past the navigation directly to the main content area.
 *
 * Usage:
 *   1. Render <SkipToContent /> as the FIRST child inside <body> (before Navbar).
 *   2. Add id="main-content" to the <main> element.
 *
 * Complies with WCAG 2.1 SC 2.4.1 (Bypass Blocks) and IS 5568.
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      dir="rtl"
      className={[
        // Always positioned at top-left, above everything
        "fixed top-2 right-2 z-[9999]",
        // Visually hidden by default — moved off-screen
        "-translate-y-20 opacity-0",
        // Revealed on focus
        "focus:translate-y-0 focus:opacity-100",
        // Transition
        "transition-all duration-150",
        // Visual style — high-contrast so it's unmissable
        "rounded-lg px-4 py-2 text-sm font-bold shadow-lg",
        "bg-[var(--citrus)] text-[oklch(0.22_0.04_80)]",
        "outline-none ring-2 ring-offset-2 ring-[var(--citrus)]",
      ].join(" ")}
    >
      דלג לתוכן הראשי
    </a>
  );
}

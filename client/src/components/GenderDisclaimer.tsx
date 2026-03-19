/**
 * GenderDisclaimer
 * Single source of truth for the gender-neutral language notice.
 * Renders at the bottom of every main screen on both mobile and desktop.
 */
export default function GenderDisclaimer() {
  return (
    <div
      dir="rtl"
      className="w-full text-center px-4 py-2"
      style={{
        fontSize: "11px",
        lineHeight: "1.6",
        color: "oklch(0.55 0.02 122 / 0.70)",
        borderTop: "1px solid oklch(0.85 0.01 122 / 0.40)",
        background: "oklch(0.97 0.005 122 / 0.60)",
      }}
    >
      לשון זכר בפלטפורמה נועדה מטעמי נוחות בלבד ומתייחסת לכל המינים.
    </div>
  );
}

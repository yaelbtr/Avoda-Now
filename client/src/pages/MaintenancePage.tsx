import { Wrench } from "lucide-react";

/**
 * MaintenancePage — shown to all non-admin users when maintenance mode is active.
 * Admins bypass this page entirely and see the full app.
 */
export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "oklch(0.97 0.02 122)", direction: "rtl" }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
        style={{ background: "linear-gradient(135deg, oklch(0.35 0.08 122), oklch(0.28 0.06 122))" }}
      >
        <Wrench className="h-10 w-10 text-white" />
      </div>

      {/* Title */}
      <h1
        className="text-3xl font-extrabold mb-3"
        style={{ color: "oklch(0.22 0.03 122.3)", fontFamily: "'Frank Ruhl Libre', 'Heebo', serif" }}
      >
        המערכת בתחזוקה
      </h1>

      {/* Subtitle */}
      <p className="text-base max-w-xs leading-relaxed" style={{ color: "oklch(0.45 0.05 122)" }}>
        אנחנו עובדים על שיפורים ונחזור בקרוב.
        <br />
        תודה על הסבלנות!
      </p>

      {/* Decorative dots */}
      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{
              background: "oklch(0.35 0.08 122)",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

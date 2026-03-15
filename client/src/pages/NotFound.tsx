import { useLocation } from "wouter";
import { AppButton, AppLogo } from "@/components/ui";
import { Home } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4"
      style={{ background: "var(--page-bg-gradient)" }}
      dir="rtl"
    >
      {/* Logo */}
      <div className="mb-8">
        <AppLogo variant="light" size="md" animated={false} />
      </div>

      {/* Error card */}
      <div
        className="glass-card rounded-2xl p-8 text-center w-full max-w-sm"
        style={{ boxShadow: "0 8px 32px oklch(0.38 0.07 122 / 0.12)" }}
      >
        {/* Big 404 */}
        <div
          className="text-7xl font-black mb-2 leading-none"
          style={{
            color: "oklch(0.50 0.09 124.9)",
            fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
            textShadow: "0 2px 8px oklch(0.50 0.09 124.9 / 0.20)",
          }}
        >
          404
        </div>

        <h1 className="text-xl font-bold mb-2" style={{ color: "#1a2010" }}>
          הדף לא נמצא
        </h1>

        <p className="text-sm leading-relaxed mb-6" style={{ color: "#6b7280" }}>
          הדף שחיפשת אינו קיים, אולי הועבר או נמחק.
        </p>

        <AppButton
          variant="cta"
          size="lg"
          className="w-full"
          onClick={() => setLocation("/")}
        >
          <Home className="w-4 h-4" />
          חזרה לדף הבית
        </AppButton>
      </div>
    </div>
  );
}

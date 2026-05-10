import { Lock, MapPin, Star, Wallet, Zap } from "lucide-react";
import { GradientCard } from "@/components/ui/gradient-card";

const BENEFITS = [
  {
    Icon: Wallet,
    title: "ללא עמלות",
    desc: "מקבלים 100% מהשכר, בלי קיצוצים",
  },
  {
    Icon: Zap,
    title: "ישיר למעסיק",
    desc: "בלי תיווך מיותר, קשר אמיתי",
  },
  {
    Icon: Lock,
    title: "פרופיל מאובטח",
    desc: "הטלפון מוסתר עד שתאשרו",
  },
  {
    Icon: MapPin,
    title: "התאמה לפי מיקום",
    desc: "רק עבודות באזור שלכם",
  },
];

export function TrustGrid() {
  return (
    <section
      dir="rtl"
      className="px-6 pt-0 pb-12"
      style={{
        // background: "var(--editorial-surface-container)",
        fontFamily: "var(--font-editorial-ui)",
      }}
    >
      <div className="mb-7 flex items-center justify-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ background: "oklch(0.75 0.12 76.7 / 0.15)" }}
        >
          <Star className="h-4 w-4" style={{ color: "var(--amber)" }} />
        </div>
        <h2 className="text-lg font-black" style={{ color: "var(--brand)" }}>
          למה עובדים בוחרים בנו
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BENEFITS.map((benefit) => (
          <GradientCard key={benefit.title} {...benefit} />
        ))}
      </div>
    </section>
  );
}

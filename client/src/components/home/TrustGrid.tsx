import { Lock, MapPin, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    Icon: Wallet,
    title: "ללא עמלות",
    desc: "מקבלים 100% מהשכר, בלי קיצוצים",
    iconBg: "var(--editorial-primary-fixed)",
    iconColor: "var(--editorial-primary)",
  },
  {
    Icon: Zap,
    title: "ישיר למעסיק",
    desc: "בלי תיווך מיותר, קשר אמיתי",
    iconBg: "var(--editorial-secondary-fixed)",
    iconColor: "var(--editorial-secondary)",
  },
  {
    Icon: Lock,
    title: "פרופיל מאובטח",
    desc: "הטלפון מוסתר עד שתאשרו",
    iconBg: "var(--editorial-tertiary-fixed)",
    iconColor: "var(--editorial-tertiary)",
  },
  {
    Icon: MapPin,
    title: "התאמה לפי מיקום",
    desc: "רק עבודות באזור שלכם",
    iconBg: "var(--editorial-primary-fixed)",
    iconColor: "var(--editorial-primary)",
  },
];

function BenefitCard({
  Icon,
  title,
  desc,
  iconBg,
  iconColor,
}: (typeof BENEFITS)[0]) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 p-5 rounded-2xl",
        "border border-black/[0.06] bg-white/60 shadow-sm backdrop-blur-sm",
        "transition-all duration-300 ease-in-out",
        "hover:scale-[1.03] hover:shadow-md hover:bg-white/80"
      )}
    >
      {/* אייקון */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: iconBg }}
      >
        <Icon size={22} strokeWidth={2.2} style={{ color: iconColor }} />
      </div>

      {/* טקסט */}
      <div className="flex flex-col gap-1">
        <h3
          className="text-base font-semibold leading-tight"
          style={{ color: "var(--editorial-on-surface)", fontFamily: "var(--font-editorial-ui)" }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-snug"
          style={{ color: "var(--editorial-on-surface-variant)" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

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
      <h2
        className="mb-5"
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#332a2c",
          fontFamily: "var(--font-editorial-headline)",
          letterSpacing: 0,
        }}
      >
        למה עובדים בוחרים בנו
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {BENEFITS.map((benefit) => (
          <BenefitCard key={benefit.title} {...benefit} />
        ))}
      </div>
    </section>
  );
}

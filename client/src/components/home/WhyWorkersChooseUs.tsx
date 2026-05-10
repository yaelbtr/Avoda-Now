import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, ShieldCheck, PhoneCall, CalendarCheck } from "lucide-react";
import { GlowCard } from "@/components/ui/spotlight-card";

const REASONS = [
  {
    id: 1,
    icon: Zap,
    glowColor: "green" as const,
    accent: "#4a7c3f",
    accentBg: "#d6f0cb",
    title: "הצעות מותאמות אישית",
    description: "המערכת מתאימה לך עבודות לפי מיקום, זמינות ותחום - בלי לחפש.",
  },
  {
    id: 2,
    icon: ShieldCheck,
    glowColor: "orange" as const,
    accent: "#795900",
    accentBg: "#ffdfa0",
    title: "ללא עמלות",
    description: "אפס עמלות. אפס מתווכים. כל השכר עובר ישירות אליך.",
  },
  {
    id: 3,
    icon: PhoneCall,
    glowColor: "purple" as const,
    accent: "#5b3a6e",
    accentBg: "#ead6fb",
    title: "קשר ישיר עם המעסיק",
    description: "המעסיק רואה אותך ופונה ישירות. בלי ביניים, בלי עיכובים.",
  },
  {
    id: 4,
    icon: CalendarCheck,
    glowColor: "blue" as const,
    accent: "#1a5276",
    accentBg: "#d0e8f8",
    title: "גמישות מלאה",
    description: "בוחרים מתי ואיפה עובדים. מעדכנים זמינות בשניות.",
  },
];

function ReasonCard({
  reason,
  index,
}: {
  reason: (typeof REASONS)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });
  const Icon = reason.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlowCard
        glowColor={reason.glowColor}
        customSize
        className="w-full"
        style={{ minHeight: 140 }}
      >
        <div
          dir="rtl"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            height: "100%",
            padding: "6px 2px",
          }}
        >
          {/* Icon badge */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: reason.accentBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={20} color={reason.accent} strokeWidth={2} />
          </div>

          {/* Text */}
          <div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--editorial-on-surface)",
                fontFamily: "var(--font-editorial-headline)",
                margin: "0 0 5px",
                lineHeight: 1.3,
              }}
            >
              {reason.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--editorial-on-surface-variant)",
                lineHeight: 1.6,
                margin: 0,
                fontFamily: "var(--font-editorial-ui)",
              }}
            >
              {reason.description}
            </p>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

export function WhyWorkersChooseUs() {
  const headerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(headerRef, { once: true });

  return (
    <section
      dir="rtl"
      style={{
        background: "var(--editorial-background)",
        padding: "32px 20px 28px",
        fontFamily: "var(--font-editorial-ui)",
      }}
    >
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.45 }}
        style={{ marginBottom: 20 }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#332a2c",
            fontFamily: "var(--font-editorial-headline)",
            margin: 0,
          }}
        >
          למה עובדים בוחרים בנו
        </h2>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {REASONS.map((reason, i) => (
          <ReasonCard key={reason.id} reason={reason} index={i} />
        ))}
      </div>
    </section>
  );
}

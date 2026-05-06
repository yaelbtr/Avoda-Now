import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserPlus, Bell, CheckCircle } from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: UserPlus,
    color: "#313b15",
    bg: "#dce8b3",
    stepLabel: "שלב 1",
    title: "נרשמים ויוצרים פרופיל",
    description: "30 שניות. בוחרים תחומים ואזור — ואתם כבר על המפה.",
  },
  {
    id: 2,
    icon: Bell,
    color: "#795900",
    bg: "#ffdfa0",
    stepLabel: "שלב 2",
    title: "אנחנו מתאימים לכם עבודות",
    description: "מעסיקים באזורכם רואים אתכם ראשונים. ההתאמה אוטומטית.",
  },
  {
    id: 3,
    icon: CheckCircle,
    color: "#492e49",
    bg: "#fed6fa",
    stepLabel: "שלב 3",
    title: "המעסיק יוצר קשר ישיר",
    description: "אתם בוחרים, מאשרים ויוצאים לעבוד. פשוט.",
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof STEPS)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.55,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      dir="rtl"
      style={{
        background: "var(--editorial-surface)",
        border: "1.5px solid var(--editorial-outline-ghost)",
        borderRadius: 24,
        padding: "22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 2px 12px rgb(27 28 26 / 0.06)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
      whileHover={{
        y: -5,
        boxShadow: "0 18px 40px rgb(27 28 26 / 0.13)",
        borderColor: step.color,
        transition: { type: "spring", stiffness: 360, damping: 22 },
      }}
    >
      {/* Glow blob */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -24,
          right: -24,
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: step.bg,
          opacity: 0.38,
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />

      {/* Icon + badge row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: step.color,
            background: step.bg,
            padding: "3px 10px",
            borderRadius: 999,
            fontFamily: "var(--font-editorial-ui)",
          }}
        >
          {step.stepLabel}
        </span>
      </div>

      {/* Text */}
      <div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "var(--editorial-on-surface)",
            fontFamily: "var(--font-editorial-headline)",
            margin: "0 0 6px",
            lineHeight: 1.3,
          }}
        >
          {step.title}
        </h3>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--editorial-on-surface-variant)",
            lineHeight: 1.6,
            margin: 0,
            fontFamily: "var(--font-editorial-ui)",
          }}
        >
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

export function HowItWorksSimple() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true });

  return (
    <section
      dir="rtl"
      style={{
        background: "var(--editorial-background)",
        marginTop: -12,
        padding: "52px 20px 32px",
        fontFamily: "var(--font-editorial-ui)",
        position: "relative",
        zIndex: 11,
      }}
    >
      {/* Header */}
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: 24 }}
      >
        
        <h2
          style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#332a2c",
          fontFamily: "var(--font-editorial-headline)",
          letterSpacing: 0,
          }}
        >
          איך זה עובד
        </h2>
      </motion.div>

      {/* Step cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {STEPS.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* Bottom divider line */}
      <motion.div
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
        style={{
          width: 2,
          background:
            "linear-gradient(to bottom, var(--editorial-primary-fixed), transparent)",
          borderRadius: 999,
          margin: "16px auto 0",
          height: 32,
          transformOrigin: "top",
        }}
      />
    </section>
  );
}

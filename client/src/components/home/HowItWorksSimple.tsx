import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const HOW_IT_WORKS_WORKER = [
  {
    step: "01",
    title: "נרשמים ויוצרים פרופיל",
    desc: "30 שניות. בוחרים תחומים ואזור - ואתם כבר על המפה.",
    imgUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/how-it-works-step1_3045eee6.webp",
    reverse: false,
  },
  {
    step: "02",
    title: "אנחנו מתאימים לכם עבודות",
    desc: "מעסיקים באזורכם רואים אתכם ראשונים. ההתאמה אוטומטית.",
    imgUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/how-it-works-step2_64b352ff.webp",
    reverse: true,
  },
  {
    step: "03",
    title: "המעסיק יוצר קשר ישיר",
    desc: "אתם בוחרים, מאשרים ויוצאים לעבוד. פשוט.",
    imgUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/how-it-works-step3_76fe12ce.webp",
    reverse: false,
  },
];

export function HowItWorksSimple() {
  return (
    <section
      className="relative z-10 mx-6 mb-12 rounded-[28px] p-7 max-w-lg"
      dir="rtl"
      style={{
        background: "white",
        boxShadow:
          "0 4px 24px oklch(0.38 0.07 125.0 / 0.10), 0 1px 4px oklch(0.38 0.07 125.0 / 0.06)",
        border: "none",
        marginTop: "28px",
        fontFamily: "var(--font-editorial-ui)",
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-7">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.75 0.12 76.7 / 0.15)" }}
        >
          <Star className="h-4 w-4" style={{ color: "var(--amber)" }} />
        </div>
        <div>
          <h3 className="text-lg font-black" style={{ color: "var(--brand)" }}>
            איך זה עובד
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        {HOW_IT_WORKS_WORKER.map(({ step, title, desc, imgUrl, reverse }, idx) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: reverse ? -24 : 24, y: 12 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: idx * 0.12, duration: 0.45, ease: "easeOut" }}
            whileHover={{
              y: -3,
              boxShadow:
                "0 8px 28px oklch(0.38 0.07 125.0 / 0.18), 0 2px 8px oklch(0.38 0.07 125.0 / 0.10)",
            }}
            whileTap={{ scale: 0.98 }}
            className={"flex items-center gap-4 p-4 rounded-2xl overflow-hidden" + (reverse ? " flex-row-reverse" : "")}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.97 0.015 122.3) 0%, oklch(0.95 0.02 91.6) 100%)",
              border: "1px solid oklch(0.89 0.05 84.0)",
            }}
          >
            <div
              className="flex-shrink-0 w-24 h-20 text-center text-[42px]  leading-none select-none flex items-center justify-center"
              style={
                {
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "#d9dfbc",
                  // backgroundImage: `url("${imgUrl}")`,
                  // backgroundSize: "cover",
                  // backgroundPosition: "center",
                  filter: "saturate(1.4) contrast(1.1) brightness(0.85)",
                } as React.CSSProperties
              }
            >
              {step}
            </div>
            <div className="flex-1 text-right">
              <h4 className="text-[16px]   mb-1" style={{ fontWeight:"800", color: "var(--brand)" }}>
                {title}
              </h4>
              <p
                className="text-[12px] font-medium leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

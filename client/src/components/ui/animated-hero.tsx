import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onSetAvailability: () => void;
  onCreateProfile: () => void;
}

function Hero({ onSetAvailability, onCreateProfile }: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["שתבחר", "באזורך", "בזמן שמתאים לך", "ללא עמלות", "מהיום"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((n) => (n === titles.length - 1 ? 0 : n + 1));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div
      dir="rtl"
      style={{
        width: "100%",
        fontFamily: "var(--font-editorial-ui)",
        backgroundColor: "var(--editorial-surface-container)",
        padding: "48px 0 40px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            textAlign: "center",
          }}
        >
          {/* תג עליון */}
          <Button
            variant="secondary"
            size="sm"
            style={{
              gap: 8,
              background: "var(--editorial-primary-fixed)",
              color: "var(--editorial-primary)",
              border: "none",
              fontFamily: "var(--font-editorial-ui)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            אלפי עובדים כבר נחשפו למעסיקים
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </Button>

          {/* כותרת עם מילה מתחלפת */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2
              style={{
                fontFamily: "var(--font-editorial-display)",
                fontSize: "clamp(1.9rem, 5vw, 2.8rem)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: "var(--editorial-on-surface)",
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              <span>עבודה</span>
              {/* מילה מתחלפת */}
              <span
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  height: "1.25em",
                  marginTop: 2,
                }}
              >
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    style={{
                      position: "absolute",
                      fontWeight: 900,
                      color: "var(--editorial-primary)",
                      fontFamily: "var(--font-editorial-display)",
                    }}
                    initial={{ opacity: 0, y: -80 }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h2>

            <p
              style={{
                fontFamily: "var(--font-editorial-ui)",
                fontSize: "0.95rem",
                lineHeight: 1.65,
                color: "var(--editorial-on-surface-variant)",
                maxWidth: 480,
                margin: "0 auto",
                letterSpacing: "-0.01em",
              }}
            >
              הצטרפו לאלפי עובדים שכבר רשומים ב-AvodaGo וקבלו הצעות עבודה ישירות מהמעסיקים הקרובים אליכם.
            </p>
          </div>

          {/* כפתורי פעולה */}
          <div style={{ display: "flex", flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Button
              variant="outline"
              size="lg"
              onClick={onSetAvailability}
              style={{
                gap: 8,
                borderColor: "var(--editorial-outline-ghost)",
                color: "var(--editorial-primary)",
                fontFamily: "var(--font-editorial-ui)",
                fontWeight: 700,
                borderRadius: 9999,
              }}
            >
              הגדר זמינות עכשיו
              <Zap style={{ width: 15, height: 15 }} />
            </Button>

            <Button
              size="lg"
              onClick={onCreateProfile}
              style={{
                gap: 8,
                background: "var(--editorial-cta-gradient)",
                border: "none",
                fontFamily: "var(--font-editorial-ui)",
                fontWeight: 700,
                borderRadius: 9999,
                boxShadow: "var(--editorial-shadow)",
              }}
            >
              צור פרופיל
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };

import { Briefcase, Mail, Zap, Users } from "lucide-react";

const FG_PRIMARY  = "oklch(0.9904 0.0107 95.3 / 0.85)";
const FG_MUTED    = "oklch(0.9904 0.0107 95.3 / 0.45)";
const ACCENT      = "var(--citrus)";
const DIVIDER     = "oklch(1 0 0 / 0.08)";

// SEO cities — real Hebrew city names used as URL params
const SEO_CITIES = [
  "תל אביב",
  "ירושלים",
  "חיפה",
  "ראשון לציון",
  "פתח תקווה",
  "אשדוד",
  "נתניה",
  "באר שבע",
  "בני ברק",
  "רמת גן",
  "הרצליה",
  "רחובות",
];

// SEO categories — value + Hebrew label for crawlable links
const SEO_CATEGORIES = [
  { value: "delivery", label: "שליחויות" },
  { value: "warehouse", label: "מחסן" },
  { value: "kitchen", label: "מטבח" },
  { value: "cleaning", label: "ניקיון" },
  { value: "security", label: "אבטחה" },
  { value: "construction", label: "בנייה" },
  { value: "childcare", label: "טיפול בילדים" },
  { value: "eldercare", label: "טיפול בקשישים" },
  { value: "retail", label: "קמעונאות" },
  { value: "events", label: "אירועים" },
  { value: "agriculture", label: "חקלאות" },
  { value: "other", label: "אחר" },
];

export default function Footer() {
  return (
    <footer
      dir="rtl"
      style={{
        background: "var(--footer-bg)",
        borderTop: `1px solid ${DIVIDER}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.44 0.07 124.9 / 0.15) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-4xl mx-auto px-4 pt-10 pb-6 relative z-10">

        {/* ── Brand row ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.50 0.09 124.9) 0%, oklch(0.36 0.07 124.9) 100%)",
                boxShadow:
                  "0 4px 12px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.15)",
              }}
            >
              <Briefcase className="h-4 w-4" style={{ color: ACCENT }} />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-black text-[18px]"
                style={{
                  color: "var(--header-fg)",
                  fontFamily: "'Frank Ruhl Libre', 'Heebo', serif",
                  letterSpacing: "-0.03em",
                }}
              >
                Avoda<span style={{ color: ACCENT }}>Now</span>
              </span>
              <span className="text-[9px] font-bold uppercase" style={{ color: FG_MUTED, letterSpacing: "0.14em" }}>
                עבודה עכשיו
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: FG_MUTED }}>
              <Zap className="h-3 w-3" style={{ color: ACCENT }} />
              <span>500+ משרות</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: FG_MUTED }}>
              <Users className="h-3 w-3" style={{ color: ACCENT }} />
              <span>אלפי עובדים</span>
            </div>
            <a
              href="mailto:info@avodanow.co.il"
              className="inline-flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: FG_MUTED }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_MUTED)}
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span>info@avodanow.co.il</span>
            </a>
          </div>
        </div>

        {/* ── SEO divider ── */}
        <div style={{ borderTop: `1px solid ${DIVIDER}` }} className="mb-8" />

        {/* ── SEO Link Groups ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">

          {/* Group 1 – Jobs by city */}
          <div>
            <h2
              className="font-bold text-[11px] uppercase mb-3 text-right"
              style={{ color: ACCENT, letterSpacing: "0.12em" }}
            >
              משרות לפי עיר
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
              {SEO_CITIES.map((city) => (
                <li key={city}>
                  <a
                    href={`/find-jobs?city=${encodeURIComponent(city)}`}
                    className="text-[13px] transition-colors"
                    style={{ color: FG_PRIMARY }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                  >
                    עבודות ב{city}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Group 2 – Jobs by category */}
          <div>
            <h2
              className="font-bold text-[11px] uppercase mb-3 text-right"
              style={{ color: ACCENT, letterSpacing: "0.12em" }}
            >
              משרות לפי קטגוריה
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
              {SEO_CATEGORIES.map((cat) => (
                <li key={cat.value}>
                  <a
                    href={`/find-jobs?category=${cat.value}`}
                    className="text-[13px] transition-colors"
                    style={{ color: FG_PRIMARY }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                  >
                    {cat.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Guide links ── */}
        <div className="mb-8" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          <h2
            className="font-bold text-[11px] uppercase mb-3 mt-6 text-right"
            style={{ color: ACCENT, letterSpacing: "0.12em" }}
          >
            מדריכים לעבודות זמניות
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-end">
            {SEO_CATEGORIES.filter((c) => c.value !== "other").map((cat) => (
              <li key={cat.value}>
                <a
                  href={`/guide/temporary-jobs/${cat.value}`}
                  className="text-[13px] transition-colors"
                  style={{ color: FG_PRIMARY }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = FG_PRIMARY)}
                >
                  מדריך: {cat.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/guide/temporary-jobs"
                className="text-[13px] font-semibold transition-colors"
                style={{ color: ACCENT }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = ACCENT)}
              >
                כל המדריכים →
              </a>
            </li>
          </ul>
        </div>

        {/* ── Minimal legal footer ── */}
        <div
          className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${DIVIDER}` }}
        >
          <div className="flex items-center gap-4">
            <a
              href="/terms"
              className="text-[12px] transition-colors"
              style={{ color: ACCENT }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = ACCENT as string)}
            >
              תנאי שימוש
            </a>
            <span style={{ color: FG_MUTED }}>·</span>
            <a
              href="/privacy"
              className="text-[12px] transition-colors"
              style={{ color: ACCENT }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = ACCENT as string)}
            >
              מדיניות פרטיות
            </a>
          </div>

          <p className="text-[11px] whitespace-nowrap font-medium" style={{ color: FG_MUTED }}>
            © {new Date().getFullYear()} AvodaNow · כל הזכויות שמורות
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: FG_MUTED }}>
          פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה.
        </p>
      </div>
    </footer>
  );
}

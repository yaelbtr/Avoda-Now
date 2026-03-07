import { Link } from "wouter";
import { Briefcase, Mail } from "lucide-react";

// Dark footer — matches Navbar header-bg (#2e3c0f)
const FG_PRIMARY  = "var(--header-fg)";                  // #fefcf4 cream
const FG_MUTED    = "oklch(0.78 0.03 95.3)";             // warm light grey
const FG_FAINT    = "oklch(0.62 0.03 95.3)";             // dimmer warm grey
const ACCENT      = "var(--citrus)";                     // Sun-Kissed Citrus
const DIVIDER     = "oklch(0.40 0.07 124.9)";            // subtle dark olive line

export default function Footer() {
  return (
    <footer
      dir="rtl"
      style={{
        background: "var(--footer-bg)",
        borderTop: `1px solid ${DIVIDER}`,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.40 0.07 124.9)" }}
              >
                <Briefcase className="h-3.5 w-3.5" style={{ color: ACCENT }} />
              </div>
              <span className="font-black text-lg" style={{ color: FG_PRIMARY }}>
                Avoda<span style={{ color: ACCENT }}>Now</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-right" style={{ color: FG_MUTED }}>
              מצא עבודה או עובדים עכשיו. לוח דרושים מהיר ופשוט לעבודות זמניות והתנדבות.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-right" style={{ color: FG_PRIMARY }}>ניווט</h3>
            <ul className="space-y-2 text-sm text-right">
              {[
                { href: "/", label: "בית" },
                { href: "/find-jobs", label: "חפש עבודה" },
                { href: "/post-job", label: "פרסם משרה" },
                { href: "/my-jobs", label: "המשרות שלי" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors"
                    style={{ color: FG_MUTED }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = FG_MUTED)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-right" style={{ color: FG_PRIMARY }}>מידע משפטי</h3>
            <ul className="space-y-2 text-sm text-right">
              <li>
                <Link
                  href="/terms"
                  className="transition-colors"
                  style={{ color: FG_MUTED }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = FG_MUTED)}
                >
                  תנאי שימוש
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors"
                  style={{ color: FG_MUTED }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = FG_MUTED)}
                >
                  מדיניות פרטיות
                </Link>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-sm pt-1 justify-end" style={{ color: FG_FAINT }}>
              <span>info@job-now.co.il</span>
              <Mail className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          <p className="text-xs text-center leading-relaxed" style={{ color: FG_FAINT }}>
            פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה או להסכמים בין הצדדים.
          </p>
          <p className="text-xs text-center mt-2" style={{ color: FG_FAINT }}>
            © {new Date().getFullYear()} AvodaNow. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}

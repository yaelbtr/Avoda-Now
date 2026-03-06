import { Link } from "wouter";
import { Briefcase, Mail } from "lucide-react";

const BG = "oklch(0.96 0.004 247)";
const BORDER = "oklch(0.90 0.006 247)";
const TEXT_PRIMARY = "oklch(0.20 0.015 265)";
const TEXT_MUTED = "oklch(0.50 0.010 265)";
const TEXT_FAINT = "oklch(0.65 0.008 265)";
const BLUE = "oklch(0.58 0.20 255)";
const BLUE_BG = "oklch(0.94 0.015 255)";

export default function Footer() {
  return (
    <footer
      dir="rtl"
      style={{
        background: BG,
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: BLUE_BG }}
              >
                <Briefcase className="h-3.5 w-3.5" style={{ color: BLUE }} />
              </div>
              <span className="font-black text-lg" style={{ color: TEXT_PRIMARY }}>
                Job<span style={{ color: BLUE }}>Now</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-right" style={{ color: TEXT_MUTED }}>
              מצא עבודה או עובדים עכשיו. לוח דרושים מהיר ופשוט לעבודות זמניות והתנדבות.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-right" style={{ color: TEXT_PRIMARY }}>ניווט</h3>
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
                    style={{ color: TEXT_MUTED }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = BLUE)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-right" style={{ color: TEXT_PRIMARY }}>מידע משפטי</h3>
            <ul className="space-y-2 text-sm text-right">
              <li>
                <Link
                  href="/terms"
                  className="transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = BLUE)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                >
                  תנאי שימוש
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = BLUE)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                >
                  מדיניות פרטיות
                </Link>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-sm pt-1 justify-end" style={{ color: TEXT_FAINT }}>
              <span>info@job-now.co.il</span>
              <Mail className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs text-center leading-relaxed" style={{ color: TEXT_FAINT }}>
            פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה או להסכמים בין הצדדים.
          </p>
          <p className="text-xs text-center mt-2" style={{ color: TEXT_FAINT }}>
            © {new Date().getFullYear()} Job-Now. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}

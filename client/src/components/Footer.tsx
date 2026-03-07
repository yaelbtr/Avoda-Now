import { Link } from "wouter";
import { Briefcase, Mail, Home, Search, PlusCircle, FolderOpen, FileText, ShieldCheck } from "lucide-react";

// Dark footer — matches Navbar header-bg (#2e3c0f)
const FG_PRIMARY  = "#e8eae5";                          // off-white text
const FG_MUTED    = "#e8eae5";                          // same off-white for body text
const FG_FAINT    = "#e8eae5";                          // email, disclaimer, copyright
const ACCENT      = "var(--citrus)";                     // Sun-Kissed Citrus — nav & legal links
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
            <h3 className="font-semibold text-sm text-right" style={{ color: ACCENT }}>ניווט</h3>
            <ul className="space-y-2 text-sm text-right">
              {[
                { href: "/", label: "בית", Icon: Home },
                { href: "/find-jobs", label: "חפש עבודה", Icon: Search },
                { href: "/post-job", label: "פרסם משרה", Icon: PlusCircle },
                { href: "/my-jobs", label: "המשרות שלי", Icon: FolderOpen },
              ].map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 transition-colors"
                    style={{ color: FG_PRIMARY, direction: "rtl" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = FG_PRIMARY)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-right" style={{ color: ACCENT }}>מידע משפטי</h3>
            <ul className="space-y-2 text-sm text-right">
              <li>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-2 transition-colors"
                  style={{ color: FG_PRIMARY, direction: "rtl" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = FG_PRIMARY)}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>תנאי שימוש</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 transition-colors"
                  style={{ color: FG_PRIMARY, direction: "rtl" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = FG_PRIMARY)}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>מדיניות פרטיות</span>
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
          <p className="text-xs text-center leading-relaxed" style={{ color: FG_FAINT, opacity: 0.75 }}>
            פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה או להסכמים בין הצדדים.
          </p>
          <p className="text-xs text-center mt-2" style={{ color: FG_FAINT, opacity: 0.75 }}>
            © {new Date().getFullYear()} AvodaNow. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}

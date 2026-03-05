import { Link } from "wouter";
import { Zap, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer
      dir="rtl"
      style={{
        background: "linear-gradient(180deg, oklch(0.10 0.015 265) 0%, oklch(0.08 0.012 265) 100%)",
        borderTop: "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.22 255) 0%, oklch(0.55 0.25 280) 100%)",
                  boxShadow: "0 0 12px oklch(0.62 0.22 255 / 0.3)",
                }}
              >
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-black text-lg text-white">
                Job<span className="gradient-text">Now</span>
              </span>
            </div>
            <p className="text-sm text-white/45 leading-relaxed text-right">
              מצא עבודה או עובדים עכשיו. לוח דרושים מהיר ופשוט לעבודות זמניות והתנדבות.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-white/60 text-right">ניווט</h3>
            <ul className="space-y-2 text-sm text-white/40 text-right">
              {[
                { href: "/", label: "בית" },
                { href: "/find-jobs", label: "חפש עבודה" },
                { href: "/post-job", label: "פרסם משרה" },
                { href: "/my-jobs", label: "המשרות שלי" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-white/60 text-right">מידע משפטי</h3>
            <ul className="space-y-2 text-sm text-white/40 text-right">
              <li><Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link></li>
            </ul>
            <div className="flex items-center gap-2 text-sm text-white/35 pt-1 justify-end">
              <span>info@job-now.co.il</span>
              <Mail className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>

        <div
          className="mt-8 pt-6"
          style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <p className="text-xs text-white/25 text-center leading-relaxed">
            פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה או להסכמים בין הצדדים.
          </p>
          <p className="text-xs text-white/20 text-center mt-2">
            © {new Date().getFullYear()} Job-Now. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}

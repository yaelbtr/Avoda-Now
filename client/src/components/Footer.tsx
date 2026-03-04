import { Link } from "wouter";
import { Briefcase, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground mt-16" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand — rightmost column in RTL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Briefcase className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-lg">Job-Now</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed text-right">
              מצא עבודה או עובדים עכשיו. לוח דרושים מהיר ופשוט לעבודות זמניות והתנדבות.
            </p>
          </div>

          {/* Navigation links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-white/90 text-right">ניווט</h3>
            <ul className="space-y-2 text-sm text-white/70 text-right">
              <li><Link href="/" className="hover:text-white transition-colors">בית</Link></li>
              <li><Link href="/find-jobs" className="hover:text-white transition-colors">חפש עבודה</Link></li>
              <li><Link href="/post-job" className="hover:text-white transition-colors">פרסם משרה</Link></li>
              <li><Link href="/my-jobs" className="hover:text-white transition-colors">המשרות שלי</Link></li>
            </ul>
          </div>

          {/* Legal — leftmost column in RTL */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-white/90 text-right">מידע משפטי</h3>
            <ul className="space-y-2 text-sm text-white/70 text-right">
              <li><Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link></li>
            </ul>
            <div className="flex items-center gap-2 text-sm text-white/70 pt-1 justify-end">
              <span>info@job-now.co.il</span>
              <Mail className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/50 text-center leading-relaxed">
            פלטפורמה זו מחברת בין עובדים למעסיקים בלבד. הפלטפורמה אינה אחראית לתנאי העסקה או להסכמים בין הצדדים.
          </p>
          <p className="text-xs text-white/40 text-center mt-2">
            © {new Date().getFullYear()} Job-Now. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}

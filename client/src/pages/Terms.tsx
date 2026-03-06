import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

export default function Terms() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/">
        <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronRight className="h-4 w-4" />
          חזור לבית
        </span>
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">תנאי שימוש</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">1. כללי</h2>
          <p className="text-muted-foreground leading-relaxed">
            ברוכים הבאים ל-AvodaNow. השימוש בפלטפורמה מהווה הסכמה לתנאים אלו. הפלטפורמה מחברת בין עובדים למעסיקים בלבד ואינה צד בהסכמי העסקה כלשהם.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">2. שימוש מותר</h2>
          <p className="text-muted-foreground leading-relaxed">
            מותר להשתמש בפלטפורמה לפרסום משרות לגיטימיות, חיפוש עבודה, ויצירת קשר בין עובדים למעסיקים. אסור לפרסם תוכן מטעה, פוגעני, או בלתי חוקי.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">3. אחריות</h2>
          <p className="text-muted-foreground leading-relaxed">
            AvodaNow אינה אחראית לתנאי העסקה, להסכמים, לתשלומים, או לכל מחלוקת בין עובדים למעסיקים. כל עסקה היא בין הצדדים ישירות.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">4. פרסום משרות</h2>
          <p className="text-muted-foreground leading-relaxed">
            מפרסמי משרות אחראים לדיוק המידע. מגבלת 3 משרות פעילות בו-זמנית. משרות שיקבלו 3 דיווחים או יותר יועברו לבדיקה.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">5. פרטיות</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו מכבדים את פרטיותך. לפרטים נוספים ראה{" "}
            <Link href="/privacy" className="text-primary hover:underline">מדיניות הפרטיות</Link>.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">6. יצירת קשר</h2>
          <p className="text-muted-foreground leading-relaxed">
            לשאלות ופניות: <a href="mailto:info@job-now.co.il" className="text-primary hover:underline">info@job-now.co.il</a>
          </p>
        </section>
      </div>
    </div>
  );
}

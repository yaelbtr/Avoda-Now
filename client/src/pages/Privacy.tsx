import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

export default function Privacy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/">
        <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronRight className="h-4 w-4" />
          חזור לבית
        </span>
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות פרטיות</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>

      <div className="space-y-4 text-foreground">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">מידע שאנו אוספים</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו אוספים מספר טלפון לצורך אימות זהות, פרטי משרות שפורסמו, ומיקום גיאוגרפי (רק כאשר ניתנת הרשאה מפורשת).
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">שימוש במידע</h2>
          <p className="text-muted-foreground leading-relaxed">
            המידע משמש אך ורק לצורך הפעלת הפלטפורמה: אימות משתמשים, הצגת משרות, וחיבור בין עובדים למעסיקים. אנו לא מוכרים מידע לצדדים שלישיים.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">אבטחת מידע</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו נוקטים באמצעי אבטחה סבירים להגנה על המידע שלך, כולל הצפנת תקשורת (HTTPS) ואחסון מאובטח.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">עוגיות (Cookies)</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו משתמשים בעוגיות לניהול הפגישה (session) בלבד. אין שימוש בעוגיות מעקב של צדדים שלישיים.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">זכויותיך</h2>
          <p className="text-muted-foreground leading-relaxed">
            יש לך הזכות לבקש מחיקת המידע שלך בכל עת. לפנייה:{" "}
            <a href="mailto:info@job-now.co.il" className="text-primary hover:underline">info@job-now.co.il</a>
          </p>
        </section>
      </div>
    </div>
  );
}

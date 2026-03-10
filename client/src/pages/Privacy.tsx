import { useFAQSchema } from "@/hooks/useStructuredData";

const PRIVACY_FAQS = [
  {
    question: "איזה מידע AvodaNow אוספת עליי?",
    answer: "אנו אוספים מספר טלפון לצורך אימות זהות, פרטי משרות שפורסמו, ומיקום גיאוגרפי רק כאשר ניתנת הרשאה מפורשת.",
  },
  {
    question: "האם AvodaNow מוכרת מידע לגורמים שלישיים?",
    answer: "לא. אנו לא מוכרים או משתפים מידע אישי עם צדדים שלישיים.",
  },
  {
    question: "כיצד המידע שלי מוגן?",
    answer: "אנו נוקטים באמצעי אבטחה סבירים כולל הצפנת תקשורת HTTPS ואחסון מאובטח.",
  },
  {
    question: "האם אפשר למחוק את החשבון שלי?",
    answer: "כן. ניתן לפנות אלינו בכתובת info@avodanow.co.il ונמחק את החשבון ואת כל המידע הקשור אליו.",
  },
  {
    question: "האם AvodaNow משתמשת בעוגיות?",
    answer: "כן, אנו משתמשים בעוגיות ההפעלה בלבד לשמירת סשן התחברות. אין שימוש בעוגיות פרסום.",
  },
];

export default function Privacy() {
  useFAQSchema(PRIVACY_FAQS);

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
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

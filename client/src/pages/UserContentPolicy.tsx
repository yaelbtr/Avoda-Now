import { Link } from "wouter";
import { BrandName } from "@/components/ui";

export default function UserContentPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות תוכן משתמשים</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">1. אחריות המשתמש</h2>
          <p className="text-muted-foreground leading-relaxed">
            המשתמש אחראי לכל תוכן שהוא מפרסם בפלטפורמה, לרבות פרטי פרופיל, תיאורי משרות, ביקורות, והודעות. יש לוודא שהמידע מדויק, עדכני, ואינו מטעה.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">2. תוכן אסור</h2>
          <p className="text-muted-foreground leading-relaxed">
            אסור לפרסם תוכן: פוגעני, גזעני, מיני, מטעה, או בלתי חוקי. אסור לפרסם מידע אישי של אחרים ללא הסכמתם. אסור לחקות זהות של אדם אחר.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">3. דיוק המידע בפרופיל</h2>
          <p className="text-muted-foreground leading-relaxed">
            המשתמש אחראי לדיוק המידע בפרופיל שלו — כישורים, ניסיון, ותמונה. מידע כוזב עלול להוביל לחסימת החשבון. <BrandName /> אינה מאמתת את המידע ואינה אחראית לנזקים שנגרמו כתוצאה ממידע שגוי.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">4. קניין רוחני</h2>
          <p className="text-muted-foreground leading-relaxed">
            בפרסום תוכן בפלטפורמה, המשתמש מעניק ל-<BrandName /> רישיון לא-בלעדי להציג את התוכן לצרכי הפלטפורמה. המשתמש שומר על זכויות הקניין הרוחני שלו.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">5. הסרת תוכן</h2>
          <p className="text-muted-foreground leading-relaxed">
            <BrandName /> שומרת לעצמה את הזכות להסיר כל תוכן שאינו עומד במדיניות זו. לדיווח על תוכן פוגעני:{" "}
            <a href="mailto:info@avodanow.co.il" className="text-primary hover:underline">info@avodanow.co.il</a>
          </p>
        </section>
        <div className="text-sm text-muted-foreground pt-2">
          ראה גם:{" "}
          <Link href="/terms" className="text-primary hover:underline">תנאי שימוש</Link>
          {" · "}
          <Link href="/privacy" className="text-primary hover:underline">מדיניות פרטיות</Link>
        </div>
      </div>
    </div>
  );
}

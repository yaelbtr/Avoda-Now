import { Link } from "wouter";
import { BrandName } from "@/components/ui";

export default function JobPostingPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות פרסום משרות</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">1. כללי</h2>
          <p className="text-muted-foreground leading-relaxed">
            מדיניות זו חלה על כל מי שמפרסם משרות ב-<BrandName />. פרסום משרה מהווה הסכמה לתנאים אלו.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">2. תוכן מותר</h2>
          <p className="text-muted-foreground leading-relaxed">
            מותר לפרסם משרות לגיטימיות בלבד — עבודות בית, אירועים, ניקיון, שמירה, ושירותים אחרים. כל משרה חייבת לכלול תיאור מדויק, שכר ריאלי, ותנאי עבודה ברורים.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">3. תוכן אסור</h2>
          <p className="text-muted-foreground leading-relaxed">
            אסור לפרסם משרות הכוללות: עבודה בלתי חוקית, ניצול עובדים, תשלום מתחת לשכר המינימום, תנאים מסוכנים, או כל תוכן מטעה. משרות כאלו יוסרו ללא הודעה מוקדמת.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">4. אחריות המפרסם</h2>
          <p className="text-muted-foreground leading-relaxed">
            המפרסם אחראי לדיוק המידע במשרה, לעמידה בדיני העבודה, ולבדיקת רישיונות ותעודות של נותני השירות. <BrandName /> אינה צד בהסכמי העסקה ואינה אחראית לתנאי העבודה.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">5. מגבלות פרסום</h2>
          <p className="text-muted-foreground leading-relaxed">
            מעסיק יכול לפרסם עד 3 משרות פעילות בו-זמנית. משרות שיקבלו 3 דיווחים או יותר יועברו לבדיקה ועלולות להוסר.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">6. אכיפה</h2>
          <p className="text-muted-foreground leading-relaxed">
            <BrandName /> שומרת לעצמה את הזכות להסיר כל משרה שאינה עומדת במדיניות זו, ולחסום משתמשים שמפרים את התנאים. לשאלות:{" "}
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

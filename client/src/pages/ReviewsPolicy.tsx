import { Link } from "wouter";
import { BrandName } from "@/components/ui";

export default function ReviewsPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות ביקורות</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">1. ביקורות אמיתיות בלבד</h2>
          <p className="text-muted-foreground leading-relaxed">
            ביקורות חייבות לשקף חוויה אמיתית ואישית עם העובד. אסור לפרסם ביקורות מזויפות, ביקורות בתמורה לתשלום, או ביקורות שנועדו לפגוע שלא כדין.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">2. תוכן הביקורת</h2>
          <p className="text-muted-foreground leading-relaxed">
            ביקורת חייבת להיות ענינית ומכבדת. אסור לכלול: מידע אישי מזהה, האשמות ללא בסיס, שפה פוגענית, או תוכן שאינו קשור לחוויית העבודה.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">3. הסרת ביקורות</h2>
          <p className="text-muted-foreground leading-relaxed">
            <BrandName /> שומרת לעצמה את הזכות להסיר ביקורות שאינן עומדות במדיניות זו. עובד שמאמין שביקורת עליו אינה הוגנת יכול לפנות אלינו לבדיקה.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">4. אחריות</h2>
          <p className="text-muted-foreground leading-relaxed">
            <BrandName /> אינה אחראית לתוכן הביקורות. הביקורות מייצגות את דעת הכותב בלבד. מי שמפרסם ביקורת שקרית עלול לשאת באחריות משפטית.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">5. יצירת קשר</h2>
          <p className="text-muted-foreground leading-relaxed">
            לדיווח על ביקורת בעייתית:{" "}
            <a href="mailto:info@avodanow.co.il" className="text-primary hover:underline">info@avodanow.co.il</a>
          </p>
        </section>
        <div className="text-sm text-muted-foreground pt-2">
          ראה גם:{" "}
          <Link href="/terms" className="text-primary hover:underline">תנאי שימוש</Link>
          {" · "}
          <Link href="/user-content-policy" className="text-primary hover:underline">מדיניות תוכן משתמשים</Link>
        </div>
      </div>
    </div>
  );
}

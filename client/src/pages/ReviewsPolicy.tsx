import { Link } from "wouter";

const SECTIONS = [
  {
    id: "purpose",
    title: "1. מטרת מערכת הדירוגים",
    content: `מערכת הדירוגים נועדה:\n• לשתף חוויות בין משתמשים\n• לסייע בקבלת החלטות\n• לשפר את איכות השירות בפלטפורמה`,
  },
  {
    id: "who-can-review",
    title: "2. מי רשאי לפרסם ביקורת",
    content: `רק משתמשים שהייתה להם אינטראקציה עם משתמש אחר דרך הפלטפורמה רשאים לפרסם ביקורת עליו.`,
  },
  {
    id: "content",
    title: "3. תוכן הביקורת",
    content: `ביקורות חייבות להיות:\n• אמיתיות\n• מבוססות על חוויה אישית\n• מנוסחות באופן מכבד`,
  },
  {
    id: "prohibited",
    title: "4. תוכן אסור בביקורות",
    content: `חל איסור לפרסם ביקורות הכוללות:\n• לשון הרע\n• קללות או תוכן פוגעני\n• מידע אישי של אדם אחר\n• טענות כוזבות\n• איומים או הטרדה`,
  },
  {
    id: "fake",
    title: "5. ביקורות מזויפות",
    content: `אסור לפרסם ביקורות מזויפות, לרבות:\n• ביקורות שנכתבו על ידי המשתמש על עצמו\n• ביקורות שנכתבו בתמורה לתשלום\n• ביקורות שנועדו לפגוע במשתמש אחר ללא בסיס`,
  },
  {
    id: "removal",
    title: "6. הסרת ביקורות",
    content: `הפלטפורמה רשאית להסיר ביקורות במקרים כגון:\n• הפרת מדיניות זו\n• חשד לביקורת מזויפת\n• תוכן פוגעני או משמיץ\n\nהחלטות הפלטפורמה בנושא זה נתונות לשיקול דעתה.`,
  },
  {
    id: "response",
    title: "7. תגובה לביקורות",
    content: `הפלטפורמה רשאית לאפשר למשתמשים להגיב לביקורות שנכתבו עליהם.`,
  },
  {
    id: "liability",
    title: "8. הגבלת אחריות",
    content: `הפלטפורמה אינה אחראית לתוכן הביקורות המתפרסמות על ידי משתמשים.\n\nהאחריות לתוכן הביקורת חלה על המשתמש שפרסם אותה.`,
  },
  {
    id: "updates",
    title: "9. עדכון המדיניות",
    content: `הפלטפורמה רשאית לעדכן מדיניות זו מעת לעת.`,
  },
  {
    id: "contact",
    title: "10. יצירת קשר",
    content: "לשאלות בנושא דירוגים וביקורות ניתן לפנות אל: info@avodanow.co.il",
  },
];

export default function ReviewsPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/legal" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
        ← חזרה לכל המסמכים המשפטיים
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות דירוגים וביקורות</h1>
      <p className="text-sm text-muted-foreground mb-2">עדכון אחרון: מרץ 2026</p>
      <p className="text-sm text-muted-foreground mb-8">
        הפלטפורמה מאפשרת למשתמשים לפרסם דירוגים וביקורות על משתמשים אחרים לאחר אינטראקציה ביניהם. מדיניות זו מגדירה את הכללים לפרסום ביקורות ודירוגים.
      </p>

      <div className="prose prose-sm max-w-none space-y-4 text-foreground">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-base font-semibold mb-2">{section.title}</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
          </section>
        ))}
      </div>

      <div className="text-sm text-muted-foreground pt-6">
        ראה גם:{" "}
        <Link href="/terms" className="text-primary hover:underline">תנאי שימוש</Link>
        {" · "}
        <Link href="/user-content-policy" className="text-primary hover:underline">מדיניות תוכן משתמשים</Link>
      </div>
    </div>
  );
}

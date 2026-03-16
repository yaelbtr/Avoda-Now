import { Link } from "wouter";

const SECTIONS = [
  {
    id: "responsibility",
    title: "1. אחריות המשתמש לתוכן",
    content: `המשתמש אחראי באופן מלא ובלעדי לכל תוכן שהוא מפרסם בפלטפורמה.\n\nהמשתמש מתחייב כי התוכן שהוא מפרסם:\n• נכון ואינו מטעה\n• חוקי ואינו מפר את החוק\n• אינו פוגע בזכויות צד שלישי\n• אינו פוגעני או מסית\n\nהפלטפורמה אינה אחראית לתוכן שמפורסם על ידי משתמשים.`,
  },
  {
    id: "prohibited",
    title: "2. תוכן אסור",
    content: `חל איסור לפרסם בפלטפורמה תוכן הכולל בין היתר:\n• מידע כוזב או מטעה\n• תוכן פוגעני, מאיים או משמיץ\n• תוכן המפר זכויות יוצרים\n• פרסום משרות בלתי חוקיות\n• תוכן הכולל אפליה אסורה\n• תוכן הכולל הסתה לאלימות או לפעילות בלתי חוקית\n• פרסום פרטים אישיים של אדם אחר ללא הסכמתו`,
  },
  {
    id: "spam",
    title: "3. תוכן מסחרי וספאם",
    content: `אין להשתמש בפלטפורמה לצורך:\n• שליחת פרסומות לא רצויות\n• הפצת ספאם\n• קידום שירותים שאינם קשורים לפלטפורמה\n• איסוף מידע על משתמשים לצרכים שיווקיים חיצוניים`,
  },
  {
    id: "copyright",
    title: "4. הפרת זכויות יוצרים",
    content: `משתמשים מתחייבים שלא להעלות תוכן המפר זכויות יוצרים או זכויות קניין רוחני של צד שלישי.\n\nהאחריות לכל הפרת זכויות חלה על המשתמש שפרסם את התוכן.`,
  },
  {
    id: "removal",
    title: "5. הסרת תוכן",
    content: `הפלטפורמה רשאית להסיר תוכן לפי שיקול דעתה במקרים כגון:\n• הפרת מדיניות זו\n• חשד לפעילות בלתי חוקית\n• פגיעה במשתמשים אחרים\n• תוכן מטעה או פוגעני\n\nהסרת תוכן יכולה להתבצע ללא הודעה מוקדמת.`,
  },
  {
    id: "reporting",
    title: "6. דיווח על תוכן",
    content: `משתמשים יכולים לדווח על תוכן בעייתי באמצעות מנגנון הדיווח במערכת.\n\nהפלטפורמה רשאית לבדוק דיווחים ולנקוט צעדים בהתאם לשיקול דעתה.`,
  },
  {
    id: "license",
    title: "7. שימוש בתוכן לצורך תפעול הפלטפורמה",
    content: `בעת פרסום תוכן בפלטפורמה, המשתמש מעניק לפלטפורמה רישיון להשתמש בתוכן לצורך:\n• הפעלת השירות\n• הצגת התוכן למשתמשים אחרים\n• שיפור השירות\n\nהרישיון מוגבל לשימוש במסגרת הפלטפורמה בלבד.`,
  },
  {
    id: "updates",
    title: "8. עדכון המדיניות",
    content: `הפלטפורמה רשאית לעדכן מדיניות זו מעת לעת.\n\nהמשך שימוש בפלטפורמה לאחר עדכון המדיניות מהווה הסכמה למדיניות המעודכנת.`,
  },
  {
    id: "contact",
    title: "9. יצירת קשר",
    content: "לשאלות בנושא מדיניות תוכן ניתן לפנות אל: info@avodanow.co.il",
  },
];

export default function UserContentPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/legal" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
        ← חזרה לכל המסמכים המשפטיים
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות תוכן משתמשים</h1>
      <p className="text-sm text-muted-foreground mb-2">עדכון אחרון: מרץ 2026</p>
      <p className="text-sm text-muted-foreground mb-8">
        מדיניות זו מגדירה את הכללים לפרסום תוכן בפלטפורמה על ידי משתמשים. כל משתמש המעלה תוכן לפלטפורמה מתחייב לפעול בהתאם למדיניות זו. המונח "תוכן משתמשים" כולל: פרופילים, תיאורי שירותים, מודעות עבודה, הודעות בצ'אט, תגובות או ביקורות, תמונות וקבצים.
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
        <Link href="/reviews-policy" className="text-primary hover:underline">מדיניות ביקורות</Link>
      </div>
    </div>
  );
}

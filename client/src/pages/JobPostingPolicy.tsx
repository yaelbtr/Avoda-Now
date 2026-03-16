import { Link } from "wouter";

const SECTIONS = [
  {
    id: "employer-responsibility",
    title: "1. אחריות המעסיק / מבקש השירות",
    content: `האחריות המלאה והבלעדית לתוכן המשרה, חוקיותה ותנאי העבודה חלה על המעסיק או מבקש השירות המפרסם אותה.\n\nהמעסיק אחראי לכך כי:\n• המשרה עומדת בדרישות החוק\n• תנאי העבודה חוקיים\n• המידע במודעה נכון ואינו מטעה\n• סביבת העבודה עומדת בדרישות הבטיחות\n\nהפלטפורמה אינה אחראית לתוכן המשרות המתפרסמות על ידי משתמשים.`,
  },
  {
    id: "no-discrimination",
    title: "2. איסור אפליה",
    content: `חל איסור לפרסם משרות הכוללות אפליה אסורה על פי חוק.\n\nלרבות אפליה על בסיס:\n• מין או מגדר\n• גיל\n• דת\n• מוצא\n• מצב משפחתי\n• מוגבלות\n• כל מאפיין אחר המוגן על פי חוק\n\nהפלטפורמה רשאית להסיר משרות הכוללות אפליה.`,
  },
  {
    id: "illegal-jobs",
    title: "3. משרות בלתי חוקיות",
    content: `חל איסור לפרסם בפלטפורמה משרות הכוללות פעילות בלתי חוקית או פעילות האסורה על פי דין.\n\nלרבות:\n• פעילות פלילית\n• עבודה ללא היתר חוקי\n• עבודות המסכנות חיי אדם ללא אמצעי בטיחות\n\nהפלטפורמה רשאית להסיר משרות אלו ללא הודעה מוקדמת.`,
  },
  {
    id: "safety",
    title: "4. אחריות לבטיחות העבודה",
    content: `המעסיק אחראי לוודא כי העבודה מתבצעת בסביבה בטוחה ובהתאם להוראות החוק.\n\nהאחריות לבטיחות מקום העבודה, ציוד הבטיחות ותנאי העבודה חלה על המעסיק בלבד.\n\nהפלטפורמה אינה אחראית לבטיחות העבודה.`,
  },
  {
    id: "licenses",
    title: "5. רישיונות והסמכות מקצועיות",
    content: `המעסיק אחראי לוודא כי נותן השירות מחזיק בכל הרישיונות, ההסמכות והביטוחים הנדרשים לצורך ביצוע העבודה.\n\nהפלטפורמה אינה בודקת או מאמתת מידע זה.`,
  },
  {
    id: "payment",
    title: "6. אחריות לתנאי העסקה ותשלום",
    content: `המעסיק אחראי באופן מלא ל:\n• תנאי ההעסקה\n• תשלום עבור העבודה\n• עמידה בדרישות החוק\n\nהפלטפורמה אינה צד להסכמים בין המשתמשים ואינה אחראית לתשלומים.`,
  },
  {
    id: "accuracy",
    title: "7. דיוק המידע במשרה",
    content: `המעסיק מתחייב כי כל המידע המפורסם במשרה הוא נכון, מדויק ואינו מטעה.\n\nחל איסור לפרסם משרות הכוללות מידע כוזב או מטעה.`,
  },
  {
    id: "removal",
    title: "8. הסרת משרות",
    content: `הפלטפורמה רשאית להסיר משרות לפי שיקול דעתה במקרים כגון:\n• הפרת תנאי שימוש\n• חשד לפעילות בלתי חוקית\n• פרסום מידע מטעה\n• הפרת תנאי מסמך זה`,
  },
  {
    id: "reporting",
    title: "9. דיווח על משרות",
    content: `משתמשים רשאים לדווח לפלטפורמה על משרות בעייתיות.\n\nהפלטפורמה רשאית לבדוק דיווחים אלו ולנקוט צעדים בהתאם לשיקול דעתה.`,
  },
  {
    id: "liability",
    title: "10. הגבלת אחריות",
    content: `הפלטפורמה משמשת כזירת חיבור בלבד בין משתמשים.\n\nהפלטפורמה אינה אחראית:\n• לתוכן המשרות\n• לתנאי העבודה\n• לביצוע העבודה\n• לתשלום עבור העבודה\n\nכל התקשרות בין משתמשים נעשית באחריותם הבלעדית.`,
  },
];

export default function JobPostingPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/legal" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
        ← חזרה לכל המסמכים המשפטיים
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">תנאי פרסום משרות</h1>
      <p className="text-sm text-muted-foreground mb-2">עדכון אחרון: מרץ 2026</p>
      <p className="text-sm text-muted-foreground mb-8">
        מסמך זה מגדיר את הכללים לפרסום משרות או בקשות שירות בפלטפורמה. פרסום משרה בפלטפורמה מהווה הסכמה לתנאים המפורטים במסמך זה.
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
        <Link href="/safety-policy" className="text-primary hover:underline">מדיניות בטיחות</Link>
      </div>
    </div>
  );
}

/**
 * Curated "best jobs" pages data for /best/:slug routes.
 * These pages feature hand-picked job categories with editorial descriptions,
 * real-time job listings, and links to related search pages.
 * They are designed to rank for AI-based search queries like
 * "best delivery jobs in Israel" or "top student jobs".
 */

export interface BestJobsPage {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  intro: string;
  /** Category filter to pass to jobs.list query */
  categoryFilter?: string;
  /** Time filter: "today" | "evening" | "weekend" | "immediate" */
  timeFilter?: "today" | "evening" | "weekend" | "immediate";
  /** Highlights shown as feature cards above the job list */
  highlights: { icon: string; label: string; value: string }[];
  /** Tips section */
  tips: { heading: string; body: string }[];
  /** Internal links to related pages */
  relatedLinks: { label: string; href: string }[];
  /** FAQ items for this page */
  faqs: { question: string; answer: string }[];
}

const BEST_JOBS_PAGES: BestJobsPage[] = [
  {
    slug: "delivery-jobs",
    title: "עבודות שליחויות הכי טובות בישראל | AvodaNow",
    h1: "עבודות שליחויות — המשרות הטובות ביותר",
    metaDescription:
      "רשימת עבודות השליחויות הטובות ביותר בישראל — שכר גבוה, שעות גמישות, ללא ניסיון. מצא משרת שליח קרוב אליך.",
    intro:
      "עבודת שליח היא אחת העבודות הזמניות המבוקשות ביותר בישראל. שכר של 35–60 ₪ לשעה, שעות גמישות ואפשרות להתחיל מיד — ללא ניסיון קודם. ריכזנו עבורכם את המשרות הטובות ביותר בתחום.",
    categoryFilter: "delivery",
    highlights: [
      { icon: "₪", label: "שכר ממוצע", value: "40–60 ₪/שעה" },
      { icon: "⏰", label: "שעות", value: "גמישות לחלוטין" },
      { icon: "🚀", label: "התחלה", value: "מיידית" },
      { icon: "📋", label: "ניסיון", value: "לא נדרש" },
    ],
    tips: [
      {
        heading: "בחרו אזור קרוב לבית",
        body: "עבודת שליח בעיר מגוריכם חוסכת זמן נסיעה ומגדילה את ההכנסה נטו.",
      },
      {
        heading: "שעות ערב = שכר גבוה יותר",
        body: "משמרות ערב ולילה משלמות לרוב 15–25% יותר מהמשמרת הרגילה.",
      },
      {
        heading: "ודאו תנאי הרכב",
        body: "חלק מהמעסיקים מספקים רכב, חלק דורשים רכב פרטי. בדקו לפני שמתחילים.",
      },
      {
        heading: "שמרו על תקשורת עם המעסיק",
        body: "הודיעו מראש על שינויים בזמינות — זה מגדיל את הסיכוי לקבל משמרות נוספות.",
      },
    ],
    relatedLinks: [
      { label: "כל עבודות השליחויות", href: "/jobs/delivery" },
      { label: "שליחויות בתל אביב", href: "/jobs/delivery/תל אביב" },
      { label: "שליחויות בירושלים", href: "/jobs/delivery/ירושלים" },
      { label: "עבודות ערב", href: "/jobs/evening" },
      { label: "מדריך שכר שליח", href: "/guide/delivery-salary" },
      { label: "שאלות נפוצות על שליחויות", href: "/faq/delivery-jobs" },
    ],
    faqs: [
      {
        question: "מה השכר הממוצע לשליח?",
        answer: "שכר ממוצע לשליח הוא 40–60 ₪ לשעה, עם תוספות בשעות ערב וסוף שבוע.",
      },
      {
        question: "האם צריך ניסיון לעבודת שליח?",
        answer: "לא, רוב משרות השליחויות אינן דורשות ניסיון קודם.",
      },
      {
        question: "באילו ערים יש הכי הרבה עבודות שליח?",
        answer: "תל אביב, ירושלים, חיפה, ראשון לציון ובני ברק הן הערים עם הכי הרבה משרות שליחויות.",
      },
    ],
  },
  {
    slug: "student-jobs",
    title: "עבודות לסטודנטים — המשרות הטובות ביותר | AvodaNow",
    h1: "עבודות לסטודנטים — המשרות הטובות ביותר",
    metaDescription:
      "עבודות זמניות לסטודנטים עם שעות גמישות — שליחויות, מלצרות, מכירות ועוד. מצא עבודה שמתאימה ללוח הלימודים שלך.",
    intro:
      "סטודנטים רבים מחפשים עבודה גמישה שמתאימה ללוח הלימודים. עבודות זמניות מציעות שכר הוגן, שעות לפי בחירה ואפשרות להתחיל מיד. ריכזנו את המשרות הטובות ביותר לסטודנטים.",
    highlights: [
      { icon: "📚", label: "מתאים ל", value: "לוח לימודים" },
      { icon: "⏰", label: "שעות", value: "גמישות" },
      { icon: "₪", label: "שכר", value: "35–55 ₪/שעה" },
      { icon: "🎓", label: "ניסיון", value: "לא נדרש" },
    ],
    tips: [
      {
        heading: "תכננו לפי לוח הלימודים",
        body: "בחרו משמרות שלא מתנגשות עם שיעורים — ערב, בוקר מוקדם, או סוף שבוע.",
      },
      {
        heading: "עבודות ערב = הכנסה נוספת",
        body: "משמרות ערב מאפשרות ללמוד ביום ולהרוויח בלילה.",
      },
      {
        heading: "אל תוותרו על תלוש שכר",
        body: "גם בעבודה זמנית מגיע לכם תלוש שכר. שמרו תיעוד של שעות העבודה.",
      },
      {
        heading: "בנו ניסיון תעסוקתי",
        body: "עבודות זמניות מוסיפות לקורות החיים ומשפרות את הסיכויים לעבודה קבועה בעתיד.",
      },
    ],
    relatedLinks: [
      { label: "חיפוש משרות", href: "/find-jobs" },
      { label: "עבודות ערב", href: "/jobs/evening" },
      { label: "עבודות סוף שבוע", href: "/jobs/weekend" },
      { label: "מדריך עבודות לסטודנטים", href: "/guide/student-jobs" },
      { label: "שאלות נפוצות לסטודנטים", href: "/faq/student-jobs" },
    ],
    faqs: [
      {
        question: "אילו עבודות הכי מתאימות לסטודנטים?",
        answer:
          "שליחויות, מלצרות, מכירות, אבטחה ועבודות אירועים — כולן מציעות שעות גמישות ומתאימות לסטודנטים.",
      },
      {
        question: "כמה שעות בשבוע מומלץ לסטודנט לעבוד?",
        answer: "מומלץ לא לעבוד יותר מ-20–25 שעות בשבוע כדי לא לפגוע בלימודים.",
      },
      {
        question: "האם יש עבודות לסטודנטים בשעות הערב?",
        answer: "כן, יש משרות ערב רבות בתחומי מסעדנות, אבטחה ומטבח.",
      },
    ],
  },
  {
    slug: "evening-jobs",
    title: "עבודות ערב — המשרות הטובות ביותר | AvodaNow",
    h1: "עבודות ערב — המשרות הטובות ביותר",
    metaDescription:
      "עבודות ערב בישראל — שכר גבוה, שעות גמישות. מצא משרת ערב בתחומי אבטחה, מטבח, שליחויות ועוד.",
    intro:
      "עבודות ערב מציעות שכר גבוה יותר ומתאימות למי שפנוי אחרי שעות הצהריים. תחומי אבטחה, מטבח, מסעדנות ושליחויות מציעים משמרות ערב בכל ימות השבוע.",
    timeFilter: "evening",
    highlights: [
      { icon: "🌙", label: "שעות", value: "17:00–24:00" },
      { icon: "₪", label: "תוספת ערב", value: "+15–25%" },
      { icon: "🚀", label: "התחלה", value: "מיידית" },
      { icon: "📋", label: "ניסיון", value: "לא נדרש" },
    ],
    tips: [
      {
        heading: "תוספת שכר לשעות ערב",
        body: "על פי חוק, עבודה בשעות ערב ולילה זכאית לתוספת שכר. ודאו שהמעסיק משלם כחוק.",
      },
      {
        heading: "מתאים לסטודנטים ולהורים",
        body: "עבודות ערב מאפשרות ללמוד ביום, לטפל בילדים ולעבוד בערב.",
      },
      {
        heading: "בדקו את הנסיעות",
        body: "ודאו שיש תחבורה ציבורית בשעות הסיום, או שהמעסיק מסדר הסעה.",
      },
      {
        heading: "אבטחה ומטבח — ביקוש גבוה",
        body: "תחומי האבטחה והמטבח מציעים את הכי הרבה משמרות ערב בכל הארץ.",
      },
    ],
    relatedLinks: [
      { label: "כל עבודות הערב", href: "/jobs/evening" },
      { label: "עבודות ערב בתל אביב", href: "/jobs/evening/תל אביב" },
      { label: "עבודות ערב בירושלים", href: "/jobs/evening/ירושלים" },
      { label: "עבודות סוף שבוע", href: "/jobs/weekend" },
      { label: "עבודות אבטחה", href: "/jobs/security" },
      { label: "עבודות מטבח", href: "/jobs/kitchen" },
    ],
    faqs: [
      {
        question: "מה שעות העבודה בעבודת ערב?",
        answer: "עבודות ערב הן בדרך כלל בין 17:00 ל-24:00, תלוי במעסיק ובתחום.",
      },
      {
        question: "האם יש תוספת שכר לשעות ערב?",
        answer: "כן, על פי חוק יש תוספת שכר לשעות ערב ולילה. שאלו את המעסיק על תנאי השכר.",
      },
      {
        question: "אילו תחומים מציעים הכי הרבה עבודות ערב?",
        answer: "אבטחה, מטבח, מסעדנות, שליחויות ואירועים הם התחומים עם הכי הרבה משמרות ערב.",
      },
    ],
  },
  {
    slug: "weekend-jobs",
    title: "עבודות סוף שבוע — המשרות הטובות ביותר | AvodaNow",
    h1: "עבודות סוף שבוע — המשרות הטובות ביותר",
    metaDescription:
      "עבודות סוף שבוע בישראל — שכר גבוה, ביקוש גבוה. מצא משרת סוף שבוע בתחומי אירועים, אבטחה, מטבח ועוד.",
    intro:
      "סוף שבוע הוא עונת שיא לעבודות זמניות — אירועים, מסעדות, אבטחה ושליחויות. השכר בסוף שבוע גבוה יותר ויש ביקוש גבוה לעובדים.",
    timeFilter: "weekend",
    highlights: [
      { icon: "🎉", label: "ביקוש", value: "גבוה במיוחד" },
      { icon: "₪", label: "תוספת שכר", value: "+25–50%" },
      { icon: "🚀", label: "התחלה", value: "מיידית" },
      { icon: "📋", label: "ניסיון", value: "לא נדרש" },
    ],
    tips: [
      {
        heading: "הירשמו מוקדם",
        body: "משמרות סוף שבוע מתמלאות מהר — הירשמו מוקדם ככל האפשר.",
      },
      {
        heading: "אירועים = שכר גבוה",
        body: "עבודות אירועים בסוף שבוע משלמות לרוב 50–80 ₪ לשעה.",
      },
      {
        heading: "תוספת שכר חוקית",
        body: "עבודה בשבת זכאית לתוספת שכר של 50% לפחות על פי חוק.",
      },
      {
        heading: "בדקו את הנסיעות",
        body: "בשבת אין תחבורה ציבורית בחלק מהערים — ודאו שיש הסעה או רכב פרטי.",
      },
    ],
    relatedLinks: [
      { label: "כל עבודות סוף השבוע", href: "/jobs/weekend" },
      { label: "עבודות אירועים", href: "/jobs/events" },
      { label: "עבודות אבטחה", href: "/jobs/security" },
      { label: "עבודות ערב", href: "/jobs/evening" },
      { label: "עבודות להיום", href: "/jobs/today" },
    ],
    faqs: [
      {
        question: "האם יש תוספת שכר לעבודה בשבת?",
        answer: "כן, על פי חוק עבודה בשבת זכאית לתוספת שכר של 50% לפחות.",
      },
      {
        question: "אילו תחומים מציעים הכי הרבה עבודות בסוף שבוע?",
        answer: "אירועים, אבטחה, מטבח, שליחויות ומסעדנות הם התחומים עם הכי הרבה משרות סוף שבוע.",
      },
      {
        question: "איך מגיעים לעבודה בשבת ללא תחבורה ציבורית?",
        answer: "חלק מהמעסיקים מסדרים הסעה. אחרת, ודאו שיש לכם רכב פרטי או שיתוף נסיעה.",
      },
    ],
  },
  {
    slug: "immediate-jobs",
    title: "עבודות מיידיות — להתחיל היום | AvodaNow",
    h1: "עבודות מיידיות — להתחיל היום",
    metaDescription:
      "עבודות מיידיות בישראל — מעסיקים שצריכים עובדים עכשיו. מצא עבודה שמתחילה היום ללא ניסיון.",
    intro:
      "מחפשים עבודה שמתחילה מיד? מעסיקים רבים צריכים עובדים עכשיו — ללא ראיון, ללא ניסיון. ריכזנו את המשרות הדחופות ביותר.",
    timeFilter: "immediate",
    highlights: [
      { icon: "⚡", label: "התחלה", value: "היום" },
      { icon: "📋", label: "ניסיון", value: "לא נדרש" },
      { icon: "₪", label: "שכר", value: "35–60 ₪/שעה" },
      { icon: "🚀", label: "תהליך", value: "מהיר" },
    ],
    tips: [
      {
        heading: "הגיבו מהר",
        body: "משרות מיידיות מתמלאות תוך שעות — הגיבו מיד כשאתם רואים מודעה מתאימה.",
      },
      {
        heading: "היו זמינים לשיחה",
        body: "ודאו שהטלפון שלכם פתוח — מעסיקים מתקשרים מיד כשמוצאים מועמד מתאים.",
      },
      {
        heading: "הכינו תעודת זהות",
        body: "חלק מהמעסיקים דורשים תעודת זהות בתחילת העבודה — הכינו אותה מראש.",
      },
    ],
    relatedLinks: [
      { label: "כל עבודות היום", href: "/jobs/today" },
      { label: "עבודות מיידיות", href: "/jobs/immediate" },
      { label: "חיפוש משרות", href: "/find-jobs" },
      { label: "עבודות ערב", href: "/jobs/evening" },
    ],
    faqs: [
      {
        question: "מה הן עבודות מיידיות?",
        answer: "עבודות מיידיות הן משרות שמעסיקים צריכים למלא מיד — לרוב תוך שעות או יום.",
      },
      {
        question: "האם צריך ניסיון לעבודות מיידיות?",
        answer: "לא, רוב העבודות המיידיות אינן דורשות ניסיון — המעסיק צריך עובד זמין ומוכן.",
      },
      {
        question: "איך מגיבים למשרה מיידית?",
        answer: "לחצו על כפתור 'הגש מועמדות' במודעה ומלאו את הפרטים. המעסיק יצור קשר מיד.",
      },
    ],
  },
];

export function getBestJobsPage(slug: string): BestJobsPage | undefined {
  return BEST_JOBS_PAGES.find((p) => p.slug === slug);
}

export { BEST_JOBS_PAGES };

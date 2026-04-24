/**
 * Cookies.tsx — מדיניות עוגיות
 * Follows the same layout pattern as Privacy.tsx and Terms.tsx.
 */

export default function Cookies() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות עוגיות</h1>
      <p className="text-sm text-muted-foreground mb-2">עדכון אחרון: מרץ 2026</p>
      <p className="text-sm text-muted-foreground mb-8">
        מסמך זה מסביר כיצד YallaAvoda משתמשת בעוגיות (Cookies) ובטכנולוגיות דומות,
        ומה הבחירות העומדות בפניך בנוגע לשימוש בהן.
      </p>

      <div className="prose prose-sm max-w-none space-y-4 text-foreground">

        <section id="what-are-cookies" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">1. מהן עוגיות?</h2>
          <p className="text-muted-foreground leading-relaxed">
            עוגיות הן קבצי טקסט קטנים המאוחסנים בדפדפן שלך כאשר אתה מבקר באתר.
            הן מאפשרות לאתר לזכור מידע על הביקור שלך, כגון שפה מועדפת ומצב התחברות,
            ולשפר את חוויית השימוש בביקורים הבאים.
          </p>
        </section>

        <section id="cookie-types" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">2. סוגי עוגיות בהן אנו משתמשים</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{`עוגיות חיוניות (תמיד פעילות):
• עוגיית session — שומרת את מצב ההתחברות שלך לאורך הביקור.
• JWT cookie — מאמתת את זהותך מול השרת בכל בקשה.
• CSRF token — מגנה על פעולות טפסים מפני התקפות.
אין אפשרות לבטל עוגיות אלו, שכן הן נדרשות לתפעול הפלטפורמה.

עוגיות אנליטיקה (ניתנות לביטול):
• Umami Analytics — מודד צפיות בדפים, מקורות תנועה וזמן שהייה.
  אינו אוסף מידע אישי מזהה ואינו משתמש ב-fingerprinting.
  ניתן לבטל עוגיות אלו בהגדרות העוגיות.`}</p>
        </section>

        <section id="third-party" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">3. עוגיות צד שלישי</h2>
          <p className="text-muted-foreground leading-relaxed">
            הפלטפורמה אינה מטמיעה עוגיות פרסום, מעקב התנהגותי, או רשתות חברתיות.
            שירות האנליטיקה (Umami) מתארח על שרתינו ואינו משתף נתונים עם צדדים שלישיים.
          </p>
        </section>

        <section id="retention" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">4. משך חיי העוגיות</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{`• עוגיות session — פוקעות עם סגירת הדפדפן.
• עוגיית אימות (JWT) — תוקף של 30 יום, מתחדשת בכל כניסה.
• הגדרות הסכמה (cookieConsent) — נשמרות ב-localStorage ללא תפוגה, עד לניקוי ידני.`}</p>
        </section>

        <section id="manage" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">5. ניהול העדפות עוגיות</h2>
          <p className="text-muted-foreground leading-relaxed">
            ניתן לשנות את הגדרות העוגיות בכל עת דרך כפתור "שנה העדפות עוגיות" המופיע בתחתית כל דף.
            בנוסף, ניתן לנקות עוגיות ישירות דרך הגדרות הדפדפן שלך.
            שים לב כי ביטול עוגיות חיוניות עלול לפגוע בתפקוד הפלטפורמה.
          </p>
        </section>

        <section id="gdpr" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">6. זכויותיך (GDPR / חוק הגנת הפרטיות)</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{`בהתאם לחוק הגנת הפרטיות ולתקנות GDPR, עומדות לך הזכויות הבאות:
• זכות לגישה — לדעת אילו עוגיות נאספות ולמה.
• זכות לביטול הסכמה — לשנות העדפות בכל עת.
• זכות למחיקה — לנקות את כל נתוני העוגיות.

לפניות בנושא פרטיות ועוגיות, ניתן לפנות אלינו דרך דף יצירת הקשר.`}</p>
        </section>

        <section id="updates" className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-base font-semibold mb-2">7. עדכונים למדיניות</h2>
          <p className="text-muted-foreground leading-relaxed">
            אנו עשויים לעדכן מדיניות זו מעת לעת. במקרה של שינוי מהותי בסוגי העוגיות,
            נציג בפניך בנר הסכמה מחודש. תאריך העדכון האחרון מופיע בראש המסמך.
          </p>
        </section>

      </div>
    </div>
  );
}
export default function Accessibility() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">הצהרת נגישות</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">מחויבות לנגישות</h2>
          <p className="text-muted-foreground leading-relaxed">
            AvodaNow מחויבת להנגיש את שירותיה לכלל המשתמשים, לרבות אנשים עם מוגבלויות. אנו פועלים בהתאם להנחיות
            תקן ישראלי <strong>IS 5568</strong> (המבוסס על WCAG 2.1 ברמה AA) ובהתאם לדרישות
            <strong> חוק שוויון זכויות לאנשים עם מוגבלות, תשנ"ח-1998</strong> ותקנות הנגישות לשירות.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">רמת הנגישות הנוכחית</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            האתר עומד ברמת תאימות <strong>AA</strong> של WCAG 2.1. בין היתר מיושמים:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
            <li>ניגודיות צבעים מינימלית של 4.5:1 לטקסט רגיל</li>
            <li>תמיכה מלאה בניווט מקלדת (Tab / Shift+Tab / Enter / Space)</li>
            <li>תוויות ARIA לכפתורים, שדות קלט ואייקונים</li>
            <li>כיוון RTL מלא לכל תכני העברית</li>
            <li>גופנים ניתנים להגדלה עד 200% ללא אובדן תוכן</li>
            <li>הודעות שגיאה ברורות ומקושרות לשדה הרלוונטי</li>
            <li>תמיכה בקוראי מסך נפוצים (NVDA, VoiceOver, TalkBack)</li>
          </ul>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">מגבלות ידועות</h2>
          <p className="text-muted-foreground leading-relaxed">
            חלק מהתכנים המוטמעים (מפות, תמונות שנוצרו על-ידי משתמשים) עשויים שלא לכלול תיאורי Alt מלאים.
            אנו עובדים על שיפור מתמיד של נושאים אלו.
          </p>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">פנייה בנושא נגישות</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            נתקלתם בבעיית נגישות? נשמח לשמוע ולתקן. ניתן לפנות לרכז הנגישות שלנו:
          </p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><strong>שם:</strong> צוות AvodaNow</p>
            <p>
              <strong>דוא"ל:</strong>{" "}
              <a href="mailto:info@avodanow.co.il" className="text-primary underline">
                info@avodanow.co.il
              </a>
            </p>
            <p><strong>זמן מענה:</strong> עד 5 ימי עסקים</p>
          </div>
        </section>

        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">תאריך עדכון ובדיקה</h2>
          <p className="text-muted-foreground leading-relaxed">
            הצהרה זו עודכנה לאחרונה במרץ 2026. האתר נבדק לנגישות באמצעות כלי בדיקה אוטומטיים ובדיקות ידניות
            על מגוון דפדפנים ומכשירים.
          </p>
        </section>

      </div>
    </div>
  );
}

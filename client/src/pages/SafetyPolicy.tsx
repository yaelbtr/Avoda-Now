import { Link } from "wouter";
import { BrandName } from "@/components/ui";

export default function SafetyPolicy() {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">מדיניות בטיחות</h1>
      <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: מרץ 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">1. אחריות נותן השירות</h2>
          <p className="text-muted-foreground leading-relaxed">
            נותן השירות (העובד) אחראי לבדוק את תנאי העבודה לפני קבלת משרה. יש לוודא שתנאי העבודה בטוחים, חוקיים, ותואמים את הסכמת הצדדים.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">2. בטיחות בעבודה</h2>
          <p className="text-muted-foreground leading-relaxed">
            יש לעבוד בסביבה בטוחה בלבד. אם תנאי העבודה נראים מסוכנים, יש לסרב לעבודה ולדווח לנו. <BrandName /> אינה אחראית לתאונות עבודה או לנזקים שנגרמו במהלך העבודה.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">3. פגישה ראשונה</h2>
          <p className="text-muted-foreground leading-relaxed">
            בפגישה ראשונה עם מעסיק חדש, מומלץ לפגוש במקום ציבורי ולהודיע לאדם קרוב על מיקומך. אל תיסע לכתובת לא מוכרת ללא אימות מוקדם.
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">4. דיווח על תקריות</h2>
          <p className="text-muted-foreground leading-relaxed">
            במקרה של תקרית בטיחות, הטרדה, או התנהגות בלתי הולמת, יש לדווח מיד ל-<BrandName /> בכתובת{" "}
            <a href="mailto:info@avodanow.co.il" className="text-primary hover:underline">info@avodanow.co.il</a>.
            במקרה חירום — חייגו 100 (משטרה) או 101 (מד"א).
          </p>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-3">5. הגבלת אחריות</h2>
          <p className="text-muted-foreground leading-relaxed">
            <BrandName /> היא פלטפורמה לחיבור בין עובדים למעסיקים ואינה צד ביחסי העבודה. האחריות על תנאי העבודה, הבטיחות, והתשלום חלה על הצדדים הישירים בלבד.
          </p>
        </section>
        <div className="text-sm text-muted-foreground pt-2">
          ראה גם:{" "}
          <Link href="/terms" className="text-primary hover:underline">תנאי שימוש</Link>
          {" · "}
          <Link href="/job-posting-policy" className="text-primary hover:underline">מדיניות פרסום משרות</Link>
        </div>
      </div>
    </div>
  );
}

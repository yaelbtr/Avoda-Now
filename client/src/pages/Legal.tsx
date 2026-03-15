import { Link } from "wouter";
import { BrandName } from "@/components/ui";
import { Scale, Shield, FileText, Star, AlertTriangle, Users } from "lucide-react";

/**
 * /legal — Central legal hub page
 * Shows table of contents for all 6 legal documents with anchor links.
 * Useful for SEO (Google indexes this as a structured legal directory)
 * and for accessibility (single entry point for all legal content).
 */

interface LegalDocument {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: string[];
  lastUpdated: string;
}

const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    href: "/terms",
    title: "תנאי שימוש",
    description: "הכללים והתנאים לשימוש בפלטפורמה AvodaNow, כולל זכויות וחובות המשתמשים.",
    icon: <FileText className="h-5 w-5" />,
    sections: ["כללי", "שימוש מותר", "אחריות", "פרסום משרות", "פרטיות", "יצירת קשר"],
    lastUpdated: "מרץ 2026",
  },
  {
    href: "/privacy",
    title: "מדיניות פרטיות",
    description: "כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלך.",
    icon: <Shield className="h-5 w-5" />,
    sections: ["מידע שאנו אוספים", "שימוש במידע", "אבטחת מידע", "עוגיות (Cookies)", "זכויותיך"],
    lastUpdated: "מרץ 2026",
  },
  {
    href: "/job-posting-policy",
    title: "מדיניות פרסום משרות",
    description: "הכללים לפרסום משרות בפלטפורמה — מה מותר, מה אסור, ומה קורה בהפרה.",
    icon: <Users className="h-5 w-5" />,
    sections: ["כללי", "תוכן מותר", "תוכן אסור", "אחריות המפרסם", "מגבלות פרסום", "אכיפה"],
    lastUpdated: "מרץ 2026",
  },
  {
    href: "/safety-policy",
    title: "מדיניות בטיחות",
    description: "כללי הבטיחות שחלים על כל המשתמשים — עובדים ומעסיקים כאחד.",
    icon: <AlertTriangle className="h-5 w-5" />,
    sections: ["אחריות נותן השירות", "בטיחות בעבודה", "פגישה ראשונה", "דיווח על תקריות", "הגבלת אחריות"],
    lastUpdated: "מרץ 2026",
  },
  {
    href: "/user-content-policy",
    title: "מדיניות תוכן משתמשים",
    description: "הכללים לגבי תוכן שמשתמשים מפרסמים — פרופילים, תיאורים ומידע אישי.",
    icon: <Scale className="h-5 w-5" />,
    sections: ["אחריות המשתמש", "תוכן אסור", "דיוק המידע בפרופיל", "קניין רוחני", "הסרת תוכן"],
    lastUpdated: "מרץ 2026",
  },
  {
    href: "/reviews-policy",
    title: "מדיניות ביקורות",
    description: "הכללים לכתיבת ביקורות על עובדים — אמינות, תוכן מותר ותהליך הסרה.",
    icon: <Star className="h-5 w-5" />,
    sections: ["ביקורות אמיתיות בלבד", "תוכן הביקורת", "הסרת ביקורות", "אחריות", "יצירת קשר"],
    lastUpdated: "מרץ 2026",
  },
];

export default function Legal() {
  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-foreground transition-colors">דף הבית</Link>
        <span>›</span>
        <span className="text-foreground font-medium">מסמכים משפטיים</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">מסמכים משפטיים</h1>
        <p className="text-muted-foreground leading-relaxed">
          כל המסמכים המשפטיים של <BrandName /> במקום אחד. קרא/י את המדיניות הרלוונטית לפני השימוש בפלטפורמה.
          כל המסמכים עודכנו לאחרונה במרץ 2026.
        </p>
      </div>

      {/* Quick navigation */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">תוכן עניינים</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LEGAL_DOCUMENTS.map((doc) => (
            <a
              key={doc.href}
              href={doc.href}
              className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-accent transition-colors group"
            >
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {doc.icon}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {doc.title}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Document cards */}
      <div className="space-y-5">
        {LEGAL_DOCUMENTS.map((doc) => (
          <div
            key={doc.href}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {doc.icon}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{doc.title}</h2>
                  <p className="text-xs text-muted-foreground">עודכן: {doc.lastUpdated}</p>
                </div>
              </div>
              <a
                href={doc.href}
                className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                קרא/י
              </a>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{doc.description}</p>

            {/* Section anchors */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">סעיפים:</p>
              <div className="flex flex-wrap gap-2">
                {doc.sections.map((section) => (
                  <a
                    key={section}
                    href={doc.href}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {section}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contact section */}
      <div className="mt-8 bg-card border border-border rounded-xl p-5 text-center">
        <h2 className="text-base font-semibold text-foreground mb-2">שאלות משפטיות?</h2>
        <p className="text-sm text-muted-foreground mb-3">
          לכל שאלה הנוגעת למדיניות הפלטפורמה, ניתן לפנות אלינו ישירות.
        </p>
        <a
          href="mailto:info@avodanow.co.il"
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
        >
          info@avodanow.co.il
        </a>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
        <BrandName /> אינה סוכנת תיווך. הפלטפורמה מספקת עובדים תוך דקות לעבודות בית ואירועים.
        הפלטפורמה אינה אחראית לתנאי העסקה בין הצדדים.
      </p>
    </div>
  );
}

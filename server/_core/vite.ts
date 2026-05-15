import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import { buildCspDirectives } from "../security";
import viteConfig from "../../vite.config";
import { KEYWORD_LANDING_PAGES } from "../../client/src/data/keywordLandingData";

// מפה: /slug → נתוני דף נחיתה (לשימוש בהזרקת תוכן לבוטים)
const KW_PAGE_MAP = new Map(
  KEYWORD_LANDING_PAGES.map((p) => [`/${p.slug}`, p])
);

// ── SEO: Bot detection ────────────────────────────────────────────────────────
const BOT_UA_RE = /googlebot|bingbot|yandexbot|slurp|duckduckbot|baiduspider|facebot|ia_archiver|AhrefsBot|SemrushBot|MJ12bot|DotBot|Applebot|GPTBot|anthropic-ai|ClaudeBot|PetalBot|DataForSeoBot/i;
function isBotRequest(ua: string): boolean {
  return BOT_UA_RE.test(ua);
}

// ── SEO: Per-route meta definitions for server-side injection ─────────────────
interface RouteMeta { title: string; description: string; ogImage?: string; }
const STATIC_ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "AvodaGo - עבודות זמניות בישראל | מצא עבודה עכשיו",
    description: "הפלטפורמה לעבודות זמניות בישראל. מצא עבודות קרוב אליך - שליחויות, מחסן, מטבח ועוד. התחבר ישירות למעסיקים ללא עמלות.",
  },
  "/find-jobs": {
    title: "חיפוש עבודה זמנית | AvodaGo",
    description: "כל המשרות הזמניות הזמינות עכשיו קרוב אליך. סנן לפי קטגוריה, עיר ושעות ומצא עבודה תוך דקות.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%95%D7%AA-%D7%9E%D7%96%D7%93%D7%9E%D7%A0%D7%95%D7%AA": {
    title: "עבודות מזדמנות בישראל | AvodaGo",
    description: "מצא עבודות מזדמנות קרוב אליך - שליחויות, ניקיון, מטבח ועוד. AvodaGo מחבר עובדים ומעסיקים ישירות, ללא עמלות.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%96%D7%9E%D7%A0%D7%99%D7%AA": {
    title: "עבודה זמנית בישראל | AvodaGo",
    description: "לוח משרות זמניות מהיר. מצא עבודה זמנית קרוב אליך ותתחיל לעבוד מחר.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9E%D7%99%D7%99%D7%93%D7%99%D7%AA": {
    title: "עבודה מיידית - התחל לעבוד היום | AvodaGo",
    description: "דרוש עובד דחוף? מצא עבודה מיידית עם AvodaGo - מחבר בין עובדים למעסיקים תוך דקות.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%A2%D7%95%D7%A0%D7%AA%D7%99%D7%AA": {
    title: "עבודה עונתית בישראל | AvodaGo",
    description: "משרות עונתיות בחקלאות, אירועים, תיירות ועוד. מצא עבודה עונתית מתאימה עכשיו.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A1%D7%98%D7%95%D7%93%D7%A0%D7%98%D7%99%D7%9D": {
    title: "עבודה לסטודנטים | AvodaGo",
    description: "עבודות גמישות לסטודנטים - שעות נוחות, ללא ניסיון. מצא עבודה בין שיעורים.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A0%D7%95%D7%A2%D7%A8": {
    title: "עבודה לנוער | AvodaGo",
    description: "משרות לנוער בין גיל 16 עד 18 - חוקי, בטוח, עם הגנה מלאה. מצא עבודה לנוער עכשיו.",
  },
  "/%D7%9E%D7%A9%D7%A8%D7%95%D7%AA-%D7%96%D7%9E%D7%A0%D7%99%D7%95%D7%AA": {
    title: "משרות זמניות | AvodaGo",
    description: "כל המשרות הזמניות בישראל במקום אחד. מעסיקים ועובדים מתחברים ישירות, ללא עמלות.",
  },
  "/%D7%9E%D7%A0%D7%A7%D7%94-%D7%9C%D7%91%D7%99%D7%AA": {
    title: "מנקה לבית | AvodaGo",
    description: "חיפוש מנקה לבית? AvodaGo מחבר בין בעלי בתים למנקות זמינות בקרבתך. מהיר, ישיר, ללא עמלות.",
  },
  "/%D7%A2%D7%95%D7%96%D7%A8%D7%AA-%D7%91%D7%99%D7%AA": {
    title: "עוזרת בית | AvodaGo",
    description: "מצא עוזרת בית מנוסה בקרבתך. AvodaGo מחבר ישירות בין מעסיקים לעוזרות בית ללא מתווכים.",
  },
  "/%D7%9E%D7%A0%D7%A7%D7%94-%D7%9C%D7%91%D7%99%D7%AA-%D7%97%D7%93-%D7%A4%D7%A2%D7%9E%D7%99": {
    title: "מנקה לבית חד פעמי | AvodaGo",
    description: "צריך מנקה חד פעמי? מצא מנקה זמינה לניקיון חד פעמי מחר בבוקר דרך AvodaGo.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%9C%D7%90-%D7%A0%D7%99%D7%A1%D7%99%D7%95%D7%9F": {
    title: "עבודה ללא ניסיון - התחל לעבוד ללא קורות חיים | AvodaGo",
    description: "מאות משרות שלא דורשות ניסיון קודם, קורות חיים, או ראיון. מצא עבודה ללא ניסיון והתחל היום.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%9E%D7%96%D7%95%D7%9E%D7%9F": {
    title: "עבודה במזומן - תשלום יומי בסוף הכל | AvodaGo",
    description: "עבודה עם תשלום באותו יום - שליחויות, מחסן, ניקיון. קבל מזומן בסוף המשמרת.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%92%D7%9E%D7%99%D7%A9%D7%94": {
    title: "עבודה גמישה - בחר מתי ואיפה לעבוד | AvodaGo",
    description: "משרות ללא התחייבות - עבוד בשעות שבחרת, בימים שנוחים לך. גמישות מלאה עם AvodaGo.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A1%D7%95%D7%A4%D7%A9": {
    title: "עבודה לסוף שבוע - משרות לשישי שבת | AvodaGo",
    description: "עבודה בסוף שבוע לשישי ושבת - אירועים, מסעדנות, שליחויות. שכר גבוה על עבודת שבת.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%99%D7%95%D7%9E%D7%99%D7%AA": {
    title: "עבודה יומית - עבוד היום, קבל תשלום היום | AvodaGo",
    description: "עבודות ליום אחד ללא התחייבות - מחסן, ניקיון, שליחויות, אירועים. 300–600 ₪ ליום.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%97%D7%93-%D7%A4%D7%A2%D7%9E%D7%99%D7%AA": {
    title: "עבודה חד פעמית - עבוד פעם אחת, קבל תשלום | AvodaGo",
    description: "עבודות לפי משימה - מסעדות, אירועים, ניקיון. עבוד פעם אחת ללא התחייבות.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%93%D7%97%D7%95%D7%A4%D7%94": {
    title: "עבודה דחופה - דרוש עובד עכשיו | AvodaGo",
    description: "עבודה דחופה עם התחלה מיידית. AvodaGo מחברת עובדים זמינים למעסיקים שצריכים עזרה עכשיו.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A4%D7%99-%D7%A9%D7%A2%D7%94": {
    title: "עבודה לפי שעה - בחר כמה שעות לעבוד | AvodaGo",
    description: "משרות בשכר שעתי - 32–65 ₪ לשעה. בחר כמה שעות לעבוד, בחר מתי. גמישות מלאה.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9E%D7%94%D7%91%D7%99%D7%AA": {
    title: "עבודה מהבית - משרות מרחוק בישראל | AvodaGo",
    description: "עבודה מהבית - שירות לקוחות, הזנת נתונים, תמיכה טכנית ועוד. עבדו מכל מקום, ללא נסיעות.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%90%D7%9E%D7%94%D7%95%D7%AA": {
    title: "עבודה לאמהות - שעות גמישות עם ילדים | AvodaGo",
    description: "עבודה לאמהות עם ילדים קטנים - שעות בוקר, קרוב לבית, ללא מחויבות קשיחה. AvodaGo מתאימה משרות לאמהות.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%97%D7%99%D7%99%D7%9C%D7%99%D7%9D-%D7%9E%D7%A9%D7%95%D7%97%D7%A8%D7%A8%D7%99%D7%9D": {
    title: "עבודה לחיילים משוחררים - התחל מחר | AvodaGo",
    description: "סיימת צבא ומחפש עבודה? AvodaGo מציגה מאות משרות לחיילים משוחררים - ללא ניסיון, תשלום מיידי.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A2%D7%A8%D7%91": {
    title: "עבודה לערב - משרות משמרת ערב | AvodaGo",
    description: "עבודה בשעות הערב - אחרי 17:00, תוספת שכר חוקית, גמישות מלאה. AvodaGo מציגה משמרות ערב.",
  },
  "/%D7%9E%D7%97%D7%A4%D7%A9-%D7%A2%D7%95%D7%91%D7%93-%D7%A2%D7%9B%D7%A9%D7%99%D7%95": {
    title: "מחפש עובד עכשיו - פרסם משרה ב-5 דקות | AvodaGo",
    description: "מחפש עובד עכשיו? פרסם משרה ב-AvodaGo ותקבל מועמדים תוך שעות. ללא עמלות, ללא ניירת.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91": {
    title: "עבודה בתל אביב - משרות זמניות | AvodaGo",
    description: "עבודה בתל אביב ואזור המרכז - מאות משרות זמניות קרוב אליך. AvodaGo מחברת עובדים ומעסיקים.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D": {
    title: "עבודה בירושלים - משרות זמניות | AvodaGo",
    description: "עבודה בירושלים - ניקיון, שמירה, אירועים ועוד. AvodaGo מתאימה משרות לפי מיקום ואזור.",
  },
  "/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%9C%D7%90-%D7%A7%D7%95%D7%A8%D7%95%D7%AA-%D7%97%D7%99%D7%99%D7%9D": {
    title: "עבודה ללא קורות חיים - הירשם ותתחיל לעבוד | AvodaGo",
    description: "עבודה ללא קורות חיים - ממלאים פרופיל קצר בנייד ומתחילים לעבוד. ללא Word, ללא PDF.",
  },
  "/guide/temporary-jobs": {
    title: "מדריך עבודות זמניות | AvodaGo",
    description: "כל מה שצריך לדעת על עבודות זמניות בישראל - שכר, זכויות, קטגוריות ועוד.",
  },
  "/faq/jobs": {
    title: "שאלות ותשובות על עבודות זמניות | AvodaGo",
    description: "תשובות לשאלות הנפוצות ביותר על עבודות זמניות בישראל.",
  },
  "/about": {
    title: "אודות AvodaGo | הפלטפורמה לעבודות זמניות",
    description: "AvodaGo היא הפלטפורמה הישראלית לעבודות זמניות. חיבור ישיר בין עובדים למעסיקים, ללא עמלות.",
  },
  "/lp/henidman": {
    title: "הצטרף כנותן שירות | AvodaGo - עבודות זמניות בישראל",
    description: "עבודות להנדימן באזור שלך | AvodaGo",
    ogImage: "https://avoda-go.co.il/og/henidman.png",
  },
};

// Hebrew paths are often URL-decoded in req.path - support both forms
function getRouteMeta(rawPath: string): RouteMeta | null {
  const decoded = (() => { try { return decodeURIComponent(rawPath); } catch { return rawPath; } })();

  const KEYWORD_META: Record<string, RouteMeta> = {
    "/עבודות-מזדמנות": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%95%D7%AA-%D7%9E%D7%96%D7%93%D7%9E%D7%A0%D7%95%D7%AA"],
    "/עבודה-זמנית": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%96%D7%9E%D7%A0%D7%99%D7%AA"],
    "/עבודה-מיידית": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9E%D7%99%D7%99%D7%93%D7%99%D7%AA"],
    "/עבודה-עונתית": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%A2%D7%95%D7%A0%D7%AA%D7%99%D7%AA"],
    "/עבודה-לסטודנטים": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A1%D7%98%D7%95%D7%93%D7%A0%D7%98%D7%99%D7%9D"],
    "/עבודה-לנוער": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A0%D7%95%D7%A2%D7%A8"],
    "/משרות-זמניות": STATIC_ROUTE_META["/%D7%9E%D7%A9%D7%A8%D7%95%D7%AA-%D7%96%D7%9E%D7%A0%D7%99%D7%95%D7%AA"],
    "/מנקה-לבית": STATIC_ROUTE_META["/%D7%9E%D7%A0%D7%A7%D7%94-%D7%9C%D7%91%D7%99%D7%AA"],
    "/עוזרת-בית": STATIC_ROUTE_META["/%D7%A2%D7%95%D7%96%D7%A8%D7%AA-%D7%91%D7%99%D7%AA"],
    "/מנקה-לבית-חד-פעמי": STATIC_ROUTE_META["/%D7%9E%D7%A0%D7%A7%D7%94-%D7%9C%D7%91%D7%99%D7%AA-%D7%97%D7%93-%D7%A4%D7%A2%D7%9E%D7%99"],
    "/עבודה-ללא-ניסיון": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%9C%D7%90-%D7%A0%D7%99%D7%A1%D7%99%D7%95%D7%9F"],
    "/עבודה-במזומן": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%9E%D7%96%D7%95%D7%9E%D7%9F"],
    "/עבודה-גמישה": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%92%D7%9E%D7%99%D7%A9%D7%94"],
    "/עבודה-לסופש": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A1%D7%95%D7%A4%D7%A9"],
    "/עבודה-יומית": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%99%D7%95%D7%9E%D7%99%D7%AA"],
    "/עבודה-חד-פעמית": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%97%D7%93-%D7%A4%D7%A2%D7%9E%D7%99%D7%AA"],
    "/עבודה-דחופה": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%93%D7%97%D7%95%D7%A4%D7%94"],
    "/עבודה-לפי-שעה": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A4%D7%99-%D7%A9%D7%A2%D7%94"],
    "/עבודה-מהבית": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9E%D7%94%D7%91%D7%99%D7%AA"],
    "/עבודה-לאמהות": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%90%D7%9E%D7%94%D7%95%D7%AA"],
    "/עבודה-לחיילים-משוחררים": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%97%D7%99%D7%99%D7%9C%D7%99%D7%9D-%D7%9E%D7%A9%D7%95%D7%97%D7%A8%D7%A8%D7%99%D7%9D"],
    "/עבודה-לערב": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%A2%D7%A8%D7%91"],
    "/מחפש-עובד-עכשיו": STATIC_ROUTE_META["/%D7%9E%D7%97%D7%A4%D7%A9-%D7%A2%D7%95%D7%91%D7%93-%D7%A2%D7%9B%D7%A9%D7%99%D7%95"],
    "/עבודה-בתל-אביב": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91"],
    "/עבודה-בירושלים": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D"],
    "/עבודה-ללא-קורות-חיים": STATIC_ROUTE_META["/%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%9C%D7%9C%D7%90-%D7%A7%D7%95%D7%A8%D7%95%D7%AA-%D7%97%D7%99%D7%99%D7%9D"],
  };

  return (
    STATIC_ROUTE_META[rawPath] ??
    STATIC_ROUTE_META[decoded] ??
    KEYWORD_META[rawPath] ??
    KEYWORD_META[decoded] ??
    null
  );
}

function injectMetaForBot(html: string, pathname: string): string {
  // תמיד מתקן canonical ו-og:url לפי הנתיב האמיתי, גם כשאין meta ספציפי לדף
  const canonical = `https://avoda-go.co.il${pathname}`;
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${canonical}$2`);
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${canonical}$2`);

  const meta = getRouteMeta(pathname);
  if (meta) {
    const safeTitle = meta.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeDesc = meta.description.replace(/"/g, "&quot;");
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
    html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${safeDesc}$2`);
    html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${safeTitle}$2`);
    html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${safeDesc}$2`);
    if (meta.ogImage) {
      html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${meta.ogImage}$2`);
      html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${meta.ogImage}$2`);
    }
  }

  // הזרקת תוכן סמנטי (H1 + מבוא) לבוטים — מונע "נסרק אך לא נכלל באינדקס"
  const decoded = (() => { try { return decodeURIComponent(pathname); } catch { return pathname; } })();
  const kwPage = KW_PAGE_MAP.get(decoded) ?? KW_PAGE_MAP.get(pathname);
  if (kwPage) {
    // תוכן גלוי לבוטים בלבד — משתמשים רגילים לא מקבלים HTML זה (isBotRequest בלעדי)
    const safeH1 = kwPage.h1.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeIntro = kwPage.intro.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const contentBlock = `\n<div id="seo-body"><h1>${safeH1}</h1><p>${safeIntro}</p></div>`;
    html = html.replace("</body>", `${contentBlock}\n</body>`);
  }

  return html;
}

function resolveDistPublicPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
  ];

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  return match ?? candidates[0];
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = resolveDistPublicPath();
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  } else {
    console.log(`[Static] Serving client from ${distPath}`);
  }

  // Hashed Vite assets (JS/CSS bundles with content hash) - safe to cache for 1 year
  app.use(
    "/assets",
    express.static(path.resolve(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    })
  );

  app.use("/assets/*", (_req, res) => {
    res.status(404).end();
  });

  // Everything else (favicon, manifest, etc.) - cache for 1 day, except HTML
  app.use(
    express.static(distPath, {
      maxAge: "1d",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  app.use((req, res, next) => {
    if (path.extname(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });

  // fall through to index.html - inject per-request CSP nonce
  // This replaces the static sendFile so we can:
  //  1. Generate a fresh nonce for every HTML response
  //  2. Inject it into all inline <script nonce="..."> tags in index.html
  //  3. Set the Content-Security-Policy header with the same nonce
  const isProduction = process.env.NODE_ENV === "production";
  const indexHtmlPath = path.resolve(distPath, "index.html");

  // Cache the index.html template in memory so we don't hit the disk on every
  // request. The file never changes at runtime (it's a build artifact), so
  // reading it once at startup is safe. This eliminates the ~1-5 ms fs.readFileSync
  // overhead per request and reduces TTFB for the HTML response.
  let _cachedIndexHtml: string | null = null;
  function getIndexHtml(): string {
    if (!_cachedIndexHtml) {
      _cachedIndexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    }
    return _cachedIndexHtml;
  }

  app.use("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (!isProduction) {
      // In development Vite serves HTML directly; this branch is a safety fallback.
      res.sendFile(indexHtmlPath);
      return;
    }

    try {
      let html = getIndexHtml();

      // Generate a cryptographically random nonce for this request.
      // nanoid(24) gives ~143 bits of entropy - well above the 128-bit minimum.
      const nonce = nanoid(24);

      // מוסיפים nonce לכל תגית script כדי שגם bundle חיצוני של Vite
      // יורשה תחת strict-dynamic ולא רק הסקריפטים ה-inline של ה-SSR shell.
      html = html.replace(/<script\b(?![^>]*\bnonce=)/g, `<script nonce="${nonce}"`);

      // הזרקת meta tags לבוטים של מנועי חיפוש - לפני ש-JS רץ
      const ua = req.get("user-agent") ?? "";
      if (isBotRequest(ua)) {
        html = injectMetaForBot(html, req.path);
      }

      // Build the full CSP directive set with this request's nonce.
      const directives = buildCspDirectives(nonce);

      // Serialise directives to a CSP header string.
      // Helmet's format: each directive is "name value1 value2; ..."
      const cspHeader = Object.entries(directives)
        .map(([key, values]) => {
          // Convert camelCase directive keys to kebab-case (Helmet convention)
          const kebab = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
          const directiveValues = Array.isArray(values) ? values : [];
          return directiveValues.length > 0 ? `${kebab} ${directiveValues.join(" ")}` : kebab;
        })
        .join("; ");

      res.setHeader("Content-Security-Policy", cspHeader);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } catch (err) {
      console.error("[CSP] Failed to inject nonce into index.html:", err);
      // Fallback: serve without nonce (CSP header still set by Helmet globally)
      res.sendFile(indexHtmlPath);
    }
  });
}

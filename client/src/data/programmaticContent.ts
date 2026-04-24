/**
 * Programmatic SEO/AEO Content Engine
 * Generates 180+ pages from category × city × intent combinations.
 * Single source of truth — all text, meta, FAQ, and internal links
 * are derived from this file. Never duplicate logic in page components.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Intent = "how_to" | "urgent" | "price";

export interface CityDef {
  slug: string;      // URL slug (Hebrew, URL-encoded)
  name: string;      // Display name
  lat: number;
  lng: number;
  region: string;    // e.g. "מרכז", "צפון"
}

export interface CategoryDef {
  slug: string;           // matches JOB_CATEGORY_SLUGS
  nameHe: string;         // "ניקיון"
  nameHeWithArticle: string; // "עובד ניקיון"
  icon: string;
  avgPrice: string;       // "₪40–80 לשעה"
  priceNote: string;
  ctaLabel: string;       // "מצא עובד ניקיון עכשיו"
}

export interface ProgrammaticSection {
  title: string;
  body: string;
}

export interface ProgrammaticFAQ {
  q: string;
  a: string;
}

export interface ProgrammaticPage {
  slug: string;           // full URL path without leading /
  category: CategoryDef;
  city: CityDef;
  intent: Intent;
  h1: string;
  intro: string;
  sections: ProgrammaticSection[];
  faq: ProgrammaticFAQ[];
  metaTitle: string;
  metaDescription: string;
  relatedSlugs: string[];
  schemaType: "HowTo" | "FAQPage";
}

// ─── Cities ───────────────────────────────────────────────────────────────────

export const PROGRAMMATIC_CITIES: CityDef[] = [
  { slug: "תל-אביב",       name: "תל אביב",       lat: 32.0853,  lng: 34.7818,  region: "מרכז" },
  { slug: "ירושלים",       name: "ירושלים",       lat: 31.7683,  lng: 35.2137,  region: "ירושלים" },
  { slug: "חיפה",          name: "חיפה",          lat: 32.7940,  lng: 34.9896,  region: "צפון" },
  { slug: "ראשון-לציון",   name: "ראשון לציון",   lat: 31.9730,  lng: 34.7925,  region: "מרכז" },
  { slug: "פתח-תקווה",     name: "פתח תקווה",     lat: 32.0841,  lng: 34.8878,  region: "מרכז" },
  { slug: "אשדוד",         name: "אשדוד",         lat: 31.8044,  lng: 34.6553,  region: "דרום" },
  { slug: "נתניה",         name: "נתניה",         lat: 32.3215,  lng: 34.8532,  region: "מרכז" },
  { slug: "באר-שבע",       name: "באר שבע",       lat: 31.2516,  lng: 34.7913,  region: "דרום" },
  { slug: "בני-ברק",       name: "בני ברק",       lat: 32.0809,  lng: 34.8338,  region: "מרכז" },
  { slug: "רמת-גן",        name: "רמת גן",        lat: 32.0680,  lng: 34.8240,  region: "מרכז" },
];

// ─── Categories ───────────────────────────────────────────────────────────────

export const PROGRAMMATIC_CATEGORIES: CategoryDef[] = [
  {
    slug: "cleaning",
    nameHe: "ניקיון",
    nameHeWithArticle: "עובד ניקיון",
    icon: "🧹",
    avgPrice: "₪40–80 לשעה",
    priceNote: "המחיר תלוי בגודל הנכס, סוג הניקיון, ומספר השעות",
    ctaLabel: "מצא עובד ניקיון עכשיו",
  },
  {
    slug: "dog_walker",
    nameHe: "דוגווקר",
    nameHeWithArticle: "דוגווקר",
    icon: "🐕",
    avgPrice: "₪30–60 לשעה",
    priceNote: "המחיר תלוי במשך הטיול, מספר הכלבים, ואזור המגורים",
    ctaLabel: "מצא דוגווקר עכשיו",
  },
  {
    slug: "moving",
    nameHe: "הובלות",
    nameHeWithArticle: "מוביל",
    icon: "🚚",
    avgPrice: "₪200–800 להובלה",
    priceNote: "המחיר תלוי בכמות הפריטים, המרחק, וצורך ברכב מיוחד",
    ctaLabel: "מצא מוביל עכשיו",
  },
  {
    slug: "babysitter",
    nameHe: "בייביסיטר",
    nameHeWithArticle: "בייביסיטר",
    icon: "👶",
    avgPrice: "₪35–60 לשעה",
    priceNote: "המחיר תלוי בגיל הילדים, מספר הילדים, ושעות העבודה",
    ctaLabel: "מצא בייביסיטר עכשיו",
  },
  {
    slug: "delivery",
    nameHe: "שליחויות",
    nameHeWithArticle: "שליח",
    icon: "📦",
    avgPrice: "₪50–150 למשימה",
    priceNote: "המחיר תלוי במרחק, משקל החבילה, ודחיפות המשלוח",
    ctaLabel: "מצא שליח עכשיו",
  },
  {
    slug: "events",
    nameHe: "אירועים",
    nameHeWithArticle: "עובד אירועים",
    icon: "🎉",
    avgPrice: "₪50–100 לשעה",
    priceNote: "המחיר תלוי בסוג האירוע, מספר השעות, ותפקיד העובד",
    ctaLabel: "מצא עובד לאירוע עכשיו",
  },
];

// ─── Intent Templates ─────────────────────────────────────────────────────────

function buildHowToPage(cat: CategoryDef, city: CityDef): Omit<ProgrammaticPage, "slug" | "relatedSlugs"> {
  return {
    category: cat,
    city,
    intent: "how_to",
    h1: `איך למצוא ${cat.nameHeWithArticle} ב${city.name}`,
    intro: `אם אתם מחפשים ${cat.nameHeWithArticle} ב${city.name}, הדרך המהירה ביותר היא למצוא עובד זמין לפי אזור וזמינות מיידית. פלטפורמות ייעודיות מאפשרות תגובה מהירה יותר מקבוצות פייסבוק או המלצות.`,
    sections: [
      {
        title: `מה האפשרויות למציאת ${cat.nameHeWithArticle} ב${city.name}`,
        body: `ישנן מספר דרכים למצוא ${cat.nameHeWithArticle} ב${city.name}: קבוצות וואטסאפ ופייסבוק, המלצות מחברים, ופלטפורמות ייעודיות. הפלטפורמות מציגות עובדים זמינים לפי מיקום ומאפשרות יצירת קשר מיידית.`,
      },
      {
        title: `מה הכי מהיר`,
        body: `הדרך המהירה ביותר היא פלטפורמה עם עובדים זמינים בזמן אמת. ניתן לראות מי זמין עכשיו ב${city.name}, ליצור קשר ישיר, ולתאם תוך דקות.`,
      },
      {
        title: `איך לבחור ${cat.nameHeWithArticle} אמין`,
        body: `בדקו ביקורות, וודאו ניסיון רלוונטי, ושאלו על זמינות. עובדים שמסמנים זמינות בפלטפורמה מחויבים יותר ומגיבים מהר יותר.`,
      },
    ],
    faq: buildFAQ(cat, city, "how_to"),
    metaTitle: `איך למצוא ${cat.nameHeWithArticle} ב${city.name} — YallaAvoda`,
    metaDescription: `מצא ${cat.nameHeWithArticle} זמין ב${city.name} במהירות. עובדים לפי אזור, זמינות מיידית, ויצירת קשר ישיר. ${cat.avgPrice}.`,
    schemaType: "HowTo",
  };
}

function buildUrgentPage(cat: CategoryDef, city: CityDef): Omit<ProgrammaticPage, "slug" | "relatedSlugs"> {
  return {
    category: cat,
    city,
    intent: "urgent",
    h1: `${cat.nameHeWithArticle} בדחיפות ב${city.name} — מהיום להיום`,
    intro: `כשצריך ${cat.nameHeWithArticle} בדחיפות ב${city.name}, כל דקה חשובה. הדרך המהירה ביותר היא פלטפורמה עם עובדים שמסמנים זמינות בזמן אמת — ניתן לראות מי זמין עכשיו ולתאם תוך דקות.`,
    sections: [
      {
        title: `איך למצוא ${cat.nameHeWithArticle} בהתראה קצרה`,
        body: `כשצריך עובד מהיום להיום, חשוב לפנות למקורות עם עובדים זמינים באופן מיידי. פלטפורמות עם מצב זמינות בזמן אמת הן הפתרון המהיר ביותר.`,
      },
      {
        title: `מה לבדוק לפני גיוס בדחיפות`,
        body: `גם בדחיפות, בדקו שהעובד מאומת, יש לו ניסיון רלוונטי, וזמין לשעות הנדרשות. עובדים שמסמנים זמינות פעילה מחויבים יותר.`,
      },
      {
        title: `כמה עולה ${cat.nameHeWithArticle} בדחיפות ב${city.name}`,
        body: `המחיר הרגיל הוא ${cat.avgPrice}. בדחיפות, ייתכן תוספת של 10–20% על המחיר הרגיל. ${cat.priceNote}.`,
      },
    ],
    faq: buildFAQ(cat, city, "urgent"),
    metaTitle: `${cat.nameHeWithArticle} בדחיפות ב${city.name} — מהיום להיום | YallaAvoda`,
    metaDescription: `מצא ${cat.nameHeWithArticle} בדחיפות ב${city.name}. עובדים זמינים עכשיו, יצירת קשר מיידית. ${cat.avgPrice}.`,
    schemaType: "FAQPage",
  };
}

function buildPricePage(cat: CategoryDef, city: CityDef): Omit<ProgrammaticPage, "slug" | "relatedSlugs"> {
  return {
    category: cat,
    city,
    intent: "price",
    h1: `כמה עולה ${cat.nameHeWithArticle} ב${city.name}`,
    intro: `המחיר הממוצע ל${cat.nameHe} ב${city.name} הוא ${cat.avgPrice}. ${cat.priceNote}. במאמר זה נסביר מה משפיע על המחיר ואיך לקבל הצעה הוגנת.`,
    sections: [
      {
        title: `טווח מחירים ל${cat.nameHe} ב${city.name}`,
        body: `המחיר הממוצע הוא ${cat.avgPrice}. ${cat.priceNote}. מחירים ב${city.name} דומים לממוצע הארצי, עם שונות לפי אזור ספציפי בעיר.`,
      },
      {
        title: `מה משפיע על המחיר`,
        body: `${cat.priceNote}. בנוסף, ניסיון העובד, שעות העבודה (בוקר/ערב/שבת), ודחיפות המשימה משפיעים על המחיר הסופי.`,
      },
      {
        title: `איך לקבל מחיר הוגן`,
        body: `השוו בין מספר עובדים, בקשו הצעת מחיר מפורטת, ובדקו ביקורות. פלטפורמות עם שקיפות מחירים מאפשרות השוואה קלה.`,
      },
    ],
    faq: buildFAQ(cat, city, "price"),
    metaTitle: `כמה עולה ${cat.nameHeWithArticle} ב${city.name} — מחירים ועלויות | YallaAvoda`,
    metaDescription: `מחיר ${cat.nameHe} ב${city.name}: ${cat.avgPrice}. מה משפיע על המחיר ואיך לקבל הצעה הוגנת.`,
    schemaType: "FAQPage",
  };
}

// ─── FAQ Generator ────────────────────────────────────────────────────────────

function buildFAQ(cat: CategoryDef, city: CityDef, intent: Intent): ProgrammaticFAQ[] {
  const base: ProgrammaticFAQ[] = [
    {
      q: `כמה עולה ${cat.nameHeWithArticle} ב${city.name}?`,
      a: `המחיר הממוצע הוא ${cat.avgPrice}. ${cat.priceNote}.`,
    },
    {
      q: `כמה זמן לוקח למצוא ${cat.nameHeWithArticle} ב${city.name}?`,
      a: `דרך פלטפורמה עם עובדים זמינים בזמן אמת, ניתן למצוא עובד תוך 15–60 דקות. בדרכים מסורתיות (קבוצות, המלצות) התהליך עשוי לקחת מספר שעות עד יום.`,
    },
    {
      q: `האם צריך ניסיון ל${cat.nameHe}?`,
      a: `ניסיון מומלץ אך לא תמיד חובה. בדקו את הפרופיל של העובד, ביקורות קודמות, ושאלו על ניסיון ספציפי לסוג המשימה שלכם.`,
    },
  ];

  if (intent === "urgent") {
    base.push({
      q: `האם ניתן למצוא ${cat.nameHeWithArticle} ב${city.name} ביום אותו יום?`,
      a: `כן. פלטפורמות עם מצב זמינות בזמן אמת מאפשרות מציאת עובד תוך שעה. חפשו עובדים שמסמנים "זמין עכשיו" ב${city.name}.`,
    });
  }

  if (intent === "price") {
    base.push({
      q: `האם המחיר ב${city.name} שונה מערים אחרות?`,
      a: `המחירים ב${city.name} דומים לממוצע הארצי. ייתכן הבדל קל לפי אזור ספציפי בעיר ועומס הביקוש.`,
    });
  }

  return base;
}

// ─── Slug Builder ─────────────────────────────────────────────────────────────

function buildSlug(cat: CategoryDef, city: CityDef, intent: Intent): string {
  const intentSuffix = intent === "how_to" ? "" : intent === "urgent" ? "-בדחיפות" : "-מחיר";
  return `${cat.slug.replace("_", "-")}/${city.slug}${intentSuffix}`;
}

// ─── Related Pages ────────────────────────────────────────────────────────────

function getRelatedSlugs(cat: CategoryDef, city: CityDef, intent: Intent): string[] {
  const related: string[] = [];

  // Same category, same city, other intents
  const otherIntents: Intent[] = (["how_to", "urgent", "price"] as Intent[]).filter(i => i !== intent);
  for (const i of otherIntents) {
    related.push(buildSlug(cat, city, i));
  }

  // Same category, nearby city (first city in same region, or first overall)
  const sameRegion = PROGRAMMATIC_CITIES.filter(c => c.region === city.region && c.slug !== city.slug);
  const nearbyCity = sameRegion[0] ?? PROGRAMMATIC_CITIES.find(c => c.slug !== city.slug);
  if (nearbyCity) {
    related.push(buildSlug(cat, nearbyCity, intent));
  }

  // Same city, different category
  const otherCat = PROGRAMMATIC_CATEGORIES.find(c => c.slug !== cat.slug);
  if (otherCat) {
    related.push(buildSlug(otherCat, city, "how_to"));
  }

  return related.slice(0, 4);
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generatePage(cat: CategoryDef, city: CityDef, intent: Intent): ProgrammaticPage {
  const slug = buildSlug(cat, city, intent);
  const relatedSlugs = getRelatedSlugs(cat, city, intent);

  let base: Omit<ProgrammaticPage, "slug" | "relatedSlugs">;
  if (intent === "how_to") base = buildHowToPage(cat, city);
  else if (intent === "urgent") base = buildUrgentPage(cat, city);
  else base = buildPricePage(cat, city);

  return { ...base, slug, relatedSlugs };
}

// ─── All Pages (180 combinations) ────────────────────────────────────────────

export const PROGRAMMATIC_PAGES: ProgrammaticPage[] = (() => {
  const pages: ProgrammaticPage[] = [];
  const intents: Intent[] = ["how_to", "urgent", "price"];
  for (const cat of PROGRAMMATIC_CATEGORIES) {
    for (const city of PROGRAMMATIC_CITIES) {
      for (const intent of intents) {
        pages.push(generatePage(cat, city, intent));
      }
    }
  }
  return pages;
})();

/** O(1) lookup by slug */
const SLUG_MAP = new Map<string, ProgrammaticPage>(
  PROGRAMMATIC_PAGES.map(p => [p.slug, p])
);

export function getPageBySlug(slug: string): ProgrammaticPage | undefined {
  return SLUG_MAP.get(slug);
}

/** Get all pages for a given category slug */
export function getPagesByCategory(categorySlug: string): ProgrammaticPage[] {
  return PROGRAMMATIC_PAGES.filter(p => p.category.slug === categorySlug);
}

/** Get all pages for a given city slug */
export function getPagesByCity(citySlug: string): ProgrammaticPage[] {
  return PROGRAMMATIC_PAGES.filter(p => p.city.slug === citySlug);
}
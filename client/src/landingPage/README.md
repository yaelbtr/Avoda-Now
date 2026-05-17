# Landing Pages — מדריך תבניות

## מבנה הקבצים

```
landingPage/
├── HenidmanLandingPage.html   ← דף Henidman (המוגש כיום)
├── shared/
│   └── landing.js             ← JS משותף לכל הדפים
├── partials/                  ← קטעי HTML לשימוש חוזר
│   ├── head-meta.html
│   ├── hero.html
│   ├── category-chips.html
│   ├── cta-strip.html
│   ├── benefits.html
│   ├── how-it-works.html
│   ├── earnings-calculator.html
│   ├── testimonials.html      (כרגע מוסתר — uncomment כשמוכן)
│   ├── faq.html
│   ├── final-cta.html
│   └── footer.html
└── README.md

client/public/assets/
└── landing-shared.css         ← CSS משותף (מוגש ישירות ללא hash)
```

## CSS ו-JS משותפים

| קובץ | מיקום | הגשה |
|------|--------|-------|
| `landing-shared.css` | `client/public/assets/` | `/assets/landing-shared.css` (ללא hash, מ-Vite publicDir) |
| `landing.js` | `client/src/landingPage/shared/` | מוטמע ע"י Rollup עם hash, מוחלף ב-build |

כל דף HTML כולל:
- `<link rel="stylesheet" href="/assets/landing-shared.css">` בה-`<head>`
- `<script src="assets/landing.js" defer></script>` בסוף ה-`<body>`

## מה גנרי vs. מה ספציפי לדף

### גנרי (shared — לא לשנות בין דפים)
- כל ה-CSS ב-`landing-shared.css` (tokens, base, components, animations)
- כל ה-JS ב-`shared/landing.js` (count-up, reveal, calculator, postMessage, handwrite oval)
- המבנה הסטרוקטורלי של כל קטע (class names, data-attributes)

### ספציפי לדף (`@page-specific`)
- `<head>`: title, description, canonical URL, og:image, og:url, og:description, twitter:*
- hero: logo-tag text, h1 content, lead text, CTA label, check items, notif/badge/location text
- trust cells: data-count value, trust-num text, trust-label
- category-chips: chip labels ואייקונים (+ שכפול aria-hidden לאנימציה)
- benefits: section-tag, section-title, section-sub, כל benefit (icon, title, text, stat)
- how-it-works: section-title, section-sub, כל step (icon, title, text, time badge)
- calculator: section-sub, שמות bar categories (תיקונים/הרכבות/תחזוקה)
- testimonials: כל הציטוטים, שמות, תפקידים
- FAQ: כל שאלות ותשובות
- final-cta: live-count text, headline, body, CTA label, meta badges
- footer: tagline, nav links (חייבים להתאים ל-IDs של sections), support email, year

## הוספת דף נחיתה חדש (תהליך ידני)

1. **צור קובץ HTML**: העתק `HenidmanLandingPage.html`, שנה את כל בלוקי `@page-specific`
2. **הגדרת URL/slug**: בחר slug (לדוגמה: `cleaning`)
3. **שרת (`server/_core/index.ts`)**: הוסף ל-`LP_PATHS`:
   ```ts
   cleaning: resolve(lpBase, "CleaningLandingPage.html"),
   ```
4. **React iframe (`StandaloneLandingPage.tsx`)**: הוסף ל-`LANDING_PAGES`:
   ```ts
   cleaning: {
     title: "AvodaGo - דף נחיתה לניקיון",
     html: cleaningLandingHtml,  // import בראש הקובץ
     assets: { /* אותו מיפוי */ },
   }
   ```
5. **Sitemap (`server/_core/index.ts`)**: הוסף `/lp/cleaning` לרשימת ה-sitemap
6. **SEO meta (`server/_core/vite.ts`)**: הוסף ל-`STATIC_ROUTE_META`:
   ```ts
   "/lp/cleaning": { title: "...", description: "...", ogImage: "..." }
   ```
7. **OG image**: הוסף `/og/cleaning.png` ל-`client/public/og/`
8. **Build plugin (`vite.config.ts`)**: הרחב את `copy-landing-pages` לעבד גם את הקובץ החדש

## placeholders שרת

הדפים תומכים בהחלפה על-ידי השרת:
- `{{LIVE_WORKERS_COUNT}}` — ספירת עובדים מפורמטת (1,234)
- `{{LIVE_WORKERS_COUNT_RAW}}` — מספר גולמי לאנימציית count-up

## אימות לאחר שינויים

```bash
pnpm dev          # פתח /lp/henidman — בדוק ויזואלית
pnpm build        # בדוק שdist/lp/henidman.html נוצר עם hash נכון
pnpm check        # אין שגיאות TypeScript
```

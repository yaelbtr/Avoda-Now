import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { ChevronRight, Lightbulb, ArrowLeft, Briefcase, BookOpen } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { getGuideEntry, GUIDE_ENTRIES } from "@/data/guideContent";
import { getCategoryIcon, getCategoryLabel } from "@shared/categories";

const CATEGORY_COLORS: Record<string, string> = {
  delivery: "#3b82f6",
  warehouse: "#f59e0b",
  kitchen: "#ef4444",
  cleaning: "#10b981",
  childcare: "#8b5cf6",
  eldercare: "#ec4899",
  security: "#6b7280",
  construction: "#f97316",
  retail: "#06b6d4",
  events: "#a855f7",
  agriculture: "#84cc16",
  other: "#64748b",
};

const SEO_CITIES = ["תל אביב", "ירושלים", "חיפה", "באר שבע", "ראשון לציון", "פתח תקווה", "בני ברק", "אשדוד"];

export default function GuidePage() {
  const { category: slug } = useParams<{ category: string }>();
  const entry = getGuideEntry(slug ?? "");

  useSEO(
    entry
      ? {
          title: `${entry.title} | AvodaNow`,
          description: entry.metaDescription,
          canonical: `https://avodanow.co.il/guide/temporary-jobs/${entry.slug}`,
        }
      : {
          title: "מדריך לא נמצא | AvodaNow",
          description: "הדף המבוקש לא נמצא.",
          noIndex: true,
        }
  );

  // Inject Article + BreadcrumbList JSON-LD
  useEffect(() => {
    if (!entry) return;
    const id = `guide-jsonld-${entry.slug}`;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: entry.title,
          description: entry.metaDescription,
          url: `https://avodanow.co.il/guide/temporary-jobs/${entry.slug}`,
          publisher: { "@type": "Organization", name: "AvodaNow", url: "https://avodanow.co.il" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "בית", item: "https://avodanow.co.il" },
            { "@type": "ListItem", position: 2, name: "מדריכים", item: "https://avodanow.co.il/guide/temporary-jobs" },
            { "@type": "ListItem", position: 3, name: entry.title, item: `https://avodanow.co.il/guide/temporary-jobs/${entry.slug}` },
          ],
        },
      ],
    });
    return () => { document.getElementById(id)?.remove(); };
  }, [entry]);

  if (!entry) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700 mb-2">מדריך לא נמצא</p>
          <Link href="/guide/temporary-jobs" className="text-blue-600 hover:underline text-sm">
            חזרה לכל המדריכים
          </Link>
        </div>
      </div>
    );
  }

  const color = CATEGORY_COLORS[entry.category] ?? "#64748b";
  const icon = getCategoryIcon(entry.category);
  const label = getCategoryLabel(entry.category);

  // Split intro into paragraphs
  const paragraphs = entry.intro.split("\n\n").filter(Boolean);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f8]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Breadcrumb ── */}
        <nav
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-6 flex-wrap text-gray-400"
        >
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/guide/temporary-jobs" className="hover:text-gray-700 transition-colors">מדריכים</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/guide/temporary-jobs" className="hover:text-gray-700 transition-colors">עבודות זמניות</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium">{label}</span>
        </nav>

        {/* ── Hero header ── */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
            border: `1.5px solid ${color}25`,
          }}
        >
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: `${color}20`, border: `1.5px solid ${color}35` }}
            >
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">{entry.title}</h1>
            </div>
          </div>
        </div>

        {/* ── Intro content ── */}
        <article className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
          {paragraphs.map((para, i) => (
            <p key={i} className={`text-gray-700 leading-relaxed text-[15px] ${i > 0 ? "mt-4" : ""}`}>
              {para}
            </p>
          ))}
        </article>

        {/* ── Tips ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5" style={{ color }} />
            <h2 className="text-lg font-bold text-gray-900">טיפים מעשיים</h2>
          </div>
          <div className="space-y-3">
            {entry.tips.map((tip, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm mb-1">{tip.title}</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{tip.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Primary CTA — link to /jobs/{category} ── */}
        <div
          className="rounded-2xl p-6 mb-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          }}
        >
          <Briefcase className="h-8 w-8 text-white mx-auto mb-2 opacity-80" />
          <p className="text-white font-bold text-lg mb-1">{entry.ctaLabel}</p>
          <p className="text-white/70 text-sm mb-4">
            הצג את כל המשרות הפעילות בקטגוריה זו
          </p>
          <Link
            href={`/jobs/${entry.category}`}
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold bg-white transition-opacity hover:opacity-90"
            style={{ color }}
          >
            {entry.ctaLabel}
          </Link>
        </div>

        {/* ── City-specific links ── */}
        <div className="bg-white rounded-2xl p-5 mb-8 border border-gray-100">
          <h2 className="text-base font-bold text-gray-900 mb-3">
            {`עבודות ${label} לפי עיר`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEO_CITIES.map((city) => (
              <Link
                key={city}
                href={`/jobs/${entry.category}/${encodeURIComponent(city)}`}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50"
              >
                {`${label} ב${city}`}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Related guides ── */}
        {entry.relatedCategories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <h2 className="text-base font-bold text-gray-900">מדריכים קשורים</h2>
            </div>
            <div className="space-y-2">
              {entry.relatedCategories.map((relSlug) => {
                const rel = GUIDE_ENTRIES.find((e) => e.slug === relSlug);
                if (!rel) return null;
                const relColor = CATEGORY_COLORS[rel.category] ?? "#64748b";
                return (
                  <Link
                    key={relSlug}
                    href={`/guide/temporary-jobs/${relSlug}`}
                    className="group flex items-center gap-3 bg-white rounded-xl p-3.5 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${relColor}18` }}
                    >
                      {getCategoryIcon(rel.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {rel.title.replace(" — המדריך המלא", "")}
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Back to hub ── */}
        <Link
          href="/guide/temporary-jobs"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          כל המדריכים לעבודות זמניות
        </Link>
      </div>
    </div>
  );
}

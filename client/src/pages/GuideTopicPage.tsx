/**
 * GuideTopicPage — renders /guide/:topic pages.
 * These are standalone guide pages (student-jobs, delivery-salary, passover-jobs, etc.)
 * that are NOT tied to a specific job category.
 */
import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { getGuideTopic, GUIDE_TOPICS } from "@/data/guideTopics";
import { getCategoryLabel } from "@shared/categories";

const BASE_URL = "https://avodanow.co.il";

export default function GuideTopicPage() {
  const { topic } = useParams<{ topic: string }>();
  const entry = getGuideTopic(topic ?? "");

  useSEO(
    entry
      ? {
          title: entry.title,
          description: entry.metaDescription,
          canonical: `/guide/${entry.slug}`,
          keywords: entry.keywords?.join(", "),
        }
      : {
          title: "מדריך לא נמצא | AvodaNow",
          description: "הדף המבוקש לא נמצא.",
          noIndex: true,
        }
  );

  // JSON-LD Article + BreadcrumbList
  useEffect(() => {
    if (!entry) return;
    const id = `guide-topic-jsonld-${entry.slug}`;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    const graph: object[] = [
      {
        "@type": "Article",
        headline: entry.title,
        description: entry.metaDescription,
        url: `${BASE_URL}/guide/${entry.slug}`,
        publisher: { "@type": "Organization", name: "AvodaNow", url: BASE_URL },
        inLanguage: "he",
        keywords: entry.keywords?.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "בית", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "מדריכים", item: `${BASE_URL}/guide/temporary-jobs` },
          { "@type": "ListItem", position: 3, name: entry.title, item: `${BASE_URL}/guide/${entry.slug}` },
        ],
      },
    ];
    // Add FAQPage JSON-LD if topic has FAQ data
    if (entry.faq && entry.faq.length > 0) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: entry.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      });
    }
    el.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
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

  const paragraphs = entry.intro.split("\n\n").filter(Boolean);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f8]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-5 flex-wrap text-gray-400"
          dir="rtl"
        >
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/guide/temporary-jobs" className="hover:text-gray-700 transition-colors">מדריכים</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium truncate max-w-[200px]">{entry.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
              }}
            >
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{entry.title}</h1>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          {paragraphs.map((p, i) => (
            <p key={i} className={`text-gray-700 leading-relaxed text-sm ${i > 0 ? "mt-3" : ""}`}>
              {p}
            </p>
          ))}
        </div>

        {/* Sections */}
        {entry.sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
              >
                {idx + 1}
              </span>
              {section.heading}
            </h2>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {section.body}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div
          className="rounded-2xl p-6 text-white text-center mb-8"
          style={{ background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)" }}
        >
          <p className="font-bold text-lg mb-1">מוכן להתחיל לעבוד?</p>
          <p className="text-sm opacity-90 mb-4">מצא עבודות זמניות קרוב אליך — ללא עמלות</p>
          <Link
            href={entry.ctaPath}
            className="inline-block bg-white text-blue-600 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors"
          >
            {entry.ctaLabel}
          </Link>
        </div>

        {/* Related categories */}
        {entry.relatedCategories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">עבודות לפי קטגוריה</h3>
            <div className="flex flex-wrap gap-2">
              {entry.relatedCategories.map((cat) => (
                <Link
                  key={cat}
                  href={`/jobs/${cat}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  עבודות {getCategoryLabel(cat)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related guide topics */}
        {entry.relatedTopics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">מדריכים נוספים</h3>
            <div className="flex flex-col gap-2">
              {entry.relatedTopics.map((slug) => {
                const related = GUIDE_TOPICS.find((t) => t.slug === slug);
                if (!related) return null;
                return (
                  <Link
                    key={slug}
                    href={`/guide/${slug}`}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors group"
                  >
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                      {related.title}
                    </span>
                    <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-purple-500 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to guide hub */}
        <Link
          href="/guide/temporary-jobs"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          חזרה לכל המדריכים
        </Link>
      </div>
    </div>
  );
}

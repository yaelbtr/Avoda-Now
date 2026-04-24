/**
 * FAQPage — renders /faq/:slug pages.
 * Includes FAQPage JSON-LD schema for AI/Google rich results.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ChevronRight, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { getFAQPage, FAQ_PAGES } from "@/data/faqData";

const BASE_URL = "https://avodanow.co.il";

function FAQAccordionItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div
      className="border border-gray-100 rounded-xl overflow-hidden mb-3 bg-white shadow-sm"
      itemScope
      itemType="https://schema.org/Question"
    >
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-right text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span itemProp="name" className="flex-1 text-right leading-snug">
          {question}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-blue-500 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <div
          className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100"
          itemProp="acceptedAnswer"
          itemScope
          itemType="https://schema.org/Answer"
        >
          <div itemProp="text" className="pt-3">
            {answer}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getFAQPage(slug ?? "");

  useSEO(
    page
      ? {
          title: page.title,
          description: page.metaDescription,
          canonical: `/faq/${page.slug}`,
        }
      : {
          title: "שאלות נפוצות | YallaAvoda",
          description: "שאלות ותשובות על עבודות זמניות בישראל.",
          noIndex: true,
        }
  );

  // FAQPage JSON-LD schema
  useEffect(() => {
    if (!page) return;
    const id = `faq-jsonld-${page.slug}`;
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
          "@type": "FAQPage",
          "@id": `${BASE_URL}/faq/${page.slug}`,
          name: page.h1,
          description: page.metaDescription,
          url: `${BASE_URL}/faq/${page.slug}`,
          inLanguage: "he",
          mainEntity: page.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "בית", item: BASE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "שאלות נפוצות",
              item: `${BASE_URL}/faq/jobs`,
            },
            ...(page.slug !== "jobs"
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: page.h1,
                    item: `${BASE_URL}/faq/${page.slug}`,
                  },
                ]
              : []),
          ],
        },
      ],
    });
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [page]);

  if (!page) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700 mb-2">דף לא נמצא</p>
          <Link href="/faq/jobs" className="text-blue-600 hover:underline text-sm">
            חזרה לשאלות נפוצות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f5f7f8]"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav aria-label="ניווט אתר" className="flex items-center gap-1 text-sm mb-5 flex-wrap text-gray-400" dir="rtl">
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <Link href="/faq/jobs" className="hover:text-gray-700 transition-colors">שאלות נפוצות</Link>
          {page.slug !== "jobs" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
              <span className="text-gray-600 font-medium truncate max-w-[200px]">{page.h1}</span>
            </>
          )}
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
              }}
            >
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{page.h1}</h1>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed mr-13">{page.intro}</p>
        </div>

        {/* FAQ Accordion */}
        <div className="mb-8">
          {page.faqs.map((faq, i) => (
            <FAQAccordionItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              index={i}
            />
          ))}
        </div>

        {/* Other FAQ pages */}
        {FAQ_PAGES.filter((p) => p.slug !== page.slug).length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-700 mb-3">שאלות נפוצות נוספות</h2>
            <div className="flex flex-col gap-2">
              {FAQ_PAGES.filter((p) => p.slug !== page.slug).map((other) => (
                <Link
                  key={other.slug}
                  href={`/faq/${other.slug}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                    {other.h1}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 shrink-0 rotate-180" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related links */}
        {page.relatedLinks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-700 mb-3">קישורים שימושיים</h2>
            <div className="flex flex-wrap gap-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div
          className="rounded-2xl p-6 text-white text-center"
          style={{ background: "linear-gradient(135deg, #3c83f6 0%, #2563eb 100%)" }}
        >
          <p className="font-bold text-lg mb-1">מוכן להתחיל לעבוד?</p>
          <p className="text-sm opacity-90 mb-4">מצא עבודות זמניות קרוב אליך — ללא עמלות</p>
          <Link
            href="/find-jobs"
            className="inline-block bg-white text-blue-600 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors"
          >
            חיפוש משרות
          </Link>
        </div>
      </div>
    </div>
  );
}
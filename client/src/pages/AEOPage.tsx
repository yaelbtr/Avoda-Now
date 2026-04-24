/**
 * AEOPage — universal template for all AEO/SEO content pages.
 *
 * Handles:
 *   - /questions/:slug
 *   - /compare/:slug
 *   - /for/:slug
 *   - /about, /faq-general, /reviews (trust pages)
 *
 * AEO structure per page:
 *   H1 = real user question
 *   Direct answer intro (3-5 lines)
 *   H2 sections with body paragraphs
 *   FAQ accordion with schema.org FAQPage JSON-LD
 *   Product CTA
 *   Related links
 *
 * Schema.org JSON-LD injected:
 *   - FAQPage (if faq.length > 0)
 *   - BreadcrumbList
 *   - Organization (sitewide)
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, ChevronRight, ArrowLeft } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import type { AEOPage } from "@/data/aeoContent";

const BASE_URL = "https://avodanow.co.il";

const TYPE_LABEL: Record<AEOPage["type"], string> = {
  question: "שאלות ותשובות",
  compare: "השוואות",
  guide: "מדריכים",
  audience: "למי זה מיועד",
  trust: "אמון ושקיפות",
};

const TYPE_PATH: Record<AEOPage["type"], string> = {
  question: "/questions",
  compare: "/compare",
  guide: "/guide",
  audience: "/for",
  trust: "/about",
};

// ── FAQ accordion item ────────────────────────────────────────────────────────
function FAQItem({
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

// ── Main component ────────────────────────────────────────────────────────────
export default function AEOPageComponent({ page }: { page: AEOPage }) {
  useSEO({ title: page.title, description: page.metaDescription });

  // Inject JSON-LD schemas
  useEffect(() => {
    const schemas: object[] = [];

    // FAQPage schema
    if (page.faq.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      });
    }

    // BreadcrumbList schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "דף הבית",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: TYPE_LABEL[page.type],
          item: `${BASE_URL}${TYPE_PATH[page.type]}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: page.h1,
          item: `${BASE_URL}${TYPE_PATH[page.type]}/${page.slug}`,
        },
      ],
    });

    // Organization schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "YallaAvoda",
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      description:
        "YallaAvoda — הפלטפורמה הישראלית לעבודה זמנית. מחברת בין עובדים זמינים למעסיקים שצריכים אותם.",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "info@avodanow.co.il",
        availableLanguage: "Hebrew",
      },
    });

    // Inject all schemas
    const existingIds = schemas.map((_, i) => `aeo-schema-${i}`);
    existingIds.forEach((id) => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    });
    schemas.forEach((schema, i) => {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = `aeo-schema-${i}`;
      el.textContent = JSON.stringify(schema);
      document.head.appendChild(el);
    });

    return () => {
      existingIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    };
  }, [page]);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              דף הבית
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              href={TYPE_PATH[page.type]}
              className="hover:text-blue-600 transition-colors"
            >
              {TYPE_LABEL[page.type]}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-gray-700 font-medium truncate max-w-[200px]">
              {page.h1}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <article
          itemScope
          itemType={
            page.faq.length > 0
              ? "https://schema.org/FAQPage"
              : "https://schema.org/Article"
          }
        >
          <header className="mb-8">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
              {TYPE_LABEL[page.type]}
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-4"
              itemProp="headline"
            >
              {page.h1}
            </h1>
            {/* Direct answer — most important for AEO */}
            <div className="bg-blue-50 border-r-4 border-blue-500 rounded-lg px-5 py-4">
              <p className="text-sm md:text-base text-gray-800 leading-relaxed">
                {page.intro}
              </p>
            </div>
          </header>

          {/* ── Sections ─────────────────────────────────────────────── */}
          {page.sections.length > 0 && (
            <div className="space-y-6 mb-10">
              {page.sections.map((section, i) => (
                <section key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    {section.h2}
                  </h2>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          )}

          {/* ── CTA ──────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-l from-blue-600 to-blue-700 rounded-2xl p-6 mb-10 text-white text-center">
            <p className="text-sm font-medium mb-3 opacity-90">
              YallaAvoda — הפלטפורמה הישראלית לעבודה זמנית
            </p>
            <Link
              href={page.cta.href}
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              {page.cta.label}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {/* ── FAQ ──────────────────────────────────────────────────── */}
          {page.faq.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-5">
                שאלות ותשובות
              </h2>
              <div
                itemScope
                itemType="https://schema.org/FAQPage"
              >
                {page.faq.map((f, i) => (
                  <FAQItem
                    key={i}
                    question={f.question}
                    answer={f.answer}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Related links ─────────────────────────────────────── */}
          {page.relatedLinks && page.relatedLinks.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                קישורים קשורים
              </h2>
              <ul className="space-y-2">
                {page.relatedLinks.map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
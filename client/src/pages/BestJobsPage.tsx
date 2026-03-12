/**
 * BestJobsPage — renders /best/:slug pages.
 * Curated job pages designed for AI-based search visibility.
 * Each page includes:
 *   - Editorial intro + highlights
 *   - Live job listings filtered by category/time
 *   - Tips section
 *   - FAQPage JSON-LD schema
 *   - ItemList + JobPosting JSON-LD schema
 *   - Internal links to related pages
 */
import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { ChevronRight, Star, Briefcase, ExternalLink } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { getBestJobsPage, BEST_JOBS_PAGES } from "@/data/bestJobsData";
import { trpc } from "@/lib/trpc";
import { buildJobPath } from "@/lib/jobSlug";
import { getCategoryLabel } from "@shared/categories";

const BASE_URL = "https://avodanow.co.il";

function buildJobPosting(job: {
  id: number;
  title: string;
  description?: string | null;
  city?: string | null;
  category?: string | null;
  salary?: string | number | null;
  salaryType?: string | null;
  createdAt: Date;
}) {
  const salaryLabel =
    job.salaryType === "hourly" ? "HOUR" : job.salaryType === "daily" ? "DAY" : "MONTH";
  const salaryNum = job.salary != null ? Number(job.salary) : null;
  return {
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? job.title,
    datePosted: new Date(job.createdAt).toISOString().split("T")[0],
    employmentType: "TEMPORARY",
    jobLocation: job.city
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.city,
            addressCountry: "IL",
          },
        }
      : undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: "AvodaNow",
      sameAs: BASE_URL,
    },
    ...(salaryNum
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "ILS",
            value: {
              "@type": "QuantitativeValue",
              value: salaryNum,
              unitText: salaryLabel,
            },
          },
        }
      : {}),
    url: `${BASE_URL}${buildJobPath(job.id, job.title, job.city ?? undefined)}`,
  };
}

export default function BestJobsPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getBestJobsPage(slug ?? "");

  // Fetch live jobs based on page filter
  const { data: jobsData, isLoading } = trpc.jobs.list.useQuery(
    {
      category: page?.categoryFilter,
      limit: 12,
    },
    { enabled: !!page }
  );

  const jobs = (jobsData as { jobs?: { id: number; title: string; description?: string | null; city?: string | null; category?: string | null; salary?: string | number | null; salaryType?: string | null; createdAt: Date }[] } | undefined)?.jobs ?? [];

  useSEO(
    page
      ? {
          title: page.title,
          description: page.metaDescription,
          canonical: `/best/${page.slug}`,
        }
      : {
          title: "משרות מומלצות | AvodaNow",
          description: "רשימת המשרות הטובות ביותר בישראל.",
          noIndex: true,
        }
  );

  // JSON-LD: FAQPage + ItemList + BreadcrumbList
  useEffect(() => {
    if (!page) return;
    const id = `best-jobs-jsonld-${page.slug}`;
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
          "@type": "CollectionPage",
          "@id": `${BASE_URL}/best/${page.slug}`,
          name: page.h1,
          description: page.metaDescription,
          url: `${BASE_URL}/best/${page.slug}`,
          inLanguage: "he",
          publisher: { "@type": "Organization", name: "AvodaNow", url: BASE_URL },
        },
        ...(jobs.length > 0
          ? [
              {
                "@type": "ItemList",
                name: page.h1,
                url: `${BASE_URL}/best/${page.slug}`,
                numberOfItems: jobs.length,
                itemListElement: jobs.slice(0, 10).map((job, idx) => ({
                  "@type": "ListItem",
                  position: idx + 1,
                  item: buildJobPosting(job),
                })),
              },
            ]
          : []),
        ...(page.faqs.length > 0
          ? [
              {
                "@type": "FAQPage",
                mainEntity: page.faqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: { "@type": "Answer", text: faq.answer },
                })),
              },
            ]
          : []),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "בית", item: BASE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "משרות מומלצות",
              item: `${BASE_URL}/best/delivery-jobs`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: page.h1,
              item: `${BASE_URL}/best/${page.slug}`,
            },
          ],
        },
      ],
    });
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [page, jobs.length]);

  if (!page) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700 mb-2">דף לא נמצא</p>
          <Link href="/find-jobs" className="text-blue-600 hover:underline text-sm">
            חזרה לחיפוש משרות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7f8]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav aria-label="ניווט אתר" className="flex items-center gap-1 text-sm mb-5 flex-wrap text-gray-400" dir="rtl">
          <Link href="/" className="hover:text-gray-700 transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <span className="text-gray-600 font-medium truncate max-w-[240px]">{page.h1}</span>
        </nav>

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
              }}
            >
              <Star className="h-5 w-5 text-white fill-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{page.h1}</h1>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{page.intro}</p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          {page.highlights.map((h, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100"
            >
              <div className="text-2xl mb-1">{h.icon}</div>
              <div className="text-xs text-gray-400 mb-0.5">{h.label}</div>
              <div className="text-sm font-bold text-gray-800">{h.value}</div>
            </div>
          ))}
        </div>

        {/* Live Job Listings */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              משרות זמינות עכשיו
            </h2>
            {page.categoryFilter && (
              <Link
                href={`/jobs/${page.categoryFilter}`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                כל המשרות →
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
              <p className="text-gray-500 text-sm mb-3">אין משרות זמינות כרגע בקטגוריה זו</p>
              <Link
                href="/find-jobs"
                className="inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                חפש בכל המשרות
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={buildJobPath(job.id, job.title, job.city ?? undefined)}
                  className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-blue-700 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {job.city && (
                          <span className="text-xs text-gray-500">{job.city}</span>
                        )}
                        {job.category && (
                          <span className="text-xs text-gray-400">
                            · {getCategoryLabel(job.category)}
                          </span>
                        )}
                        {job.salary && (
                          <span className="text-xs font-medium text-green-600">
                            · ₪{job.salary}/{job.salaryType === "hourly" ? "שעה" : job.salaryType === "daily" ? "יום" : "חודש"}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                  </div>
                  {job.description && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Search CTA */}
          <div className="mt-4 text-center">
            <Link
              href={page.categoryFilter ? `/jobs/${page.categoryFilter}` : "/find-jobs"}
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Briefcase className="h-4 w-4" />
              {page.categoryFilter
                ? `כל עבודות ${getCategoryLabel(page.categoryFilter)}`
                : "כל המשרות"}
            </Link>
          </div>
        </div>

        {/* Tips */}
        {page.tips.length > 0 && (
          <div className="mb-7">
            <h2 className="text-base font-bold text-gray-900 mb-4">טיפים חשובים</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {page.tips.map((tip, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-1">{tip.heading}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{tip.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {page.faqs.length > 0 && (
          <div className="mb-7">
            <h2 className="text-base font-bold text-gray-900 mb-4">שאלות נפוצות</h2>
            <div className="space-y-3">
              {page.faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  itemScope
                  itemType="https://schema.org/Question"
                >
                  <p className="text-sm font-semibold text-gray-800 mb-2" itemProp="name">
                    {faq.question}
                  </p>
                  <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                    <p className="text-sm text-gray-600 leading-relaxed" itemProp="text">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related links */}
        {page.relatedLinks.length > 0 && (
          <div className="mb-7">
            <h2 className="text-sm font-bold text-gray-700 mb-3">קישורים קשורים</h2>
            <div className="flex flex-wrap gap-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Other best-jobs pages */}
        <div className="mb-7">
          <h2 className="text-sm font-bold text-gray-700 mb-3">עמודי משרות מומלצות נוספים</h2>
          <div className="flex flex-col gap-2">
            {BEST_JOBS_PAGES.filter((p) => p.slug !== page.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/best/${other.slug}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">
                  {other.h1}
                </span>
                <Star className="h-4 w-4 text-gray-300 group-hover:text-amber-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

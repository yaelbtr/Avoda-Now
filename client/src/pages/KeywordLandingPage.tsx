/**
 * KeywordLandingPage.tsx
 *
 * Reusable SEO landing page for all Hebrew keyword routes:
 *   /עבודה-זמנית, /עבודה-מיידית, /עבודות-מזדמנות, /עבודה-עונתית,
 *   /עבודה-לסטודנטים, /עבודה-לנוער, /משרות-זמניות
 *
 * Each page renders:
 *   - Dynamic <title> / <meta description> / canonical via useSEO
 *   - H1 + intro paragraph (150+ words for E-E-A-T)
 *   - Highlights stat bar
 *   - Live job listings via trpc.jobs.list
 *   - FAQ accordion with FAQPage JSON-LD
 *   - ItemList + JobPosting JSON-LD for Google for Jobs
 *   - BreadcrumbList JSON-LD
 *   - Internal links section
 */

import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ChevronRight, ChevronDown, ChevronUp, Briefcase, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import { buildJobPath } from "@/lib/jobSlug";
import { getKeywordLandingPage } from "@/data/keywordLandingData";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import JobBottomSheet from "@/components/JobBottomSheet";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { saveReturnPath } from "@/const";
import { toast } from "sonner";
import {
  C_BRAND_HEX, C_BORDER, C_PAGE_BG_HEX,
} from "@/lib/colors";

const BASE_URL = "https://avodanow.co.il";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  brand:    C_BRAND_HEX,
  pageBg:   C_PAGE_BG_HEX,
  border:   C_BORDER,
  cardBg:   "#ffffff",
  cardRadius: "1rem",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
} as const;

// ── JSON-LD helpers ───────────────────────────────────────────────────────────
function buildJobPosting(job: {
  id: number;
  title: string;
  description?: string | null;
  city?: string | null;
  category?: string | null;
  salary?: string | number | null;
  salaryType?: string | null;
  hourlyRate?: string | number | null;
  createdAt: Date;
  expiresAt?: Date | null;
}) {
  const salaryLabel =
    job.salaryType === "hourly" ? "HOUR" : job.salaryType === "daily" ? "DAY" : "MONTH";
  const rawSalary = job.salary ?? job.hourlyRate;
  const salaryNum = rawSalary != null ? Number(rawSalary) : null;
  return {
    "@type": "JobPosting",
    title: job.title,
    description: (job.description ?? job.title).slice(0, 500),
    datePosted: new Date(job.createdAt).toISOString().split("T")[0],
    ...(job.expiresAt ? { validThrough: new Date(job.expiresAt).toISOString() } : {}),
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
    ...(salaryNum && job.salaryType !== "volunteer"
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

function injectScript(id: string, schema: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema);
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: T.border }}
    >
      <button
        className="w-full flex items-center justify-between gap-3 py-4 text-right font-semibold text-sm"
        style={{ color: "#1a2010" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{question}</span>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: T.brand }} />
          : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: T.brand }} />
        }
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: "#4F583B" }}>
          {answer}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KeywordLandingPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const [location] = useLocation();
  // Routes are registered as exact paths (e.g. /מנקה-לבית) so useParams returns undefined.
  // Fall back to deriving the slug from the URL pathname directly.
  const slug = slugParam ?? decodeURIComponent(location.replace(/^\//, "").split("/")[0]);
  const page = getKeywordLandingPage(slug ?? "");
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();

  type BottomSheetJob = {
    id: number; title: string; category: string; address: string;
    city?: string | null; salary?: string | null; salaryType: string;
    hourlyRate?: string | null; contactPhone: string | null | undefined;
    showPhone?: boolean | null; businessName?: string | null; startTime: string;
    startDateTime?: Date | string | null; isUrgent?: boolean | null;
    workersNeeded: number; createdAt: Date | string;
    expiresAt?: Date | string | null; description?: string | null;
  };
  const [selectedJob, setSelectedJob] = useState<BottomSheetJob | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  // ── Live job query ────────────────────────────────────────────────────────
  const { data: jobsData, isLoading } = trpc.jobs.list.useQuery(
    {
      category: page?.categoryFilter,
      limit: 12,
    },
    { enabled: !!page }
  );

  type RawJob = {
    id: number; title: string; description?: string | null;
    city?: string | null; category?: string | null;
    salary?: string | number | null; salaryType?: string | null;
    hourlyRate?: string | number | null; createdAt: Date; expiresAt?: Date | null;
    isUrgent?: boolean | null; isLocalBusiness?: boolean | null;
    latitude?: string | number | null; longitude?: string | number | null;
    address?: string | null; businessName?: string | null;
    workingHours?: string | null; startTime?: string | null;
    jobDate?: string | null; minAge?: number | null;
  };

  const rawJobs: RawJob[] = (jobsData as { jobs?: RawJob[] } | undefined)?.jobs ?? [];

  // ── SEO ───────────────────────────────────────────────────────────────────
  useSEO(
    page
      ? {
          title: page.title,
          description: page.metaDescription,
          canonical: `/${page.slug}`,
          keywords: `${page.h1}, עבודה זמנית, משרות, ישראל`,
        }
      : { title: "AvodaNow | עבודה זמנית", description: "מצא עבודה זמנית בישראל", noIndex: true }
  );

  // ── JSON-LD injection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!page) return;
    const scriptId = `kw-landing-jsonld-${page.slug}`;

    injectScript(scriptId, {
      "@context": "https://schema.org",
      "@graph": [
        // CollectionPage
        {
          "@type": "CollectionPage",
          "@id": `${BASE_URL}/${page.slug}`,
          name: page.h1,
          description: page.metaDescription,
          url: `${BASE_URL}/${page.slug}`,
          inLanguage: "he",
          publisher: { "@type": "Organization", name: "AvodaNow", url: BASE_URL },
        },
        // ItemList of JobPosting
        ...(rawJobs.length > 0
          ? [{
              "@type": "ItemList",
              name: page.h1,
              url: `${BASE_URL}/${page.slug}`,
              numberOfItems: rawJobs.length,
              itemListElement: rawJobs.slice(0, 10).map((job, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                item: buildJobPosting(job),
              })),
            }]
          : []),
        // FAQPage
        ...(page.faqs.length > 0
          ? [{
              "@type": "FAQPage",
              mainEntity: page.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            }]
          : []),
        // BreadcrumbList
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "בית", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "חיפוש עבודה", item: `${BASE_URL}/find-jobs` },
            { "@type": "ListItem", position: 3, name: page.h1, item: `${BASE_URL}/${page.slug}` },
          ],
        },
      ],
    });

    return () => { document.getElementById(scriptId)?.remove(); };
  }, [page, rawJobs.length]);

  // ── 404 ───────────────────────────────────────────────────────────────────
  if (!page) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: T.pageBg }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-700 mb-2">דף לא נמצא</p>
          <Link href="/find-jobs" className="text-sm hover:underline" style={{ color: T.brand }}>
            חזרה לחיפוש משרות
          </Link>
        </div>
      </div>
    );
  }

  const requireLogin = (msg: string) => {
    saveReturnPath();
    setLoginMessage(msg);
    setLoginOpen(true);
  };

  // Cast rawJobs to JobCardJob shape (all required fields satisfied)
  const jobCards: JobCardJob[] = rawJobs.map((j) => ({
    id: j.id,
    title: j.title,
    category: j.category ?? "",
    address: j.address ?? j.city ?? "",
    city: j.city ?? null,
    salary: j.salary != null ? String(j.salary) : null,
    salaryType: j.salaryType ?? "hourly",
    contactPhone: null,
    businessName: j.businessName ?? null,
    startTime: j.startTime ?? "flexible",
    isUrgent: j.isUrgent ?? false,
    isLocalBusiness: j.isLocalBusiness ?? false,
    workersNeeded: 1,
    createdAt: j.createdAt,
    expiresAt: j.expiresAt ?? null,
    hourlyRate: j.hourlyRate != null ? String(j.hourlyRate) : null,
    jobDate: j.jobDate ?? null,
    minAge: j.minAge ?? null,
  }));

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: T.pageBg }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav
          aria-label="ניווט אתר"
          className="flex items-center gap-1 text-sm mb-5 flex-wrap"
          style={{ color: "#9aaa7a" }}
          dir="rtl"
        >
          <Link href="/" className="hover:underline transition-colors">בית</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link href="/find-jobs" className="hover:underline transition-colors">חיפוש עבודה</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span style={{ color: "#1a2010" }} className="font-medium truncate max-w-[200px]">
            {page.h1}
          </span>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#1a2010" }}>
            {page.h1}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#4F583B" }}>
            {page.intro}
          </p>
        </header>

        {/* ── Highlights bar ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {page.highlights.map((h) => (
            <div
              key={h.label}
              className="rounded-xl p-3 text-center"
              style={{
                background: T.cardBg,
                border: `1px solid ${T.border}`,
                boxShadow: T.cardShadow,
              }}
            >
              <div className="text-xl mb-1">{h.icon}</div>
              <div className="text-xs font-semibold" style={{ color: "#1a2010" }}>{h.value}</div>
              <div className="text-xs" style={{ color: "#9aaa7a" }}>{h.label}</div>
            </div>
          ))}
        </div>

        {/* ── Live job listings ──────────────────────────────────────────── */}
        <section aria-label="משרות פנויות" className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-4 w-4" style={{ color: T.brand }} />
            <h2 className="font-bold text-base" style={{ color: "#1a2010" }}>
              משרות פנויות עכשיו
            </h2>
          </div>

          {isLoading ? (
            <JobCardSkeletonList count={4} />
          ) : jobCards.length > 0 ? (
            <div className="flex flex-col gap-3">
              {jobCards.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onCardClick={(j) => {
                    setSelectedJob({
                      id: j.id, title: j.title,
                      category: j.category ?? "",
                      address: j.address ?? j.city ?? "",
                      city: j.city, salary: j.salary,
                      salaryType: j.salaryType ?? "hourly",
                      hourlyRate: j.hourlyRate,
                      contactPhone: null,
                      businessName: j.businessName,
                      startTime: j.startTime ?? "flexible",
                      isUrgent: j.isUrgent,
                      workersNeeded: 1,
                      createdAt: j.createdAt,
                      expiresAt: j.expiresAt,
                    });
                    // description stored in rawJobs — look up by id
                    const raw = rawJobs.find(r => r.id === j.id);
                    if (raw) setSelectedJob(prev => prev ? { ...prev, description: raw.description ?? null } : prev);
                    setSheetOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: T.cardBg, border: `1px solid ${T.border}` }}
            >
              <Search className="h-8 w-8 mx-auto mb-3" style={{ color: "#9aaa7a" }} />
              <p className="font-semibold mb-1" style={{ color: "#1a2010" }}>אין משרות כרגע</p>
              <p className="text-sm mb-4" style={{ color: "#9aaa7a" }}>
                הירשמו לעדכונים ותקבלו התראה כשמשרות חדשות יתפרסמו
              </p>
              <Link
                href="/find-jobs"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: T.brand }}
              >
                חפש בכל המשרות
              </Link>
            </div>
          )}

          {jobCards.length > 0 && (
            <div className="mt-4 text-center">
              <Link
                href="/find-jobs"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: T.brand }}
              >
                <Search className="h-4 w-4" />
                ראה את כל המשרות
              </Link>
            </div>
          )}
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section aria-label="שאלות נפוצות" className="mb-10">
          <h2 className="font-bold text-base mb-4" style={{ color: "#1a2010" }}>
            שאלות נפוצות
          </h2>
          <div
            className="rounded-xl px-4"
            style={{
              background: T.cardBg,
              border: `1px solid ${T.border}`,
              boxShadow: T.cardShadow,
            }}
          >
            {page.faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </section>

        {/* ── Internal links ─────────────────────────────────────────────── */}
        <section aria-label="קישורים קשורים" className="mb-8">
          <h2 className="font-bold text-base mb-3" style={{ color: "#1a2010" }}>
            חיפושים קשורים
          </h2>
          <div className="flex flex-wrap gap-2">
            {page.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  background: "oklch(0.94 0.04 122)",
                  color: T.brand,
                  border: `1px solid oklch(0.85 0.06 122)`,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

      </div>

      {/* ── Job bottom sheet ───────────────────────────────────────────────── */}
      <JobBottomSheet
        job={selectedJob}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onLoginRequired={requireLogin}
        isAuthenticated={isAuthenticated}
      />

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message={loginMessage}
      />
    </div>
  );
}

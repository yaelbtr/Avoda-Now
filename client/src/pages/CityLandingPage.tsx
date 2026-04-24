/**
 * CityLandingPage — /עבודה-זמנית/:city
 *
 * Programmatic SEO landing pages targeting long-tail keywords:
 * "עבודה זמנית [עיר]" — e.g. "עבודה זמנית תל אביב"
 *
 * Architecture mirrors KeywordLandingPage to maintain DRY principle:
 * - useSEO for title/description/canonical/keywords
 * - JSON-LD: JobPosting ItemList + BreadcrumbList + FAQPage
 * - Live job list filtered by city via trpc.jobs.list
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { JobCard, type JobCardJob } from "@/components/JobCard";
import { JobCardSkeletonList } from "@/components/JobCardSkeleton";
import JobBottomSheet from "@/components/JobBottomSheet";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { getCityLandingPage } from "@/data/cityLandingData";
import { buildJobPath } from "@/lib/jobSlug";
import { MapPin, ChevronLeft, Search, HelpCircle } from "lucide-react";

const BASE_URL = "https://avodanow.co.il";

// ── Design tokens (shared with KeywordLandingPage) ─────────────────────────
const T = {
  brand: "oklch(0.42 0.10 122)",
  brandLight: "oklch(0.94 0.04 122)",
  border: "oklch(0.88 0.05 122)",
  cardBg: "oklch(0.98 0.01 122)",
  cardShadow: "0 1px 4px oklch(0.28 0.06 122 / 0.08)",
  heroBg: "linear-gradient(135deg, oklch(0.35 0.08 122) 0%, oklch(0.28 0.06 122) 100%)",
};

// ── FAQ accordion item ─────────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="py-4 border-b last:border-b-0 cursor-pointer"
      style={{ borderColor: T.border }}
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-sm" style={{ color: "#1a2010" }}>
          {question}
        </span>
        <HelpCircle
          className="h-4 w-4 flex-shrink-0 transition-transform"
          style={{ color: T.brand, transform: open ? "rotate(180deg)" : "none" }}
        />
      </div>
      {open && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#4a5a30" }}>
          {answer}
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CityLandingPage() {
  const { city: citySlug } = useParams<{ city: string }>();
  const page = getCityLandingPage(citySlug ?? "");
  const { isAuthenticated } = useAuth();
  const [selectedJob, setSelectedJob] = useState<null | {
    id: number; title: string; category: string; address: string;
    city?: string | null; salary?: string | null; salaryType: string;
    hourlyRate?: string | null; contactPhone: string | null;
    businessName?: string | null; startTime: string;
    isUrgent?: boolean | null; workersNeeded: number;
    createdAt: Date | string; expiresAt?: Date | string | null;
    description?: string | null;
  }>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  // ── Live job query — filtered by city ────────────────────────────────────
  const { data: jobsData, isLoading } = trpc.jobs.list.useQuery(
    { city: page?.cityName, limit: 12 },
    { enabled: !!page }
  );

  type RawJob = {
    id: number; title: string; description?: string | null;
    city?: string | null; category?: string | null;
    salary?: string | number | null; salaryType?: string | null;
    hourlyRate?: string | null; createdAt: Date; expiresAt?: Date | null;
    isUrgent?: boolean | null; isLocalBusiness?: boolean | null;
    latitude?: string | number | null; longitude?: string | number | null;
    address?: string | null; businessName?: string | null;
    workingHours?: string | null; startTime?: string | null;
    jobDate?: string | null; minAge?: number | null;
  };
  const rawJobs: RawJob[] = (jobsData as { rows?: RawJob[] })?.rows ?? [];

  // ── JobPosting ItemList JSON-LD ───────────────────────────────────────────
  useEffect(() => {
    if (!page || rawJobs.length === 0) return;
    const scriptId = `city-landing-jsonld-${page.slug}`;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: page.h1,
      url: `${BASE_URL}/עבודה-זמנית/${page.slug}`,
      numberOfItems: rawJobs.length,
      itemListElement: rawJobs.map((job, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "JobPosting",
          title: job.title,
          datePosted: job.createdAt instanceof Date
            ? job.createdAt.toISOString().split("T")[0]
            : String(job.createdAt).split("T")[0],
          validThrough: job.expiresAt
            ? (job.expiresAt instanceof Date
              ? job.expiresAt.toISOString().split("T")[0]
              : String(job.expiresAt).split("T")[0])
            : undefined,
          employmentType: "TEMPORARY",
          hiringOrganization: {
            "@type": "Organization",
            name: job.businessName ?? "YallaAvoda",
            sameAs: BASE_URL,
          },
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.city ?? page.cityName,
              addressCountry: "IL",
            },
          },
          url: `${BASE_URL}${buildJobPath(job.id, job.title, job.city ?? undefined)}`,
        },
      })),
    };
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, [page, rawJobs]);

  // ── BreadcrumbList + FAQPage JSON-LD ─────────────────────────────────────
  useEffect(() => {
    if (!page) return;
    const scriptId = `city-landing-meta-jsonld-${page.slug}`;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "YallaAvoda", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "עבודה זמנית", item: `${BASE_URL}/עבודה-זמנית` },
          { "@type": "ListItem", position: 3, name: page.h1, item: `${BASE_URL}/עבודה-זמנית/${page.slug}` },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ];
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, [page]);

  // ── SEO meta ──────────────────────────────────────────────────────────────
  useSEO(
    page
      ? {
          title: page.title,
          description: page.metaDescription,
          keywords: `עבודה זמנית ${page.cityName}, עבודה מיידית ${page.cityName}, משרות זמניות ${page.cityName}, עבודה ${page.cityName}, חיפוש עבודה ${page.cityName}`,
          canonical: `/עבודה-זמנית/${page.slug}`,
        }
      : { title: "עבודה זמנית | YallaAvoda", noIndex: true }
  );

  const requireLogin = (msg: string) => {
    setLoginMessage(msg);
    setLoginOpen(true);
  };

  // ── 404 fallback ──────────────────────────────────────────────────────────
  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8" dir="rtl">
        <MapPin className="h-12 w-12" style={{ color: T.brand }} />
        <h1 className="text-xl font-bold" style={{ color: "#1a2010" }}>
          העיר לא נמצאה
        </h1>
        <Link
          href="/עבודה-זמנית"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: T.brand }}
        >
          <ChevronLeft className="h-4 w-4" />
          חזרה לעבודה זמנית
        </Link>
      </div>
    );
  }

  // ── Map raw jobs to JobCardJob ─────────────────────────────────────────────
  const jobCards: JobCardJob[] = rawJobs.map((job) => ({
    id: job.id,
    title: job.title,
    category: job.category ?? "",
    city: job.city ?? null,
    address: job.address ?? job.city ?? "",
    salary: job.salary != null ? String(job.salary) : null,
    salaryType: (job.salaryType as JobCardJob["salaryType"]) ?? "hourly",
    hourlyRate: job.hourlyRate != null ? String(job.hourlyRate) : null,
    contactPhone: null,
    workersNeeded: 1,
    isUrgent: job.isUrgent ?? null,
    isLocalBusiness: job.isLocalBusiness ?? null,
    latitude: job.latitude != null ? String(job.latitude) : null,
    longitude: job.longitude != null ? String(job.longitude) : null,
    businessName: job.businessName ?? null,
    workingHours: job.workingHours ?? null,
    startTime: job.startTime ?? "",
    jobDate: job.jobDate ?? null,
    minAge: job.minAge ?? null,
    createdAt: job.createdAt,
    expiresAt: job.expiresAt ?? null,
  }));

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.01 122)" }} dir="rtl">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{ background: T.heroBg, minHeight: 180 }}
      >
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs mb-4 opacity-80" aria-label="ניווט">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">בית</Link>
            <ChevronLeft className="h-3 w-3 text-white/50" />
            <Link href="/עבודה-זמנית" className="text-white/70 hover:text-white transition-colors">עבודה זמנית</Link>
            <ChevronLeft className="h-3 w-3 text-white/50" />
            <span className="text-white font-medium">{page.cityName}</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
            {page.h1}
          </h1>
          <p className="text-sm text-white/80 mb-6 max-w-lg">
            {page.metaDescription}
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap gap-2">
            {page.highlights.map((h) => (
              <div
                key={h.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "oklch(1 0 0 / 0.12)", color: "white", border: "1px solid oklch(1 0 0 / 0.20)" }}
              >
                <span>{h.icon}</span>
                <span>{h.label}:</span>
                <span className="font-bold">{h.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Intro */}
        <section className="mb-8">
          <p className="text-sm leading-relaxed" style={{ color: "#3a4a20" }}>
            {page.intro}
          </p>
        </section>

        {/* Live jobs */}
        <section className="mb-10" aria-label={`משרות זמניות ב${page.cityName}`}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5" style={{ color: T.brand }} />
            <h2 className="font-bold text-base" style={{ color: "#1a2010" }}>
              משרות זמניות ב{page.cityName} עכשיו
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
                    const raw = rawJobs.find((r) => r.id === j.id);
                    setSelectedJob({
                      id: j.id,
                      title: j.title,
                      category: j.category ?? "",
                      address: j.address ?? j.city ?? "",
                      city: j.city,
                      salary: j.salary,
                      salaryType: j.salaryType ?? "hourly",
                      hourlyRate: j.hourlyRate != null ? String(j.hourlyRate) : null,
                      contactPhone: null,
                      businessName: j.businessName,
                      startTime: j.startTime ?? "flexible",
                      isUrgent: j.isUrgent,
                      workersNeeded: 1,
                      createdAt: j.createdAt,
                      expiresAt: j.expiresAt,
                      description: raw?.description ?? null,
                    });
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
              <p className="font-semibold mb-1" style={{ color: "#1a2010" }}>
                אין משרות ב{page.cityName} כרגע
              </p>
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
                href={`/find-jobs?city=${encodeURIComponent(page.cityName)}`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: T.brand }}
              >
                <Search className="h-4 w-4" />
                ראה את כל המשרות ב{page.cityName}
              </Link>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="mb-10" aria-label="שאלות נפוצות">
          <h2 className="font-bold text-base mb-4" style={{ color: "#1a2010" }}>
            שאלות נפוצות — עבודה זמנית ב{page.cityName}
          </h2>
          <div
            className="rounded-xl px-4"
            style={{ background: T.cardBg, border: `1px solid ${T.border}`, boxShadow: T.cardShadow }}
          >
            {page.faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="mb-8" aria-label="קישורים קשורים">
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
      </main>

      {/* ── Job bottom sheet ──────────────────────────────────────────────── */}
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
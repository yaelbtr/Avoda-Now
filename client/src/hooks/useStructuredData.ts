/**
 * useStructuredData — injects / removes JSON-LD <script> tags in <head>.
 *
 * Each hook is keyed by a unique script ID so multiple schemas coexist on
 * the same page without conflicts.
 *
 * Available hooks:
 *   useJobPostingSchema   — single job page (/job/:id)
 *   useJobListingSchema   — listing / SEO landing pages (/jobs/*)
 *   useBreadcrumbSchema   — breadcrumb trail for any page
 *   useOrganizationSchema — site-wide Organization (homepage)
 *   useFAQSchema          — FAQ accordion (terms / help pages)
 */
import { useEffect } from "react";

const BASE_URL = "https://avodanow.co.il";
const SITE_NAME = "AvodaNow";
const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663359495587/REsBLBseSeXTZwj6TLp8WJ/og-default-29zavHYfF5qrQJEhQy9iTk.png";

// ── Generic helper ────────────────────────────────────────────────────────────

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

function removeScript(id: string) {
  document.getElementById(id)?.remove();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface JobPostingSchema {
  id: number;
  title: string;
  description: string;
  city?: string | null;
  address?: string | null;
  salary?: string | null;
  salaryType?: "hourly" | "daily" | "monthly" | "volunteer" | null;
  category?: string | null;
  businessName?: string | null;
  createdAt?: Date | string | null;
  expiresAt?: Date | string | null;
  isUrgent?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  /** Relative path, e.g. "/jobs/שליחויות" */
  path: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function salaryUnit(type?: string | null): string {
  switch (type) {
    case "hourly":  return "HOUR";
    case "daily":   return "DAY";
    case "monthly": return "MONTH";
    default:        return "HOUR";
  }
}

function buildJobPosting(job: JobPostingSchema): object {
  const jobUrl = `${BASE_URL}/job/${job.id}`;
  const location = job.city ?? job.address ?? "ישראל";
  const datePosted = job.createdAt
    ? new Date(job.createdAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const validThrough = job.expiresAt
    ? new Date(job.expiresAt).toISOString()
    : undefined;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description.slice(0, 500),
    datePosted,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
        addressCountry: "IL",
      },
    },
    hiringOrganization: {
      "@type": "Organization",
      name: job.businessName ?? SITE_NAME,
      sameAs: BASE_URL,
    },
    url: jobUrl,
    employmentType: job.isUrgent ? "TEMPORARY" : "OTHER",
  };

  if (validThrough) schema.validThrough = validThrough;

  if (job.salary && job.salaryType !== "volunteer") {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "ILS",
      value: {
        "@type": "QuantitativeValue",
        value: parseFloat(job.salary),
        unitText: salaryUnit(job.salaryType),
      },
    };
  }

  return schema;
}

// ── Hook: single job page (/job/:id) ─────────────────────────────────────────

export function useJobPostingSchema(job: JobPostingSchema | null | undefined) {
  useEffect(() => {
    if (!job) { removeScript("ld-job-posting"); return; }
    injectScript("ld-job-posting", buildJobPosting(job));
    return () => removeScript("ld-job-posting");
  }, [job?.id, job?.title, job?.description, job?.expiresAt]);
}

// ── Hook: listing page (/jobs/*) — ItemList of JobPosting ────────────────────

export function useJobListingSchema(
  jobs: JobPostingSchema[],
  pageTitle: string,
  pageUrl: string
) {
  useEffect(() => {
    if (!jobs.length) { removeScript("ld-job-listing"); return; }
    injectScript("ld-job-listing", {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: pageTitle,
      url: `${BASE_URL}${pageUrl}`,
      numberOfItems: jobs.length,
      itemListElement: jobs.slice(0, 20).map((job, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: buildJobPosting(job),
      })),
    });
    return () => removeScript("ld-job-listing");
  }, [jobs.length, pageTitle, pageUrl]);
}

// ── Hook: BreadcrumbList ──────────────────────────────────────────────────────
//
// Usage:
//   useBreadcrumbSchema([
//     { name: "בית",      path: "/" },
//     { name: "משרות",    path: "/jobs" },
//     { name: "שליחויות", path: "/jobs/שליחויות" },
//     { name: "תל אביב",  path: "/jobs/שליחויות/תל אביב" },
//   ]);

export function useBreadcrumbSchema(items: BreadcrumbItem[]) {
  useEffect(() => {
    if (!items.length) { removeScript("ld-breadcrumb"); return; }
    injectScript("ld-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: item.name,
        item: `${BASE_URL}${item.path}`,
      })),
    });
    return () => removeScript("ld-breadcrumb");
  }, [JSON.stringify(items)]);
}

// ── Hook: Organization (homepage / global) ────────────────────────────────────
//
// Inject once on the homepage to establish the Knowledge Panel.

export function useOrganizationSchema() {
  useEffect(() => {
    injectScript("ld-organization", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
        width: 1200,
        height: 630,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "info@avodanow.co.il",
        contactType: "customer support",
        availableLanguage: "Hebrew",
        areaServed: "IL",
      },
      sameAs: [
        BASE_URL,
      ],
      description:
        "AvodaNow — לוח דרושים מהיר ופשוט. מצא עבודות זמניות קרוב אליך ללא עמלות.",
      foundingLocation: {
        "@type": "Place",
        addressCountry: "IL",
      },
    });
    return () => removeScript("ld-organization");
  }, []);
}

// ── Hook: FAQPage ─────────────────────────────────────────────────────────────
//
// Usage:
//   useFAQSchema([
//     { question: "...", answer: "..." },
//   ]);

export function useFAQSchema(faqs: FAQItem[]) {
  useEffect(() => {
    if (!faqs.length) { removeScript("ld-faq"); return; }
    injectScript("ld-faq", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
    return () => removeScript("ld-faq");
  }, [faqs.length]);
}

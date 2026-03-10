/**
 * useStructuredData — injects / removes a JSON-LD <script> tag in <head>.
 *
 * Usage:
 *   useStructuredData(schema)   // pass null/undefined to remove
 *
 * The hook is keyed by `id` so multiple schemas can coexist on the same page.
 */
import { useEffect } from "react";

const BASE_URL = "https://avodanow.co.il";
const SITE_NAME = "AvodaNow";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function salaryUnit(type?: string | null): string {
  switch (type) {
    case "hourly": return "HOUR";
    case "daily": return "DAY";
    case "monthly": return "MONTH";
    default: return "HOUR";
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
    const scriptId = "ld-job-posting";
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!job) {
      el?.remove();
      return;
    }

    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }

    el.textContent = JSON.stringify(buildJobPosting(job));

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [job?.id, job?.title, job?.description, job?.expiresAt]);
}

// ── Hook: listing page (/jobs/*) — ItemList of JobPosting ────────────────────

export function useJobListingSchema(
  jobs: JobPostingSchema[],
  pageTitle: string,
  pageUrl: string
) {
  useEffect(() => {
    const scriptId = "ld-job-listing";
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!jobs.length) {
      el?.remove();
      return;
    }

    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }

    const schema = {
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
    };

    el.textContent = JSON.stringify(schema);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [jobs.length, pageTitle, pageUrl]);
}

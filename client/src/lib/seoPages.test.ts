/**
 * Tests for FAQ and Best Jobs page data integrity.
 * Ensures all pages have required fields and valid slugs.
 */
import { describe, it, expect } from "vitest";
import { FAQ_PAGES, getFAQPage } from "../data/faqData";
import { BEST_JOBS_PAGES, getBestJobsPage } from "../data/bestJobsData";

describe("FAQ Pages data integrity", () => {
  it("all FAQ pages have required fields", () => {
    for (const page of FAQ_PAGES) {
      expect(page.slug, `${page.slug} missing slug`).toBeTruthy();
      expect(page.title, `${page.slug} missing title`).toBeTruthy();
      expect(page.h1, `${page.slug} missing h1`).toBeTruthy();
      expect(page.metaDescription, `${page.slug} missing metaDescription`).toBeTruthy();
      expect(page.faqs.length, `${page.slug} has no faqs`).toBeGreaterThan(0);
    }
  });

  it("all FAQ items have question and answer", () => {
    for (const page of FAQ_PAGES) {
      for (const faq of page.faqs) {
        expect(faq.question, `FAQ in ${page.slug} missing question`).toBeTruthy();
        expect(faq.answer, `FAQ in ${page.slug} missing answer`).toBeTruthy();
      }
    }
  });

  it("getFAQPage returns correct page by slug", () => {
    expect(getFAQPage("jobs")?.slug).toBe("jobs");
    expect(getFAQPage("delivery-jobs")?.slug).toBe("delivery-jobs");
    expect(getFAQPage("student-jobs")?.slug).toBe("student-jobs");
  });

  it("getFAQPage returns undefined for unknown slug", () => {
    expect(getFAQPage("nonexistent")).toBeUndefined();
  });

  it("all FAQ pages have at least 5 FAQ items", () => {
    for (const page of FAQ_PAGES) {
      expect(page.faqs.length, `${page.slug} has fewer than 5 faqs`).toBeGreaterThanOrEqual(5);
    }
  });

  it("all FAQ pages have at least one related link", () => {
    for (const page of FAQ_PAGES) {
      expect(page.relatedLinks.length, `${page.slug} has no related links`).toBeGreaterThan(0);
    }
  });
});

describe("Best Jobs Pages data integrity", () => {
  it("all best-jobs pages have required fields", () => {
    for (const page of BEST_JOBS_PAGES) {
      expect(page.slug, `${page.slug} missing slug`).toBeTruthy();
      expect(page.title, `${page.slug} missing title`).toBeTruthy();
      expect(page.h1, `${page.slug} missing h1`).toBeTruthy();
      expect(page.metaDescription, `${page.slug} missing metaDescription`).toBeTruthy();
      expect(page.intro, `${page.slug} missing intro`).toBeTruthy();
      expect(page.highlights.length, `${page.slug} has no highlights`).toBeGreaterThan(0);
    }
  });

  it("all best-jobs pages have tips", () => {
    for (const page of BEST_JOBS_PAGES) {
      expect(page.tips.length, `${page.slug} has no tips`).toBeGreaterThan(0);
    }
  });

  it("all best-jobs pages have FAQ items", () => {
    for (const page of BEST_JOBS_PAGES) {
      expect(page.faqs.length, `${page.slug} has no faqs`).toBeGreaterThan(0);
    }
  });

  it("getBestJobsPage returns correct page by slug", () => {
    expect(getBestJobsPage("delivery-jobs")?.slug).toBe("delivery-jobs");
    expect(getBestJobsPage("student-jobs")?.slug).toBe("student-jobs");
    expect(getBestJobsPage("evening-jobs")?.slug).toBe("evening-jobs");
    expect(getBestJobsPage("weekend-jobs")?.slug).toBe("weekend-jobs");
    expect(getBestJobsPage("immediate-jobs")?.slug).toBe("immediate-jobs");
  });

  it("getBestJobsPage returns undefined for unknown slug", () => {
    expect(getBestJobsPage("nonexistent")).toBeUndefined();
  });

  it("all highlights have icon, label and value", () => {
    for (const page of BEST_JOBS_PAGES) {
      for (const h of page.highlights) {
        expect(h.icon, `${page.slug} highlight missing icon`).toBeTruthy();
        expect(h.label, `${page.slug} highlight missing label`).toBeTruthy();
        expect(h.value, `${page.slug} highlight missing value`).toBeTruthy();
      }
    }
  });
});

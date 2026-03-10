import { describe, it, expect } from "vitest";
import { toSlug, buildJobPath, parseJobId } from "./jobSlug";

describe("toSlug", () => {
  it("converts Hebrew text to slug", () => {
    expect(toSlug("שליח בתל אביב")).toBe("שליח-בתל-אביב");
  });
  it("handles mixed Hebrew and ASCII", () => {
    expect(toSlug("Delivery Driver תל אביב")).toBe("Delivery-Driver-תל-אביב");
  });
  it("collapses multiple spaces and hyphens", () => {
    expect(toSlug("עבודה   ב  מחסן")).toBe("עבודה-ב-מחסן");
  });
  it("strips special characters", () => {
    expect(toSlug("עבודה! @ מטבח")).toBe("עבודה-מטבח");
  });
  it("trims leading and trailing hyphens", () => {
    expect(toSlug(" - שליח - ")).toBe("שליח");
  });
  it("limits to 80 characters", () => {
    const long = "א".repeat(100);
    expect(toSlug(long).length).toBeLessThanOrEqual(80);
  });
});

describe("buildJobPath", () => {
  it("builds slug path with title and city", () => {
    expect(buildJobPath(42, "שליח", "תל אביב")).toBe("/job/42-שליח-תל-אביב");
  });
  it("builds slug path with title only", () => {
    expect(buildJobPath(7, "מטבח", null)).toBe("/job/7-מטבח");
  });
  it("falls back to /job/{id} when slug is empty", () => {
    expect(buildJobPath(5, "!!!")).toBe("/job/5");
  });
});

describe("parseJobId", () => {
  it("parses plain numeric id", () => {
    expect(parseJobId("42")).toBe(42);
  });
  it("parses slug-based id", () => {
    expect(parseJobId("42-שליח-בתל-אביב")).toBe(42);
  });
  it("returns 0 for invalid input", () => {
    expect(parseJobId("abc")).toBe(0);
  });
});

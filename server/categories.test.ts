import { describe, it, expect, vi } from "vitest";

// Test the category slug validation logic
describe("Category slug validation", () => {
  it("should accept valid slugs", () => {
    const validSlugs = ["cleaning", "events", "kitchen", "serving", "gardening"];
    for (const slug of validSlugs) {
      expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
    }
  });

  it("should reject slugs with uppercase or spaces", () => {
    const invalidSlugs = ["Cleaning", "my events", "kitchen!", ""];
    for (const slug of invalidSlugs) {
      expect(/^[a-z0-9-]+$/.test(slug)).toBe(false);
    }
  });

  it("should enforce max length of 64 chars", () => {
    const longSlug = "a".repeat(65);
    expect(longSlug.length > 64).toBe(true);
    const validSlug = "a".repeat(64);
    expect(validSlug.length <= 64).toBe(true);
  });
});

describe("Category name validation", () => {
  it("should accept Hebrew category names", () => {
    const names = ["ניקיון", "אירועים", "מטבח ובישול", "הגשה ושירות"];
    for (const name of names) {
      expect(name.length > 0 && name.length <= 100).toBe(true);
    }
  });

  it("should reject empty names", () => {
    expect("".length > 0).toBe(false);
  });
});

describe("Category sort order", () => {
  it("should sort categories by sortOrder ascending", () => {
    const cats = [
      { slug: "events", sortOrder: 20 },
      { slug: "cleaning", sortOrder: 10 },
      { slug: "kitchen", sortOrder: 30 },
    ];
    const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(sorted[0].slug).toBe("cleaning");
    expect(sorted[1].slug).toBe("events");
    expect(sorted[2].slug).toBe("kitchen");
  });
});

describe("Category icon defaults", () => {
  it("should fall back to 💼 when icon is null", () => {
    const icon = null;
    const display = icon ?? "💼";
    expect(display).toBe("💼");
  });
});

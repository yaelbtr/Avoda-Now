import { describe, it, expect } from "vitest";
import { normalizeDateInput } from "../shared/ageUtils";

describe("normalizeDateInput", () => {
  // ── Already ISO ────────────────────────────────────────────────────────────
  it("returns YYYY-MM-DD unchanged", () => {
    expect(normalizeDateInput("1995-11-07")).toBe("1995-11-07");
  });

  // ── DD/MM/YYYY (slash) ─────────────────────────────────────────────────────
  it("converts DD/MM/YYYY to YYYY-MM-DD", () => {
    expect(normalizeDateInput("07/11/1995")).toBe("1995-11-07");
  });

  it("pads single-digit day and month with slash separator", () => {
    expect(normalizeDateInput("7/1/2000")).toBe("2000-01-07");
  });

  // ── DD.MM.YYYY (dot — Samsung Galaxy) ─────────────────────────────────────
  it("converts DD.MM.YYYY to YYYY-MM-DD", () => {
    expect(normalizeDateInput("07.11.1995")).toBe("1995-11-07");
  });

  it("pads single-digit day and month with dot separator", () => {
    expect(normalizeDateInput("7.1.2000")).toBe("2000-01-07");
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────
  it("returns empty string unchanged", () => {
    expect(normalizeDateInput("")).toBe("");
  });

  it("returns unrecognised format unchanged", () => {
    expect(normalizeDateInput("not-a-date")).toBe("not-a-date");
  });

  it("returns partial input unchanged", () => {
    expect(normalizeDateInput("07/11")).toBe("07/11");
  });

  // ── Future-date guard (string comparison works for ISO dates) ──────────────
  it("normalised date that is today is not in the future", () => {
    const today = new Date().toISOString().split("T")[0];
    const [y, m, d] = today.split("-");
    const dotFormat = `${d}.${m}.${y}`;
    const result = normalizeDateInput(dotFormat);
    expect(result).toBe(today);
    expect(result > today).toBe(false);
  });

  it("normalised future date is correctly detected as future", () => {
    const future = "01/01/2099";
    const result = normalizeDateInput(future);
    const today = new Date().toISOString().split("T")[0];
    expect(result > today).toBe(true);
  });
});

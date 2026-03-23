import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  isOvernightShift,
  isEndTimeInvalid,
  isZeroDurationShift,
} from "../shared/ageUtils";

describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => expect(timeToMinutes("00:00")).toBe(0));
  it("converts 06:00 to 360", () => expect(timeToMinutes("06:00")).toBe(360));
  it("converts 22:30 to 1350", () => expect(timeToMinutes("22:30")).toBe(1350));
  it("returns null for empty string", () => expect(timeToMinutes("")).toBeNull());
  it("returns null for null", () => expect(timeToMinutes(null)).toBeNull());
  it("returns null for invalid format", () => expect(timeToMinutes("abc")).toBeNull());
});

describe("isOvernightShift", () => {
  it("22:00 → 06:00 is overnight", () => expect(isOvernightShift("22:00", "06:00")).toBe(true));
  it("23:00 → 07:00 is overnight", () => expect(isOvernightShift("23:00", "07:00")).toBe(true));
  it("08:00 → 16:00 is NOT overnight", () => expect(isOvernightShift("08:00", "16:00")).toBe(false));
  it("returns false for null inputs", () => expect(isOvernightShift(null, null)).toBe(false));
});

describe("isEndTimeInvalid", () => {
  // Normal same-day shifts — valid
  it("08:00 → 16:00 is valid", () => expect(isEndTimeInvalid("08:00", "16:00")).toBe(false));
  it("06:00 → 14:00 is valid", () => expect(isEndTimeInvalid("06:00", "14:00")).toBe(false));
  it("12:00 → 20:00 is valid", () => expect(isEndTimeInvalid("12:00", "20:00")).toBe(false));
  it("16:00 → 22:00 is valid", () => expect(isEndTimeInvalid("16:00", "22:00")).toBe(false));

  // Overnight shifts — valid (end < start but duration >= 1 h)
  it("22:00 → 06:00 overnight is valid", () => expect(isEndTimeInvalid("22:00", "06:00")).toBe(false));
  it("23:00 → 07:00 overnight is valid", () => expect(isEndTimeInvalid("23:00", "07:00")).toBe(false));
  it("20:00 → 04:00 overnight is valid", () => expect(isEndTimeInvalid("20:00", "04:00")).toBe(false));

  // Zero-duration — invalid
  it("09:00 → 09:00 zero-duration is invalid", () => expect(isEndTimeInvalid("09:00", "09:00")).toBe(true));
  it("14:00 → 14:00 zero-duration is invalid", () => expect(isEndTimeInvalid("14:00", "14:00")).toBe(true));

  // End < start but very short overnight (< 1 h) — invalid
  it("09:00 → 08:45 (15 min 'overnight') is invalid", () => expect(isEndTimeInvalid("09:00", "08:45")).toBe(true));
  it("10:00 → 09:30 (30 min 'overnight') is invalid", () => expect(isEndTimeInvalid("10:00", "09:30")).toBe(true));

  // Null/empty inputs — not invalid (no data to validate)
  it("null inputs are not flagged as invalid", () => expect(isEndTimeInvalid(null, null)).toBe(false));
  it("empty strings are not flagged as invalid", () => expect(isEndTimeInvalid("", "")).toBe(false));
});

describe("isZeroDurationShift", () => {
  it("same start and end is zero-duration", () => expect(isZeroDurationShift("10:00", "10:00")).toBe(true));
  it("different times are not zero-duration", () => expect(isZeroDurationShift("10:00", "11:00")).toBe(false));
  it("null inputs return false", () => expect(isZeroDurationShift(null, null)).toBe(false));
});

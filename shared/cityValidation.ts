/**
 * cityValidation.ts — Single source of truth for city name validation.
 *
 * Used by:
 *  - CityAutocomplete (client-side inline error)
 *  - PostJob form (submit-time guard)
 *  - server/routers.ts postJob + updateJob Zod schema (server-side guard)
 *
 * Rules (ordered by specificity):
 *  1. Empty / whitespace-only → not a city (caller decides if required)
 *  2. Too long (> 40 chars)   → likely a full address
 *  3. Contains ASCII digits   → street number present (e.g. "הרצל 12")
 *  4. Contains Hebrew digits  → ״א״ through ״ת״ used as ordinals (e.g. "121א")
 *     Note: standalone aleph/bet used in city names (e.g. "באר שבע") are fine;
 *     we only flag when a digit-like letter immediately follows a digit sequence.
 *  5. Contains common address keywords (רחוב, שדרות, כיכר, etc.)
 *
 * Returns null when valid, or a Hebrew error string when invalid.
 */

/** Maximum length for a valid city name. */
export const CITY_MAX_LENGTH = 40;

/** Regex: ASCII digits anywhere in the string. */
const HAS_ASCII_DIGIT = /\d/;

/**
 * Regex: a Hebrew letter used as an ordinal suffix immediately after digits,
 * e.g. "121א", "5ב". Standalone Hebrew letters are fine.
 */
const HAS_HEBREW_ORDINAL = /\d[א-ת]/;

/** Address-indicator keywords (Hebrew). Whole-word match to avoid false positives. */
const ADDRESS_KEYWORDS = [
  "רחוב",
  "רח'",
  "שדרות",
  "שד'",
  "כיכר",
  "סמטא",
  "סמטת",
  "מעלה",
  "מורד",
  "שכונת",
  "קיבוץ גלויות",
  "דרך",
];

const ADDRESS_KEYWORD_REGEX = new RegExp(
  `(^|\\s)(${ADDRESS_KEYWORDS.join("|")})(\\s|$)`,
  "u"
);

export interface CityValidationResult {
  valid: boolean;
  /** Hebrew error message, or null when valid. */
  error: string | null;
}

/**
 * Validates a city name string.
 *
 * @param city - Raw string from the input field (may be empty).
 * @param options.required - If true, an empty string is treated as an error.
 *                           Defaults to false so callers can handle "required"
 *                           separately from "looks like an address".
 */
export function validateCityName(
  city: string | null | undefined,
  options: { required?: boolean } = {}
): CityValidationResult {
  const trimmed = (city ?? "").trim();

  if (trimmed.length === 0) {
    if (options.required) {
      return { valid: false, error: "יש להזין שם עיר" };
    }
    return { valid: true, error: null };
  }

  if (trimmed.length > CITY_MAX_LENGTH) {
    return {
      valid: false,
      error: "נראה שהוזנה כתובת מלאה. יש להזין שם עיר בלבד (למשל: תל אביב)",
    };
  }

  if (HAS_ASCII_DIGIT.test(trimmed)) {
    return {
      valid: false,
      error: "שם עיר אינו יכול להכיל מספרים. יש להזין שם עיר בלבד (למשל: בני ברק)",
    };
  }

  if (HAS_HEBREW_ORDINAL.test(trimmed)) {
    return {
      valid: false,
      error: "נראה שהוזנה כתובת מלאה. יש להזין שם עיר בלבד (למשל: בני ברק)",
    };
  }

  if (ADDRESS_KEYWORD_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "נראה שהוזנה כתובת מלאה. יש להזין שם עיר בלבד (למשל: תל אביב)",
    };
  }

  return { valid: true, error: null };
}

/**
 * Zod-compatible refine function for use in server-side schemas.
 * Returns true when the value is valid (or empty/undefined — let `.optional()`
 * handle the required check separately).
 *
 * Usage:
 *   city: z.string().max(100).optional().superRefine(cityZodRefine)
 */
export function cityZodRefine(
  val: string | undefined,
  ctx: { addIssue: (issue: { code: "custom"; message: string }) => void }
): void {
  if (!val) return; // let .optional() / .min() handle emptiness
  const result = validateCityName(val);
  if (!result.valid && result.error) {
    ctx.addIssue({ code: "custom", message: result.error });
  }
}

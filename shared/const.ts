/**
 * Feature flag — set to true when the system is ready to accept employers.
 * When false, FindJobs shows a translucent "coming soon" overlay and
 * blocks all user interaction. Single source of truth for this gate.
 */
export const FIND_JOBS_OPEN = false;

export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
/**
 * sessionStorage key used to persist pending Google registration data
 * (name, phone, termsAccepted, age18Accepted) across the OAuth redirect.
 * Consumed once by PostGoogleRegistration after the OAuth callback.
 */
export const PENDING_GOOGLE_REG_KEY = "avodanow_pending_google_reg";
export const AXIOS_TIMEOUT_MS = 30_000;
/** Max support reports per IP/user per hour to prevent abuse */
export const SUPPORT_REPORT_RATE_LIMIT = 5;

/**
 * Maximum number of active (status='offered') job offers allowed per job posting
 * at any one time. Enforced server-side in sendJobOffer.
 */
export const MAX_ACTIVE_OFFERS = 5;

/**
 * Maximum number of workers that can accept (or be accepted into) a single job posting.
 * When this cap is reached the job is automatically closed with closedReason = 'cap_reached'.
 * Enforced server-side in updateApplicationStatus and respondToJobOffer.
 */
export const MAX_ACCEPTED_CANDIDATES = 3;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
/**
 * Thrown by protectedProcedure when the authenticated user has no phone number.
 * Frontend should intercept this and open the registration/phone-entry flow.
 */
export const PHONE_REQUIRED_ERR_MSG = 'Phone number required (10003)';

/**
 * Single source of truth for legal document versions.
 * When a document is updated, bump its version string here.
 * The TermsUpdateBanner will automatically prompt users who accepted
 * an older version to re-consent.
 *
 * Version format: "YYYY-MM" (year-month of last update)
 */
export const LEGAL_DOCUMENT_VERSIONS = {
  terms: "2026-03",
  privacy: "2026-03",
  age_18: "2026-03",
  job_posting_policy: "2026-03",
  safety_policy: "2026-03",
  user_content_policy: "2026-03",
  reviews_policy: "2026-03",
} as const;

export type LegalConsentType = keyof typeof LEGAL_DOCUMENT_VERSIONS;

/**
 * Human-readable labels for each consent type (used in the banner UI).
 */
export const LEGAL_DOCUMENT_LABELS: Record<LegalConsentType, string> = {
  terms: "תנאי שימוש",
  privacy: "מדיניות פרטיות",
  age_18: "אישור גיל 18+",
  job_posting_policy: "מדיניות פרסום משרות",
  safety_policy: "מדיניות בטיחות",
  user_content_policy: "מדיניות תוכן משתמשים",
  reviews_policy: "מדיניות ביקורות",
};

/**
 * Paths for each consent type (used to link to the document from the banner).
 */
export const LEGAL_DOCUMENT_PATHS: Record<LegalConsentType, string> = {
  terms: "/terms",
  privacy: "/privacy",
  age_18: "/terms",
  job_posting_policy: "/job-posting-policy",
  safety_policy: "/safety-policy",
  user_content_policy: "/user-content-policy",
  reviews_policy: "/reviews-policy",
};

/**
 * Single source of truth for shift presets used across the platform.
 *
 * Used by:
 *  - PostJob (employer selects a shift when posting a job)
 *  - WorkerProfile / HomeWorker (worker marks preferred time slots)
 *  - FindJobs (filter by shift)
 *  - queryJobs server-side (minor late-hours filter references these hours)
 *
 * Fields:
 *  - value   : stable identifier stored in DB / state
 *  - label   : Hebrew display name
 *  - sub     : human-readable time range (display only)
 *  - start   : ISO HH:MM start time (used to pre-fill workStartTime)
 *  - end     : ISO HH:MM end time   (used to pre-fill workEndTime)
 *  - icon    : emoji shown in the card UI
 *  - isNight : true when the shift ends past midnight (used for minor filtering)
 */
export interface ShiftPreset {
  readonly value: string;
  readonly label: string;
  readonly sub: string;
  readonly start: string;
  readonly end: string;
  readonly icon: string;
  readonly isNight: boolean;
}

export const SHIFT_PRESETS: readonly ShiftPreset[] = [
  { value: "morning",   label: "בוקר",   sub: "06:00–14:00", start: "06:00", end: "14:00", icon: "☀️",  isNight: false },
  { value: "afternoon", label: "צהריים", sub: "12:00–20:00", start: "12:00", end: "20:00", icon: "🌤️", isNight: false },
  { value: "evening",   label: "ערב",    sub: "16:00–22:00", start: "16:00", end: "22:00", icon: "🌆",  isNight: false },
  { value: "night",     label: "לילה",   sub: "22:00–06:00", start: "22:00", end: "06:00", icon: "🌙",  isNight: true  },
] as const;

/**
 * Human-readable Hebrew labels for each application/offer status.
 * Used in MyJobs applicant rows, JobApplications, and MyApplications cards.
 * Single source of truth — do not duplicate in individual components.
 *
 * Fields:
 *  - label   : Short badge text
 *  - color   : Text/icon color (OKLCH)
 *  - bg      : Badge background (OKLCH)
 *  - tooltip : Longer description shown as title attribute on the badge
 */
export const APPLICATION_STATUS_LABELS: Record<
  string,
  { label: string; color: string; bg: string; tooltip: string; workerTooltip?: string }
> = {
  pending:          { label: "הגיש בקשה",          color: "oklch(0.38 0.07 125.0)",  bg: "oklch(0.50 0.14 85 / 0.08)",  tooltip: "העובד הגיש בקשה והיא עדיין לא נצפתה",                  workerTooltip: "הגשת בקשה למשרה זו" },
  viewed:           { label: "נצפה, ממתין לתשובה",  color: "oklch(0.50 0.14 80)",     bg: "oklch(0.50 0.14 80 / 0.08)",  tooltip: "צפית בבקשה, המעסיק טרם החליט אם לקבל או לדחות",        workerTooltip: "המעסיק צפה בבקשה שלך וטרם הגיב" },
  accepted:         { label: "התקבל",               color: "oklch(0.38 0.15 160)",    bg: "oklch(0.68 0.20 160 / 0.10)", tooltip: "המעסיק קיבל את העובד ופרטי הקשר נחשפו",                workerTooltip: "התקבלת! המעסיק יצור איתך קשר בקרוב" },
  rejected:         { label: "נדחה",                color: "oklch(0.50 0.02 120)",    bg: "oklch(0.93 0.01 120)",        tooltip: "המעסיק דחה את בקשת העובד",                             workerTooltip: "בקשתך לא התקבלה הפעם" },
  offered:          { label: "ממתין לתשובת עובד",   color: "oklch(0.45 0.16 260)",    bg: "oklch(0.45 0.16 260 / 0.08)", tooltip: "שלחת הצעת עבודה לעובד והוא טרם הגיב או דחה",           workerTooltip: "קיבלת הצעת עבודה — אשר או דחה" },
  offer_rejected:   { label: "עובד דחה הצעה",       color: "oklch(0.55 0.18 30)",     bg: "oklch(0.55 0.18 30 / 0.08)",  tooltip: "העובד דחה את הצעת העבודה ששלחת",                       workerTooltip: "דחית את הצעת העבודה" },
  offered_accepted: { label: "העובד אישר",           color: "oklch(0.38 0.15 160)",    bg: "oklch(0.68 0.20 160 / 0.10)", tooltip: "העובד אישר את הצעת העבודה ופרטי הקשר נחשפו",           workerTooltip: "אישרת את ההצעה! המעסיק קיבל את הטלפון שלך ויצור איתך קשר בקרוב" },
};

/**
 * Returns the Hebrew label config for an application status, with a safe fallback.
 */
export function getApplicationStatusLabel(status: string) {
  return (
    APPLICATION_STATUS_LABELS[status] ?? {
      label: status,
      color: "oklch(0.50 0.02 120)",
      bg: "oklch(0.93 0.01 120)",
      tooltip: status,
    }
  );
}

/**
 * Normalizes an Israeli phone number to the E.164 format required by wa.me.
 * Handles inputs like: "0559258668", "+972559258668", "972559258668", "055-925-8668"
 * Returns a full number like "972559258668" (no + prefix, no dashes).
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // Already has country code 972
  if (digits.startsWith("972")) return digits;
  // Starts with leading 0 (Israeli local format)
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  // Bare number without prefix — assume Israeli
  return "972" + digits;
}

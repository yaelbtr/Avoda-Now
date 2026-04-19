/**
 * ageUtils.ts — Single source of truth for age-related business logic.
 *
 * Rules:
 *  - Workers under 16 cannot register as workers.
 *  - Workers aged 16–17 are considered minors.
 *  - Minor workers can only see jobs where workEndTime <= "22:00".
 *  - Workers 18+ have no time restrictions.
 *  - Jobs may specify a minAge (16 or 18); workers not meeting it are blocked.
 */

export const MIN_WORKER_AGE = 16;
export const MINOR_MAX_AGE = 17;
export const MINOR_END_TIME_CUTOFF = "22:00"; // HH:MM, inclusive

/**
 * Calculate age in full years from a YYYY-MM-DD birth date string.
 * Returns null if birthDate is null/undefined/invalid.
 */
export function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Returns true if the worker is a minor (age 16 or 17).
 * Returns null if age cannot be determined.
 */
export function isMinor(age: number | null): boolean | null {
  if (age === null) return null;
  return age >= MIN_WORKER_AGE && age <= MINOR_MAX_AGE;
}

/**
 * Returns true if the worker is too young to register (under 16).
 */
export function isTooYoung(age: number | null): boolean {
  if (age === null) return false;
  return age < MIN_WORKER_AGE;
}

/**
 * Returns true if a job is accessible to a minor worker.
 * A job is accessible if workEndTime is null/empty OR <= "22:00".
 * Comparison is lexicographic on HH:MM strings, which is correct for 24h format.
 */
export function isJobAccessibleToMinor(workEndTime: string | null | undefined): boolean {
  if (!workEndTime) return true; // No end time specified → assume accessible
  return workEndTime <= MINOR_END_TIME_CUTOFF;
}

/**
 * Returns true if the employer should see a warning that the job
 * will not be shown to workers under 18.
 */
export function shouldWarnLateJob(workEndTime: string | null | undefined): boolean {
  if (!workEndTime) return false;
  return workEndTime > MINOR_END_TIME_CUTOFF;
}

/**
 * Returns true if a worker's age meets the job's minimum age requirement.
 * If minAge is null/undefined/0, there is no restriction → always true.
 * If age is null (unknown), we block to be safe → false.
 */
export function meetsMinAgeRequirement(
  age: number | null,
  minAge: number | null | undefined,
): boolean {
  if (!minAge) return true; // No restriction
  if (age === null) return false; // Unknown age → block
  return age >= minAge;
}

/**
 * Normalises a user-typed date string to YYYY-MM-DD.
 *
 * Accepts:
 *   - YYYY-MM-DD  (native <input type="date"> value)
 *   - DD/MM/YYYY  (common Israeli manual input)
 *   - DD.MM.YYYY  (Samsung Galaxy / Android keyboard default)
 *
 * Returns the original string unchanged if it doesn't match any pattern,
 * so the server-side validation will still reject it with a clear error.
 */
export function normalizeDateInput(raw: string): string {
  if (!raw) return raw;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD.MM.YYYY
  const match = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw;
}

/**
 * Converts an HH:MM time string to total minutes since midnight.
 * Returns null for empty/invalid input.
 */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Returns true if the shift spans midnight (end time < start time in minutes).
 * e.g. 22:00 → 06:00 is overnight.
 */
export function isOvernightShift(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return false;
  return end < start;
}

/**
 * Returns true if the end/start time combination is invalid.
 *
 * Rules:
 *  - end === start → invalid (zero-duration)
 *  - end > start  → valid   (normal same-day shift)
 *  - end < start  → valid ONLY if it looks like a genuine overnight shift,
 *    i.e. the gap wrapping midnight is at least 1 hour.
 *    e.g. 22:00→06:00 = 8 h overnight ✓
 *         09:00→08:00 = 23 h "overnight" — treat as user error ✗
 *
 * Heuristic: if end < start AND the forward (overnight) duration is < 1 h,
 * flag as invalid.
 */
export function isEndTimeInvalid(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return false;
  if (end === start) return true; // zero-duration
  if (end > start) return false;  // normal same-day shift
  // end < start — potential overnight.
  // A genuine overnight shift starts in the evening (18:00 or later).
  // If start < 18:00 and end < start, it's almost certainly a user error
  // (e.g. typed 08:45 as end when start is 09:00).
  const EVENING_CUTOFF = 18 * 60; // 18:00 in minutes
  return start < EVENING_CUTOFF; // starts before 18:00 → not a real overnight → invalid
}

/**
 * Returns true if endTime equals startTime (zero-duration shift — invalid).
 */
export function isZeroDurationShift(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return false;
  return end === start;
}

/**
 * Returns a human-readable Hebrew label for a minAge value.
 * Used on job cards and PostJob form.
 */
export function minAgeLabel(minAge: number | null | undefined): string | null {
  if (!minAge) return null;
  if (minAge === 18) return "מבוגרים בלבד (18+)";
  if (minAge === 16) return "גיל 16+";
  return `גיל ${minAge}+`;
}

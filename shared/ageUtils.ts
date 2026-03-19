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
 * Returns a human-readable Hebrew label for a minAge value.
 * Used on job cards and PostJob form.
 */
export function minAgeLabel(minAge: number | null | undefined): string | null {
  if (!minAge) return null;
  if (minAge === 18) return "מבוגרים בלבד (18+)";
  if (minAge === 16) return "גיל 16+";
  return `גיל ${minAge}+`;
}

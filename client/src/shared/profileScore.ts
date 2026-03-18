/**
 * Shared profile completion score utility — single source of truth.
 * Used by both FindJobs and WorkerProfile to ensure consistent score display.
 *
 * Checks (7 total, each worth ~14%):
 *  1. name
 *  2. profilePhoto
 *  3. preferredCategories (at least one)
 *  4. preferredCity OR workerLatitude
 *  5. workerBio
 *  6. preferenceText
 *  7. preferredDays (at least one)
 */

export interface ProfileScoreInput {
  name?: string | null;
  profilePhoto?: string | null;
  preferredCategories?: string[];
  preferredCity?: string | null;
  workerLatitude?: number | null;
  workerBio?: string | null;
  preferenceText?: string | null;
  preferredDays?: string[];
}

export function calcProfileScore(profile: ProfileScoreInput | null | undefined): number {
  if (!profile) return 0;
  const checks = [
    !!profile.name?.trim(),
    !!profile.profilePhoto,
    (profile.preferredCategories ?? []).length > 0,
    !!(profile.preferredCity || profile.workerLatitude),
    !!profile.workerBio?.trim(),
    !!profile.preferenceText?.trim(),
    (profile.preferredDays ?? []).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function calcProfileMissingItems(profile: ProfileScoreInput | null | undefined): string[] {
  if (!profile) return ["שם מלא", "תמונת פרופיל", "קטגוריות עבודה", "אזור מועדף", "ביו קצר", "תיאור העדפות", "ימים מועדפים"];
  return [
    !profile.name?.trim() && "שם מלא",
    !profile.profilePhoto && "תמונת פרופיל",
    (profile.preferredCategories ?? []).length === 0 && "קטגוריות עבודה",
    !(profile.preferredCity || profile.workerLatitude) && "אזור מועדף",
    !profile.workerBio?.trim() && "ביו קצר",
    !profile.preferenceText?.trim() && "תיאור העדפות",
    (profile.preferredDays ?? []).length === 0 && "ימים מועדפים",
  ].filter(Boolean) as string[];
}

/**
 * jobSlug.ts — utilities for generating and parsing slug-based job URLs.
 *
 * Format: /job/{id}-{slug}
 * Examples:
 *   /job/42-שליח-בתל-אביב
 *   /job/7-מטבח-בירושלים
 *
 * The slug is derived from the job title (and optionally city).
 * Hebrew characters are preserved; spaces become hyphens; special chars stripped.
 */

/**
 * Convert a Hebrew (or mixed) string to a URL-safe slug.
 * Preserves Hebrew letters, digits, and ASCII letters.
 * Replaces spaces and underscores with hyphens.
 * Collapses consecutive hyphens.
 * Trims leading/trailing hyphens.
 */
export function toSlug(text: string): string {
  return text
    .trim()
    .replace(/[\s_]+/g, "-")           // spaces → hyphens
    .replace(/[^\u0590-\u05FF\w-]/g, "") // keep Hebrew, ASCII word chars, hyphens
    .replace(/-{2,}/g, "-")             // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "")            // trim leading/trailing hyphens
    .slice(0, 80);                       // max 80 chars
}

/**
 * Build the canonical job URL path.
 * e.g. buildJobPath(42, "שליח בתל אביב") → "/job/42-שליח-בתל-אביב"
 */
export function buildJobPath(id: number, title: string, city?: string | null): string {
  const slugParts = [title, city].filter(Boolean).join(" ");
  const slug = toSlug(slugParts);
  return slug ? `/job/${id}-${slug}` : `/job/${id}`;
}

/**
 * Extract the numeric job ID from a slug-based path segment.
 * Accepts both "42" and "42-שליח-בתל-אביב".
 */
export function parseJobId(idSlug: string): number {
  const match = idSlug.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

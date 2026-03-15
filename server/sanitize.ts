/**
 * server/sanitize.ts — Centralized XSS Sanitization Utility
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all user-generated text sanitization.
 *
 * Usage:
 *   import { sanitizeText, sanitizeRichText } from "./sanitize";
 *
 *   sanitizeText(input)      — strips ALL HTML tags (plain text fields)
 *   sanitizeRichText(input)  — allows safe subset of HTML (descriptions)
 *
 * Never sanitize on the client — always sanitize server-side before DB writes.
 */

import sanitizeHtml from "sanitize-html";

// ─── Plain text sanitizer ─────────────────────────────────────────────────────
// Strips ALL HTML tags. Use for: names, titles, addresses, phone numbers,
// short text fields, tags, bio, notes, etc.
const PLAIN_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],        // no HTML allowed
  allowedAttributes: {},  // no attributes allowed
  disallowedTagsMode: "discard",
};

/**
 * Strip all HTML tags from a string.
 * Safe for plain-text fields: names, titles, addresses, notes, tags.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return input ?? "";
  return sanitizeHtml(input.trim(), PLAIN_TEXT_OPTIONS);
}

// ─── Rich text sanitizer ──────────────────────────────────────────────────────
// Allows a safe subset of formatting tags. Use for: job descriptions, bio.
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "i", "em", "strong", "br", "p", "ul", "ol", "li"],
  allowedAttributes: {},  // no attributes (no href, no style, no onclick)
  disallowedTagsMode: "discard",
};

/**
 * Allow safe formatting HTML (bold, italic, lists, paragraphs).
 * Use for job descriptions and worker bio fields.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return input ?? "";
  return sanitizeHtml(input.trim(), RICH_TEXT_OPTIONS);
}

// ─── Batch sanitizer ─────────────────────────────────────────────────────────
/**
 * Sanitize an array of strings (e.g. tags, categories).
 * Each element is stripped of HTML.
 */
export function sanitizeTextArray(arr: string[] | null | undefined): string[] {
  if (!arr) return [];
  return arr.map(sanitizeText).filter(Boolean);
}

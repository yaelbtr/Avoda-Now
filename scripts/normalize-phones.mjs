/**
 * scripts/normalize-phones.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time migration: converts all phone numbers in the `users` table that are
 * NOT already in E.164 format (+972XXXXXXXXX) to the correct format.
 *
 * Safe to run multiple times (idempotent):
 *   - Phones already in +972 format are skipped.
 *   - Duplicate collisions (two rows that would normalize to the same number)
 *     are reported and left untouched — manual review required.
 *
 * Usage:
 *   node scripts/normalize-phones.mjs
 *
 * Requires DATABASE_URL env variable (auto-injected in the Manus sandbox).
 */

import mysql from "mysql2/promise";

// ── Phone normalization (mirrors server/smsProvider.ts) ──────────────────────

function normalizeIsraeliPhone(raw) {
  if (!raw) return null;
  const stripped = raw.trim();
  const digits = stripped.replace(/[\s\-().]/g, "").replace(/^\+/, "");

  // Already in international format: 972 + 9 digits
  if (digits.startsWith("972") && digits.length >= 11 && digits.length <= 13) {
    return `+${digits}`;
  }

  // Local Israeli format: starts with 0, 9-10 digits
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 10) {
    return `+972${digits.slice(1)}`;
  }

  // Stripped of leading 0: 8-9 digits starting with 2-9
  if (!digits.startsWith("0") && !digits.startsWith("9") && digits.length >= 8 && digits.length <= 9) {
    return `+972${digits}`;
  }

  return null; // Cannot normalize — leave as-is
}

function isE164(phone) {
  return /^\+972[2-9]\d{7,9}$/.test(phone);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

try {
  // Fetch all users with a phone number
  const [rows] = await conn.execute(
    "SELECT id, phone FROM users WHERE phone IS NOT NULL ORDER BY id"
  );

  console.log(`\n📋 Found ${rows.length} users with phone numbers\n`);

  let skipped = 0;
  let updated = 0;
  let failed = 0;
  let collisions = 0;

  for (const row of rows) {
    const { id, phone } = row;

    // Already in E.164 — skip
    if (isE164(phone)) {
      skipped++;
      continue;
    }

    const normalized = normalizeIsraeliPhone(phone);

    if (!normalized) {
      console.warn(`⚠️  id=${id}: Cannot normalize "${phone}" — skipping`);
      failed++;
      continue;
    }

    // Check for collision: does another user already have this normalized number?
    const [existing] = await conn.execute(
      "SELECT id FROM users WHERE phone = ? AND id != ?",
      [normalized, id]
    );

    if (existing.length > 0) {
      console.error(
        `💥 COLLISION id=${id}: "${phone}" → "${normalized}" already belongs to id=${existing[0].id} — SKIPPING (manual review needed)`
      );
      collisions++;
      continue;
    }

    // Safe to update
    await conn.execute("UPDATE users SET phone = ? WHERE id = ?", [normalized, id]);
    console.log(`✅ id=${id}: "${phone}" → "${normalized}"`);
    updated++;
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration complete:
  ✅ Updated:    ${updated}
  ⏭️  Skipped:   ${skipped} (already E.164)
  ⚠️  Failed:    ${failed} (could not normalize)
  💥 Collisions: ${collisions} (manual review needed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (collisions > 0) {
    console.error("❌ There are collision records that require manual review before they can be normalized.");
    process.exit(1);
  }

  process.exit(0);
} finally {
  await conn.end();
}

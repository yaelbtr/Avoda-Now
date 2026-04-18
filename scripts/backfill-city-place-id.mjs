/**
 * backfill-city-place-id.mjs
 *
 * One-time script: resolves each unique city name on existing jobs to a Google
 * Maps place_id and writes it back to the `cityPlaceId` column.
 *
 * Strategy
 * ────────
 * 1. Fetch all distinct city values that still have cityPlaceId = NULL.
 * 2. For each unique city name, call the Google Maps Place Autocomplete API
 *    (restricted to Israel, type=cities, language=he) and take the first
 *    prediction's place_id.
 * 3. Batch-update every job that has that city string with the resolved place_id.
 * 4. Log a summary: resolved / skipped / failed counts.
 *
 * Safety
 * ──────
 * - Deduplicates city names before hitting the API → O(distinct cities) calls,
 *   not O(jobs).
 * - Skips cities that look like full addresses (contain digits or are longer
 *   than 40 chars) — those are not valid city names and would return garbage
 *   place_ids.
 * - Dry-run mode: set DRY_RUN=1 to print what would happen without writing.
 * - Rate-limited to 5 API calls/second to stay within Maps quota.
 *
 * Usage
 * ──────
 *   node scripts/backfill-city-place-id.mjs
 *   DRY_RUN=1 node scripts/backfill-city-place-id.mjs
 */

import pg from "pg";

const { Pool } = pg;

// ─── Config ──────────────────────────────────────────────────────────────────

const POSTGRES_URL = process.env.POSTGRES_URL;
const FORGE_API_URL = (process.env.BUILT_IN_FORGE_API_URL ?? "").replace(/\/+$/, "");
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY ?? "";
const DRY_RUN = process.env.DRY_RUN === "1";
const RATE_LIMIT_MS = 200; // 5 req/s

if (!POSTGRES_URL) { console.error("❌  POSTGRES_URL is not set"); process.exit(1); }
if (!FORGE_API_URL || !FORGE_API_KEY) { console.error("❌  BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY not set"); process.exit(1); }

const pool = new Pool({ connectionString: POSTGRES_URL });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sleep for `ms` milliseconds. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns true if the city string looks like a real city name (not a full
 * address or garbage value).
 */
function isCityLike(city) {
  if (!city || city.trim().length === 0) return false;
  if (city.trim().length > 40) return false;          // likely a full address
  if (/\d/.test(city)) return false;                  // contains digits → address
  return true;
}

/**
 * Calls Google Maps Place Autocomplete for a Hebrew city name in Israel.
 * Returns the place_id of the first prediction, or null if none found.
 */
async function resolvePlaceId(cityName) {
  const url = new URL(`${FORGE_API_URL}/v1/maps/proxy/maps/api/place/autocomplete/json`);
  url.searchParams.set("key", FORGE_API_KEY);
  url.searchParams.set("input", cityName);
  url.searchParams.set("components", "country:il");
  url.searchParams.set("types", "(cities)");
  url.searchParams.set("language", "he");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Maps API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();

  if (data.status === "OK" && data.predictions && data.predictions.length > 0) {
    return data.predictions[0].place_id;
  }
  if (data.status === "ZERO_RESULTS") return null;
  throw new Error(`Maps API status: ${data.status} — ${data.error_message ?? ""}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗺  cityPlaceId backfill ${DRY_RUN ? "(DRY RUN — no DB writes)" : ""}`);
  console.log("─".repeat(60));

  // 1. Fetch all distinct city names that still need a placeId
  const { rows: cityRows } = await pool.query(`
    SELECT city, COUNT(*) AS job_count
    FROM jobs
    WHERE city IS NOT NULL
      AND city != ''
      AND "cityPlaceId" IS NULL
    GROUP BY city
    ORDER BY job_count DESC
  `);

  if (cityRows.length === 0) {
    console.log("✅  All jobs already have cityPlaceId set. Nothing to do.");
    await pool.end();
    return;
  }

  console.log(`Found ${cityRows.length} distinct city name(s) across ${cityRows.reduce((s, r) => s + Number(r.job_count), 0)} job(s):\n`);
  cityRows.forEach((r) => console.log(`  • "${r.city}" (${r.job_count} job${r.job_count > 1 ? "s" : ""})`));
  console.log();

  // 2. Resolve each unique city name → place_id
  const resolved = new Map();   // cityName → placeId
  const skipped  = [];          // city names that look like addresses
  const failed   = [];          // city names where API returned nothing

  for (const { city } of cityRows) {
    if (!isCityLike(city)) {
      console.log(`⏭  Skipping "${city}" — looks like an address, not a city name`);
      skipped.push(city);
      continue;
    }

    try {
      await sleep(RATE_LIMIT_MS);
      const placeId = await resolvePlaceId(city);
      if (placeId) {
        console.log(`✅  "${city}" → ${placeId}`);
        resolved.set(city, placeId);
      } else {
        console.log(`⚠️  "${city}" → ZERO_RESULTS (no place_id found)`);
        failed.push(city);
      }
    } catch (err) {
      console.error(`❌  "${city}" → API error: ${err.message}`);
      failed.push(city);
    }
  }

  // 3. Write resolved place_ids back to the DB
  if (resolved.size === 0) {
    console.log("\nNo place_ids resolved — nothing to write.");
  } else if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would update jobs for ${resolved.size} city name(s).`);
  } else {
    console.log(`\nWriting ${resolved.size} place_id(s) to DB...`);
    let totalUpdated = 0;
    for (const [city, placeId] of resolved) {
      const { rowCount } = await pool.query(
        `UPDATE jobs SET "cityPlaceId" = $1 WHERE city = $2 AND "cityPlaceId" IS NULL`,
        [placeId, city]
      );
      console.log(`  ✍  "${city}" → ${placeId} (${rowCount} row${rowCount !== 1 ? "s" : ""} updated)`);
      totalUpdated += rowCount ?? 0;
    }
    console.log(`\n✅  Updated ${totalUpdated} job row(s) in total.`);
  }

  // 4. Summary
  console.log("\n" + "─".repeat(60));
  console.log(`Summary:`);
  console.log(`  Resolved  : ${resolved.size} city name(s)`);
  console.log(`  Skipped   : ${skipped.length} (address-like strings)`);
  console.log(`  Failed    : ${failed.length} (no Maps result)`);
  if (skipped.length) console.log(`  Skipped   : ${skipped.join(", ")}`);
  if (failed.length)  console.log(`  Failed    : ${failed.join(", ")}`);
  console.log("─".repeat(60) + "\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

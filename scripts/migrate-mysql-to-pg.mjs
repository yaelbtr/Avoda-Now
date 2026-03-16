/**
 * MySQL → PostgreSQL data migration script.
 * Reads all rows from MySQL (TiDB) and inserts them into PostgreSQL,
 * preserving IDs and relations.
 *
 * Run with:  node scripts/migrate-mysql-to-pg.mjs
 *
 * Requires both DATABASE_URL (MySQL) and POSTGRES_URL (PostgreSQL).
 */

import mysql from "mysql2/promise";
import pg from "pg";

const { Pool } = pg;

const MYSQL_URL = process.env.DATABASE_URL;
const PG_URL = process.env.POSTGRES_URL;

if (!MYSQL_URL) throw new Error("DATABASE_URL (MySQL) is required");
if (!PG_URL) throw new Error("POSTGRES_URL (PostgreSQL) is required");

function log(msg) { console.log(`[migrate] ${msg}`); }
function logTable(table, count) { console.log(`  ✓ ${table}: ${count} rows`); }

/**
 * Decode a MySQL value for insertion into PostgreSQL.
 *
 * Key rules:
 *  - JS Arrays/Objects: must be JSON.stringify'd so pg sends them as text,
 *    not as PostgreSQL array literals (which cause "invalid input syntax for type json").
 *  - Buffers (TiDB binary protocol): decode to string, then handle as above.
 *  - Dates: pass through as-is (pg handles Date objects fine).
 *  - Primitives: pass through.
 */
function decodeValue(v) {
  if (v === null || v === undefined) return null;

  // Buffer (TiDB binary protocol)
  if (Buffer.isBuffer(v)) {
    if (v.length === 1) return v[0] === 1; // boolean
    const str = v.toString("utf8").replace(/\x00/g, "").trim();
    if (str === "" || str === "null") return null;
    // Try to extract valid JSON from the string
    const jsonStart = str.search(/[\[{]/);
    if (jsonStart >= 0) {
      try { return JSON.stringify(JSON.parse(str.slice(jsonStart))); } catch { /* fall through */ }
    }
    return null;
  }

  // Arrays and plain objects → must be JSON strings for pg jsonb columns
  if (Array.isArray(v) || (typeof v === "object" && !(v instanceof Date))) {
    return JSON.stringify(v);
  }

  // Plain JSON strings (already serialised in MySQL)
  if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
    // Validate it's real JSON; if so, pass as-is (pg will parse the text)
    try { JSON.parse(v); return v; } catch { return v; }
  }

  return v;
}

async function pgInsertRows(pgClient, table, rows, columns) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (const row of rows) {
    const vals = columns.map((c) => decodeValue(row[c]));
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const colList = columns.map((c) => `"${c}"`).join(", ");
    try {
      await pgClient.query(
        `INSERT INTO "${table}" (${colList}) OVERRIDING SYSTEM VALUE VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        vals
      );
      inserted++;
    } catch (err) {
      console.warn(`  ⚠ Skipped row in ${table} (id=${row.id ?? "?"}): ${err.message}`);
    }
  }
  return inserted;
}

async function resetSequences(pgClient, tables) {
  for (const t of tables) {
    try {
      await pgClient.query(
        `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`
      );
    } catch { /* tables with text PK like system_settings — skip */ }
  }
}

async function main() {
  log("Connecting to MySQL...");
  const mysqlConn = await mysql.createConnection(MYSQL_URL);

  log("Connecting to PostgreSQL...");
  const pgPool = new Pool({
    connectionString: PG_URL,
    ssl: PG_URL.includes("neon.tech") || PG_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false } : false,
  });
  const pgClient = await pgPool.connect();

  try {
    // Insert in correct parent → child order to satisfy FK constraints

    // Order matters: parent tables before child tables (FK constraints)

    const [prefixes] = await mysqlConn.query("SELECT * FROM phone_prefixes");
    logTable("phone_prefixes", await pgInsertRows(pgClient, "phone_prefixes", prefixes,
      ["id", "prefix", "description", "is_active"]));

    const [cities] = await mysqlConn.query("SELECT * FROM cities");
    logTable("cities", await pgInsertRows(pgClient, "cities", cities,
      ["id", "city_code", "name_he", "name_en", "district", "latitude", "longitude", "is_active"]));

    const [categories] = await mysqlConn.query("SELECT * FROM categories");
    logTable("categories", await pgInsertRows(pgClient, "categories", categories,
      ["id", "slug", "name", "icon", "groupName", "imageUrl", "isActive", "sortOrder", "createdAt", "updatedAt"]));

    const [regions] = await mysqlConn.query("SELECT * FROM regions");
    logTable("regions", await pgInsertRows(pgClient, "regions", regions,
      ["id", "slug", "name", "centerCity", "centerLat", "centerLng",
       "activationRadiusKm", "radiusMinutes", "minWorkersRequired",
       "currentWorkers", "status", "description", "imageUrl", "createdAt", "updatedAt"]));

    const [users] = await mysqlConn.query("SELECT * FROM users");
    logTable("users", await pgInsertRows(pgClient, "users", users,
      ["id", "openId", "phone", "phonePrefix", "phoneNumber", "name", "email",
       "loginMethod", "status", "role", "userMode", "workerTags", "preferredCategories",
       "preferredCity", "preferredCities", "locationMode", "workerLatitude", "workerLongitude",
       "searchRadiusKm", "preferenceText", "preferredDays", "preferredTimeSlots", "workerBio",
       "profilePhoto", "expectedHourlyRate", "availabilityStatus", "workerRating",
       "completedJobsCount", "signupCompleted", "regionId", "notificationPrefs",
       "createdAt", "updatedAt", "lastSignedIn", "referredBy", "termsAcceptedAt"]));

    const [jobs] = await mysqlConn.query("SELECT * FROM jobs");
    logTable("jobs", await pgInsertRows(pgClient, "jobs", jobs,
      ["id", "title", "description", "category", "address", "city", "latitude", "longitude",
       "salary", "salaryType", "contactPhone", "contactName", "businessName", "workingHours",
       "startTime", "startDateTime", "isUrgent", "isLocalBusiness", "reminderSentAt",
       "closedReason", "workersNeeded", "postedBy", "activeDuration", "expiresAt", "status",
       "reportCount", "jobTags", "jobLocationMode", "jobSearchRadiusKm", "hourlyRate",
       "estimatedHours", "showPhone", "jobDate", "workStartTime", "workEndTime",
       "imageUrls", "createdAt", "updatedAt"]));

    const [applications] = await mysqlConn.query("SELECT * FROM applications");
    logTable("applications", await pgInsertRows(pgClient, "applications", applications,
      ["id", "jobId", "workerId", "status", "message", "contactRevealed", "revealedAt",
       "createdAt", "updatedAt"]));

    const [reports] = await mysqlConn.query("SELECT * FROM job_reports");
    logTable("job_reports", await pgInsertRows(pgClient, "job_reports", reports,
      ["id", "jobId", "reporterPhone", "reporterIp", "reason", "createdAt"]));

    const [availability] = await mysqlConn.query("SELECT * FROM worker_availability");
    logTable("worker_availability", await pgInsertRows(pgClient, "worker_availability", availability,
      ["id", "userId", "latitude", "longitude", "city", "note", "availableUntil",
       "reminderSentAt", "createdAt", "updatedAt"]));

    const [batches] = await mysqlConn.query("SELECT * FROM notification_batches");
    logTable("notification_batches", await pgInsertRows(pgClient, "notification_batches", batches,
      ["id", "jobId", "employerPhone", "pendingCount", "scheduledAt", "sentAt",
       "status", "createdAt", "updatedAt"]));

    const [pushSubs] = await mysqlConn.query("SELECT * FROM push_subscriptions");
    logTable("push_subscriptions", await pgInsertRows(pgClient, "push_subscriptions", pushSubs,
      ["id", "userId", "endpoint", "p256dh", "auth", "createdAt"]));

    const [savedJobs] = await mysqlConn.query("SELECT * FROM saved_jobs");
    logTable("saved_jobs", await pgInsertRows(pgClient, "saved_jobs", savedJobs,
      ["id", "userId", "jobId", "savedAt"]));

    const [ratings] = await mysqlConn.query("SELECT * FROM worker_ratings");
    logTable("worker_ratings", await pgInsertRows(pgClient, "worker_ratings", ratings,
      ["id", "workerId", "employerId", "applicationId", "rating", "comment", "createdAt"]));

    const [phoneLogs] = await mysqlConn.query("SELECT * FROM phone_change_logs");
    logTable("phone_change_logs", await pgInsertRows(pgClient, "phone_change_logs", phoneLogs,
      ["id", "userId", "oldPhone", "newPhone", "ipAddress", "result", "createdAt"]));

    const [otpLimits] = await mysqlConn.query("SELECT * FROM otp_rate_limit");
    logTable("otp_rate_limit", await pgInsertRows(pgClient, "otp_rate_limit", otpLimits,
      ["id", "phone", "ip", "sendCount", "verifyAttempts", "windowStart", "updatedAt"]));

    const [workerRegions] = await mysqlConn.query("SELECT * FROM worker_regions");
    logTable("worker_regions", await pgInsertRows(pgClient, "worker_regions", workerRegions,
      ["worker_id", "region_id", "distance_km", "match_type", "created_at"]));

    const [regionNotifs] = await mysqlConn.query("SELECT * FROM region_notification_requests");
    logTable("region_notification_requests", await pgInsertRows(pgClient, "region_notification_requests", regionNotifs,
      ["id", "user_id", "region_id", "type", "created_at"]));

    const [settings] = await mysqlConn.query("SELECT * FROM system_settings");
    logTable("system_settings", await pgInsertRows(pgClient, "system_settings", settings,
      ["key", "value", "updated_at"]));

    const [consents] = await mysqlConn.query("SELECT * FROM user_consents");
    logTable("user_consents", await pgInsertRows(pgClient, "user_consents", consents,
      ["id", "user_id", "consent_type", "document_version", "ip_address", "user_agent", "created_at"]));

    log("All rows inserted.");

    // Reset serial sequences so new inserts get correct IDs
    log("Resetting sequences...");
    await resetSequences(pgClient, [
      "users", "jobs", "applications", "job_reports", "worker_availability",
      "notification_batches", "push_subscriptions", "cities", "phone_prefixes",
      "phone_change_logs", "saved_jobs", "worker_ratings", "categories", "regions",
      "region_notification_requests", "user_consents", "otp_rate_limit",
    ]);

    log("✅ Migration complete!");
  } finally {
    pgClient.release();
    await pgPool.end();
    await mysqlConn.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

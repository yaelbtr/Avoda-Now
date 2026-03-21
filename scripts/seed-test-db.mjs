/**
 * seed-test-db.mjs
 *
 * Seeds the isolated test database with deterministic synthetic data.
 * NO real user data, phone numbers, emails, or production records are used.
 *
 * All synthetic emails use the `.invalid` TLD (RFC 2606) — they can never
 * be delivered to real inboxes.
 *
 * Run:
 *   node scripts/seed-test-db.mjs
 *   pnpm db:seed:test
 *
 * Environment:
 *   TEST_DATABASE_URL — defaults to local jobnow_test DB
 */

import pg from "pg";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://test_user:test_password@localhost:5432/jobnow_test";

const pool = new pg.Pool({ connectionString: TEST_DB_URL });

// ─── Seed Data ───────────────────────────────────────────────────────────────

const TEST_CATEGORIES = [
  { slug: "delivery", nameHe: "משלוחים", nameEn: "Delivery", icon: "🚚", isActive: true, sortOrder: 1 },
  { slug: "kitchen",  nameHe: "מטבח",    nameEn: "Kitchen",  icon: "🍳", isActive: true, sortOrder: 2 },
  { slug: "cleaning", nameHe: "ניקיון",  nameEn: "Cleaning", icon: "🧹", isActive: true, sortOrder: 3 },
  { slug: "warehouse",nameHe: "מחסן",    nameEn: "Warehouse",icon: "📦", isActive: true, sortOrder: 4 },
];

const TEST_CITIES = [
  { name: "תל אביב",  lat: 32.0853, lng: 34.7818, region: "מרכז"      },
  { name: "ירושלים",  lat: 31.7683, lng: 35.2137, region: "ירושלים"   },
  { name: "חיפה",     lat: 32.7940, lng: 34.9896, region: "צפון"      },
];

const TEST_PHONE_PREFIXES = [
  { prefix: "050", carrier: "פלאפון" },
  { prefix: "052", carrier: "סלקום"  },
  { prefix: "054", carrier: "פרטנר"  },
];

const TEST_SYSTEM_SETTINGS = [
  { key: "employer_area_locked",          value: "false" },
  { key: "maintenance_mode",              value: "false" },
  { key: "max_active_jobs_per_employer",  value: "5"     },
];

// Synthetic test users — all emails use `.invalid` TLD (RFC 2606)
const TEST_USERS = [
  {
    openId:          "test-worker-001",
    name:            "ישראל ישראלי (TEST)",
    email:           "test.worker.001@test.invalid",
    phone:           "+972501234001",
    phonePrefix:     "050",
    phoneNumber:     "1234001",
    loginMethod:     "phone_otp",
    role:            "user",
    signupCompleted: true,
    termsAcceptedAt: new Date("2024-01-01"),
  },
  {
    openId:          "test-worker-002",
    name:            "שרה כהן (TEST)",
    email:           "test.worker.002@test.invalid",
    phone:           "+972521234002",
    phonePrefix:     "052",
    phoneNumber:     "1234002",
    loginMethod:     "phone_otp",
    role:            "user",
    signupCompleted: true,
    termsAcceptedAt: new Date("2024-01-02"),
  },
  {
    openId:          "test-employer-001",
    name:            "מעסיק בדיקה (TEST)",
    email:           "test.employer.001@test.invalid",
    phone:           "+972541234003",
    phonePrefix:     "054",
    phoneNumber:     "1234003",
    loginMethod:     "phone_otp",
    role:            "user",
    signupCompleted: true,
    termsAcceptedAt: new Date("2024-01-03"),
  },
  {
    openId:          "test-admin-001",
    name:            "מנהל בדיקה (TEST)",
    email:           "test.admin.001@test.invalid",
    phone:           "+972501234004",
    phonePrefix:     "050",
    phoneNumber:     "1234004",
    loginMethod:     "phone_otp",
    role:            "admin",
    signupCompleted: true,
    termsAcceptedAt: new Date("2024-01-04"),
  },
  {
    openId:          "test-email-user-001",
    name:            "משתמש מייל (TEST)",
    email:           "test.email.001@test.invalid",
    phone:           null,
    phonePrefix:     null,
    phoneNumber:     null,
    loginMethod:     "email_otp",
    role:            "user",
    signupCompleted: false,
    termsAcceptedAt: new Date("2024-01-05"),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    const safeUrl = TEST_DB_URL.replace(/:([^:@]+)@/, ":***@");
    console.log("🌱 Seeding test database...");
    console.log(`   DB: ${safeUrl}`);

    await client.query("BEGIN");

    // ── Truncate all tables (FK-safe order) ──────────────────────────────────
    console.log("   Truncating existing test data...");
    await client.query(`
      TRUNCATE TABLE
        applications, saved_jobs, worker_ratings, worker_regions,
        region_notification_requests, worker_availability,
        notification_batches, push_subscriptions, job_reports,
        jobs, user_consents, legal_acknowledgements, birthdate_changes,
        phone_change_logs, email_verifications, email_unsubscribes,
        otp_rate_limit, system_logs, users,
        system_settings, categories, cities, phone_prefixes,
        regions
      RESTART IDENTITY CASCADE
    `);

      // ── Categories ────────────────────────────────────────────────────────
    console.log("   Seeding categories...");
    for (const cat of TEST_CATEGORIES) {
      await client.query(
        `INSERT INTO categories (slug, name, icon, "isActive", "sortOrder")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.slug, cat.nameHe, cat.icon, cat.isActive, cat.sortOrder]
      );
    }

     // ── Cities ────────────────────────────────────────────────────────
    console.log("   Seeding cities...");
    for (const city of TEST_CITIES) {
      await client.query(
        `INSERT INTO cities (name_he, latitude, longitude)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [city.name, city.lat, city.lng]
      );
    }
    // ── Phone prefixes ────────────────────────────────────────────────────────
    console.log("   Seeding phone prefixes...");
    for (const pp of TEST_PHONE_PREFIXES) {
      await client.query(
        `INSERT INTO phone_prefixes (prefix, description)
         VALUES ($1, $2)
         ON CONFLICT (prefix) DO NOTHING`,
        [pp.prefix, pp.carrier]
      );
    }
    // ── System settings ────────────────────────────────────────────────────────
    console.log("   Seeding system settings...");
    for (const s of TEST_SYSTEM_SETTINGS) {
      await client.query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [s.key, s.value]
      );
    }

    // ── Users ────────────────────────────────────────────────────────────────
    console.log("   Seeding test users...");
    const userIds = {};
    for (const user of TEST_USERS) {
      const result = await client.query(
        `INSERT INTO users (
          "openId", name, email, phone, "phonePrefix", "phoneNumber",
          "loginMethod", role, "signupCompleted", "termsAcceptedAt",
          "createdAt", "lastSignedIn"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id`,
        [
          user.openId, user.name, user.email, user.phone,
          user.phonePrefix, user.phoneNumber, user.loginMethod,
          user.role, user.signupCompleted, user.termsAcceptedAt,
        ]
      );
      userIds[user.openId] = result.rows[0].id;
    }

    // ── Jobs (posted by test employer) ───────────────────────────────────────
    console.log("   Seeding test jobs...");
    const employerId = userIds["test-employer-001"];
    const testJobs = [
      {
        title: "שליח/ה לתל אביב (TEST)",
        description: "משרת בדיקה — אין להגיש מועמדות אמיתית",
        category: "delivery",
        city: "תל אביב",
        address: "תל אביב (TEST)",
        latitude: 32.0853,
        longitude: 34.7818,
        salary: 45,
        salaryType: "hourly",
        contactPhone: "+972501234003",
        contactName: "מעסיק בדיקה",
        startTime: "today",
        status: "active",
      },
      {
        title: "עובד/ת מטבח (TEST)",
        description: "משרת בדיקה — אין להגיש מועמדות אמיתית",
        category: "kitchen",
        city: "ירושלים",
        address: "ירושלים (TEST)",
        latitude: 31.7683,
        longitude: 35.2137,
        salary: 350,
        salaryType: "daily",
        contactPhone: "+972501234003",
        contactName: "מעסיק בדיקה",
        startTime: "tomorrow",
        status: "active",
      },
      {
        title: "עובד/ת ניקיון (TEST — סגור)",
        description: "משרת בדיקה סגורה",
        category: "cleaning",
        city: "חיפה",
        address: "חיפה (TEST)",
        latitude: 32.7940,
        longitude: 34.9896,
        salary: 40,
        salaryType: "hourly",
        contactPhone: "+972501234003",
        contactName: "מעסיק בדיקה",
        startTime: "flexible",
        status: "closed",
      },
    ];

    const jobIds = [];
    for (const job of testJobs) {
      const result = await client.query(
        `INSERT INTO jobs (
          title, description, category, city, address,
          latitude, longitude, salary, "salaryType",
          "contactPhone", "contactName", "startTime",
          status, "postedBy", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING id`,
        [
          job.title, job.description, job.category, job.city, job.address,
          job.latitude, job.longitude, job.salary, job.salaryType,
          job.contactPhone, job.contactName, job.startTime,
          job.status, employerId,
        ]
      );
      jobIds.push(result.rows[0].id);
    }

    // ── Applications ─────────────────────────────────────────────────────────
    console.log("   Seeding test applications...");
    const worker1Id = userIds["test-worker-001"];
    if (jobIds[0]) {
      await client.query(
        `INSERT INTO applications ("jobId", "workerId", status, "createdAt", "updatedAt")
         VALUES ($1, $2, 'pending', NOW(), NOW())`,
        [jobIds[0], worker1Id]
      );
    }

    await client.query("COMMIT");

    console.log("");
    console.log("✅ Test database seeded successfully!");
    console.log(`   Users:      ${TEST_USERS.length}`);
    console.log(`   Jobs:       ${testJobs.length}`);
    console.log(`   Categories: ${TEST_CATEGORIES.length}`);
    console.log(`   Cities:     ${TEST_CITIES.length}`);
    console.log("");
    console.log("Test user openIds:");
    console.log("  Worker 1:   test-worker-001");
    console.log("  Worker 2:   test-worker-002");
    console.log("  Employer:   test-employer-001");
    console.log("  Admin:      test-admin-001");
    console.log("  Email user: test-email-user-001");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

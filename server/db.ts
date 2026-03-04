import { and, count, desc, eq, gte, lte, or, sql, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertJob,
  InsertJobReport,
  InsertUser,
  Job,
  jobReports,
  jobs,
  otpRateLimit,
  users,
  workerAvailability,
  InsertWorkerAvailability,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}

export async function createUserByPhone(phone: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `phone_${phone}_${Date.now()}`;
  await db.insert(users).values({
    openId,
    phone,
    name: name ?? null,
    loginMethod: "phone_otp",
    lastSignedIn: new Date(),
  });
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function setUserMode(id: number, mode: "worker" | "employer") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ userMode: mode }).where(eq(users.id, id));
}

export async function getUserMode(id: number): Promise<"worker" | "employer" | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ userMode: users.userMode }).from(users).where(eq(users.id, id)).limit(1);
  return result[0]?.userMode ?? null;
}

export async function clearUserMode(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ userMode: null }).where(eq(users.id, id));
}

export async function getWorkerProfile(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      preferredCategories: users.preferredCategories,
      preferredCity: users.preferredCity,
      workerBio: users.workerBio,
      workerTags: users.workerTags,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateWorkerProfile(
  id: number,
  data: { preferredCategories?: string[]; preferredCity?: string | null; workerBio?: string | null; name?: string | null }
) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.preferredCategories !== undefined) updateSet.preferredCategories = data.preferredCategories;
  if (data.preferredCity !== undefined) updateSet.preferredCity = data.preferredCity;
  if (data.workerBio !== undefined) updateSet.workerBio = data.workerBio;
  if (data.name !== undefined) updateSet.name = data.name;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, id));
}

// ─── OTP Rate Limiting ────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SEND_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 3;

/** Returns the current rate-limit record for a phone, or null if window expired */
async function getRateLimitRecord(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(otpRateLimit)
    .where(eq(otpRateLimit.phone, phone))
    .limit(1);
  const record = result[0];
  if (!record) return null;
  // If window has expired, delete and return null
  if (Date.now() - record.windowStart.getTime() > RATE_WINDOW_MS) {
    await db.delete(otpRateLimit).where(eq(otpRateLimit.phone, phone));
    return null;
  }
  return record;
}

/** Check and increment OTP send rate limit. Returns true if allowed. */
export async function checkAndIncrementSendRate(phone: string, ip?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // fail open if DB unavailable
  const record = await getRateLimitRecord(phone);
  if (!record) {
    await db.insert(otpRateLimit).values({ phone, ip: ip ?? null, sendCount: 1, verifyAttempts: 0, windowStart: new Date() });
    return true;
  }
  if (record.sendCount >= MAX_SEND_PER_HOUR) return false;
  await db.update(otpRateLimit).set({ sendCount: record.sendCount + 1 }).where(eq(otpRateLimit.phone, phone));
  return true;
}

/** Check and increment verify attempt count. Returns true if allowed. */
export async function checkAndIncrementVerifyAttempts(phone: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const record = await getRateLimitRecord(phone);
  if (!record) return true; // no record = first attempt, allowed
  if (record.verifyAttempts >= MAX_VERIFY_ATTEMPTS) return false;
  await db.update(otpRateLimit).set({ verifyAttempts: record.verifyAttempts + 1 }).where(eq(otpRateLimit.phone, phone));
  return true;
}

/** Reset verify attempts after successful verification */
export async function resetRateLimit(phone: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(otpRateLimit).where(eq(otpRateLimit.phone, phone));
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

/** Expire jobs whose expiresAt has passed */
export async function expireOldJobs() {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  // Expire jobs past their expiresAt
  await db
    .update(jobs)
    .set({ status: "expired", closedReason: "expired" })
    .where(and(eq(jobs.status, "active"), lte(jobs.expiresAt, now)));
  // Auto-hide jobs with no reminder response: created > 9h ago, no reminderSentAt update within 3h
  const nineHoursAgo = new Date(now.getTime() - 9 * 60 * 60 * 1000);
  await db
    .update(jobs)
    .set({ status: "expired", closedReason: "expired" })
    .where(
      and(
        eq(jobs.status, "active"),
        lte(jobs.createdAt, nineHoursAgo),
        sql`${jobs.reminderSentAt} IS NOT NULL`
      )
    );
}

/** Count active jobs for a user (for spam limit) */
export async function countActiveJobsByUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ cnt: count() })
    .from(jobs)
    .where(and(eq(jobs.postedBy, userId), eq(jobs.status, "active")));
  return result[0]?.cnt ?? 0;
}

export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobs).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId ?? 0;
  const created = await db.select().from(jobs).where(eq(jobs.id, insertId)).limit(1);
  return created[0];
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0];
}

export async function getActiveJobs(limit = 50, category?: string) {
  const db = await getDb();
  if (!db) return [];
  await expireOldJobs();
  const conditions = [or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!];
  if (category && category !== "all") {
    conditions.push(eq(jobs.category, category as Job["category"]));
  }
  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

export async function getJobsNearLocation(
  lat: number,
  lng: number,
  radiusKm: number,
  category?: string,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];
  await expireOldJobs();

  const distanceExpr = sql<number>`
    (6371 * acos(
      cos(radians(${lat})) * cos(radians(CAST(${jobs.latitude} AS DECIMAL(10,7))))
      * cos(radians(CAST(${jobs.longitude} AS DECIMAL(10,7))) - radians(${lng}))
      + sin(radians(${lat})) * sin(radians(CAST(${jobs.latitude} AS DECIMAL(10,7))))
    ))
  `;

  const conditions = [
    or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!,
    sql`${distanceExpr} <= ${radiusKm}`,
  ];
  if (category && category !== "all") {
    conditions.push(eq(jobs.category, category as Job["category"]));
  }

  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      category: jobs.category,
      address: jobs.address,
      city: jobs.city,
      latitude: jobs.latitude,
      longitude: jobs.longitude,
      salary: jobs.salary,
      salaryType: jobs.salaryType,
      contactPhone: jobs.contactPhone,
      contactName: jobs.contactName,
      businessName: jobs.businessName,
      workingHours: jobs.workingHours,
      startTime: jobs.startTime,
      workersNeeded: jobs.workersNeeded,
      activeDuration: jobs.activeDuration,
      expiresAt: jobs.expiresAt,
      postedBy: jobs.postedBy,
      status: jobs.status,
      reportCount: jobs.reportCount,
      jobTags: jobs.jobTags,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      distance: distanceExpr,
    })
    .from(jobs)
    .where(and(...conditions))
    .orderBy(distanceExpr, desc(jobs.createdAt))
    .limit(limit);
}

export async function getMyJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.postedBy, userId)).orderBy(desc(jobs.createdAt));
}

export async function updateJobStatus(id: number, userId: number, status: Job["status"]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set({ status }).where(and(eq(jobs.id, id), eq(jobs.postedBy, userId)));
}

export async function deleteJob(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.postedBy, userId)));
}

export async function updateJob(id: number, userId: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set(data).where(and(eq(jobs.id, id), eq(jobs.postedBy, userId)));
}

/** Get urgent jobs (isUrgent=true), sorted by createdAt desc */
export async function getUrgentJobs(limit = 20, category?: string) {
  const db = await getDb();
  if (!db) return [];
  await expireOldJobs();
  const conditions = [
    or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!,
    eq(jobs.isUrgent, true),
  ];
  if (category && category !== "all") {
    conditions.push(eq(jobs.category, category as Job["category"]));
  }
  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

/** Mark a job as filled by the owner */
export async function markJobFilled(jobId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(jobs)
    .set({ status: "closed", closedReason: "found_worker" })
    .where(and(eq(jobs.id, jobId), eq(jobs.postedBy, userId)));
}

/** Send reminder for a job (mark reminderSentAt) */
export async function markReminderSent(jobId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set({ reminderSentAt: new Date() }).where(eq(jobs.id, jobId));
}

/** Get active jobs that need a reminder (created 6+ hours ago, no reminder sent yet) */
export async function getJobsNeedingReminder() {
  const db = await getDb();
  if (!db) return [];
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "active"),
        lte(jobs.createdAt, sixHoursAgo),
        sql`${jobs.reminderSentAt} IS NULL`
      )
    )
    .limit(100);
}

// ─── Worker Availability ──────────────────────────────────────────────────────

/** Set or update a worker's availability (upsert by userId) */
export async function setWorkerAvailable(data: InsertWorkerAvailability) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete old record for this user first
  await db.delete(workerAvailability).where(eq(workerAvailability.userId, data.userId));
  await db.insert(workerAvailability).values(data);
}

/** Remove a worker's availability */
export async function setWorkerUnavailable(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(workerAvailability).where(eq(workerAvailability.userId, userId));
}

/** Get current availability record for a user */
export async function getWorkerAvailability(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const result = await db
    .select()
    .from(workerAvailability)
    .where(and(eq(workerAvailability.userId, userId), gte(workerAvailability.availableUntil, now)))
    .limit(1);
  return result[0] ?? null;
}

/** Get available workers near a location, sorted by distance */
export async function getNearbyWorkers(lat: number, lng: number, radiusKm = 20, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();

  const distanceExpr = sql<number>`
    (6371 * acos(
      cos(radians(${lat})) * cos(radians(CAST(${workerAvailability.latitude} AS DECIMAL(10,7))))
      * cos(radians(CAST(${workerAvailability.longitude} AS DECIMAL(10,7))) - radians(${lng}))
      + sin(radians(${lat})) * sin(radians(CAST(${workerAvailability.latitude} AS DECIMAL(10,7))))
    ))
  `;

  return db
    .select({
      id: workerAvailability.id,
      userId: workerAvailability.userId,
      latitude: workerAvailability.latitude,
      longitude: workerAvailability.longitude,
      city: workerAvailability.city,
      note: workerAvailability.note,
      availableUntil: workerAvailability.availableUntil,
      createdAt: workerAvailability.createdAt,
      userName: users.name,
      userPhone: users.phone,
      distance: distanceExpr,
    })
    .from(workerAvailability)
    .innerJoin(users, eq(workerAvailability.userId, users.id))
    .where(
      and(
        gte(workerAvailability.availableUntil, now),
        sql`${distanceExpr} <= ${radiusKm}`
      )
    )
    .orderBy(distanceExpr)
    .limit(limit);
}

/** Get jobs whose startDateTime is within the next 24 hours (or startTime='today') */
export async function getTodayJobs(limit = 50, category?: string) {
  const db = await getDb();
  if (!db) return [];
  await expireOldJobs();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const conditions = [
    or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!,
    or(
      // Exact timestamp within next 24 hours
      and(gte(jobs.startDateTime, now), lte(jobs.startDateTime, in24h))!,
      // Legacy enum value "today"
      eq(jobs.startTime, "today"),
    )!,
  ];
  if (category && category !== "all") {
    conditions.push(eq(jobs.category, category as Job["category"]));
  }
  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(jobs.startDateTime, desc(jobs.createdAt))
    .limit(limit);
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function reportJob(data: InsertJobReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(jobReports).values(data);
  await db.update(jobs).set({ reportCount: sql`${jobs.reportCount} + 1` }).where(eq(jobs.id, data.jobId));
  const updated = await db.select({ reportCount: jobs.reportCount }).from(jobs).where(eq(jobs.id, data.jobId)).limit(1);
  if ((updated[0]?.reportCount ?? 0) >= 3) {
    await db.update(jobs).set({ status: "under_review" }).where(eq(jobs.id, data.jobId));
  }
}

// ─── Live Stats & Activity Feed ──────────────────────────────────────────────

/**
 * Returns real-time platform statistics:
 * - availableWorkers: workers with active availability right now
 * - newJobsLastHour: jobs posted in the last 60 minutes
 * - urgentJobsNow: currently active urgent jobs
 */
export async function getLiveStats() {
  const db = await getDb();
  if (!db) return { availableWorkers: 0, newJobsLastHour: 0, urgentJobsNow: 0 };

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [workerRows, newJobRows, urgentRows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workerAvailability)
      .where(gte(workerAvailability.availableUntil, now)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(jobs)
      .where(
        and(
          or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!,
          gte(jobs.createdAt, oneHourAgo)
        )!
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "active"),
          eq(jobs.isUrgent, true)
        )!
      ),
  ]);

  return {
    availableWorkers: Number(workerRows[0]?.count ?? 0),
    newJobsLastHour: Number(newJobRows[0]?.count ?? 0),
    urgentJobsNow: Number(urgentRows[0]?.count ?? 0),
  };
}

/**
 * Returns a feed of recent activity for the ticker:
 * - Recent job posts (last 2 hours)
 * - Recently available workers (last 1 hour)
 * Returns up to `limit` items sorted by recency.
 */
export async function getActivityFeed(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [recentJobs, recentWorkers] = await Promise.all([
    db
      .select({
        id: jobs.id,
        title: jobs.title,
        city: jobs.city,
        salary: jobs.salary,
        salaryType: jobs.salaryType,
        isUrgent: jobs.isUrgent,
        category: jobs.category,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(
        and(
          or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!,
          gte(jobs.createdAt, twoHoursAgo)
        )!
      )
      .orderBy(desc(jobs.createdAt))
      .limit(limit),
    db
      .select({
        id: workerAvailability.id,
        city: workerAvailability.city,
        note: workerAvailability.note,
        createdAt: workerAvailability.createdAt,
      })
      .from(workerAvailability)
      .where(
        and(
          gte(workerAvailability.availableUntil, now),
          gte(workerAvailability.createdAt, oneHourAgo)
        )!
      )
      .orderBy(desc(workerAvailability.createdAt))
      .limit(10),
  ]);

  type FeedItem =
    | { type: "job"; id: number; title: string; city: string | null; salary: string | null; salaryType: string; isUrgent: boolean | null; category: string; createdAt: Date }
    | { type: "worker"; id: number; city: string | null; note: string | null; createdAt: Date };

  const feed: FeedItem[] = [
    ...recentJobs.map((j) => ({ type: "job" as const, ...j })),
    ...recentWorkers.map((w) => ({ type: "worker" as const, ...w })),
  ];

  // Sort by recency
  feed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return feed.slice(0, limit);
}

// ─── Worker Notifications ─────────────────────────────────────────────────────

/**
 * Find workers who have set a preferredCategory matching the given job category,
 * and optionally a preferredCity matching the job city.
 * Returns up to `limit` workers that have a phone number (required for SMS).
 *
 * Matching rules:
 *  - Category: worker's preferredCategories JSON array contains the job category
 *  - City: worker's preferredCity equals the job city (case-insensitive), OR job city is null
 *  - Worker must have a phone number to receive the SMS
 *  - Excludes the job poster themselves
 */
export async function getWorkersMatchingJob(
  jobCategory: string,
  jobCity: string | null | undefined,
  excludeUserId: number,
  limit = 100
): Promise<Array<{ id: number; phone: string; name: string | null; preferredCity: string | null }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      preferredCity: users.preferredCity,
      preferredCategories: users.preferredCategories,
    })
    .from(users)
    .where(
      and(
        eq(users.userMode, "worker"),
        eq(users.status, "active"),
        sql`${users.phone} IS NOT NULL`,
        sql`${users.preferredCategories} IS NOT NULL`,
        sql`${users.id} != ${excludeUserId}`
      )
    )
    .limit(500); // fetch a wider set, then filter in JS for JSON array matching

  // Filter by category match (JSON array contains jobCategory)
  const categoryMatches = rows.filter((r) => {
    const cats = r.preferredCategories as string[] | null;
    return Array.isArray(cats) && cats.includes(jobCategory);
  });

  // Filter by city match if job has a city
  const cityMatches = jobCity
    ? categoryMatches.filter(
        (r) =>
          !r.preferredCity ||
          r.preferredCity.trim().toLowerCase() === jobCity.trim().toLowerCase()
      )
    : categoryMatches;

  return cityMatches
    .filter((r) => !!r.phone)
    .slice(0, limit)
    .map((r) => ({ id: r.id, phone: r.phone!, name: r.name, preferredCity: r.preferredCity }));
}

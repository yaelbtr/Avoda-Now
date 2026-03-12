import { and, count, desc, eq, gte, inArray, isNull, like, lte, ne, or, sql, asc } from "drizzle-orm";
import { alias as aliasedTable } from "drizzle-orm/mysql-core";
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
  applications,
  notificationBatches,
  pushSubscriptions,
  InsertPushSubscription,
  cities,
  savedJobs,
  phonePrefixes,
  phoneChangeLogs,
  workerRatings,
  categories,
  Category,
  regions,
  Region,
  InsertRegion,
  workerRegions,
  WorkerRegion,
  regionNotificationRequests,
  RegionNotificationRequest,
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
      locationMode: users.locationMode,
      workerLatitude: users.workerLatitude,
      workerLongitude: users.workerLongitude,
      searchRadiusKm: users.searchRadiusKm,
      preferenceText: users.preferenceText,
      preferredDays: users.preferredDays,
      preferredTimeSlots: users.preferredTimeSlots,
      preferredCities: users.preferredCities,
      signupCompleted: users.signupCompleted,
      profilePhoto: users.profilePhoto,
      phonePrefix: users.phonePrefix,
      phoneNumber: users.phoneNumber,
      workerRating: users.workerRating,
      completedJobsCount: users.completedJobsCount,
      availabilityStatus: users.availabilityStatus,
      expectedHourlyRate: users.expectedHourlyRate,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateWorkerProfile(
  id: number,
  data: {
    preferredCategories?: string[];
    preferredCity?: string | null;
    workerBio?: string | null;
    name?: string | null;
    phone?: string | null;
    locationMode?: "city" | "radius";
    workerLatitude?: string | null;
    workerLongitude?: string | null;
    searchRadiusKm?: number | null;
    preferenceText?: string | null;
    workerTags?: string[];
    preferredDays?: string[];
    preferredTimeSlots?: string[];
    preferredCities?: number[];
    expectedHourlyRate?: number | null;
    availabilityStatus?: "available_now" | "available_today" | "available_hours" | "not_available" | null;
    signupCompleted?: boolean;
    profilePhoto?: string | null;
    email?: string | null;
  }
) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.preferredCategories !== undefined) updateSet.preferredCategories = data.preferredCategories;
  if (data.preferredCity !== undefined) updateSet.preferredCity = data.preferredCity;
  if (data.workerBio !== undefined) updateSet.workerBio = data.workerBio;
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.phone !== undefined) updateSet.phone = data.phone;
  if ((data as any).phonePrefix !== undefined) updateSet.phonePrefix = (data as any).phonePrefix;
  if ((data as any).phoneNumber !== undefined) updateSet.phoneNumber = (data as any).phoneNumber;
  if (data.locationMode !== undefined) updateSet.locationMode = data.locationMode;
  if (data.workerLatitude !== undefined) updateSet.workerLatitude = data.workerLatitude;
  if (data.workerLongitude !== undefined) updateSet.workerLongitude = data.workerLongitude;
  if (data.searchRadiusKm !== undefined) updateSet.searchRadiusKm = data.searchRadiusKm;
  if (data.preferenceText !== undefined) updateSet.preferenceText = data.preferenceText;
  if (data.workerTags !== undefined) updateSet.workerTags = data.workerTags;
  if (data.preferredDays !== undefined) updateSet.preferredDays = data.preferredDays;
  if (data.preferredTimeSlots !== undefined) updateSet.preferredTimeSlots = data.preferredTimeSlots;
  if (data.preferredCities !== undefined) updateSet.preferredCities = data.preferredCities;
  if (data.expectedHourlyRate !== undefined) updateSet.expectedHourlyRate = data.expectedHourlyRate;
  if (data.availabilityStatus !== undefined) updateSet.availabilityStatus = data.availabilityStatus;
  if (data.signupCompleted !== undefined) updateSet.signupCompleted = data.signupCompleted;
  if (data.profilePhoto !== undefined) updateSet.profilePhoto = data.profilePhoto;
  if (data.email !== undefined) updateSet.email = data.email;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, id));
}

// ─── Phone Update ───────────────────────────────────────────────────────────

/** Update a user's phone number and split prefix/number fields after OTP verification */
export async function updateUserPhone(
  userId: number,
  phone: string,
  phonePrefix: string | null,
  phoneNumber: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ phone, phonePrefix, phoneNumber })
    .where(eq(users.id, userId));
}

/** Log a phone change attempt for audit purposes */
export async function logPhoneChange(params: {
  userId: number;
  oldPhone: string | null | undefined;
  newPhone: string;
  ipAddress: string;
  result: "success" | "failed" | "locked";
}) {
  const db = await getDb();
  if (!db) return; // non-critical, don't throw
  await db.insert(phoneChangeLogs).values({
    userId: params.userId,
    oldPhone: params.oldPhone ?? null,
    newPhone: params.newPhone,
    ipAddress: params.ipAddress,
    result: params.result,
  });
}

/** Count failed OTP attempts for phone change in the last hour */
export async function countRecentPhoneChangeFailures(
  userId: number,
  windowMs = 60 * 60 * 1000
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowMs);
  const rows = await db
    .select({ id: phoneChangeLogs.id })
    .from(phoneChangeLogs)
    .where(
      and(
        eq(phoneChangeLogs.userId, userId),
        eq(phoneChangeLogs.result, "failed"),
        gte(phoneChangeLogs.createdAt, since)
      )
    );
  return rows.length;
}

/** Clear recent failed phone-change attempts for a user (admin action to release lockout) */
export async function clearPhoneChangeLockout(
  userId: number,
  windowMs = 60 * 60 * 1000
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const since = new Date(Date.now() - windowMs);
  // Delete failed/locked entries in the last hour for this user
  const result = await db
    .delete(phoneChangeLogs)
    .where(
      and(
        eq(phoneChangeLogs.userId, userId),
        or(
          eq(phoneChangeLogs.result, "failed"),
          eq(phoneChangeLogs.result, "locked")
        ),
        gte(phoneChangeLogs.createdAt, since)
      )
    );
  // Return rows deleted count
  return (result as unknown as { affectedRows?: number })?.affectedRows ?? 0;
}

// ─── Phone Prefixes ──────────────────────────────────────────────────────────

/** Returns all active phone prefixes ordered by prefix */
export async function getPhonePrefixes() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: phonePrefixes.id,
      prefix: phonePrefixes.prefix,
      description: phonePrefixes.description,
    })
    .from(phonePrefixes)
    .where(eq(phonePrefixes.isActive, true))
    .orderBy(asc(phonePrefixes.prefix));
}

/** Check if a prefix exists in the phone_prefixes table */
export async function isValidPhonePrefix(prefix: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: phonePrefixes.id })
    .from(phonePrefixes)
    .where(and(eq(phonePrefixes.prefix, prefix), eq(phonePrefixes.isActive, true)))
    .limit(1);
  return result.length > 0;
}

// ─── Cities ──────────────────────────────────────────────────────────────────

/** Returns all active cities ordered by district then Hebrew name */
export async function getCities() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: cities.id,
      nameHe: cities.nameHe,
      nameEn: cities.nameEn,
      district: cities.district,
      latitude: cities.latitude,
      longitude: cities.longitude,
    })
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.district), asc(cities.nameHe));
}

/** Search cities by Hebrew or English name prefix (for autocomplete) */
export async function searchCities(query: string, limit = 10) {
  const db = await getDb();
  if (!db || !query.trim()) return [];
  const q = `%${query.trim()}%`;
  return db
    .select({
      id: cities.id,
      nameHe: cities.nameHe,
      nameEn: cities.nameEn,
      district: cities.district,
      latitude: cities.latitude,
      longitude: cities.longitude,
    })
    .from(cities)
    .where(
      and(
        eq(cities.isActive, true),
        or(like(cities.nameHe, q), like(cities.nameEn, q))
      )
    )
    .orderBy(asc(cities.nameHe))
    .limit(limit);
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

export async function getActiveJobs(
  limit = 50,
  category?: string,
  city?: string,
  dateFilter?: "today" | "tomorrow" | "this_week",
  offset = 0,
  dayOfWeek?: number[], // 0=Sun, 1=Mon, ..., 6=Sat (JS convention)
  cities?: string[]     // multi-city filter (takes precedence over city when provided)
): Promise<{ rows: (typeof jobs.$inferSelect)[]; total: number }> {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  await expireOldJobs();
  const conditions = [or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!];
  if (category && category !== "all") {
    conditions.push(eq(jobs.category, category as Job["category"]));
  }
  // Multi-city filter takes precedence over single city
  const effectiveCities = cities && cities.length > 0 ? cities : (city && city !== "all" ? [city] : []);
  if (effectiveCities.length === 1) {
    conditions.push(eq(jobs.city, effectiveCities[0]));
  } else if (effectiveCities.length > 1) {
    conditions.push(inArray(jobs.city, effectiveCities));
  }
  if (dateFilter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    if (dateFilter === "today") {
      conditions.push(eq(jobs.jobDate, todayStr));
    } else if (dateFilter === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      conditions.push(eq(jobs.jobDate, tomorrow.toISOString().slice(0, 10)));
    } else if (dateFilter === "this_week") {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      conditions.push(sql`${jobs.jobDate} >= ${todayStr} AND ${jobs.jobDate} <= ${weekEnd.toISOString().slice(0, 10)}`);
    }
  }
  // dayOfWeek filter: JS 0=Sun..6=Sat → MySQL DAYOFWEEK() 1=Sun..7=Sat
  if (dayOfWeek && dayOfWeek.length > 0) {
    const mysqlDays = dayOfWeek.map(d => d + 1); // convert JS→MySQL
    conditions.push(
      or(
        isNull(jobs.jobDate),
        sql`DAYOFWEEK(${jobs.jobDate}) IN (${sql.join(mysqlDays.map(d => sql`${d}`), sql`, `)})`
      )!
    );
  }
  const whereClause = and(...conditions);
  const [rows, countResult] = await Promise.all([
    db.select().from(jobs).where(whereClause).orderBy(desc(jobs.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(jobs).where(whereClause),
  ]);
  return { rows, total: countResult[0]?.total ?? 0 };
}

export async function getJobsNearLocation(
  lat: number,
  lng: number,
  radiusKm: number,
  category?: string,
  limit = 50,
  city?: string,
  dateFilter?: "today" | "tomorrow" | "this_week",
  offset = 0,
  dayOfWeek?: number[], // 0=Sun, 1=Mon, ..., 6=Sat (JS convention)
  cities?: string[]     // multi-city filter (takes precedence over city when provided)
): Promise<{ rows: Array<Record<string, unknown> & { distance: number }>; total: number }> {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
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
  // Multi-city filter takes precedence over single city
  const effectiveCitiesNear = cities && cities.length > 0 ? cities : (city && city !== "all" ? [city] : []);
  if (effectiveCitiesNear.length === 1) {
    conditions.push(eq(jobs.city, effectiveCitiesNear[0]));
  } else if (effectiveCitiesNear.length > 1) {
    conditions.push(inArray(jobs.city, effectiveCitiesNear));
  }
  if (dateFilter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    if (dateFilter === "today") {
      conditions.push(eq(jobs.jobDate, todayStr));
    } else if (dateFilter === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      conditions.push(eq(jobs.jobDate, tomorrow.toISOString().slice(0, 10)));
    } else if (dateFilter === "this_week") {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      conditions.push(sql`${jobs.jobDate} >= ${todayStr} AND ${jobs.jobDate} <= ${weekEnd.toISOString().slice(0, 10)}`);
    }
  }
  // dayOfWeek filter: JS 0=Sun..6=Sat → MySQL DAYOFWEEK() 1=Sun..7=Sat
  if (dayOfWeek && dayOfWeek.length > 0) {
    const mysqlDays = dayOfWeek.map(d => d + 1);
    conditions.push(
      or(
        isNull(jobs.jobDate),
        sql`DAYOFWEEK(${jobs.jobDate}) IN (${sql.join(mysqlDays.map(d => sql`${d}`), sql`, `)})`
      )!
    );
  }

  const selectFields = {
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
    jobDate: jobs.jobDate,
    workStartTime: jobs.workStartTime,
    workEndTime: jobs.workEndTime,
    distance: distanceExpr,
  };
  const whereClause = and(...conditions);
  const [rows, countResult] = await Promise.all([
    db.select(selectFields).from(jobs).where(whereClause).orderBy(distanceExpr, desc(jobs.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(jobs).where(whereClause),
  ]);
  return { rows: rows as Array<Record<string, unknown> & { distance: number }>, total: countResult[0]?.total ?? 0 };
}

export async function getMyJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.postedBy, userId)).orderBy(desc(jobs.createdAt));
}

/**
 * Returns the employer's jobs enriched with a pendingCount of applications awaiting review.
 */
export async function getMyJobsWithPendingCounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const myJobsList = await db
    .select()
    .from(jobs)
    .where(eq(jobs.postedBy, userId))
    .orderBy(desc(jobs.createdAt));

  if (myJobsList.length === 0) return [];

  // Count pending applications per job in one query
  const counts = await db
    .select({
      jobId: applications.jobId,
      pendingCount: count(),
    })
    .from(applications)
    .where(
      and(
        eq(applications.status, "pending"),
        sql`${applications.jobId} IN (${myJobsList.map((j) => j.id).join(",")})`
      )
    )
    .groupBy(applications.jobId);

  const countMap = new Map(counts.map((c) => [c.jobId, c.pendingCount]));
  return myJobsList.map((j) => ({ ...j, pendingCount: countMap.get(j.id) ?? 0 }));
}

/**
 * Returns all applications submitted by a worker, with job info.
 */
export async function getMyApplications(workerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      status: applications.status,
      message: applications.message,
      contactRevealed: applications.contactRevealed,
      createdAt: applications.createdAt,
      jobTitle: jobs.category,
      jobAddress: jobs.address,
      jobCity: jobs.city,
      jobSalary: jobs.salary,
      jobSalaryType: jobs.salaryType,
      jobStatus: jobs.status,
      employerName: users.name,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(users, eq(jobs.postedBy, users.id))
    .where(eq(applications.workerId, workerId))
    .orderBy(desc(applications.createdAt));
}

/** Returns the set of job IDs the worker has already applied to */
export async function getAppliedJobIds(workerId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.workerId, workerId));
  return rows.map((r) => r.jobId);
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

/** Get workers whose availability expires in the next 25–35 minutes and haven't been reminded yet.
 *  Used by the expiry reminder job to send a "30 min left" SMS.
 */
export async function getWorkersWithExpiringAvailability(): Promise<
  Array<{ userId: number; phone: string; name: string | null; availableUntil: Date; availabilityId: number }>
> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);   // 35 min from now

  const rows = await db
    .select({
      userId: workerAvailability.userId,
      availableUntil: workerAvailability.availableUntil,
      availabilityId: workerAvailability.id,
      reminderSentAt: workerAvailability.reminderSentAt,
      phone: users.phone,
      name: users.name,
    })
    .from(workerAvailability)
    .innerJoin(users, eq(workerAvailability.userId, users.id))
    .where(
      and(
        gte(workerAvailability.availableUntil, windowStart),
        lte(workerAvailability.availableUntil, windowEnd),
        sql`${workerAvailability.reminderSentAt} IS NULL`
      )
    );

  return rows
    .filter((r) => !!r.phone)
    .map((r) => ({
      userId: r.userId,
      phone: r.phone!,
      name: r.name,
      availableUntil: r.availableUntil,
      availabilityId: r.availabilityId,
    }));
}

/** Mark that a reminder SMS was sent for a specific availability record */
export async function markAvailabilityReminderSent(availabilityId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workerAvailability)
    .set({ reminderSentAt: new Date() })
    .where(eq(workerAvailability.id, availabilityId));
}

// ─── Applications ─────────────────────────────────────────────────────────────

/** Check if a worker has already applied to a job */
export async function getApplicationByWorkerAndJob(workerId: number, jobId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(applications)
    .where(and(eq(applications.workerId, workerId), eq(applications.jobId, jobId)))
    .limit(1);
  return result[0] ?? null;
}

/** Create a new job application */
export async function createApplication(workerId: number, jobId: number, message?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(applications).values({ workerId, jobId, message: message ?? null });
}

/** Get a worker's public profile by user ID (for employer to view after receiving application SMS) */
export async function getPublicWorkerProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      preferredCategories: users.preferredCategories,
      preferredCity: users.preferredCity,
      preferredCities: users.preferredCities,
      workerBio: users.workerBio,
      workerTags: users.workerTags,
      createdAt: users.createdAt,
      profilePhoto: users.profilePhoto,
      availabilityStatus: users.availabilityStatus,
      workerRating: users.workerRating,
      completedJobsCount: users.completedJobsCount,
      workerLatitude: users.workerLatitude,
      workerLongitude: users.workerLongitude,
      preferredDays: users.preferredDays,
      preferredTimeSlots: users.preferredTimeSlots,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, "active")))
    .limit(1);
  return result[0] ?? null;
}

/** Get a single application by ID (includes worker profile + contactRevealed state) */
export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      workerId: applications.workerId,
      status: applications.status,
      message: applications.message,
      contactRevealed: applications.contactRevealed,
      revealedAt: applications.revealedAt,
      createdAt: applications.createdAt,
      // Worker public profile
      workerName: users.name,
      workerPhone: users.phone,
      workerBio: users.workerBio,
      workerPreferredCity: users.preferredCity,
      workerPreferredCategories: users.preferredCategories,
      workerTags: users.workerTags,
      workerCreatedAt: users.createdAt,
      // Job info for authorization
      jobPostedBy: jobs.postedBy,
      jobTitle: jobs.title,
    })
    .from(applications)
    .innerJoin(users, eq(applications.workerId, users.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.id, id))
    .limit(1);
  return result[0] ?? null;
}

/** Mark an application's contact as revealed by the employer */
export async function revealApplicationContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(applications)
    .set({
      contactRevealed: true,
      revealedAt: new Date(),
      status: "viewed",
    })
    .where(eq(applications.id, id));
}

/** Get all applications for a specific job (for employer view) */
export async function getApplicationsForJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: applications.id,
      workerId: applications.workerId,
      status: applications.status,
      message: applications.message,
      contactRevealed: applications.contactRevealed,
      revealedAt: applications.revealedAt,
      createdAt: applications.createdAt,
      workerName: users.name,
      // Phone only returned if contactRevealed — caller must filter
      workerPhone: users.phone,
      workerBio: users.workerBio,
      workerPreferredCity: users.preferredCity,
      workerTags: users.workerTags,
      workerRating: users.workerRating,
      completedJobsCount: users.completedJobsCount,
    })
    .from(applications)
    .innerJoin(users, eq(applications.workerId, users.id))
    .where(eq(applications.jobId, jobId))
    .orderBy(desc(applications.createdAt));
}

/**
 * Returns applications for a job with worker location (from workerAvailability if present)
 * and Haversine distance from the job's lat/lng. Sorted: closest first, nulls last.
 * Phone is included — caller must strip if contactRevealed=false.
 */
export async function getApplicationsForJobWithDistance(
  jobId: number,
  jobLat: string,
  jobLng: string
) {
  const db = await getDb();
  if (!db) return [];

  const distanceExpr = sql<number>`
    6371 * 2 * ASIN(SQRT(
      POWER(SIN((RADIANS(CAST(${workerAvailability.latitude} AS DECIMAL(10,7))) - RADIANS(${jobLat})) / 2), 2)
      + COS(RADIANS(${jobLat})) * COS(RADIANS(CAST(${workerAvailability.latitude} AS DECIMAL(10,7))))
      * POWER(SIN((RADIANS(CAST(${workerAvailability.longitude} AS DECIMAL(10,7))) - RADIANS(${jobLng})) / 2), 2)
    ))
  `;

  const now = new Date();
  return db
    .select({
      id: applications.id,
      workerId: applications.workerId,
      status: applications.status,
      message: applications.message,
      contactRevealed: applications.contactRevealed,
      revealedAt: applications.revealedAt,
      createdAt: applications.createdAt,
      workerName: users.name,
      workerPhone: users.phone,
      workerBio: users.workerBio,
      workerPreferredCity: users.preferredCity,
      workerTags: users.workerTags,
      distanceKm: distanceExpr,
      workerRating: users.workerRating,
      completedJobsCount: users.completedJobsCount,
    })
    .from(applications)
    .innerJoin(users, eq(applications.workerId, users.id))
    .leftJoin(
      workerAvailability,
      and(
        eq(workerAvailability.userId, applications.workerId),
        gte(workerAvailability.availableUntil, now)
      )
    )
    .where(eq(applications.jobId, jobId))
    .orderBy(sql`${distanceExpr} IS NULL`, asc(distanceExpr));
}

/**
 * Accept an application: sets status=accepted, contactRevealed=true, revealedAt=now.
 * Reject an application: sets status=rejected.
 */
export async function updateApplicationStatus(
  id: number,
  action: "accept" | "reject"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (action === "accept") {
    await db
      .update(applications)
      .set({
        status: "accepted",
        contactRevealed: true,
        revealedAt: new Date(),
      })
      .where(eq(applications.id, id));
  } else {
    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.id, id));
  }
}

// ── Notification Batch helpers ────────────────────────────────────────────────

/**
 * Returns the active (pending) batch for a job, or null if none exists.
 */
export async function getPendingBatchForJob(jobId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(notificationBatches)
    .where(
      and(
        eq(notificationBatches.jobId, jobId),
        eq(notificationBatches.status, "pending")
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Creates a new pending batch for a job.
 * scheduledAt = now + windowMs (default 10 minutes).
 */
export async function createNotificationBatch(
  jobId: number,
  employerPhone: string,
  windowMs = 10 * 60 * 1000
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const scheduledAt = new Date(Date.now() + windowMs);
  await db.insert(notificationBatches).values({
    jobId,
    employerPhone,
    pendingCount: 1,
    scheduledAt,
    status: "pending",
  });
  // Return the newly created row
  const rows = await db
    .select()
    .from(notificationBatches)
    .where(
      and(
        eq(notificationBatches.jobId, jobId),
        eq(notificationBatches.status, "pending")
      )
    )
    .orderBy(desc(notificationBatches.createdAt))
    .limit(1);
  return rows[0];
}

/**
 * Increments pendingCount on an existing batch and returns the updated row.
 */
export async function incrementBatchCount(batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notificationBatches)
    .set({ pendingCount: sql`pendingCount + 1` })
    .where(eq(notificationBatches.id, batchId));
  const rows = await db
    .select()
    .from(notificationBatches)
    .where(eq(notificationBatches.id, batchId))
    .limit(1);
  return rows[0];
}

/**
 * Marks a batch as sent (idempotent — safe to call multiple times).
 * Only updates rows that are still "pending" to prevent double-send.
 */
export async function markBatchSent(batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notificationBatches)
    .set({ status: "sent", sentAt: new Date() })
    .where(
      and(
        eq(notificationBatches.id, batchId),
        eq(notificationBatches.status, "pending")
      )
    );
}

/**
 * Returns the count of applications for a worker where the status was updated
 * after the given lastSeenAt timestamp. Used to drive the unread badge in the nav.
 * Only counts meaningful status changes (accepted/rejected/viewed), not initial creation.
 */
export async function getUnreadApplicationsCount(
  workerId: number,
  lastSeenAt: Date
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ cnt: count() })
    .from(applications)
    .where(
      and(
        eq(applications.workerId, workerId),
        sql`${applications.updatedAt} > ${lastSeenAt}`,
        sql`${applications.status} != 'pending'`
      )
    );
  return rows[0]?.cnt ?? 0;
}

// ── Push Subscription helpers ─────────────────────────────────────────────

export async function savePushSubscription(data: InsertPushSubscription): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Upsert by endpoint: if same endpoint re-subscribes, update its keys
  await db
    .insert(pushSubscriptions)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        p256dh: data.p256dh,
        auth: data.auth,
        userId: data.userId,
      },
    });
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

// ── Notification Preferences helpers ─────────────────────────────────────────
/** Returns the notification preference for a user (defaults to "both") */
export async function getNotificationPrefs(
  userId: number
): Promise<"both" | "push_only" | "sms_only" | "none"> {
  const db = await getDb();
  if (!db) return "both";
  const result = await db
    .select({ notificationPrefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0]?.notificationPrefs ?? "both";
}

/** Update the notification preference for a user */
export async function updateNotificationPrefs(
  userId: number,
  prefs: "both" | "push_only" | "sms_only" | "none"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ notificationPrefs: prefs }).where(eq(users.id, userId));
}

/**
 * Mark all pending applications for an employer's jobs as "viewed".
 * Called when the employer opens the applications/my-jobs page.
 * This resets the pending badge count on the employer home page.
 */
export async function markEmployerApplicationsViewed(employerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Get all job IDs belonging to this employer
  const myJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.postedBy, employerId));
  if (myJobs.length === 0) return;
  const jobIds = myJobs.map((j) => j.id);
  // Update all pending applications for those jobs to "viewed"
  await db
    .update(applications)
    .set({ status: "viewed" })
    .where(
      and(
        sql`${applications.jobId} IN (${sql.join(jobIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(applications.status, "pending")
      )
    );
}

// ── Saved Jobs ────────────────────────────────────────────────────────────────

/** Save a job for a worker. Silently ignores duplicate saves. */
export async function saveJob(userId: number, jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(savedJobs).values({ userId, jobId });
  } catch {
    // Unique constraint violation = already saved, ignore
  }
}

/** Remove a saved job for a worker. */
export async function unsaveJob(userId: number, jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
}

/** Get all saved job IDs for a worker. */
export async function getSavedJobIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ jobId: savedJobs.jobId })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId));
  return rows.map((r) => r.jobId);
}

/** Get full job details for all saved jobs of a worker, ordered by most recently saved. */
export async function getSavedJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      savedAt: savedJobs.savedAt,
      id: jobs.id,
      title: jobs.title,
      category: jobs.category,
      address: jobs.address,
      city: jobs.city,
      salary: jobs.salary,
      salaryType: jobs.salaryType,
      businessName: jobs.businessName,
      startTime: jobs.startTime,
      startDateTime: jobs.startDateTime,
      isUrgent: jobs.isUrgent,
      workersNeeded: jobs.workersNeeded,
      expiresAt: jobs.expiresAt,
      createdAt: jobs.createdAt,
      contactPhone: jobs.contactPhone,
    })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.savedAt));
  return rows;
}

// ── Worker Ratings ────────────────────────────────────────────────────────────

/**
 * Submit or update a rating from an employer for a worker.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE to allow re-rating.
 * After insert/update, recalculates the worker's average rating and
 * increments completedJobsCount only on a new rating (not an update).
 */
export async function rateWorker(
  workerId: number,
  employerId: number,
  rating: number,
  comment: string | null,
  applicationId: number | null
): Promise<{ isNew: boolean; newAverage: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate: if applicationId provided, ensure it is accepted and belongs to this employer+worker
  if (applicationId !== null) {
    const app = await db
      .select({ id: applications.id, status: applications.status, workerId: applications.workerId })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.workerId, workerId)
        )
      )
      .limit(1);
    if (app.length === 0) throw new Error("Application not found");
    if (app[0].status !== "accepted") throw new Error("Worker must be accepted before rating");
    // Prevent duplicate rating per application
    const dupApp = await db
      .select({ id: workerRatings.id })
      .from(workerRatings)
      .where(eq(workerRatings.applicationId, applicationId))
      .limit(1);
    if (dupApp.length > 0) throw new Error("Already rated for this application");
  }

  // Check if rating already exists (employer → worker, any application)
  const existing = await db
    .select({ id: workerRatings.id })
    .from(workerRatings)
    .where(
      and(
        eq(workerRatings.workerId, workerId),
        eq(workerRatings.employerId, employerId)
      )
    )
    .limit(1);
  const isNew = existing.length === 0;

  if (isNew) {
    await db.insert(workerRatings).values({
      workerId,
      employerId,
      applicationId: applicationId ?? undefined,
      rating,
      comment: comment ?? undefined,
    });
  } else {
    await db
      .update(workerRatings)
      .set({ rating, comment: comment ?? undefined })
      .where(
        and(
          eq(workerRatings.workerId, workerId),
          eq(workerRatings.employerId, employerId)
        )
      );
  }

  // Recalculate average
  const avgResult = await db
    .select({ avg: sql<number>`AVG(${workerRatings.rating})`, cnt: count() })
    .from(workerRatings)
    .where(eq(workerRatings.workerId, workerId));

  const newAverage = Number(avgResult[0]?.avg ?? rating);
  const totalRatings = avgResult[0]?.cnt ?? 1;

  // Update user's cached rating + completedJobsCount (only increment on new rating)
  await db
    .update(users)
    .set({
      workerRating: String(newAverage.toFixed(1)),
      ...(isNew ? { completedJobsCount: sql`completedJobsCount + 1` } : {}),
    })
    .where(eq(users.id, workerId));

  return { isNew, newAverage };
}

/** Returns job counts grouped by city and category — used for dynamic SEO sitemap */
export async function getJobCountByCityAndCategory(): Promise<
  Array<{ city: string | null; category: string | null; cnt: number }>
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      city: jobs.city,
      category: jobs.category,
      cnt: sql<number>`COUNT(*)`,
    })
    .from(jobs)
    .where(or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!)
    .groupBy(jobs.city, jobs.category);
  return rows.map((r) => ({ city: r.city ?? null, category: r.category ?? null, cnt: Number(r.cnt) }));
}

/** Get the existing rating from an employer for a worker (for pre-filling UI) */
export async function getExistingRating(workerId: number, employerId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(workerRatings)
    .where(
      and(
        eq(workerRatings.workerId, workerId),
        eq(workerRatings.employerId, employerId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** Get all active categories (for public use) */
export async function getActiveCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder, categories.id);
}

/** Get all categories including inactive (for admin) */
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categories)
    .orderBy(categories.sortOrder, categories.id);
}

/** Get a single category by slug */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** Create a new category */
export async function createCategory(data: {
  slug: string;
  name: string;
  icon?: string;
  groupName?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(categories).values({
    slug: data.slug,
    name: data.name,
    icon: data.icon ?? "💼",
    groupName: data.groupName ?? "general",
    imageUrl: data.imageUrl ?? null,
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder ?? 0,
  });
}

/** Update an existing category */
export async function updateCategory(id: number, data: {
  slug?: string;
  name?: string;
  icon?: string;
  groupName?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

/** Toggle isActive for a category */
export async function toggleCategoryActive(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.select({ isActive: categories.isActive }).from(categories).where(eq(categories.id, id)).limit(1);
  if (!rows[0]) throw new Error("Category not found");
  await db.update(categories).set({ isActive: !rows[0].isActive }).where(eq(categories.id, id));
}

/** Delete a category (admin only) */
export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(categories).where(eq(categories.id, id));
}

/** Seed initial categories if the table is empty */
export async function seedCategoriesIfEmpty() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) return; // already seeded

  const seed = [
    { slug: "cleaning",       name: "ניקיון",              icon: "🧹", groupName: "home",    sortOrder: 1 },
    { slug: "events",         name: "אירועים",             icon: "🎉", groupName: "events",  sortOrder: 2 },
    { slug: "gardening",      name: "גינון",               icon: "🌿", groupName: "home",    sortOrder: 3 },
    { slug: "repairs",        name: "תיקונים כלליים",      icon: "🔧", groupName: "home",    sortOrder: 4 },
    { slug: "plumbing",       name: "אינסטלציה",           icon: "🚿", groupName: "home",    sortOrder: 5 },
    { slug: "electricity",    name: "חשמל",                icon: "⚡", groupName: "home",    sortOrder: 6 },
    { slug: "moving",         name: "הובלות",              icon: "📦", groupName: "home",    sortOrder: 7 },
    { slug: "childcare",      name: "טיפול בילדים",        icon: "👶", groupName: "care",    sortOrder: 8 },
    { slug: "eldercare",      name: "טיפול בקשישים",       icon: "🧓", groupName: "care",    sortOrder: 9 },
    { slug: "catering",       name: "קייטרינג ובישול",     icon: "🍳", groupName: "events",  sortOrder: 10 },
    { slug: "serving",        name: "הגשה ושירות",         icon: "🍽️", groupName: "events",  sortOrder: 11 },
    { slug: "security",       name: "אבטחה",               icon: "🛡️", groupName: "general", sortOrder: 12 },
    { slug: "delivery",       name: "שליחויות",            icon: "🚴", groupName: "general", sortOrder: 13 },
    { slug: "retail",         name: "קמעונאות",            icon: "🛍️", groupName: "general", sortOrder: 14 },
    { slug: "warehouse",      name: "מחסן",                icon: "🏭", groupName: "general", sortOrder: 15 },
    { slug: "agriculture",    name: "חקלאות",              icon: "🌾", groupName: "general", sortOrder: 16 },
    { slug: "emergency_support", name: "סיוע בחירום",     icon: "🆘", groupName: "special", sortOrder: 17 },
    { slug: "volunteer",      name: "התנדבות",             icon: "💚", groupName: "special", sortOrder: 18 },
    { slug: "other",          name: "אחר",                 icon: "💼", groupName: "general", sortOrder: 99 },
  ];

  for (const cat of seed) {
    await db.insert(categories).values({ ...cat, isActive: true });
  }
}

// ─── Worker Reviews ────────────────────────────────────────────────────────────
/**
 * Get all reviews for a worker, with employer name and photo.
 * Returns newest first, max 50 entries.
 */
export async function getWorkerReviews(workerId: number): Promise<
  Array<{
    id: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
    employerName: string | null;
    employerPhoto: string | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: workerRatings.id,
      rating: workerRatings.rating,
      comment: workerRatings.comment,
      createdAt: workerRatings.createdAt,
      employerName: users.name,
      employerPhoto: users.profilePhoto,
    })
    .from(workerRatings)
    .innerJoin(users, eq(workerRatings.employerId, users.id))
    .where(eq(workerRatings.workerId, workerId))
    .orderBy(desc(workerRatings.createdAt))
    .limit(50);
  return rows;
}

// ─── Regions ─────────────────────────────────────────────────────────────────

/** Haversine distance in km between two GPS coordinates */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return all regions ordered by name */
export async function getRegions(): Promise<Region[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).orderBy(asc(regions.name));
}

/** Return the center city names of all active regions (status = 'active') */
export async function getActiveRegionCities(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ centerCity: regions.centerCity })
    .from(regions)
    .orderBy(asc(regions.name));
  return rows.map(r => r.centerCity);
}

/** Return a single region by its slug */
export async function getRegionBySlug(slug: string): Promise<Region | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1);
  return rows[0];
}

/** Return a single region by its id */
export async function getRegionById(id: number): Promise<Region | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
  return rows[0];
}

/**
 * Seed initial Israeli regions if the table is empty.
 * Called once at server startup.
 */
export async function seedRegionsIfEmpty(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: regions.id }).from(regions).limit(1);
  if (existing.length > 0) return;

  const initialRegions: InsertRegion[] = [
    { slug: "tel-aviv",       name: "תל אביב",        centerCity: "תל אביב",      centerLat: "32.0853000", centerLng: "34.7818000", activationRadiusKm: 15, minWorkersRequired: 50 },
    { slug: "jerusalem",      name: "ירושלים",         centerCity: "ירושלים",       centerLat: "31.7683000", centerLng: "35.2137000", activationRadiusKm: 15, minWorkersRequired: 50 },
    { slug: "haifa",          name: "חיפה",            centerCity: "חיפה",          centerLat: "32.7940000", centerLng: "34.9896000", activationRadiusKm: 15, minWorkersRequired: 30 },
    { slug: "bnei-brak",      name: "בני ברק",         centerCity: "בני ברק",       centerLat: "32.0841000", centerLng: "34.8338000", activationRadiusKm: 8,  minWorkersRequired: 30 },
    { slug: "ashdod",         name: "אשדוד",           centerCity: "אשדוד",         centerLat: "31.8040000", centerLng: "34.6550000", activationRadiusKm: 12, minWorkersRequired: 30 },
    { slug: "beer-sheva",     name: "באר שבע",         centerCity: "באר שבע",       centerLat: "31.2518000", centerLng: "34.7913000", activationRadiusKm: 15, minWorkersRequired: 30 },
    { slug: "netanya",        name: "נתניה",           centerCity: "נתניה",         centerLat: "32.3215000", centerLng: "34.8532000", activationRadiusKm: 12, minWorkersRequired: 30 },
    { slug: "rishon-lezion",  name: "ראשון לציון",     centerCity: "ראשון לציון",   centerLat: "31.9730000", centerLng: "34.7925000", activationRadiusKm: 12, minWorkersRequired: 30 },
    { slug: "petah-tikva",    name: "פתח תקווה",       centerCity: "פתח תקווה",     centerLat: "32.0840000", centerLng: "34.8878000", activationRadiusKm: 10, minWorkersRequired: 30 },
    { slug: "holon",          name: "חולון",           centerCity: "חולון",         centerLat: "32.0167000", centerLng: "34.7750000", activationRadiusKm: 8,  minWorkersRequired: 20 },
    { slug: "ramat-gan",      name: "רמת גן",          centerCity: "רמת גן",        centerLat: "32.0684000", centerLng: "34.8248000", activationRadiusKm: 8,  minWorkersRequired: 20 },
    { slug: "herzliya",       name: "הרצליה",          centerCity: "הרצליה",        centerLat: "32.1663000", centerLng: "34.8436000", activationRadiusKm: 10, minWorkersRequired: 20 },
  ];

  await db.insert(regions).values(initialRegions);
  console.log(`[Regions] Seeded ${initialRegions.length} initial regions.`);
}

/**
 * Find the nearest region to a given GPS coordinate that is within its activationRadiusKm.
 * Returns undefined if no region is within range.
 */
export async function findNearestRegion(lat: number, lng: number): Promise<Region | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const allRegions = await db.select().from(regions);
  let nearest: Region | undefined;
  let nearestDist = Infinity;
  for (const region of allRegions) {
    const dist = haversineKm(lat, lng, parseFloat(region.centerLat), parseFloat(region.centerLng));
    if (dist <= region.activationRadiusKm && dist < nearestDist) {
      nearest = region;
      nearestDist = dist;
    }
  }
  return nearest;
}

/**
 * Sync a worker's region memberships.
 * Called whenever a worker updates their GPS location or preferred cities.
 *
 * Strategy:
 *   1. GPS radius: add all regions whose center is within the worker's searchRadiusKm.
 *   2. Preferred cities: add regions whose centerCity matches any of the worker's preferred city names.
 *   3. Remove old memberships that no longer apply.
 *   4. Update currentWorkers count for all affected regions.
 *   5. Auto-activate any region that reaches its threshold.
 */
export async function syncWorkerRegions(
  workerId: number,
  opts: {
    lat?: number | null;
    lng?: number | null;
    searchRadiusKm?: number | null;
    preferredCityNames?: string[];
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const allRegions = await db.select().from(regions);
  const newRegionEntries: { regionId: number; distanceKm: number | null; matchType: "gps_radius" | "preferred_city" }[] = [];

  for (const region of allRegions) {
    const rLat = parseFloat(region.centerLat);
    const rLng = parseFloat(region.centerLng);
    let matched = false;
    let distKm: number | null = null;

    // 1. GPS radius match
    if (opts.lat != null && opts.lng != null) {
      const dist = haversineKm(opts.lat, opts.lng, rLat, rLng);
      const radius = opts.searchRadiusKm ?? region.activationRadiusKm;
      if (dist <= radius) {
        matched = true;
        distKm = Math.round(dist * 1000) / 1000;
        newRegionEntries.push({ regionId: region.id, distanceKm: distKm, matchType: "gps_radius" });
        continue;
      }
    }

    // 2. Preferred city match
    if (!matched && opts.preferredCityNames && opts.preferredCityNames.length > 0) {
      const regionCityNorm = region.centerCity.trim();
      if (opts.preferredCityNames.some((c) => c.trim() === regionCityNorm)) {
        newRegionEntries.push({ regionId: region.id, distanceKm: null, matchType: "preferred_city" });
      }
    }
  }

  // Get current memberships
  const existing = await db
    .select({ regionId: workerRegions.regionId })
    .from(workerRegions)
    .where(eq(workerRegions.workerId, workerId));
  const existingIds = new Set(existing.map((r) => r.regionId));
  const newIds = new Set(newRegionEntries.map((r) => r.regionId));

  // Regions to remove
  const toRemove = Array.from(existingIds).filter((id) => !newIds.has(id));
  // Regions to add
  const toAdd = newRegionEntries.filter((r) => !existingIds.has(r.regionId));

  // Remove stale memberships
  if (toRemove.length > 0) {
    await db
      .delete(workerRegions)
      .where(and(eq(workerRegions.workerId, workerId), inArray(workerRegions.regionId, toRemove)));
  }

  // Insert new memberships
  for (const entry of toAdd) {
    await db.insert(workerRegions).values({
      workerId,
      regionId: entry.regionId,
      distanceKm: entry.distanceKm != null ? String(entry.distanceKm) : null,
      matchType: entry.matchType,
    }).onDuplicateKeyUpdate({ set: { matchType: entry.matchType, distanceKm: entry.distanceKm != null ? String(entry.distanceKm) : null } });
  }

  // Also keep users.regionId pointing to the nearest GPS region (for backward compat)
  if (opts.lat != null && opts.lng != null) {
    const gpsEntries = newRegionEntries.filter((r) => r.matchType === "gps_radius");
    const nearest = gpsEntries.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))[0];
    await db.update(users).set({ regionId: nearest?.regionId ?? null }).where(eq(users.id, workerId));
  }

  // Recount all affected regions and auto-activate
  const affectedIds = Array.from(new Set([...toRemove, ...toAdd.map((r) => r.regionId)]));
  for (const regionId of affectedIds) {
    await _recountAndMaybeActivate(db, regionId);
  }
}

/** Internal: recount worker_regions for a region and auto-activate if threshold met */
async function _recountAndMaybeActivate(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  regionId: number
): Promise<void> {
  const rows = await db
    .select({ cnt: count() })
    .from(workerRegions)
    .where(eq(workerRegions.regionId, regionId));
  const cnt = rows[0]?.cnt ?? 0;
  await db.update(regions).set({ currentWorkers: cnt }).where(eq(regions.id, regionId));

  // Auto-activate if threshold met
  const region = await getRegionById(regionId);
  if (region && region.status === "collecting_workers" && cnt >= region.minWorkersRequired) {
    await db.update(regions).set({ status: "active" }).where(eq(regions.id, regionId));
    console.log(`[Regions] Region "${region.name}" auto-activated! (${cnt} workers)`);
    // Fire-and-forget: push notifications to all workers in this region
    _notifyRegionWorkers(db, region.id, region.name).catch((err) =>
      console.error(`[Regions] Failed to notify workers for region ${region.id}:`, err)
    );
  }
}

/**
 * Fire-and-forget: send push notifications to all workers associated with a region.
 * Called when the region auto-activates.
 */
async function _notifyRegionWorkers(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  regionId: number,
  regionName: string
): Promise<void> {
  // Import lazily to avoid circular deps
  const { sendPushToUser } = await import("./webPush");
  const workers = await db
    .select({ workerId: workerRegions.workerId })
    .from(workerRegions)
    .where(eq(workerRegions.regionId, regionId));
  for (const { workerId } of workers) {
    try {
      await sendPushToUser(workerId, {
        title: `🎉 האזור ${regionName} נפתח!`,
        body: `מעסיקים מחפשים עכשיו באזורך. היכנס לאפליקציה וקבל הצעות עבודה עכשיו.`,
        url: "/find-jobs",
      });
    } catch {
      // Non-critical — skip failed subscriptions
    }
  }
}

/**
 * Legacy shim — kept so existing callers in routers.ts don't break.
 * Delegates to syncWorkerRegions with GPS-only mode.
 * @deprecated Use syncWorkerRegions directly.
 */
export async function associateWorkerWithRegion(
  workerId: number,
  newRegionId: number | null,
  oldRegionId: number | null
): Promise<Region | undefined> {
  // This shim is kept for backward compat; new code should call syncWorkerRegions.
  if (!newRegionId) {
    const db = await getDb();
    if (db) {
      await db.delete(workerRegions).where(eq(workerRegions.workerId, workerId));
      await db.update(users).set({ regionId: null }).where(eq(users.id, workerId));
    }
    return undefined;
  }
  return getRegionById(newRegionId);
}

/**
 * Admin: update a region's status manually.
 */
export async function updateRegionStatus(
  regionId: number,
  status: "collecting_workers" | "active" | "paused"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(regions).set({ status }).where(eq(regions.id, regionId));
}

/**
 * Admin: update region settings.
 */
export async function updateRegion(
  regionId: number,
  data: Partial<Pick<InsertRegion, "name" | "minWorkersRequired" | "activationRadiusKm" | "description" | "imageUrl" | "status">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(regions).set(data as Record<string, unknown>).where(eq(regions.id, regionId));
}

/**
 * Check whether the region that covers a given city/lat/lng is active.
 * Used before allowing an employer to post a job.
 * Returns { allowed: true } or { allowed: false, regionName: string }.
 */
export async function checkRegionActiveForJob(
  lat: number,
  lng: number
): Promise<{ allowed: boolean; regionId?: number; regionName?: string; regionSlug?: string }> {
  const region = await findNearestRegion(lat, lng);
  if (!region) {
    // No region defined for this location → allow posting (open market)
    return { allowed: true };
  }
  if (region.status === "active") {
    return { allowed: true };
  }
  return { allowed: false, regionId: region.id, regionName: region.name, regionSlug: region.slug };
}

/** Recount workers per region from the worker_regions table (admin utility) */
export async function recountRegionWorkers(regionId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ cnt: count() })
    .from(workerRegions)
    .where(eq(workerRegions.regionId, regionId));
  const cnt = rows[0]?.cnt ?? 0;
  await db.update(regions).set({ currentWorkers: cnt }).where(eq(regions.id, regionId));
  return cnt;
}

/** Admin: create a new region */
export async function createRegion(data: InsertRegion): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(regions).values(data);
  return (result[0] as { insertId: number }).insertId;
}

/** Admin: delete a region and all its worker_regions entries */
export async function deleteRegion(regionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workerRegions).where(eq(workerRegions.regionId, regionId));
  await db.delete(regions).where(eq(regions.id, regionId));
}

/**
 * Admin: list workers associated with a region via worker_regions.
 * Returns worker profile info plus distance_km and match_type.
 */
export async function getWorkersByRegion(regionId: number): Promise<
  Array<{
    id: number;
    name: string | null;
    profilePhoto: string | null;
    preferredCity: string | null;
    distanceKm: string | null;
    matchType: string;
    createdAt: Date;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      profilePhoto: users.profilePhoto,
      preferredCity: users.preferredCity,
      distanceKm: workerRegions.distanceKm,
      matchType: workerRegions.matchType,
      createdAt: workerRegions.createdAt,
    })
    .from(workerRegions)
    .innerJoin(users, eq(workerRegions.workerId, users.id))
    .where(eq(workerRegions.regionId, regionId))
    .orderBy(asc(workerRegions.distanceKm));
  return rows;
}

// ─── Region Notification Requests ────────────────────────────────────────────

/**
 * Subscribe a user to receive a notification when a region becomes active.
 * Silently ignores duplicate requests (unique constraint on user+region).
 */
export async function requestRegionNotification(
  userId: number,
  regionId: number,
  type: "worker" | "employer"
): Promise<{ alreadySubscribed: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already subscribed
  const existing = await db
    .select({ id: regionNotificationRequests.id })
    .from(regionNotificationRequests)
    .where(
      and(
        eq(regionNotificationRequests.userId, userId),
        eq(regionNotificationRequests.regionId, regionId)
      )
    )
    .limit(1);

  if (existing.length > 0) return { alreadySubscribed: true };

  await db.insert(regionNotificationRequests).values({ userId, regionId, type });
  return { alreadySubscribed: false };
}

/**
 * Get all notification subscriptions for a user (with region data).
 */
export async function getMyRegionNotificationRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: regionNotificationRequests.id,
      regionId: regionNotificationRequests.regionId,
      type: regionNotificationRequests.type,
      createdAt: regionNotificationRequests.createdAt,
      regionName: regions.name,
      regionSlug: regions.slug,
      regionStatus: regions.status,
    })
    .from(regionNotificationRequests)
    .innerJoin(regions, eq(regionNotificationRequests.regionId, regions.id))
    .where(eq(regionNotificationRequests.userId, userId));
}

/**
 * Get all users who subscribed to be notified when a specific region activates.
 * Used when admin activates a region to send push notifications.
 */
export async function getRegionNotificationSubscribers(
  regionId: number,
  type?: "worker" | "employer"
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(regionNotificationRequests.regionId, regionId)];
  if (type) conditions.push(eq(regionNotificationRequests.type, type));
  return db
    .select({
      userId: regionNotificationRequests.userId,
      type: regionNotificationRequests.type,
      userName: users.name,
      userEmail: users.email,
    })
    .from(regionNotificationRequests)
    .innerJoin(users, eq(regionNotificationRequests.userId, users.id))
    .where(and(...conditions));
}

/**
 * Delete a user's notification subscription for a region.
 */
export async function cancelRegionNotification(userId: number, regionId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(regionNotificationRequests)
    .where(
      and(
        eq(regionNotificationRequests.userId, userId),
        eq(regionNotificationRequests.regionId, regionId)
      )
    );
}

/**
 * Get the activation status of all regions a worker is associated with.
 * Returns whether at least one region is active.
 */
export async function getWorkerRegionStatus(workerId: number): Promise<{
  hasAnyRegion: boolean;
  hasActiveRegion: boolean;
  inactiveRegions: Array<{ id: number; name: string; slug: string; status: string }>;
}> {
  const db = await getDb();
  if (!db) return { hasAnyRegion: false, hasActiveRegion: false, inactiveRegions: [] };

  const rows = await db
    .select({
      regionId: workerRegions.regionId,
      regionName: regions.name,
      regionSlug: regions.slug,
      regionStatus: regions.status,
    })
    .from(workerRegions)
    .innerJoin(regions, eq(workerRegions.regionId, regions.id))
    .where(eq(workerRegions.workerId, workerId));

  if (rows.length === 0) return { hasAnyRegion: false, hasActiveRegion: false, inactiveRegions: [] };

  const hasActiveRegion = rows.some((r) => r.regionStatus === "active");
  const inactiveRegions = rows
    .filter((r) => r.regionStatus !== "active")
    .map((r) => ({ id: r.regionId, name: r.regionName, slug: r.regionSlug, status: r.regionStatus }));

  return { hasAnyRegion: true, hasActiveRegion, inactiveRegions };
}

// ─── Referral helpers ─────────────────────────────────────────────────────────

/** Set referredBy on a user only if it hasn't been set yet (first-time only). */
export async function applyReferral(userId: number, referrerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (userId === referrerId) return; // cannot refer yourself
  // Only set if not already set
  await db
    .update(users)
    .set({ referredBy: referrerId })
    .where(and(eq(users.id, userId), isNull(users.referredBy)));
}

/** Get all users referred by a given user ID. */
export async function getReferralsByUser(referrerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      userMode: users.userMode,
      createdAt: users.createdAt,
      signupCompleted: users.signupCompleted,
    })
    .from(users)
    .where(eq(users.referredBy, referrerId))
    .orderBy(desc(users.createdAt));
}

/** Get referral count for a user. */
export async function getReferralCount(referrerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.referredBy, referrerId));
  return result[0]?.count ?? 0;
}

/** Admin: get all referral pairs (referrer + referred). */
export async function getAllReferrals() {
  const db = await getDb();
  if (!db) return [];
  const referrers = aliasedTable(users, "referrers");
  return db
    .select({
      referrerId: referrers.id,
      referrerName: referrers.name,
      referrerPhone: referrers.phone,
      referredId: users.id,
      referredName: users.name,
      referredPhone: users.phone,
      referredMode: users.userMode,
      referredAt: users.createdAt,
    })
    .from(users)
    .innerJoin(referrers, eq(users.referredBy, referrers.id))
    .orderBy(desc(users.createdAt));
}

/** Worker withdraws their application from a job.
 * Only allowed if the job is still active/not expired and the application belongs to the worker.
 */
export async function withdrawApplication(applicationId: number, workerId: number): Promise<{ success: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "db_unavailable" };
  // Fetch the application with job status
  const rows = await db
    .select({
      id: applications.id,
      workerId: applications.workerId,
      jobStatus: jobs.status,
      jobExpiresAt: jobs.expiresAt,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(and(eq(applications.id, applicationId), eq(applications.workerId, workerId)))
    .limit(1);
  const app = rows[0];
  if (!app) return { success: false, reason: "not_found" };
  if (app.workerId !== workerId) return { success: false, reason: "forbidden" };
  // Block withdrawal if job is already expired or closed
  const isExpired = app.jobStatus === "expired" || app.jobStatus === "closed"
    || (app.jobExpiresAt != null && new Date(app.jobExpiresAt) < new Date());
  if (isExpired) return { success: false, reason: "job_expired" };
  await db.delete(applications).where(eq(applications.id, applicationId));
  return { success: true };
}

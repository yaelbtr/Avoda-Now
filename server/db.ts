import { and, count, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertJob,
  InsertJobReport,
  InsertOtpCode,
  InsertUser,
  Job,
  jobReports,
  jobs,
  otpCodes,
  users,
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

// ─── OTP ─────────────────────────────────────────────────────────────────────

export async function createOtp(phone: string, code: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(otpCodes).values({ phone, code, expiresAt, used: false });
}

export async function getValidOtp(phone: string, code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gte(otpCodes.expiresAt, new Date())
      )
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  return result[0];
}

export async function markOtpUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

/** Expire jobs whose expiresAt has passed */
export async function expireOldJobs() {
  const db = await getDb();
  if (!db) return;
  await db
    .update(jobs)
    .set({ status: "expired" })
    .where(
      and(
        eq(jobs.status, "active"),
        lte(jobs.expiresAt, new Date())
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
  const conditions = [
    or(eq(jobs.status, "active"), eq(jobs.status, "under_review"))!,
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

  const rows = await db
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

  return rows;
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

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function reportJob(data: InsertJobReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(jobReports).values(data);

  // Increment report count and check threshold
  await db
    .update(jobs)
    .set({ reportCount: sql`${jobs.reportCount} + 1` })
    .where(eq(jobs.id, data.jobId));

  // If 3+ reports → under_review
  const updated = await db.select({ reportCount: jobs.reportCount }).from(jobs).where(eq(jobs.id, data.jobId)).limit(1);
  if ((updated[0]?.reportCount ?? 0) >= 3) {
    await db.update(jobs).set({ status: "under_review" }).where(eq(jobs.id, data.jobId));
  }
}

/**
 * Admin-only database query helpers.
 * All functions here are called only from adminProcedure-protected routes.
 */
import { and, count, desc, eq, gte, or, sql } from "drizzle-orm";
import { Job, applications, jobReports, jobs, notificationBatches, phoneChangeLogs, users } from "../drizzle/schema";
import { getDb } from "./db";

// ─── Jobs Admin ───────────────────────────────────────────────────────────────

export async function adminGetAllJobs(limit = 100, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = status ? [eq(jobs.status, status as Job["status"])] : [];
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      category: jobs.category,
      city: jobs.city,
      address: jobs.address,
      contactName: jobs.contactName,
      contactPhone: jobs.contactPhone,
      businessName: jobs.businessName,
      status: jobs.status,
      reportCount: jobs.reportCount,
      postedBy: jobs.postedBy,
      expiresAt: jobs.expiresAt,
      createdAt: jobs.createdAt,
      salary: jobs.salary,
      salaryType: jobs.salaryType,
    })
    .from(jobs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

export async function adminGetReportedJobs() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "under_review"))
    .orderBy(desc(jobs.reportCount), desc(jobs.createdAt));
}

export async function adminApproveJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set({ status: "active", reportCount: 0 }).where(eq(jobs.id, jobId));
}

export async function adminRejectJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set({ status: "closed" }).where(eq(jobs.id, jobId));
}

export async function adminDeleteJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobs).where(eq(jobs.id, jobId));
}

export async function adminSetJobStatus(jobId: number, status: Job["status"]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set({ status }).where(eq(jobs.id, jobId));
}

// ─── Users Admin ──────────────────────────────────────────────────────────────

export async function adminGetAllUsers(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function adminBlockUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ status: "suspended" }).where(eq(users.id, userId));
}

export async function adminUnblockUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
}

export async function adminSetUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function adminCreateUser(data: { phone: string; name?: string; role?: "user" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check for duplicate phone
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, data.phone)).limit(1);
  if (existing.length > 0) throw new Error("מספר טלפון כבר קיים במערכת");
  const openId = `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const [inserted] = await db.insert(users).values({
    phone: data.phone,
    name: data.name ?? null,
    role: data.role ?? "user",
    openId,
    status: "active",
  });
  return { id: (inserted as any).insertId as number };
}

export async function adminUpdateUser(userId: number, data: { name?: string; phone?: string; role?: "user" | "admin"; status?: "active" | "suspended" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.status !== undefined) updateData.status = data.status;
  if (Object.keys(updateData).length === 0) return;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function adminDeleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

// ─── Reports Admin ────────────────────────────────────────────────────────────

export async function adminGetAllReports(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: jobReports.id,
      jobId: jobReports.jobId,
      reporterPhone: jobReports.reporterPhone,
      reporterIp: jobReports.reporterIp,
      reason: jobReports.reason,
      createdAt: jobReports.createdAt,
      jobTitle: jobs.title,
      jobStatus: jobs.status,
      jobCity: jobs.city,
    })
    .from(jobReports)
    .leftJoin(jobs, eq(jobReports.jobId, jobs.id))
    .orderBy(desc(jobReports.createdAt))
    .limit(limit);
}

export async function adminClearJobReports(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobReports).where(eq(jobReports.jobId, jobId));
  await db.update(jobs).set({ reportCount: 0 }).where(eq(jobs.id, jobId));
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function adminGetStats() {
  const db = await getDb();
  if (!db) {
    return { totalJobs: 0, activeJobs: 0, underReviewJobs: 0, totalUsers: 0, totalReports: 0, newUsersToday: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalJobsRes,
    activeJobsRes,
    underReviewRes,
    totalUsersRes,
    totalReportsRes,
    newUsersTodayRes,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(jobs),
    db.select({ cnt: count() }).from(jobs).where(eq(jobs.status, "active")),
    db.select({ cnt: count() }).from(jobs).where(eq(jobs.status, "under_review")),
    db.select({ cnt: count() }).from(users),
    db.select({ cnt: count() }).from(jobReports),
    db.select({ cnt: count() }).from(users).where(sql`${users.createdAt} >= ${today}`),
  ]);

  return {
    totalJobs: totalJobsRes[0]?.cnt ?? 0,
    activeJobs: activeJobsRes[0]?.cnt ?? 0,
    underReviewJobs: underReviewRes[0]?.cnt ?? 0,
    totalUsers: totalUsersRes[0]?.cnt ?? 0,
    totalReports: totalReportsRes[0]?.cnt ?? 0,
    newUsersToday: newUsersTodayRes[0]?.cnt ?? 0,
  };
}

// ─── Applications Admin ───────────────────────────────────────────────────────

/**
 * Returns all applications with worker name/phone and job title, newest first.
 */
export async function adminGetAllApplications(limit = 300) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      workerId: applications.workerId,
      status: applications.status,
      message: applications.message,
      contactRevealed: applications.contactRevealed,
      revealedAt: applications.revealedAt,
      createdAt: applications.createdAt,
      workerName: users.name,
      workerPhone: users.phone,
      jobTitle: jobs.title,
      jobCity: jobs.city,
    })
    .from(applications)
    .innerJoin(users, eq(applications.workerId, users.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .orderBy(desc(applications.createdAt))
    .limit(limit);
}

// ─── Notification Batches Admin ───────────────────────────────────────────────

/**
 * Returns all notification batches with job title, newest first.
 */
export async function adminGetAllBatches(limit = 300) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: notificationBatches.id,
      jobId: notificationBatches.jobId,
      employerPhone: notificationBatches.employerPhone,
      pendingCount: notificationBatches.pendingCount,
      scheduledAt: notificationBatches.scheduledAt,
      sentAt: notificationBatches.sentAt,
      status: notificationBatches.status,
      createdAt: notificationBatches.createdAt,
      jobTitle: jobs.title,
    })
    .from(notificationBatches)
    .innerJoin(jobs, eq(notificationBatches.jobId, jobs.id))
    .orderBy(desc(notificationBatches.createdAt))
    .limit(limit);
}

/**
 * Returns a single batch by ID.
 */
export async function adminGetBatchById(batchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(notificationBatches)
    .where(eq(notificationBatches.id, batchId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Cancels a pending batch (sets status = "cancelled").
 * Only affects rows that are still "pending".
 */
export async function adminCancelBatch(batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notificationBatches)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(notificationBatches.id, batchId),
        eq(notificationBatches.status, "pending")
      )
    );
}

// ─── Phone Change Lockout ─────────────────────────────────────────────────────

/**
 * Check if a user is currently locked out from phone changes.
 * Returns { locked, failureCount, lockedUntil } for display in admin panel.
 */
export async function adminGetPhoneChangeLockoutStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const windowMs = 60 * 60 * 1000; // 1 hour
  const since = new Date(Date.now() - windowMs);
  const rows = await db
    .select()
    .from(phoneChangeLogs)
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
  const failureCount = rows.length;
  const locked = failureCount >= 5;
  // Estimate when lockout expires: 1h after the first failure in the window
  const oldest = rows.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())[0];
  const lockedUntil = locked && oldest
    ? new Date(new Date(oldest.createdAt!).getTime() + windowMs)
    : null;
  return { locked, failureCount, lockedUntil };
}

/**
 * Clear recent failed/locked phone-change log entries for a user.
 * Returns the number of rows deleted.
 */
export async function adminClearPhoneChangeLockout(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const windowMs = 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);
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
  return (result as unknown as { affectedRows?: number })?.affectedRows ?? 0;
}

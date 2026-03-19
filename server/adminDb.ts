/**
 * Admin-only database query helpers.
 * All functions here are called only from adminProcedure-protected routes.
 */
import { and, count, desc, eq, gte, or, sql } from "drizzle-orm";
import {
  BirthdateChange, Job,
  applications, birthdateChanges, jobReports, jobs,
  notificationBatches, phoneChangeLogs, users,
  pushSubscriptions, savedJobs, workerRatings,
  workerAvailability, legalAcknowledgements,
} from "../drizzle/schema";
import { getDb } from "./db";
import { normalizeIsraeliPhone } from "./smsProvider";

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

export async function adminSetUserRole(userId: number, role: "user" | "admin" | "test") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function adminCreateUser(data: { phone: string; name?: string; role?: "user" | "admin" | "test" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Normalize phone to E.164 before storing
  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeIsraeliPhone(data.phone);
  } catch {
    throw new Error("מספר טלפון לא תקין");
  }
  // Check for duplicate phone
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, normalizedPhone)).limit(1);
  if (existing.length > 0) throw new Error("מספר טלפון כבר קיים במערכת");
  const openId = `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inserted = await db.insert(users).values({
    phone: normalizedPhone,
    name: data.name ?? null,
    role: data.role ?? "user",
    openId,
    status: "active",
  }).returning({ id: users.id });
  return { id: inserted[0].id };
}

export async function adminUpdateUser(userId: number, data: { name?: string; phone?: string; role?: "user" | "admin" | "test"; status?: "active" | "suspended" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.phone !== undefined) {
    if (data.phone) {
      try {
        updateData.phone = normalizeIsraeliPhone(data.phone);
      } catch {
        throw new Error("מספר טלפון לא תקין");
      }
    } else {
      updateData.phone = null;
    }
  }
  if (data.role !== undefined) updateData.role = data.role;
  if (data.status !== undefined) updateData.status = data.status;
  if (Object.keys(updateData).length === 0) return;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function adminDeleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Cascade-delete all records that reference this user before removing the
  // user row itself.  Tables with onDelete:"cascade" in the schema are handled
  // automatically by Postgres; we manually delete the ones that are NOT
  // declared with cascade (or where the FK has no onDelete clause).

  // 1. Applications where this user is the worker
  await db.delete(applications).where(eq(applications.workerId, userId));

  // 2. Jobs posted by this user (and their applications, which cascade from jobs)
  //    First delete applications for those jobs, then the jobs themselves.
  const userJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.postedBy, userId));
  for (const j of userJobs) {
    await db.delete(applications).where(eq(applications.jobId, j.id));
  }
  await db.delete(jobs).where(eq(jobs.postedBy, userId));

  // 3. Worker availability
  await db.delete(workerAvailability).where(eq(workerAvailability.userId, userId));

  // 4. Push subscriptions
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

  // 5. Saved jobs
  await db.delete(savedJobs).where(eq(savedJobs.userId, userId));

  // 6. Worker ratings (as worker or as employer)
  await db.delete(workerRatings).where(eq(workerRatings.workerId, userId));
  await db.delete(workerRatings).where(eq(workerRatings.employerId, userId));

  // 7. Phone change logs
  await db.delete(phoneChangeLogs).where(eq(phoneChangeLogs.userId, userId));

  // 8. Legal acknowledgements
  await db.delete(legalAcknowledgements).where(eq(legalAcknowledgements.userId, userId));

  // 9. Birthdate changes
  await db.delete(birthdateChanges).where(eq(birthdateChanges.userId, userId));

  // 10. Finally delete the user row
  //     (workerRegions, regionNotificationRequests, userConsents have
  //      onDelete:"cascade" so Postgres handles them automatically)
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

// ─── BirthDate Changes Audit ─────────────────────────────────────────────────

/**
 * Paginated list of all birthDate changes with user name/email joined.
 * Ordered newest-first for the admin audit log.
 */
export async function adminGetBirthdateChanges(params: {
  limit?: number;
  offset?: number;
}): Promise<Array<BirthdateChange & { userName: string | null; userEmail: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, offset = 0 } = params;
  return db
    .select({
      id: birthdateChanges.id,
      userId: birthdateChanges.userId,
      oldBirthDate: birthdateChanges.oldBirthDate,
      newBirthDate: birthdateChanges.newBirthDate,
      changedAt: birthdateChanges.changedAt,
      ipAddress: birthdateChanges.ipAddress,
      userName: users.name,
      userEmail: users.email,
    })
    .from(birthdateChanges)
    .innerJoin(users, eq(birthdateChanges.userId, users.id))
    .orderBy(desc(birthdateChanges.changedAt))
    .limit(limit)
    .offset(offset);
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
  // PostgreSQL DELETE returns the deleted rows; count them
  return Array.isArray(result) ? result.length : 0;
}

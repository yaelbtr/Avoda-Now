/**
 * Admin-only database query helpers.
 * All functions here are called only from adminProcedure-protected routes.
 */
import { and, count, desc, eq, sql } from "drizzle-orm";
import { Job, jobReports, jobs, users } from "../drizzle/schema";
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

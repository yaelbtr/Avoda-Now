/**
 * Admin-only database query helpers.
 * All functions here are called only from adminProcedure-protected routes.
 */
import { and, count, desc, eq, gte, isNotNull, or, sql, asc } from "drizzle-orm";
import {
  BirthdateChange, Job,
  applications, birthdateChanges, jobReports, jobs,
  notificationBatches, phoneChangeLogs, users,
  pushSubscriptions, savedJobs, workerRatings,
  workerAvailability, legalAcknowledgements,
  referralLinks, type ReferralLink,
} from "../drizzle/schema";
import { getDb } from "./db";
import { normalizeIsraeliPhone } from "./smsProvider";
import { storageDelete } from "./storage";

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

  // 0. Delete profile photo from S3 (if any) before removing DB rows.
  //    profilePhoto is stored as a full CDN URL; extract the relative key by
  //    stripping the CDN origin prefix.  Failure is non-fatal — log and continue.
  const userRow = await db
    .select({ profilePhoto: users.profilePhoto })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const photoUrl = userRow[0]?.profilePhoto;
  if (photoUrl) {
    try {
      // The key is the path portion after the CDN origin, e.g.
      // "https://cdn.example.com/<tenantId>/profile-photos/123-456.jpg"
      // → "<tenantId>/profile-photos/123-456.jpg"
      const relKey = new URL(photoUrl).pathname.replace(/^\//, "");
      await storageDelete(relKey);
    } catch (err) {
      // Non-fatal: log but do not block the deletion
      console.error(`[adminDeleteUser] Failed to delete S3 photo for user ${userId}:`, err);
    }
  }

  // Cascade-delete all records that reference this user before removing the
  // user row itself.  Tables with onDelete:"cascade" in the schema are handled
  // automatically by Postgres; we manually delete the ones that are NOT
  // declared with cascade (or where the FK has no onDelete clause).

  // 1. Applications where this user is the worker
  await db.delete(applications).where(eq(applications.workerId, userId));

  // 2. Jobs posted by this user — delete all child rows that reference jobs.id
  //    before deleting the jobs themselves (FK constraints without CASCADE).
  const userJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.postedBy, userId));
  if (userJobs.length > 0) {
    const jobIds = userJobs.map((j) => j.id);
    // 2a. Applications referencing these jobs
    for (const jid of jobIds) {
      await db.delete(applications).where(eq(applications.jobId, jid));
    }
    // 2b. Job reports referencing these jobs (FK: job_reports.jobId → jobs.id, no cascade)
    for (const jid of jobIds) {
      await db.delete(jobReports).where(eq(jobReports.jobId, jid));
    }
    // 2c. Notification batches referencing these jobs (FK: notification_batches.jobId → jobs.id, no cascade)
    for (const jid of jobIds) {
      await db.delete(notificationBatches).where(eq(notificationBatches.jobId, jid));
    }
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

/**
 * Returns registration counts grouped by referralSource, utmCampaign, and utmMedium.
 * Used in the admin panel "מקורות הרשמה" card.
 */
export async function adminGetReferralStats() {
  const db = await getDb();
  if (!db) return {
    total: 0, facebook: 0, google: 0, organic: 0, other: 0,
    breakdown: [] as { source: string; count: number }[],
    campaignBreakdown: [] as { campaign: string; count: number }[],
    mediumBreakdown: [] as { medium: string; count: number }[],
  };

  // Group by referralSource
  const sourceRows = await db
    .select({ source: users.referralSource, cnt: count() })
    .from(users)
    .groupBy(users.referralSource);
  const breakdown = sourceRows.map(r => ({ source: r.source ?? "organic", count: Number(r.cnt) }));
  const facebook = breakdown.find(r => r.source === "facebook")?.count ?? 0;
  const google   = breakdown.find(r => r.source === "google")?.count ?? 0;
  const organic  = breakdown.filter(r => r.source === "organic" || !r.source).reduce((s, r) => s + r.count, 0);
  const other    = breakdown.filter(r => r.source !== "facebook" && r.source !== "google" && r.source !== "organic" && !!r.source).reduce((s, r) => s + r.count, 0);
  const total    = breakdown.reduce((s, r) => s + r.count, 0);

  // Group by utmCampaign (exclude nulls), sorted by count desc
  const campaignRows = await db
    .select({ campaign: users.utmCampaign, cnt: count() })
    .from(users)
    .where(isNotNull(users.utmCampaign))
    .groupBy(users.utmCampaign)
    .orderBy(desc(count()));
  const campaignBreakdown = campaignRows.map(r => ({ campaign: r.campaign!, count: Number(r.cnt) }));

  // Group by utmMedium (exclude nulls), sorted by count desc
  const mediumRows = await db
    .select({ medium: users.utmMedium, cnt: count() })
    .from(users)
    .where(isNotNull(users.utmMedium))
    .groupBy(users.utmMedium)
    .orderBy(desc(count()));
  const mediumBreakdown = mediumRows.map(r => ({ medium: r.medium!, count: Number(r.cnt) }));

  return { total, facebook, google, organic, other, breakdown, campaignBreakdown, mediumBreakdown };
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

/**
 * Force-expire all existing sessions for a user by setting forcedLogoutAt
 * to the current timestamp (ms). Any JWT with iat < forcedLogoutAt will be
 * rejected by the auth middleware on the next request.
 */
export async function adminForceLogoutUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ forcedLogoutAt: Date.now() })
    .where(eq(users.id, userId));
}

/**
 * Clear the forced-logout flag so the user can log in again normally.
 * (Useful if the admin wants to re-allow access after a forced logout.)
 */
export async function adminClearForcedLogout(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ forcedLogoutAt: null })
    .where(eq(users.id, userId));
}

// ─── Referral Links Admin ─────────────────────────────────────────────────────

/** List all referral links ordered by creation date (newest first). */
export async function adminListReferralLinks(): Promise<ReferralLink[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referralLinks).orderBy(desc(referralLinks.createdAt));
}

/** Create a new referral link. code must be unique. */
export async function adminCreateReferralLink(
  data: { code: string; label: string; source: string }
): Promise<ReferralLink> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .insert(referralLinks)
    .values({ code: data.code, label: data.label, source: data.source })
    .returning();
  return row;
}

/** Toggle the isActive flag of a referral link. */
export async function adminToggleReferralLink(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referralLinks).set({ isActive }).where(eq(referralLinks.id, id));
}

/** Delete a referral link permanently. */
export async function adminDeleteReferralLink(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(referralLinks).where(eq(referralLinks.id, id));
}

/**
 * Atomically increment the click counter for a referral link by code.
 * Returns the updated row, or null if the code does not exist / is inactive.
 */
export async function incrementReferralLinkClicks(
  code: string
): Promise<ReferralLink | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .update(referralLinks)
    .set({ clicks: sql`${referralLinks.clicks} + 1` })
    .where(and(eq(referralLinks.code, code), eq(referralLinks.isActive, true)))
    .returning();
  return row ?? null;
}

/**
 * Return per-link stats: clicks + registrations attributed to each source.
 * A registration is attributed when users.referralSource matches the link's source.
 */
export async function adminGetReferralLinkStats() {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(referralLinks).orderBy(desc(referralLinks.createdAt));
  if (links.length === 0) return [];
  // Count registrations per source in one query
  const regRows = await db
    .select({ source: users.referralSource, total: count() })
    .from(users)
    .where(isNotNull(users.referralSource))
    .groupBy(users.referralSource);
  const regMap = new Map(regRows.map((r) => [r.source, Number(r.total)]));
  return links.map((link) => ({
    ...link,
    registrations: regMap.get(link.source) ?? 0,
    conversionRate:
      link.clicks > 0
        ? Math.round(((regMap.get(link.source) ?? 0) / link.clicks) * 100)
        : 0,
  }));
}

// ─── Notification Log helpers (re-exported from db.ts for admin router) ───────
export {
  getJobsWithNotificationStats,
  getNotificationLogsForJob,
  getNotificationBatchSummaryForJob,
} from "./db";

// ─── Employers Admin ──────────────────────────────────────────────────────────
/**
 * Returns all users whose userMode = 'employer', enriched with job-posting stats.
 * Uses a LEFT JOIN + GROUP BY so users with 0 jobs are still included.
 */
export async function adminGetAllEmployers(limit = 300) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  const rows = await db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      totalJobs: count(jobs.id),
      activeJobs: sql<number>`SUM(CASE WHEN ${jobs.status} = 'active' AND (${jobs.expiresAt} IS NULL OR ${jobs.expiresAt} > ${now}) THEN 1 ELSE 0 END)`,
    })
    .from(users)
    .leftJoin(jobs, eq(jobs.postedBy, users.id))
    .where(eq(users.userMode, "employer"))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    totalJobs: Number(r.totalJobs),
    activeJobs: Number(r.activeJobs ?? 0),
  }));
}

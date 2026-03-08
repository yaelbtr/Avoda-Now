import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  checkAndIncrementSendRate,
  checkAndIncrementVerifyAttempts,
  countActiveJobsByUser,
  createJob,
  deleteJob,
  getActiveJobs,
  getJobById,
  getJobsNearLocation,
  getMyJobs,
  getTodayJobs,
  getUrgentJobs,
  markJobFilled,
  setWorkerAvailable,
  setWorkerUnavailable,
  getWorkerAvailability,
  getNearbyWorkers,
  createUserByPhone,
  getUserByPhone,
  reportJob,
  resetRateLimit,
  updateJob,
  updateJobStatus,
  updateUserLastSignedIn,
  getLiveStats,
  getActivityFeed,
  setUserMode,
  getUserMode,
  getWorkerProfile,
  getPublicWorkerProfile,
  updateWorkerProfile,
  clearUserMode,
  getWorkersMatchingJob,
  getMyJobsWithPendingCounts,
  getMyApplications,
  createApplication,
  getApplicationByWorkerAndJob,
  getApplicationById,
  getApplicationsForJob,
  getApplicationsForJobWithDistance,
  revealApplicationContact,
  updateApplicationStatus,
  getUnreadApplicationsCount,
  savePushSubscription,
  deletePushSubscriptionByEndpoint,
} from "./db";
import { sendJobAlerts } from "./sms";
import { sendPushToUser } from "./webPush";
import {
  adminApproveJob,
  adminBlockUser,
  adminCancelBatch,
  adminClearJobReports,
  adminDeleteJob,
  adminGetAllApplications,
  adminGetAllBatches,
  adminGetAllJobs,
  adminGetAllReports,
  adminGetAllUsers,
  adminGetBatchById,
  adminGetReportedJobs,
  adminGetStats,
  adminRejectJob,
  adminSetJobStatus,
  adminSetUserRole,
  adminUnblockUser,
} from "./adminDb";
import {
  isValidIsraeliPhone,
  normalizeIsraeliPhone,
  smsProvider,
} from "./smsProvider";
import { adminProcedure } from "./_core/trpc";

// ─── OTP Auth ────────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  /**
   * Step 1: Send OTP via Twilio Verify.
   * Normalizes phone to E.164, enforces rate limits, then calls Twilio.
   */
  sendOtp: publicProcedure
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .mutation(async ({ input, ctx }) => {
      // Normalize to E.164
      let phone: string;
      try {
        phone = normalizeIsraeliPhone(input.phone);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין. הכנס מספר ישראלי תקין." });
      }

      if (!isValidIsraeliPhone(phone)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין. הכנס מספר נייד ישראלי." });
      }

      // IP-based + phone-based rate limiting
      const ip = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        ?? ctx.req.socket?.remoteAddress
        ?? "unknown";

      const allowed = await checkAndIncrementSendRate(phone, ip);
      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "שלחת יותר מדי בקשות. נסה שוב בעוד שעה.",
        });
      }

      // Send via Twilio Verify
      const result = await smsProvider.sendOtp(phone);
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "לא ניתן לשלוח קוד כרגע. נסו שוב בעוד מספר דקות.",
        });
      }

      return { success: true, phone };
    }),

  /**
   * Step 2: Verify OTP via Twilio Verify.
   * On success, creates or updates user and issues a session JWT.
   */
  verifyOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(9).max(20),
        code: z.string().min(4).max(8),
        name: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Normalize phone
      let phone: string;
      try {
        phone = normalizeIsraeliPhone(input.phone);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין" });
      }

      // Check verify attempt rate limit
      const attemptAllowed = await checkAndIncrementVerifyAttempts(phone);
      if (!attemptAllowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "מספר הניסיונות המרבי הגיע. בקש קוד חדש.",
        });
      }

      // Verify with Twilio
      const result = await smsProvider.verifyOtp(phone, input.code);

      if (!result.success || !result.approved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error ?? "קוד האימות שגוי.",
        });
      }

      // Reset rate limit on success
      await resetRateLimit(phone);

      // Find or create user
      let user = await getUserByPhone(phone);
      if (!user) {
        user = await createUserByPhone(phone, input.name);
      } else {
        await updateUserLastSignedIn(user.id);
      }

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "שגיאה ביצירת משתמש" });
      }

      // Issue session JWT using the same format sdk.verifySession expects:
      // { openId, appId, name } — must match SDKServer.verifySession field checks
      const token = await sdk.signSession(
        {
          openId: user.openId,
          appId: ENV.appId,
          name: user.name ?? user.phone ?? "",
        },
        { expiresInMs: 30 * 24 * 60 * 60 * 1000 } // 30 days
      );

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return { success: true, user };
    }),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const jobInputSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5),
  category: z.enum([
    "delivery", "warehouse", "agriculture", "kitchen", "cleaning",
    "security", "construction", "childcare", "eldercare", "retail",
    "events", "volunteer", "emergency_support", "passover_jobs", "reserve_families", "other",
  ]),
  address: z.string().min(2),
  city: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  salary: z.number().optional(),
  salaryType: z.enum(["hourly", "daily", "monthly", "volunteer"]).default("hourly"),
  contactPhone: z.string().min(9).optional(),
  contactName: z.string().min(2),
  businessName: z.string().optional(),
  workingHours: z.string().optional(),
  startTime: z.enum(["today", "tomorrow", "this_week", "flexible"]).default("flexible"),
  workersNeeded: z.number().int().min(1).default(1),
  activeDuration: z.enum(["1", "3", "7"]).default("1"),
  isUrgent: z.boolean().default(false),
  isLocalBusiness: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  jobTags: z.array(z.string()).optional(),
  /** ISO string for exact start date/time */
  startDateTime: z.string().datetime({ offset: true }).optional(),
});

const jobsRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const jobs = await getActiveJobs(input.limit ?? 50, input.category);
      if (!ctx.user) return jobs.map(j => ({ ...j, contactPhone: null }));
      return jobs;
    }),

  search: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().default(10),
        category: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const jobs = await getJobsNearLocation(input.lat, input.lng, input.radiusKm, input.category, input.limit ?? 50);
      if (!ctx.user) return jobs.map(j => ({ ...j, contactPhone: null }));
      return jobs;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      // Never expose phone to unauthenticated users
      if (!ctx.user) return { ...job, contactPhone: null };
      return job;
    }),

  create: protectedProcedure
    .input(jobInputSchema)
    .mutation(async ({ input, ctx }) => {
      // Enforce active job limit (max 3 per user)
      const activeCount = await countActiveJobsByUser(ctx.user.id);
      if (activeCount >= 3) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "הגעת למגבלת 3 משרות פעילות. סגור משרה קיימת כדי לפרסם חדשה.",
        });
      }
      // Phone must come from the authenticated user — never trust client-supplied phone
      const contactPhone = ctx.user.phone ?? input.contactPhone;
      if (!contactPhone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "לא נמצא מספר טלפון בחשבונך. אנא התחבר מחדש.",
        });
      }

      // Urgent jobs expire in 12h, normal jobs use activeDuration (default 1 day)
      const durationDays = parseInt(input.activeDuration);
      const expiresMs = input.isUrgent
        ? 12 * 60 * 60 * 1000
        : durationDays * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + expiresMs);
      const city = input.city ?? input.address.split(",")[0].trim();

      const job = await createJob({
        ...input,
        contactPhone, // always from authenticated user
        city,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        salary: input.salary?.toString(),
        expiresAt,
        isUrgent: input.isUrgent ?? false,
        isLocalBusiness: input.isLocalBusiness ?? false,
        showPhone: input.showPhone ?? false,
        startDateTime: input.startDateTime ? new Date(input.startDateTime) : null,
        postedBy: ctx.user.id,
        status: "active",
        jobTags: input.jobTags ?? [input.category],
      });

      // Fire-and-forget: notify matching workers via SMS (does not block the response)
      getWorkersMatchingJob(input.category, city, ctx.user.id)
        .then((workers) =>
          sendJobAlerts(
            workers,
            { title: input.title, city, category: input.category, isUrgent: input.isUrgent ?? false, id: job.id }
          )
        )
        .then((sent) => {
          if (sent > 0) console.log(`[JobAlert] Sent SMS to ${sent} matching workers for job #${job.id}`);
        })
        .catch((err) => console.warn("[JobAlert] Error sending job alerts:", err));

      return job;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: jobInputSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const updateData: Record<string, unknown> = { ...input.data };
      if (input.data.latitude !== undefined) updateData.latitude = input.data.latitude.toString();
      if (input.data.longitude !== undefined) updateData.longitude = input.data.longitude.toString();
      if (input.data.salary !== undefined) updateData.salary = input.data.salary?.toString();
      await updateJob(input.id, ctx.user.id, updateData as Parameters<typeof updateJob>[2]);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["active", "closed", "expired", "under_review"]) }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateJobStatus(input.id, ctx.user.id, input.status);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteJob(input.id, ctx.user.id);
      return { success: true };
    }),

  myJobs: protectedProcedure.query(async ({ ctx }) => getMyJobs(ctx.user.id)),

  /** Employer's jobs with pending applicant count per job */
  myJobsWithPendingCounts: protectedProcedure.query(async ({ ctx }) =>
    getMyJobsWithPendingCounts(ctx.user.id)
  ),

  /** Worker's own applications with job info and status */
  myApplications: protectedProcedure.query(async ({ ctx }) =>
    getMyApplications(ctx.user.id)
  ),
  /** Count of unread application status updates since lastSeenAt */
  unreadApplicationsCount: protectedProcedure
    .input(z.object({ lastSeenAt: z.date() }))
    .query(async ({ ctx, input }) =>
      getUnreadApplicationsCount(ctx.user.id, input.lastSeenAt)
    ),

  /** Jobs starting within the next 24 hours */
  listToday: publicProcedure
    .input(z.object({ category: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const jobs = await getTodayJobs(input.limit ?? 50, input.category);
      if (!ctx.user) return jobs.map(j => ({ ...j, contactPhone: null }));
      return jobs;
    }),

  /** Urgent jobs (isUrgent=true), sorted by newest */
  listUrgent: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const jobs = await getUrgentJobs(input.limit ?? 20);
      if (!ctx.user) return jobs.map(j => ({ ...j, contactPhone: null }));
      return jobs;
    }),

  /** Mark a job as filled — only the job owner can do this */
  markFilled: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.postedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await markJobFilled(input.id, ctx.user.id);
      return { success: true };
    }),

  report: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        reason: z.string().max(200).optional(),
        reporterPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const ip =
        ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] ??
        ctx.req.socket?.remoteAddress ??
        "unknown";
      await reportJob({ jobId: input.jobId, reason: input.reason, reporterPhone: input.reporterPhone, reporterIp: ip });
      return { success: true };
    }),

  /** Worker applies to a job — records application and sends SMS to employer */
  applyToJob: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        message: z.string().max(500).optional(),
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      if (job.status !== "active" && job.status !== "under_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "משרה זו אינה פעילה" });
      }

      // Prevent duplicate applications
      const existing = await getApplicationByWorkerAndJob(ctx.user.id, input.jobId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "כבר הגשת מועמדות למשרה זו" });
      }

      // Record the application
      await createApplication(ctx.user.id, input.jobId, input.message);

      // Batched notification: collect applications for 10 min, then send one summary SMS.
      // If BATCH_THRESHOLD (3) applicants arrive before the window closes, send immediately.
      if (job.contactPhone) {
        import("./notificationBatcher").then(({ recordApplicationAndNotify }) => {
          recordApplicationAndNotify(input.jobId, job.contactPhone!).catch((err) =>
            console.warn("[Apply] Batch notification error:", err)
          );
        }).catch((err) => console.warn("[Apply] Batcher import error:", err));
      }

      return { success: true };
    }),

  /** Get applications for a job sorted by distance (employer view) */
  getJobApplications: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      if (job.postedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "אין הרשאה" });
      const rows = await getApplicationsForJobWithDistance(
        input.jobId,
        job.latitude,
        job.longitude
      );
      // Strip phone for non-accepted applicants
      return rows.map((r) => ({
        ...r,
        workerPhone: r.contactRevealed ? r.workerPhone : null,
      }));
    }),

  /** Get applications for a job (employer view) */
  getApplications: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const apps = await getApplicationsForJob(input.jobId);
      // Strip phone unless the employer has already accepted (contactRevealed)
      return apps.map((a) => ({
        ...a,
        workerPhone: a.contactRevealed ? a.workerPhone : null,
      }));
    }),

  /**
   * Accept or reject an application.
   * Accept: sets status=accepted, contactRevealed=true, revealedAt=now → phone revealed.
   * Reject: sets status=rejected.
   * Only the job owner can call this.
   */
  updateApplicationStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      action: z.enum(["accept", "reject"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "מועמדות לא נמצאה" });
      if (app.jobPostedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "אין לך גישה לפעולה זו" });
      }
      await updateApplicationStatus(input.id, input.action);

      // Send Web Push notification to the worker
      if (app.workerId) {
        const isAccepted = input.action === "accept";
        sendPushToUser(app.workerId, {
          title: isAccepted ? "🎉 מועמדותך התקבלה!" : "עדכון מועמדות",
          body: isAccepted
            ? `מזל טוב! המעסיק קיבל את מועמדותך למשרה "${app.jobTitle}"`
            : `מועמדותך למשרה "${app.jobTitle}" לא התקבלה`,
          url: "/my-applications",
        }).catch((e) => console.error("[WebPush] send failed:", e));
      }

      return {
        success: true,
        // Return phone only when accepting
        workerPhone: input.action === "accept" ? app.workerPhone : null,
      };
    }),

  /** Check if current user has already applied to a job */
  checkApplied: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const existing = await getApplicationByWorkerAndJob(ctx.user.id, input.jobId);
      return { applied: !!existing };
    }),

  /**
   * Get a single application by ID.
   * Returns worker profile + contactRevealed state.
   * Only the job owner (employer) can access.
   * Phone number is only returned if contactRevealed = true.
   */
  getApplication: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const app = await getApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "מועמדות לא נמצאה" });
      if (app.jobPostedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "אין לך גישה למועמדות זו" });
      }
      return {
        ...app,
        // Only expose phone if employer has already revealed contact
        workerPhone: app.contactRevealed ? app.workerPhone : null,
      };
    }),

  /**
   * Reveal contact details for an application.
   * Sets contactRevealed = true, revealedAt = now.
   * Only the job owner can call this.
   */
  revealContact: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const app = await getApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "מועמדות לא נמצאה" });
      if (app.jobPostedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "אין לך גישה לפעולה זו" });
      }
      await revealApplicationContact(input.id);
      // Return the phone number now that it's been revealed
      return { success: true, workerPhone: app.workerPhone };
    }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────

const adminRouter = router({
  /** Dashboard statistics */
  stats: adminProcedure.query(async () => adminGetStats()),

  /** All jobs with optional status filter */
  listJobs: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => adminGetAllJobs(input.limit ?? 100, input.status)),

  /** Jobs under review (reported 3+ times) */
  reportedJobs: adminProcedure.query(async () => adminGetReportedJobs()),

  /** Approve a job — set status=active, clear report count */
  approveJob: adminProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => { await adminApproveJob(input.jobId); return { success: true }; }),

  /** Reject/hide a job — set status=closed */
  rejectJob: adminProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => { await adminRejectJob(input.jobId); return { success: true }; }),

  /** Delete any job */
  deleteJob: adminProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => { await adminDeleteJob(input.jobId); return { success: true }; }),

  /** Set any job status */
  setJobStatus: adminProcedure
    .input(z.object({ jobId: z.number(), status: z.enum(["active", "closed", "expired", "under_review"]) }))
    .mutation(async ({ input }) => { await adminSetJobStatus(input.jobId, input.status); return { success: true }; }),

  /** All reports with job info */
  listReports: adminProcedure.query(async () => adminGetAllReports()),

  /** Clear reports for a job after resolving */
  clearReports: adminProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => { await adminClearJobReports(input.jobId); return { success: true }; }),

  /** All users */
  listUsers: adminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => adminGetAllUsers(input.limit ?? 200)),

  /** Block a user */
  blockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => { await adminBlockUser(input.userId); return { success: true }; }),

  /** Unblock a user */
  unblockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => { await adminUnblockUser(input.userId); return { success: true }; }),

  /** Set user role */
  setUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => { await adminSetUserRole(input.userId, input.role); return { success: true }; }),

  // ── Applications Admin ────────────────────────────────────────────────────

  /** All applications with worker + job info */
  listApplications: adminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => adminGetAllApplications(input.limit ?? 300)),

  // ── Notification Batches Admin ────────────────────────────────────────────

  /** All notification batches with job title */
  listBatches: adminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => adminGetAllBatches(input.limit ?? 300)),

  /** Force-flush a pending batch immediately */
  flushBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input }) => {
      const batch = await adminGetBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      if (batch.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch is not pending" });
      // Use the batcher's flush logic (handles markBatchSent + SMS)
      const { flushBatchAdmin } = await import("./notificationBatcher");
      await flushBatchAdmin(batch.id, batch.jobId, batch.employerPhone, batch.pendingCount);
      return { success: true };
    }),

  /** Cancel a pending batch (suppress the notification) */
  cancelBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input }) => {
      await adminCancelBatch(input.batchId);
      return { success: true };
    }),
});
// ─── Workers Router ───────────────────────────────────────────────────────────

const workersRouter = router({
  /** Set current user as available to work */
  setAvailable: protectedProcedure
    .input(z.object({
      latitude: z.number(),
      longitude: z.number(),
      city: z.string().optional(),
      note: z.string().max(200).optional(),
      durationHours: z.number().default(4),
    }))
    .mutation(async ({ input, ctx }) => {
      const availableUntil = new Date(Date.now() + input.durationHours * 60 * 60 * 1000);
      await setWorkerAvailable({
        userId: ctx.user.id,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        city: input.city ?? null,
        note: input.note ?? null,
        availableUntil,
      });
      return { success: true, availableUntil };
    }),

  /** Remove current user's availability */
  setUnavailable: protectedProcedure
    .mutation(async ({ ctx }) => {
      await setWorkerUnavailable(ctx.user.id);
      return { success: true };
    }),

  /** Get current user's availability status */
  myStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const status = await getWorkerAvailability(ctx.user.id);
      return status;
    }),

  /** Get available workers near a location (for employers) */
  nearby: publicProcedure
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      radiusKm: z.number().default(20),
      limit: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const workers = await getNearbyWorkers(input.lat, input.lng, input.radiusKm, input.limit ?? 50);
      // Only show phone to authenticated users
      if (!ctx.user) return workers.map(w => ({ ...w, userPhone: null }));
      return workers;
    }),
});

//// ─── Live Stats Router ─────────────────────────────────────────────────────

const liveStatsRouter = router({
  /** Real-time platform stats: available workers, new jobs last hour, urgent jobs */
  stats: publicProcedure.query(async () => {
    return getLiveStats();
  }),

  /** Recent activity feed for the ticker: new jobs + newly available workers */
  feed: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      return getActivityFeed(input?.limit ?? 20);
    }),
});

// ─── User Mode Router ───────────────────────────────────────────────

const userRouter = router({
  getMode: protectedProcedure.query(async ({ ctx }) => {
    const mode = await getUserMode(ctx.user.id);
    return { mode };
  }),
  setMode: protectedProcedure
    .input(z.object({ mode: z.enum(["worker", "employer"]) }))
    .mutation(async ({ ctx, input }) => {
      await setUserMode(ctx.user.id, input.mode);
      return { success: true };
    }),

  /** Reset the user's mode so the role selection screen is shown again */
  resetMode: protectedProcedure.mutation(async ({ ctx }) => {
    await clearUserMode(ctx.user.id);
    return { success: true };
  }),

  /** Get the current user's worker profile */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getWorkerProfile(ctx.user.id);
    return profile;
  }),

  /** Get a public worker profile by user ID (for employers viewing applicants) */
  getPublicProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const profile = await getPublicWorkerProfile(input.userId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "פרופיל לא נמצא" });
      return profile;
    }),

  /** Update the current user's worker profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        preferredCategories: z.array(z.string()).optional(),
        preferredCity: z.string().max(100).nullable().optional(),
        workerBio: z.string().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateWorkerProfile(ctx.user.id, {
        name: input.name,
        preferredCategories: input.preferredCategories,
        preferredCity: input.preferredCity,
        workerBio: input.workerBio,
      });
      return { success: true };
    }),
});

// ─── Push Notifications Router ─────────────────────────────────────────────

const pushRouter = router({
  /** Subscribe current user to Web Push notifications */
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await savePushSubscription({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      });
      return { success: true };
    }),

  /** Unsubscribe (remove) a push subscription by endpoint */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input }) => {
      await deletePushSubscriptionByEndpoint(input.endpoint);
      return { success: true };
    }),

  /** Return the VAPID public key for the client to use when subscribing */
  vapidKey: publicProcedure.query(() => ({
    publicKey: ENV.vapidPublicKey ?? "",
  })),
});

// ─── App Router ─────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  jobs: jobsRouter,
  workers: workersRouter,
  admin: adminRouter,
  live: liveStatsRouter,
  user: userRouter,
  push: pushRouter,
});

export type AppRouter = typeof appRouter;

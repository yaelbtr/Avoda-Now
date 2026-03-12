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
  getNotificationPrefs,
  updateNotificationPrefs,
  markEmployerApplicationsViewed,
  getCities,
  searchCities,
  getPhonePrefixes,
  isValidPhonePrefix,
  saveJob,
  unsaveJob,
  getSavedJobIds,
  getSavedJobs,
  updateUserPhone,
  logPhoneChange,
  countRecentPhoneChangeFailures,
  rateWorker,
  getExistingRating,
  getWorkerReviews,
  getJobCountByCityAndCategory,
  getActiveCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
  seedCategoriesIfEmpty,
  getRegions,
  getActiveRegionCities,
  getRegionBySlug,
  getRegionById,
  findNearestRegion,
  associateWorkerWithRegion,
  syncWorkerRegions,
  createRegion,
  deleteRegion,
  getWorkersByRegion,
  updateRegionStatus,
  updateRegion,
  seedRegionsIfEmpty,
  recountRegionWorkers,
  checkRegionActiveForJob,
  requestRegionNotification,
  getMyRegionNotificationRequests,
  getRegionNotificationSubscribers,
  cancelRegionNotification,
  getWorkerRegionStatus,
  applyReferral,
  getReferralsByUser,
  getReferralCount,
  getAllReferrals,
  withdrawApplication,
  getSystemSetting,
  setSystemSetting,
  isMaintenanceModeActive,
  getMaintenanceMessage,
  getHeroStats,
} from "./db";
import { sendJobAlerts } from "./sms";
import { sendPushToUser, sendJobPushNotifications } from "./webPush";
import {
  adminApproveJob,
  adminBlockUser,
  adminCancelBatch,
  adminGetPhoneChangeLockoutStatus,
  adminClearPhoneChangeLockout,
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
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from "./adminDb";
import {
  isValidIsraeliPhone,
  normalizeIsraeliPhone,
  smsProvider,
} from "./smsProvider";
import { adminProcedure } from "./_core/trpc";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

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

      // Test-user bypass: if this phone belongs to a 'test' role user, skip SMS entirely
      const existingUser = await getUserByPhone(phone);
      if (existingUser?.role === "test") {
        return { success: true, phone, testBypass: true };
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
          message: result.error ?? "לא ניתן לשלוח קוד כרגע. נסוו שוב בעוד מספר דקות.",
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
        email: z.string().email().max(320).optional(),
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

      // Test-user bypass: check if this phone belongs to a 'test' role user
      // Test users authenticate with the first 6 digits of their phone number
      const testUserCheck = await getUserByPhone(phone);
      if (testUserCheck?.role === "test") {
        // Extract first 6 digits from the E.164 phone number (e.g. +972501234567 → "972501")
        const first6 = phone.replace(/\D/g, "").slice(0, 6);
        if (input.code !== first6) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "קוד האימות שגוי. הכנס את 6 הספרות הראשונות של הטלפון.",
          });
        }
        // Bypass Twilio — issue session directly
        await updateUserLastSignedIn(testUserCheck.id);
        const tokenTest = await sdk.signSession(
          { openId: testUserCheck.openId, appId: ENV.appId, name: testUserCheck.name ?? testUserCheck.phone ?? "" },
          { expiresInMs: 30 * 24 * 60 * 60 * 1000 }
        );
        const cookieOptionsTest = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, tokenTest, cookieOptionsTest);
        return { success: true, user: testUserCheck };
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
        user = await createUserByPhone(phone, input.name, input.email);
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
  /** Location mode for worker search: radius around job location or specific city */
  jobLocationMode: z.enum(["radius", "city"]).default("radius"),
  /** Search radius in km when jobLocationMode = radius */
  jobSearchRadiusKm: z.number().int().min(1).max(100).default(5),
  /** Hourly rate in ILS (e.g. 70 for 70₪/hour) */
  hourlyRate: z.number().min(0).max(10000).optional(),
  /** Estimated number of hours for the job (e.g. 4) */
  estimatedHours: z.number().min(0.5).max(24).optional(),
  /** Specific date for the job in YYYY-MM-DD format */
  jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Work start time in HH:MM format */
  workStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  /** Work end time in HH:MM format */
  workEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  /** Up to 5 S3 image URLs uploaded by the employer */
  imageUrls: z.array(z.string().url()).max(5).optional(),
});

const jobsRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      /** Multi-category filter — takes precedence over category when provided */
      categories: z.array(z.string().min(1)).max(20).optional(),
      limit: z.number().int().min(1).max(50).optional(),
      city: z.string().optional(),
      /** Multi-city filter — takes precedence over city when provided */
      cities: z.array(z.string().min(1)).max(20).optional(),
      dateFilter: z.enum(["today", "tomorrow", "this_week"]).optional(),
      page: z.number().int().min(1).default(1),
      /** Day-of-week filter: JS convention 0=Sun, 1=Mon, ..., 6=Sat */
      dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    }))
    .query(async ({ input }) => {
      const limit = input.limit ?? 10;
      const offset = (input.page - 1) * limit;
      const { rows, total } = await getActiveJobs(limit, input.category, input.city, input.dateFilter, offset, input.dayOfWeek, input.cities, input.categories);
      return { jobs: rows.map(j => ({ ...j, contactPhone: null })), total, page: input.page, limit };
    }),

  search: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().default(10),
        category: z.string().optional(),
        /** Multi-category filter — takes precedence over category when provided */
        categories: z.array(z.string().min(1)).max(20).optional(),
        limit: z.number().int().min(1).max(50).optional(),
        city: z.string().optional(),
        /** Multi-city filter — takes precedence over city when provided */
        cities: z.array(z.string().min(1)).max(20).optional(),
        dateFilter: z.enum(["today", "tomorrow", "this_week"]).optional(),
        page: z.number().int().min(1).default(1),
        /** Day-of-week filter: JS convention 0=Sun, 1=Mon, ..., 6=Sat */
        dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      })
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? 10;
      const offset = (input.page - 1) * limit;
      const { rows, total } = await getJobsNearLocation(input.lat, input.lng, input.radiusKm, input.category, limit, input.city, input.dateFilter, offset, input.dayOfWeek, input.cities, input.categories);
      return { jobs: rows.map(j => ({ ...j, contactPhone: null })), total, page: input.page, limit };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      // Never expose contactPhone to workers or unauthenticated users
      return { ...job, contactPhone: null };
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

      // ── Regional access control: block posting if region is not yet active ──
      // Admins bypass the regional check
      if (ctx.user.role !== "admin") {
        const regionCheck = await checkRegionActiveForJob(input.latitude, input.longitude);
        if (!regionCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `האזור עדיין בהרצה ונפתח בקרוב למעסיקים.`,
            cause: {
              regionId: regionCheck.regionId,
              regionName: regionCheck.regionName,
              regionSlug: regionCheck.regionSlug,
            },
          });
        }
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
      // Extract city from address: use the last meaningful part (city name)
      // e.g. "הירקון/מבצע קדש, תל אביב" → "תל אביב"
      const extractCityFromAddress = (addr: string): string => {
        const parts = addr.split(",").map(p => p.trim()).filter(Boolean);
        // Last part is usually the city; skip country/zip if present
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          // Skip parts that look like country names or zip codes
          if (/^\d+$/.test(part)) continue; // zip code
          if (part === "ישראל" || part === "Israel") continue;
          return part;
        }
        return parts[0] ?? addr;
      };
      const city = input.city ?? extractCityFromAddress(input.address);

      const job = await createJob({
        ...input,
        contactPhone, // always from authenticated user
        city,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        salary: input.salary?.toString(),
        hourlyRate: input.hourlyRate?.toString(),
        estimatedHours: input.estimatedHours?.toString(),
        expiresAt,
        isUrgent: input.isUrgent ?? false,
        isLocalBusiness: input.isLocalBusiness ?? false,
        showPhone: input.showPhone ?? false,
        startDateTime: input.startDateTime ? new Date(input.startDateTime) : null,
        postedBy: ctx.user.id,
        status: "active",
        jobTags: input.jobTags ?? [input.category],
        jobLocationMode: input.jobLocationMode ?? "radius",
        jobSearchRadiusKm: input.jobSearchRadiusKm ?? 5,
        jobDate: input.jobDate ?? null,
        workStartTime: input.workStartTime ?? null,
        workEndTime: input.workEndTime ?? null,
        imageUrls: input.imageUrls ?? null,
      });
      // Fire-and-forget: call external matching API to pre-compute matching workers
      const MATCHING_API_URL = process.env.MATCHING_API_URL;
      if (MATCHING_API_URL) {
        fetch(`${MATCHING_API_URL}/match-workers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: job.id,
            job_description: input.description,
            latitude: input.latitude,
            longitude: input.longitude,
            city: city,
            location_mode: input.jobLocationMode ?? "radius",
          }),
        }).catch((err) => console.warn("[MatchAPI] Pre-compute call failed:", err));
      }
      // Fire-and-forget: notify matching workers via SMS + Web Push (does not block the response)
      const jobMeta = { title: input.title, city, category: input.category, isUrgent: input.isUrgent ?? false, id: job.id };
      getWorkersMatchingJob(input.category, city, ctx.user.id)
        .then(async (workers) => {
          // SMS alerts
          const smsSent = await sendJobAlerts(workers, jobMeta);
          if (smsSent > 0) console.log(`[JobAlert] Sent SMS to ${smsSent} matching workers for job #${job.id}`);
          // Web Push notifications — fan-out to all matching workers who have subscriptions
          const workerIds = workers.map((w) => w.id);
          if (workerIds.length > 0) {
            const pushSent = await sendJobPushNotifications(workerIds, jobMeta);
            if (pushSent > 0) console.log(`[JobAlert] Sent Push to ${pushSent} matching workers for job #${job.id}`);
          }
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

      // When job is closed, notify employer to rate accepted workers
      if (input.status === "closed") {
        try {
          const allApps = await getApplicationsForJob(input.id);
          const acceptedWorkers = allApps.filter((a) => a.status === "accepted");
          if (acceptedWorkers.length > 0) {
            const workerNames = acceptedWorkers.map((a) => a.workerName ?? "עובד").join(", ");
            await sendPushToUser(ctx.user.id, {
              title: "⭐ דרגו את העובדים שלכם",
              body: `המשרה "${job.title}" הסתיימה. דרגו את: ${workerNames}`,
              url: `/my-jobs/${input.id}/applications`,
            });
          }
        } catch (e) {
          // Non-critical — don't fail the mutation
          console.error("[Rating notification] Failed:", e);
        }
      }

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
  /** Total count of pending (unreviewed) applications across all employer's jobs */
  totalPendingApplications: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await getMyJobsWithPendingCounts(ctx.user.id);
    const total = jobs.reduce((sum, j) => sum + (j.pendingCount ?? 0), 0);
    return { total };
  }),

  /** Mark all pending applications for employer's jobs as viewed (resets badge count) */
  markApplicationsViewed: protectedProcedure.mutation(async ({ ctx }) => {
    await markEmployerApplicationsViewed(ctx.user.id);
    return { success: true };
  }),
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
      // Never expose contactPhone to workers or unauthenticated users
      return jobs.map(j => ({ ...j, contactPhone: null }));
    }),

  /** Urgent jobs (isUrgent=true), sorted by newest */
  listUrgent: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const jobs = await getUrgentJobs(input.limit ?? 20);
      // Never expose contactPhone to workers or unauthenticated users
      return jobs.map(j => ({ ...j, contactPhone: null }));
    }),

  /**
   * Call external matching API to get workers matching a job.
   * Returns worker IDs with scores from the external backend.
   */
  matchWorkers: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      if (job.postedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const MATCHING_API_URL = process.env.MATCHING_API_URL;
      if (!MATCHING_API_URL) {
        // Return empty list if no external API configured yet
        return { workers: [] as { worker_id: number; score: number }[] };
      }

      try {
        const res = await fetch(`${MATCHING_API_URL}/match-workers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: job.id,
            job_description: job.description,
            latitude: job.latitude,
            longitude: job.longitude,
            city: job.city,
            location_mode: job.jobLocationMode ?? "radius",
          }),
        });
        if (!res.ok) throw new Error(`Matching API error: ${res.status}`);
        const data = await res.json() as { workers: { worker_id: number; score: number }[] };
        return data;
      } catch (err) {
        console.warn("[MatchWorkers] External API call failed:", err);
        return { workers: [] as { worker_id: number; score: number }[] };
      }
    }),

  /**
   * Send a job offer to a specific worker via external API.
   */
  sendJobOffer: protectedProcedure
    .input(z.object({ jobId: z.number(), workerId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      if (job.postedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const MATCHING_API_URL = process.env.MATCHING_API_URL;
      if (!MATCHING_API_URL) {
        // Stub: log and return success when no external API configured
        console.log(`[JobOffer] Stub: offer job #${input.jobId} to worker #${input.workerId}`);
        return { success: true, stub: true };
      }

      try {
        const res = await fetch(`${MATCHING_API_URL}/job-offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: input.jobId, worker_id: input.workerId }),
        });
        if (!res.ok) throw new Error(`Job offer API error: ${res.status}`);
        // Notify worker via Push
        sendPushToUser(input.workerId, {
          title: "💼 הצעת עבודה חדשה!",
          body: `מעסיק שלח לך הצעת עבודה למשרה: ${job.title}`,
          url: "/my-applications",
        }).catch((e) => console.warn("[JobOffer] Push to worker failed:", e));
        return { success: true, stub: false };
      } catch (err) {
        console.warn("[JobOffer] External API call failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "שגיאה בשליחת ההצעה" });
      }
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

      // Determine employer's notification preferences (only if postedBy is set)
      const employerPrefs = job.postedBy != null
        ? await getNotificationPrefs(job.postedBy)
        : "both";

      // Batched SMS notification (respects prefs)
      if (job.contactPhone && (employerPrefs === "both" || employerPrefs === "sms_only")) {
        import("./notificationBatcher").then(({ recordApplicationAndNotify }) => {
          recordApplicationAndNotify(input.jobId, job.contactPhone!).catch((err) =>
            console.warn("[Apply] Batch notification error:", err)
          );
        }).catch((err) => console.warn("[Apply] Batcher import error:", err));
      }

      // Immediate Push notification to employer (respects prefs)
      if (job.postedBy != null && (employerPrefs === "both" || employerPrefs === "push_only")) {
        const workerName = ctx.user.name ?? "עובד חדש";
        const origin = input.origin ?? "";
        const appUrl = origin ? `${origin}/jobs/${input.jobId}/applications` : `/jobs/${input.jobId}/applications`;
        sendPushToUser(job.postedBy, {
          title: "מועמד חדש! 🎉",
          body: `${workerName} הגיש מועמדות למשרה: ${job.title}`,
          url: appUrl,
        }).catch((err) => console.warn("[Apply] Push to employer error:", err));
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

  /** Worker withdraws their own application. Only allowed if job is still active. */
  withdrawApplication: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await withdrawApplication(input.applicationId, ctx.user.id);
      if (!result.success) {
        const msg = result.reason === "not_found" ? "מועמדות לא נמצאה"
          : result.reason === "job_expired" ? "לא ניתן לבטל מועמדות למשרה שפג תוקפה או נסגרה"
          : "לא ניתן לבטל מועמדות";
        throw new TRPCError({ code: result.reason === "not_found" ? "NOT_FOUND" : "FORBIDDEN", message: msg });
      }
      return { success: true };
    }),

  /** Upload a job image to S3 and return the URL. Max 5 per job. */
  uploadJobImage: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const key = `job-images/${ctx.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
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
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "test"]) }))
    .mutation(async ({ input }) => { await adminSetUserRole(input.userId, input.role); return { success: true }; }),

  /** Manually create a user */
  createUser: adminProcedure
    .input(z.object({
      phone: z.string().min(9),
      name: z.string().optional(),
      role: z.enum(["user", "admin", "test"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const normalized = normalizeIsraeliPhone(input.phone);
      if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין" });
      return adminCreateUser({ phone: normalized, name: input.name, role: input.role });
    }),

  /** Update user fields */
  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(["user", "admin", "test"]).optional(),
      status: z.enum(["active", "suspended"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, ...data } = input;
      if (data.phone) {
        const normalized = normalizeIsraeliPhone(data.phone);
        if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין" });
        data.phone = normalized;
      }
      await adminUpdateUser(userId, data);
      return { success: true };
    }),

  /** Delete a user permanently */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => { await adminDeleteUser(input.userId); return { success: true }; }),

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

  /** Get phone change lockout status for a specific user */
  getPhoneChangeLockoutStatus: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return adminGetPhoneChangeLockoutStatus(input.userId);
    }),

  /** Clear phone change lockout for a specific user (admin action) */
  clearPhoneChangeLockout: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const deletedCount = await adminClearPhoneChangeLockout(input.userId);
      return { success: true, deletedCount };
    }),

  /** Get current maintenance mode status + message */
  getMaintenanceMode: adminProcedure.query(async () => {
    const [active, message] = await Promise.all([
      isMaintenanceModeActive(),
      getMaintenanceMessage(),
    ]);
    return { active, message };
  }),

  /** Toggle maintenance mode on/off */
  setMaintenanceMode: adminProcedure
    .input(z.object({ active: z.boolean() }))
    .mutation(async ({ input }) => {
      await setSystemSetting("maintenanceMode", input.active ? "true" : "false");
      return { success: true, active: input.active };
    }),

  /** Set custom maintenance message shown to users */
  setMaintenanceMessage: adminProcedure
    .input(z.object({ message: z.string().max(500) }))
    .mutation(async ({ input }) => {
      await setSystemSetting("maintenanceMessage", input.message);
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

  /** Counts for the hero banner conditional display (activeJobs, closedJobs, registeredWorkers) */
  heroStats: publicProcedure.query(async () => {
    return getHeroStats();
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

  /** Get all active phone prefixes for the phone input component */
  getPhonePrefixes: publicProcedure.query(async () => {
    return getPhonePrefixes();
  }),

  getCities: publicProcedure.query(async () => {
    return getCities();
  }),

  /** Search cities by name prefix for autocomplete */
  searchCities: publicProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      return searchCities(input.query, 10);
    }),

  /** Get a public worker profile by user ID (for employers viewing applicants) */
  getPublicProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const profile = await getPublicWorkerProfile(input.userId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "פרופיל לא נמצא" });
      return profile;
    }),

  /** Complete the worker onboarding signup flow — saves all required + optional fields at once */
  completeSignup: protectedProcedure
    .input(
      z.object({
        // Required
        name: z.string().min(2).max(100),
        locationMode: z.enum(["city", "radius"]),
        preferredCity: z.string().max(100).nullable().optional(),
        workerLatitude: z.string().nullable().optional(),
        workerLongitude: z.string().nullable().optional(),
        searchRadiusKm: z.number().int().min(1).max(100).nullable().optional(),
        preferredCategories: z.array(z.string()),
        // Optional
        phone: z.string().min(9).max(20).nullable().optional(),
        preferenceText: z.string().max(1000).nullable().optional(),
        expectedHourlyRate: z.number().min(0).max(10000).nullable().optional(),
        workerBio: z.string().max(500).nullable().optional(),
        availabilityStatus: z.enum(["available_now", "available_today", "available_hours", "not_available"]).nullable().optional(),
        preferredDays: z.array(z.string()).optional(),
        preferredTimeSlots: z.array(z.string()).optional(),
        preferredCities: z.array(z.number().int()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Normalize phone if provided (only for OAuth users without phone)
      let normalizedPhone: string | undefined = undefined;
      if (input.phone && ctx.user.loginMethod !== "phone_otp") {
        try {
          normalizedPhone = normalizeIsraeliPhone(input.phone);
          if (!isValidIsraeliPhone(normalizedPhone)) normalizedPhone = undefined;
        } catch { normalizedPhone = undefined; }
      }
      await updateWorkerProfile(ctx.user.id, {
        name: input.name,
        phone: normalizedPhone,
        locationMode: input.locationMode,
        preferredCity: input.preferredCity,
        workerLatitude: input.workerLatitude,
        workerLongitude: input.workerLongitude,
        searchRadiusKm: input.searchRadiusKm ?? undefined,
        preferredCategories: input.preferredCategories,
        preferenceText: input.preferenceText,
        expectedHourlyRate: input.expectedHourlyRate,
        workerBio: input.workerBio,
        availabilityStatus: input.availabilityStatus,
        preferredDays: input.preferredDays,
        preferredTimeSlots: input.preferredTimeSlots,
        preferredCities: input.preferredCities,
        signupCompleted: true,
      });
      return { success: true };
    }),
  /** Update the current user's worker profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().min(9).max(20).nullable().optional(),
        phonePrefix: z.string().length(3).nullable().optional(),
        phoneNumber: z.string().length(7).regex(/^\d{7}$/).nullable().optional(),
        preferredCategories: z.array(z.string()).optional(),
        preferredCity: z.string().max(100).nullable().optional(),
        workerBio: z.string().max(500).nullable().optional(),
        locationMode: z.enum(["city", "radius"]).optional(),
        workerLatitude: z.string().nullable().optional(),
        workerLongitude: z.string().nullable().optional(),
        searchRadiusKm: z.number().int().min(1).max(100).nullable().optional(),
        preferenceText: z.string().max(1000).nullable().optional(),
        workerTags: z.array(z.string().max(50)).max(20).optional(),
        preferredDays: z.array(z.string()).optional(),
        preferredTimeSlots: z.array(z.string()).optional(),
        preferredCities: z.array(z.number().int()).optional(),
        email: z.string().email().max(320).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow phone update for OAuth (Google) users who don't have a phone yet
      // or who logged in via OAuth (not phone OTP)
      let normalizedPhone: string | undefined = undefined;
      if (input.phone !== undefined && input.phone !== null) {
        // Only allow if user authenticated via OAuth (not phone OTP)
        if (ctx.user.loginMethod === "phone_otp") {
          throw new Error("שינוי מספר טלפון אינו מותר למשתמשים שנכנסו עם OTP");
        }
        try {
          normalizedPhone = normalizeIsraeliPhone(input.phone);
          if (!isValidIsraeliPhone(normalizedPhone)) {
            throw new Error("מספר טלפון לא תקין");
          }
        } catch {
          throw new Error("מספר טלפון לא תקין");
        }
      }
      // Validate and save split phone fields
      let phonePrefix: string | undefined = undefined;
      let phoneNumber: string | undefined = undefined;
      if (input.phonePrefix !== undefined && input.phoneNumber !== undefined &&
          input.phonePrefix !== null && input.phoneNumber !== null) {
        const prefixValid = await isValidPhonePrefix(input.phonePrefix);
        if (!prefixValid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "קידומת טלפון לא תקינה" });
        }
        if (!/^\d{7}$/.test(input.phoneNumber)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "מספר הטלפון חייב להכיל בדיוק 7 ספרות" });
        }
        phonePrefix = input.phonePrefix;
        phoneNumber = input.phoneNumber;
        // Also build the combined phone for the phone field
        const combined = `${input.phonePrefix}${input.phoneNumber}`;
        try {
          normalizedPhone = normalizeIsraeliPhone(combined);
          if (!isValidIsraeliPhone(normalizedPhone)) normalizedPhone = undefined;
        } catch { normalizedPhone = undefined; }
      }
      await updateWorkerProfile(ctx.user.id, {
        name: input.name,
        phone: normalizedPhone,
        ...(phonePrefix !== undefined ? { phonePrefix } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber } : {}),
        preferredCategories: input.preferredCategories,
        preferredCity: input.preferredCity,
        workerBio: input.workerBio,
        locationMode: input.locationMode,
        workerLatitude: input.workerLatitude,
        workerLongitude: input.workerLongitude,
        searchRadiusKm: input.searchRadiusKm ?? undefined,
        preferenceText: input.preferenceText,
        workerTags: input.workerTags,
        preferredDays: input.preferredDays,
        preferredTimeSlots: input.preferredTimeSlots,
        preferredCities: input.preferredCities,
        // Only allow email update for non-Google users (Google users get email from OAuth)
        email: ctx.user.loginMethod !== "google_oauth" ? input.email : undefined,
      });

      // ── Multi-region association: sync GPS radius + preferred cities ──
      try {
        const lat = input.workerLatitude ? parseFloat(input.workerLatitude) : null;
        const lng = input.workerLongitude ? parseFloat(input.workerLongitude) : null;
        const searchRadiusKm = input.searchRadiusKm ?? null;
        // Resolve preferred city names from IDs if provided
        let preferredCityNames: string[] = [];
        if (input.preferredCities && input.preferredCities.length > 0) {
          const cityRows = await getCities();
          preferredCityNames = cityRows
            .filter((c) => input.preferredCities!.includes(c.id))
            .map((c) => c.nameHe);
        }
        await syncWorkerRegions(ctx.user.id, {
          lat: lat && !isNaN(lat) ? lat : null,
          lng: lng && !isNaN(lng) ? lng : null,
          searchRadiusKm,
          preferredCityNames,
        });
      } catch (err) {
        console.warn("[Regions] Failed to sync worker regions:", err);
      }

      return { success: true };
    }),

  /** Upload a profile photo to S3 and save the URL */
  uploadProfilePhoto: protectedProcedure
    .input(z.object({
      /** Base64-encoded image data (without data: prefix) */
      base64: z.string(),
      /** MIME type: image/jpeg or image/png */
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const key = `profile-photos/${ctx.user.id}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      await updateWorkerProfile(ctx.user.id, { profilePhoto: url });
      return { url };
    }),

  /** Get the current user's notification preferences */
  getNotificationPrefs: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await getNotificationPrefs(ctx.user.id);
    return { prefs };
  }),

  /** Update the current user's notification preferences */
  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        prefs: z.enum(["both", "push_only", "sms_only", "none"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateNotificationPrefs(ctx.user.id, input.prefs);
      return { success: true };
    }),

  /**
   * Step 1 of phone change: send OTP to the new phone number via SMS.
   * If SMS fails and user has email, offers email fallback.
   * Enforces lockout after 5 failed verify attempts in last hour.
   */
  requestPhoneChangeOtp: protectedProcedure
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        ?? ctx.req.socket?.remoteAddress ?? "unknown";

      const normalized = normalizeIsraeliPhone(input.phone);
      if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "מספר הטלפון אינו תקין" });

      // Check lockout: if user had 5+ failed verify attempts in last hour
      const recentFailures = await countRecentPhoneChangeFailures(ctx.user.id);
      if (recentFailures >= 5) {
        await logPhoneChange({ userId: ctx.user.id, oldPhone: ctx.user.phone, newPhone: normalized, ipAddress: ip, result: "locked" });
        // Notify owner about lockout
        notifyOwner({ title: "נעילת חשבון — שינוי טלפון", content: `משתמש ${ctx.user.id} (${ctx.user.phone ?? "unknown"}) נחסם לאחר 5 ניסיונות כושלים. IP: ${ip}` }).catch(() => {});
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "החשבון נעול זמנית לשינוי טלפון. נסה שוב בעוד שעה." });
      }

      // Check if number is already taken by another user
      const existing = await getUserByPhone(normalized);
      if (existing && existing.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "מספר זה כבר רשום במערכת" });
      }

      // Rate limit: max 5 OTP sends per phone per hour
      const rateLimitOk = await checkAndIncrementSendRate(normalized);
      if (!rateLimitOk) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "יותר מדי בקשות. נסה שוב בעוד שעה" });
      }

      const result = await smsProvider.sendOtp(normalized);
      if (!result.success) {
        // SMS failed — check if user has email for fallback
        const userEmail = ctx.user.email;
        return {
          success: false,
          smsFailed: true,
          hasEmailFallback: !!(userEmail && userEmail.includes("@")),
          error: result.error ?? "שגיאה בשליחת קוד",
          normalizedPhone: normalized,
        };
      }
      return { success: true, smsFailed: false, hasEmailFallback: false, normalizedPhone: normalized };
    }),

  /**
   * Email fallback: send OTP to user's registered email when SMS fails.
   */
  requestPhoneChangeOtpEmail: protectedProcedure
    .input(z.object({ phone: z.string().min(9).max(20) }))
    .mutation(async ({ input, ctx }) => {
      const userEmail = ctx.user.email;
      if (!userEmail || !userEmail.includes("@")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "אין כתובת מייל רשומה בחשבון" });
      }
      const normalized = normalizeIsraeliPhone(input.phone);
      if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "מספר הטלפון אינו תקין" });

      const result = await smsProvider.sendOtpToEmail(userEmail);
      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "שגיאה בשליחת קוד למייל" });
      }
      // Return masked email for display
      const [local, domain] = userEmail.split("@");
      const maskedEmail = `${local.slice(0, 2)}***@${domain}`;
      return { success: true, maskedEmail, normalizedPhone: normalized };
    }),

  /**
   * Step 2 of phone change: verify OTP (SMS or email) and update phone in DB.
   * Enforces lockout after 5 failed attempts. Logs every attempt.
   */
  verifyPhoneChangeOtp: protectedProcedure
    .input(z.object({
      phone: z.string().min(9).max(20),
      code: z.string().length(6),
      phonePrefix: z.string().length(3).optional(),
      phoneNumber: z.string().length(7).optional(),
      /** If true, verify against email channel instead of SMS */
      useEmail: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        ?? ctx.req.socket?.remoteAddress ?? "unknown";

      const normalized = normalizeIsraeliPhone(input.phone);
      if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "מספר הטלפון אינו תקין" });

      // Check lockout before attempting
      const recentFailures = await countRecentPhoneChangeFailures(ctx.user.id);
      if (recentFailures >= 5) {
        await logPhoneChange({ userId: ctx.user.id, oldPhone: ctx.user.phone, newPhone: normalized, ipAddress: ip, result: "locked" });
        notifyOwner({ title: "נעילת חשבון — שינוי טלפון", content: `משתמש ${ctx.user.id} (${ctx.user.phone ?? "unknown"}) נחסם לאחר 5 ניסיונות כושלים. IP: ${ip}` }).catch(() => {});
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "החשבון נעול זמנית לשינוי טלפון. נסה שוב בעוד שעה." });
      }

      // Rate limit verify attempts
      const attemptsOk = await checkAndIncrementVerifyAttempts(normalized);
      if (!attemptsOk) {
        await logPhoneChange({ userId: ctx.user.id, oldPhone: ctx.user.phone, newPhone: normalized, ipAddress: ip, result: "failed" });
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "יותר מדי ניסיונות. נסה שוב מאוחר יותר" });
      }

      let verifyResult;
      if (input.useEmail && ctx.user.email) {
        verifyResult = await smsProvider.verifyEmailOtp(ctx.user.email, input.code);
      } else {
        verifyResult = await smsProvider.verifyOtp(normalized, input.code);
      }

      if (!verifyResult.success || !verifyResult.approved) {
        // Log failed attempt
        await logPhoneChange({ userId: ctx.user.id, oldPhone: ctx.user.phone, newPhone: normalized, ipAddress: ip, result: "failed" });
        // Check if now locked out
        const failuresAfter = await countRecentPhoneChangeFailures(ctx.user.id);
        if (failuresAfter >= 5) {
          notifyOwner({ title: "נעילת חשבון — שינוי טלפון", content: `משתמש ${ctx.user.id} (${ctx.user.phone ?? "unknown"}) הגיע ל-5 ניסיונות כושלים ונעקר לשעה. IP: ${ip}` }).catch(() => {});
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `קוד שגוי. החשבון נעול לשעה לאחר ${failuresAfter} ניסיונות כושלים.` });
        }
        const remaining = 5 - failuresAfter;
        throw new TRPCError({ code: "BAD_REQUEST", message: `קוד האימות שגוי או פג תוקפו. נותרו עוד ${remaining} ניסיונות.` });
      }

      // Success — update phone in DB and log
      await updateUserPhone(ctx.user.id, normalized, input.phonePrefix ?? null, input.phoneNumber ?? null);
      await logPhoneChange({ userId: ctx.user.id, oldPhone: ctx.user.phone, newPhone: normalized, ipAddress: ip, result: "success" });

      return { success: true };
    }),

  /** Quick availability status update without entering the full profile page */
  quickUpdateAvailability: protectedProcedure
    .input(z.object({
      availabilityStatus: z.enum(["available_now", "available_today", "available_hours", "not_available"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateWorkerProfile(ctx.user.id, { availabilityStatus: input.availabilityStatus });
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

// ─── Saved Jobs Router ───────────────────────────────────────────────

const savedJobsRouter = router({
  /** Save a job for the current worker */
  save: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await saveJob(ctx.user.id, input.jobId);
      return { success: true };
    }),

  /** Unsave (remove bookmark) a job */
  unsave: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await unsaveJob(ctx.user.id, input.jobId);
      return { success: true };
    }),

  /** Get all saved job IDs for the current worker */
  getSavedIds: protectedProcedure.query(async ({ ctx }) => {
    const ids = await getSavedJobIds(ctx.user.id);
    return { ids };
  }),

  /** Get full saved job details for the current worker */
  getSavedJobs: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getSavedJobs(ctx.user.id);
    // Never expose contactPhone to workers
    return rows.map(r => ({ ...r, contactPhone: null }));
  }),
});

// ─── Ratings Router ─────────────────────────────────────────────

const ratingsRouter = router({
  /** Submit or update a rating for a worker (employer only) */
  rateWorker: protectedProcedure
    .input(
      z.object({
        workerId: z.number(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
        applicationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.userMode !== "employer") {
        throw new Error("Only employers can rate workers");
      }
      if (input.workerId === ctx.user.id) {
        throw new Error("Cannot rate yourself");
      }
      const result = await rateWorker(
        input.workerId,
        ctx.user.id,
        input.rating,
        input.comment ?? null,
        input.applicationId ?? null
      );
      return result;
    }),

  /** Get the current user's existing rating for a worker (for pre-filling UI) */
  getMyRating: protectedProcedure
    .input(z.object({ workerId: z.number() }))
    .query(async ({ input, ctx }) => {
      const existing = await getExistingRating(input.workerId, ctx.user.id);
      return existing ?? null;
    }),
  /** Get all public reviews for a worker */
  getWorkerReviews: publicProcedure
    .input(z.object({ workerId: z.number() }))
    .query(async ({ input }) => {
      return getWorkerReviews(input.workerId);
    }),
});
// ─── SEO Router ─────────────────────────────────────────────────────

// Simple in-process cache for SEO stats (10 min TTL)
let _seoStatsCache: { data: Awaited<ReturnType<typeof getJobCountByCityAndCategory>>; ts: number } | null = null;
const SEO_CACHE_TTL_MS = 10 * 60 * 1000;

const seoRouter = router({
  /** Returns job counts per city/category for dynamic sitemap and SEO pages */
  cityJobCounts: publicProcedure.query(async () => {
    const now = Date.now();
    if (_seoStatsCache && now - _seoStatsCache.ts < SEO_CACHE_TTL_MS) {
      return _seoStatsCache.data;
    }
    const data = await getJobCountByCityAndCategory();
    _seoStatsCache = { data, ts: now };
    return data;
  }),
});

// ─── Categories Router ─────────────────────────────────────────────

const categoriesRouter = router({
  /** Get all active categories (public) */
  list: publicProcedure.query(async () => {
    return getActiveCategories();
  }),
  /** Get all categories including inactive (admin only) */
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllCategories();
  }),
  /** Create a new category (admin only) */
  create: protectedProcedure
    .input(z.object({
      slug: z.string().min(2).max(64).regex(/^[a-z0-9_]+$/, "Slug must be lowercase letters, numbers, or underscores"),
      name: z.string().min(1).max(100),
      icon: z.string().max(16).optional(),
      groupName: z.string().max(64).optional(),
      imageUrl: z.string().url().optional().or(z.literal("")),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await createCategory(input);
      return { success: true };
    }),
  /** Update an existing category (admin only) */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      slug: z.string().min(2).max(64).regex(/^[a-z0-9_]+$/).optional(),
      name: z.string().min(1).max(100).optional(),
      icon: z.string().max(16).optional(),
      groupName: z.string().max(64).optional(),
      imageUrl: z.string().url().optional().or(z.literal("")),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateCategory(id, data);
      return { success: true };
    }),
  /** Toggle isActive for a category (admin only) */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await toggleCategoryActive(input.id);
      return { success: true };
    }),
  /** Delete a category (admin only) */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteCategory(input.id);
      return { success: true };
    }),
  /** Seed initial categories if table is empty (admin only) */
  seed: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await seedCategoriesIfEmpty();
      return { success: true };
    }),
});

// ─── Regions Router ─────────────────────────────────────────────────────────

const regionsRouter = router({
  /** List all regions (public) */
  list: publicProcedure.query(async () => {
    return getRegions();
  }),

  /** Return center city names of all active regions (public) */
  getActiveCities: publicProcedure.query(async () => {
    return getActiveRegionCities();
  }),

  /** Get a single region by slug (public) */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const region = await getRegionBySlug(input.slug);
      if (!region) throw new TRPCError({ code: "NOT_FOUND", message: "אזור לא נמצא" });
      return region;
    }),

  /** Check if the region at given coordinates is active (public) */
  checkActive: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ input }) => {
      return checkRegionActiveForJob(input.lat, input.lng);
    }),

  /** Admin: update region status */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["collecting_workers", "active", "paused"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateRegionStatus(input.id, input.status);
      return { success: true };
    }),

  /** Admin: update region settings */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().min(2).max(100).optional(),
      minWorkersRequired: z.number().int().min(1).optional(),
      activationRadiusKm: z.number().int().min(1).max(200).optional(),
      radiusMinutes: z.number().int().min(1).max(120).optional(),
      description: z.string().max(500).nullable().optional(),
      imageUrl: z.string().url().nullable().optional(),
      status: z.enum(["collecting_workers", "active", "paused"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateRegion(id, data);
      return { success: true };
    }),

  /** Admin: recount workers for a region from the users table */
  recount: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const count = await recountRegionWorkers(input.id);
      return { success: true, count };
    }),

  /** Admin: seed initial regions if table is empty */
  seed: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await seedRegionsIfEmpty();
      return { success: true };
    }),

  /** Admin: create a new region */
  create: protectedProcedure
    .input(z.object({
      slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
      name: z.string().min(2).max(100),
      centerCity: z.string().min(2).max(100),
      centerLat: z.string(),
      centerLng: z.string(),
      activationRadiusKm: z.number().int().min(1).max(200).default(15),
      radiusMinutes: z.number().int().min(1).max(120).default(20),
      minWorkersRequired: z.number().int().min(1).default(50),
      description: z.string().max(500).nullable().optional(),
      status: z.enum(["collecting_workers", "active", "paused"]).default("collecting_workers"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const id = await createRegion({
        slug: input.slug,
        name: input.name,
        centerCity: input.centerCity,
        centerLat: input.centerLat,
        centerLng: input.centerLng,
        activationRadiusKm: input.activationRadiusKm,
        radiusMinutes: input.radiusMinutes,
        minWorkersRequired: input.minWorkersRequired,
        description: input.description ?? null,
        status: input.status,
        currentWorkers: 0,
      });
      return { success: true, id };
    }),

  /** Admin: delete a region */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteRegion(input.id);
      return { success: true };
    }),

  /** Admin: list workers in a region */
  getWorkers: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getWorkersByRegion(input.id);
    }),

  /** Get region by ID (admin) */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const region = await getRegionById(input.id);
      if (!region) throw new TRPCError({ code: "NOT_FOUND", message: "אזור לא נמצא" });
      return region;
    }),

  /**
   * Subscribe the current user to be notified when a region becomes active.
   * Works for both workers and employers.
   */
  requestNotification: protectedProcedure
    .input(z.object({
      regionId: z.number().int(),
      type: z.enum(["worker", "employer"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await requestRegionNotification(ctx.user.id, input.regionId, input.type);
      return result;
    }),

  /** Cancel a notification subscription */
  cancelNotification: protectedProcedure
    .input(z.object({ regionId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      await cancelRegionNotification(ctx.user.id, input.regionId);
      return { success: true };
    }),

  /** Get the current user's notification subscriptions */
  myNotifications: protectedProcedure
    .query(async ({ ctx }) => {
      return getMyRegionNotificationRequests(ctx.user.id);
    }),

  /**
   * Get the activation status of all regions the current worker is associated with.
   * Used to show the "region not yet open" banner on the worker homepage.
   */
  workerRegionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      return getWorkerRegionStatus(ctx.user.id);
    }),

  /**
   * Admin: activate a region and notify all subscribed users.
   * Wraps updateStatus + fan-out push notifications.
   */
  activateAndNotify: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const region = await getRegionById(input.id);
      if (!region) throw new TRPCError({ code: "NOT_FOUND", message: "אזור לא נמצא" });

      // Activate the region
      await updateRegionStatus(input.id, "active");

      // Notify all subscribers
      const subscribers = await getRegionNotificationSubscribers(input.id);
      let notified = 0;
      for (const sub of subscribers) {
        try {
          const msg = sub.type === "employer"
            ? `האזור "${region.name}" נפתח! כעת תוכל לפרסם משרות ולמצוא עובדים.`
            : `האזור "${region.name}" נפתח! מעסיקים מחפשים עכשיו — בדוק הצעות עבודה.`;
          await sendPushToUser(sub.userId, {
            title: `🎉 האזור ${region.name} נפתח!`,
            body: msg,
            url: sub.type === "employer" ? "/post-job" : "/find-jobs",
          });
          notified++;
        } catch {
          // Non-critical — continue even if push fails
        }
      }

      return { success: true, notified };
    }),
});

// ─── Referral Router ────────────────────────────────────────────────────────

const referralRouter = router({
  /** Apply a referral code to the current user (only if not already set). */
  applyRef: protectedProcedure
    .input(z.object({ referrerId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await applyReferral(ctx.user.id, input.referrerId);
      return { success: true };
    }),

  /** Get my referral stats (count + list of referred users). */
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const [referrals, count] = await Promise.all([
      getReferralsByUser(ctx.user.id),
      getReferralCount(ctx.user.id),
    ]);
    return { count, referrals };
  }),

  /** Admin: get all referral pairs. */
  adminAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllReferrals();
  }),
});

// ─── Maintenance Router ────────────────────────────────────────────────────────────────────

const maintenanceRouter = router({
  /** Public: check if maintenance mode is active + custom message.
   * Test-role users always receive active=false so they can bypass maintenance mode.
   */
  status: publicProcedure.query(async ({ ctx }) => {
    const [active, message] = await Promise.all([
      isMaintenanceModeActive(),
      getMaintenanceMessage(),
    ]);
    // If the requesting user is a test-role user, bypass maintenance
    if (active && ctx.user?.role === "test") {
      return { active: false, message };
    }
    return { active, message };
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  maintenance: maintenanceRouter,
  auth: authRouter,
  jobs: jobsRouter,
  workers: workersRouter,
  admin: adminRouter,
  live: liveStatsRouter,
  user: userRouter,
  push: pushRouter,
  savedJobs: savedJobsRouter,
  ratings: ratingsRouter,
  seo: seoRouter,
  categories: categoriesRouter,
  regions: regionsRouter,
  referral: referralRouter,
});
export type AppRouter = typeof appRouter;

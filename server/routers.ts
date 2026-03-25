import { TRPCError } from "@trpc/server";
import { createInMemoryRateLimiter } from "./security";
import { z } from "zod";
import { COOKIE_NAME, LEGAL_DOCUMENT_VERSIONS, MAX_ACCEPTED_CANDIDATES, MAX_ACTIVE_OFFERS, SUPPORT_REPORT_RATE_LIMIT, type LegalConsentType } from "@shared/const";
import { cityZodRefine } from "@shared/cityValidation";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { phoneRequiredProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  checkAndIncrementSendRate,
  checkAndIncrementVerifyAttempts,
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
  createUserByEmail,
  getUserByPhone,
  getUserByNormalizedPhone,
  getUserByEmail,
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
  getWorkerNamesByIds,
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
  isEmployerLockActive,
  getHeroStats,
  resetTestUserProfile,
  recordUserConsent,
  getUserConsents,
  completeGoogleRegistration,
  hasRequiredConsents,
  saveBirthDate,
  getWorkerBirthDate,
  getWorkersMinorStatus,
  logLegalAcknowledgement,
  queryJobs,
  updateBirthDateWithAudit,
  getLastBirthDateChange,
  logEvent,
  getLogs,
  getEmployerProfile,
  updateEmployerProfile,
  createJobOffer,
  respondToJobOffer,
  countActiveOffers,
  countAcceptedCandidates,
  autoCloseJobIfCapReached,
  getApplicantWorkerIdsForJob,
  getWorkerLocationsByIds,
  getCityNamesByIds,
  getOfferedWorkerIdsForEmployer,
} from "./db";
import { sendJobAlerts, sendSms } from "./sms";
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
  adminGetBirthdateChanges,
  adminGetReportedJobs,
  adminGetStats,
  adminRejectJob,
  adminSetJobStatus,
  adminSetUserRole,
  adminUnblockUser,
  adminForceLogoutUser,
  adminClearForcedLogout,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from "./adminDb";
import {
  isValidIsraeliPhone,
  normalizeIsraeliPhone,
  splitIsraeliE164Phone,
  smsProvider,
} from "./smsProvider";
import { adminProcedure } from "./_core/trpc";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { sanitizeText, sanitizeRichText, sanitizeTextArray } from "./sanitize";
import { authLogger, securityLogger, getClientIp } from "./logger";
import { calcAge, isMinor, isTooYoung, isJobAccessibleToMinor, meetsMinAgeRequirement } from "@shared/ageUtils";
import { assertMinorEligible } from "./minorGuard";
import {
  createEmailOtp,
  sendEmailOtp,
  verifyEmailOtp,
  getEmailSendCooldown,
  EMAIL_OTP_MAX_ATTEMPTS,
  sendWelcomeEmail as sendWelcomeEmailOtp,
  confirmUnsubscribe,
} from "./emailOtp";

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
    .input(z.object({
      phone: z.string().min(9).max(20),
      isRegistration: z.boolean().optional(),
      termsAccepted: z.boolean().optional(),
      email: z.string().email().max(320).optional(),
      channel: z.enum(["sms", "email", "call", "whatsapp"]).optional().default("sms"),
    }))
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

      // For login flow: block if phone not registered (no termsAcceptedAt means never completed signup)
      // Exception: admin/manager users created directly in DB are allowed to log in without termsAcceptedAt
      if (!input.isRegistration) {
        const isPrivilegedUser = existingUser && existingUser.role === "admin";
        if (!existingUser || (!existingUser.termsAcceptedAt && !isPrivilegedUser)) {
          void logEvent("warn", "otp.send.blocked.not_registered", "Login OTP blocked — phone not registered", {
            phone,
            meta: { channel: input.channel, existsInDb: !!existingUser, hasTerms: !!existingUser?.termsAcceptedAt },
          });
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "מספר זה אינו רשום במערכת.",
          });
        }
      }

      // For registration flow: check for duplicates and enforce terms
      if (input.isRegistration) {
        if (existingUser && existingUser.termsAcceptedAt) {
          // Phone already registered with completed signup — block registration
          throw new TRPCError({
            code: "CONFLICT",
            message: "מספר הטלפון כבר רשום במערכת. אם אתה משתמש קיים, נסה להתחבר או פנה למנהל המערכת.",
          });
        }
        // Email duplicate check (only if email provided)
        if (input.email) {
          const emailUser = await getUserByEmail(input.email);
          if (emailUser) {
            // Provide a context-aware message based on how the existing account was created
            const isGoogleAccount = emailUser.loginMethod === "google";
            const message = isGoogleAccount
              ? "המייל כבר קשור לחשבון קיים שנפתח באמצעות Google. אנא התחבר עם Google במקום."
              : "כתובת המייל כבר רשומה במערכת. אם אתה משתמש קיים, נסה להתחבר או פנה למנהל המערכת.";
            throw new TRPCError({ code: "CONFLICT", message });
          }
        }
        if (!input.termsAccepted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "יש לאשר את תנאי השימוש לפני ההרשמה.",
          });
        }
      }

      // IP-based + phone-based rate limiting
      const ip = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        ?? ctx.req.socket?.remoteAddress
        ?? "unknown";

      // Admin users are exempt from OTP rate limits
      // (test-role users already returned early above, so we only need to check admin here)
      const isPrivilegedSender = existingUser && existingUser.role === "admin";
      if (!isPrivilegedSender) {
        const allowed = await checkAndIncrementSendRate(phone, ip);
        if (!allowed) {
          securityLogger.warn({ ip, phone: phone.slice(-4), event: "otp_rate_limit_exceeded" }, "OTP rate limit exceeded");
          void logEvent("warn", "otp.send.rate_limited", "OTP send rate limit exceeded", {
            phone,
            meta: { ip, channel: input.channel, isRegistration: input.isRegistration },
          });
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "שלחת יותר מדי בקשות. נסה שוב בעוד שעה.",
          });
        }
      }

      // Send via chosen channel (SMS, Email, Voice Call, or WhatsApp)
      let result: { success: boolean; error?: string };
      if (input.channel === "email") {
        // Email channel: use the email provided in registration
        const targetEmail = input.email;
        if (!targetEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "כתובת מייל נדרשת לשליחת קוד למייל" });
        }
        result = await smsProvider.sendOtpToEmail(targetEmail);
      } else if (input.channel === "call") {
        // Voice call channel
        result = await smsProvider.sendOtpVoice(phone);
      } else if (input.channel === "whatsapp") {
        // WhatsApp channel — fallback when SMS rate-limited
        result = await smsProvider.sendOtpWhatsApp(phone);
      } else {
        result = await smsProvider.sendOtp(phone);
      }

      if (!result.success) {
        void logEvent("error", "otp.send.failed", "OTP send failed via provider", {
          phone,
          meta: { channel: input.channel, error: result.error, isRegistration: input.isRegistration },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "לא ניתן לשלוח קוד כרגע. נסה שוב בעוד מספר דקות.",
        });
      }

      void logEvent("info", "otp.send.success", "OTP sent successfully", {
        phone,
        meta: { channel: input.channel, isRegistration: input.isRegistration },
      });
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
        termsAccepted: z.boolean().optional(),
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
        // Bypass Twilio — reset profile and issue session directly
        await resetTestUserProfile(testUserCheck.id);
        await updateUserLastSignedIn(testUserCheck.id);
        // Re-fetch user after reset so the returned object reflects cleared state
        const resetUser = await getUserByPhone(phone);
        const tokenTest = await sdk.signSession(
          { openId: testUserCheck.openId, appId: ENV.appId, name: testUserCheck.name ?? testUserCheck.phone ?? "" },
          { expiresInMs: 30 * 24 * 60 * 60 * 1000 }
        );
        const cookieOptionsTest = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, tokenTest, cookieOptionsTest);
        return { success: true, user: resetUser ?? testUserCheck, testReset: true };
      }

      // Check verify attempt rate limit
      const attemptAllowed = await checkAndIncrementVerifyAttempts(phone);
      if (!attemptAllowed) {
        securityLogger.warn({ phone: phone.slice(-4), event: "otp_verify_rate_limit" }, "OTP verify rate limit exceeded");
        void logEvent("warn", "otp.verify.rate_limited", "OTP verify rate limit exceeded", { phone });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "מספר הניסיונות המרבי הגיע. בקש קוד חדש.",
        });
      }

      // Verify with Twilio
      const result = await smsProvider.verifyOtp(phone, input.code);

      if (!result.success || !result.approved) {
        securityLogger.warn({ phone: phone.slice(-4), event: "otp_verify_failed" }, "OTP verification failed");
        void logEvent("warn", "otp.verify.failed", "OTP code rejected by provider", {
          phone,
          meta: { error: result.error },
        });
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
        // New user: enforce terms acceptance
        if (!input.termsAccepted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "יש לאשר את תנאי השימוש לפני ההרשמה.",
          });
        }
        try {
          user = await createUserByPhone(phone, input.name, input.email, true, normalizeIsraeliPhone);
          void logEvent("info", "signup.user_created", "New user created via phone OTP", {
            phone,
            userId: user?.id,
            meta: { name: input.name, hasEmail: !!input.email },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.startsWith("PHONE_DUPLICATE:")) {
            void logEvent("warn", "signup.phone_duplicate", "Phone duplicate detected during signup", { phone });
            // Another account with the same number (different format) already exists
            throw new TRPCError({
              code: "CONFLICT",
              message: "מספר הטלפון כבר רשום במערכת. אם אתה משתמש קיים, נסה להתחבר.",
            });
          }
          void logEvent("error", "signup.create_user_failed", `Failed to create user: ${msg}`, { phone, meta: { error: msg } });
          throw err;
        }
        // Welcome email is sent later in completeSignup wizard (after profile is complete)
      } else {
        // Existing user: must have accepted terms at some point
        if (!user.termsAcceptedAt) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "חשבונך לא הושלם. יש להירשם מחדש ולאשר את תנאי השימוש.",
          });
        }
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

      authLogger.info({ userId: user.id, event: "login_success", method: "phone_otp" }, "User logged in via OTP");
      void logEvent("info", "otp.verify.success", "OTP verified — user logged in", {
        phone,
        userId: user.id,
        meta: { isNewUser: !!input.termsAccepted },
      });
      const isNewUser = !input.termsAccepted ? false : true;
      return { success: true, user, isNewUser };
    }),

  // ─── Email OTP ───────────────────────────────────────────────────────────────

  sendEmailCode: publicProcedure
    .input(
      z.object({
        email: z.string().email("כתובת המייל אינה תקינה"),
      })
    )
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();

      // Rate limit: 60-second cooldown per email
      const cooldownMs = await getEmailSendCooldown(email);
      if (cooldownMs > 0) {
        const seconds = Math.ceil(cooldownMs / 1000);
        void logEvent("warn", "email_otp.send.cooldown", `Email OTP cooldown active: ${seconds}s remaining`, { meta: { email } });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `נא המתן ${seconds} שניות לפני שליחת קוד נוסף`,
        });
      }

      // Create OTP record and send email
      let code: string;
      try {
        code = await createEmailOtp(email);
      } catch (err) {
        void logEvent("error", "email_otp.send.db_error", "Failed to create email OTP record", { meta: { email, error: String(err) } });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "שגיאה פנימית. נא נסה שנית" });
      }

      try {
        await sendEmailOtp(email, code);
      } catch (err) {
        void logEvent("error", "email_otp.send.failed", "SendGrid send failed", { meta: { email, error: String(err) } });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "שליחת המייל נכשלה. נא נסה שנית" });
      }

      void logEvent("info", "email_otp.send.success", "Email OTP sent", { meta: { email } });
      return { success: true };
    }),

  verifyEmailCode: publicProcedure
    .input(
      z.object({
        email: z.string().email("כתובת המייל אינה תקינה"),
        code: z.string().length(6, "קוד חייב להכיל 6 ספרות"),
        termsAccepted: z.boolean().optional(),
        /** Full name collected during registration — saved immediately on new user creation */
        name: z.string().min(2).max(100).optional(),
        /** Phone number (local Israeli format) collected during registration */
        phone: z.string().min(9).max(20).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase().trim();

      const result = await verifyEmailOtp(email, input.code);

      if (result === "not_found") {
        void logEvent("warn", "email_otp.verify.not_found", "No OTP record found", { meta: { email } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצא קוד פעיל. שלח קוד חדש" });
      }
      if (result === "expired") {
        void logEvent("warn", "email_otp.verify.expired", "OTP expired", { meta: { email } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "פג תוקף הקוד. שלח קוד חדש" });
      }
      if (result === "max_attempts") {
        void logEvent("warn", "email_otp.verify.max_attempts", "Max OTP attempts reached", { meta: { email } });
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `חרגת ${EMAIL_OTP_MAX_ATTEMPTS} ניסיונות. שלח קוד חדש` });
      }
      if (result === "wrong") {
        void logEvent("warn", "email_otp.verify.wrong_code", "Wrong OTP code", { meta: { email } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "קוד שגוי. נא נסה שנית" });
      }

      // result === "ok" — find or create user by email
      let user = await getUserByEmail(email);
      const isNewUser = !user;

      if (!user) {
        // New user — create account
        user = await createUserByEmail(email); // email-only user with correct loginMethod
        void logEvent("info", "email_otp.verify.new_user", "New user created via email OTP", { userId: user.id, meta: { email } });

        // Immediately persist name and phone if provided during registration
        if (input.name || input.phone) {
          let normalizedPhone: string | undefined;
          let phoneParts: { phonePrefix?: string; phoneNumber?: string } = {};
          if (input.phone) {
            try {
              normalizedPhone = normalizeIsraeliPhone(input.phone);
              const split = splitIsraeliE164Phone(normalizedPhone);
              if (split) phoneParts = { phonePrefix: split.prefix, phoneNumber: split.number };
            } catch {
              // invalid phone — skip silently, user can update in profile
            }
          }
          await updateWorkerProfile(user.id, {
            ...(input.name ? { name: input.name } : {}),
            ...(normalizedPhone ? { phone: normalizedPhone, ...phoneParts } : {}),
          });
        }

        // Send welcome email immediately — email is known at this point
        sendWelcomeEmailOtp({ to: email, name: input.name ?? "" })
          .catch((err) => console.warn("[verifyEmailCode] sendWelcomeEmail error:", err));
      } else {
        await updateUserLastSignedIn(user.id);
        void logEvent("info", "email_otp.verify.login", "User logged in via email OTP", { userId: user.id, meta: { email } });
      }

      // Create session (same format as phone OTP)
      const token = await sdk.signSession(
        {
          openId: user.openId,
          appId: ENV.appId,
          name: user.name ?? user.email ?? "",
        },
        { expiresInMs: 30 * 24 * 60 * 60 * 1000 } // 30 days
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return { success: true, user, isNewUser };
    }),

  unsubscribeEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const email = await confirmUnsubscribe(input.token);
      return { success: true, email };
    }),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const jobInputSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(3000),
  category: z.enum([
    "delivery", "warehouse", "agriculture", "kitchen", "cleaning",
    "security", "construction", "childcare", "eldercare", "retail",
    "events", "gardening", "serving", "electricity", "plumbing", "moving",
    "volunteer", "emergency_support", "passover_jobs", "reserve_families", "other",
  ]),
  address: z.string().min(2).max(300),
  city: z.string().max(100).optional().superRefine(cityZodRefine),
  latitude: z.number(),
  longitude: z.number(),
  salary: z.number().optional(),
  salaryType: z.enum(["hourly", "daily", "monthly", "volunteer"]).default("hourly"),
  contactPhone: z.string().min(9).optional(),
  contactName: z.string().min(2).max(100),
  businessName: z.string().max(200).optional(),
  workingHours: z.string().max(200).optional(),
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
  /** Minimum worker age: null = no restriction, 16 = 16+, 18 = adults only */
  minAge: z.union([z.literal(16), z.literal(18)]).nullable().optional(),
  /** Google Maps place_id for the job's city — canonical city identifier for matching */
  cityPlaceId: z.string().max(100).optional(),
});

/** Rate limiter for job-publish OTP sends: max 3 per user per 10 minutes */
const publishOtpRateLimiter = createInMemoryRateLimiter(3, 10 * 60 * 1000);

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
      dateFilter: z.string().optional(), // "today"|"tomorrow"|"this_week"|"YYYY-MM-DD"|"YYYY-MM-DD:YYYY-MM-DD"
      page: z.number().int().min(1).default(1),
      /** Day-of-week filter: JS convention 0=Sun, 1=Mon, ..., 6=Sat */
      dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 10;
      const offset = (input.page - 1) * limit;
      // Auto-filter by worker age when the caller is an authenticated worker
      const workerAge = ctx.user
        ? calcAge(await getWorkerBirthDate(ctx.user.id))
        : null;
      const { rows, total } = await getActiveJobs(limit, input.category, input.city, input.dateFilter, offset, input.dayOfWeek, input.cities, input.categories, workerAge);
      return { jobs: rows.map(j => ({ ...j, contactPhone: null })), total, page: input.page, limit };
    }),

  search: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().min(1).max(200).default(10),
        category: z.string().optional(),
        /** Multi-category filter — takes precedence over category when provided */
        categories: z.array(z.string().min(1)).max(20).optional(),
        limit: z.number().int().min(1).max(50).optional(),
        city: z.string().optional(),
        /** Multi-city filter — takes precedence over city when provided */
        cities: z.array(z.string().min(1)).max(20).optional(),
      dateFilter: z.string().optional(), // "today"|"tomorrow"|"this_week"|"YYYY-MM-DD"|"YYYY-MM-DD:YYYY-MM-DD"
      page: z.number().int().min(1).default(1),
      /** Day-of-week filter: JS convention 0=Sun, 1=Mon, ..., 6=Sat */
      dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    })
  )
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 10;
      const offset = (input.page - 1) * limit;
      // Auto-filter by worker age when the caller is an authenticated worker
      const workerAge = ctx.user
        ? calcAge(await getWorkerBirthDate(ctx.user.id))
        : null;
      let { rows, total } = await getJobsNearLocation(input.lat, input.lng, input.radiusKm, input.category, limit, input.city, input.dateFilter, offset, input.dayOfWeek, input.cities, input.categories, workerAge);
      // Fallback: when no jobs found in user's radius, expand to 100 km and show nearest jobs.
      // Only applies to page 1 (no point falling back on subsequent pages).
      let isFallback = false;
      if (total === 0 && input.page === 1 && !input.dateFilter && !input.city && !(input.cities?.length) && !input.category && !(input.categories?.length)) {
        const fallback = await getJobsNearLocation(input.lat, input.lng, 100, undefined, limit, undefined, undefined, 0, undefined, undefined, undefined, workerAge);
        if (fallback.total > 0) {
          rows = fallback.rows;
          total = fallback.total;
          isFallback = true;
        }
      }
      return { jobs: rows.map(j => ({ ...j, contactPhone: null })), total, page: input.page, limit, isFallback };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      // Never expose contactPhone to workers or unauthenticated users
      return { ...job, contactPhone: null };
    }),

  create: phoneRequiredProcedure
    .input(jobInputSchema)
    .mutation(async ({ input, ctx }) => {
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

      // ── XSS sanitization: strip HTML from all free-text fields before DB write ──
      const sanitizedInput = {
        ...input,
        title: sanitizeText(input.title),
        description: sanitizeRichText(input.description),
        address: sanitizeText(input.address),
        city: sanitizeText(city),
        contactName: sanitizeText(input.contactName),
        businessName: sanitizeText(input.businessName),
        workingHours: sanitizeText(input.workingHours),
        jobTags: sanitizeTextArray(input.jobTags ?? [input.category]),
      };

      const job = await createJob({
        ...sanitizedInput,
        contactPhone, // always from authenticated user
        city: sanitizedInput.city,
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
        minAge: input.minAge ?? null,
        cityPlaceId: input.cityPlaceId ?? null,
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
      getWorkersMatchingJob(input.category, city, ctx.user.id, 100, input.latitude, input.longitude)
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
      // ── XSS sanitization on update fields ──
      const sanitized = { ...input.data };
      if (sanitized.title !== undefined) sanitized.title = sanitizeText(sanitized.title);
      if (sanitized.description !== undefined) sanitized.description = sanitizeRichText(sanitized.description);
      if (sanitized.address !== undefined) sanitized.address = sanitizeText(sanitized.address);
      if (sanitized.city !== undefined) sanitized.city = sanitizeText(sanitized.city);
      if (sanitized.contactName !== undefined) sanitized.contactName = sanitizeText(sanitized.contactName);
      if (sanitized.businessName !== undefined) sanitized.businessName = sanitizeText(sanitized.businessName);
      if (sanitized.workingHours !== undefined) sanitized.workingHours = sanitizeText(sanitized.workingHours);
      const updateData: Record<string, unknown> = { ...sanitized };
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
  /**
   * Returns a map of workerId → jobIds[] for all active offers the employer has sent.
   * Used in AvailableWorkers to show "offer already sent" badges and filter out offered workers.
   */
  getOfferedWorkerIds: protectedProcedure.query(async ({ ctx }) => {
    const map = await getOfferedWorkerIdsForEmployer(ctx.user.id);
    // Serialize Map → plain object { workerId: jobId[] } for tRPC transport
    const result: Record<number, number[]> = {};
    Array.from(map.entries()).forEach(([workerId, jobIds]) => {
      result[workerId] = Array.from(jobIds);
    });
    return result;
  }),

  /** Worker's own applications with job info and status */
  myApplications: protectedProcedure.query(async ({ ctx }) => {
    const apps = await getMyApplications(ctx.user.id);
    // Only expose employer phone when the worker has accepted the offer (contactRevealed)
    return apps.map(app => ({
      ...app,
      employerPhone: (app.status === "accepted" && app.contactRevealed) ? app.employerPhone : null,
    }));
  }),
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
      const workerAge = ctx.user
        ? calcAge(await getWorkerBirthDate(ctx.user.id))
        : null;
      const jobs = await getTodayJobs(input.limit ?? 50, input.category, workerAge);
      // Never expose contactPhone to workers or unauthenticated users
      return jobs.map(j => ({ ...j, contactPhone: null }));
    }),

  /** Urgent jobs (isUrgent=true), sorted by newest */
  listUrgent: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const workerAge = ctx.user
        ? calcAge(await getWorkerBirthDate(ctx.user.id))
        : null;
      const jobs = await getUrgentJobs(input.limit ?? 20, undefined, workerAge);
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

      // Pre-fetch workers already engaged with this job (any status) so we can
      // exclude them from the results — single source of truth for this filter.
      const engagedWorkerIds = await getApplicantWorkerIdsForJob(input.jobId);

      const MATCHING_API_URL = process.env.MATCHING_API_URL;
      if (!MATCHING_API_URL) {
        // Fallback: use internal DB matching when no external API is configured
        const localWorkers = await getWorkersMatchingJob(
          job.category,
          job.city,
          ctx.user.id,
          50,
          job.latitude ? Number(job.latitude) : null,
          job.longitude ? Number(job.longitude) : null,
        );
        // Enrich with names, ratings, profile photos and availability in a single batch query
        const nameMap = await getWorkerNamesByIds(localWorkers.map((w) => w.id));
        return {
          workers: localWorkers
            .filter((w) => !engagedWorkerIds.has(w.id))
            .map((w, i) => ({
              worker_id: w.id,
              score: 1 - i * 0.01,
              name: nameMap.get(w.id)?.name ?? null,
              rating: nameMap.get(w.id)?.workerRating ?? null,
              profilePhoto: nameMap.get(w.id)?.profilePhoto ?? null,
              availabilityStatus: nameMap.get(w.id)?.availabilityStatus ?? null,
              locationMissingGps: false,
            })),
        };
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

        // Step 1: filter out workers already engaged with this job
        const notEngaged = data.workers.filter((w) => !engagedWorkerIds.has(w.worker_id));

        // Step 2: server-side location guard — the external API may rank workers
        // purely on semantic/category similarity without respecting the worker's
        // preferred city or radius setting. We re-apply the same location rules
        // that the internal DB path uses, so city-mode workers from a different
        // city (e.g. Beer Sheva for a Bnei Brak job) are never returned.
        //
        // IMPORTANT: fail-closed for unknown workers — if a worker_id is not found
        // in our DB (e.g. data not yet synced), we EXCLUDE them rather than
        // passing them through unchecked.
        const workerLocations = await getWorkerLocationsByIds(notEngaged.map((w) => w.worker_id));
        const jobCity = (job.city ?? "").trim().toLowerCase();
        // Access cityPlaceId from the job row (added via schema, present in select *)
        const jobPlaceId = (job as Record<string, unknown>).cityPlaceId as string | null | undefined;
        const jobLat = job.latitude ? Number(job.latitude) : null;
        const jobLng = job.longitude ? Number(job.longitude) : null;

        // Collect all city IDs referenced by city-mode workers so we can resolve
        // them to Hebrew names in a single batch query (O(n) not O(n²)).
        const allCityIds = new Set<number>();
        Array.from(workerLocations.values()).forEach((loc) => {
          if (loc.locationMode !== "radius" && loc.preferredCities) {
            loc.preferredCities.forEach((id) => allCityIds.add(id));
          }
        });
        const cityNameMap = await getCityNamesByIds(Array.from(allCityIds));

        // Evaluate each worker and attach a locationMissingGps flag for radius-mode
        // workers who were included because the job has no coordinates (no distance
        // validation possible). The UI can surface these with a "מיקום לא מוגדר" tag.
        type EnrichedWorker = typeof notEngaged[number] & { locationMissingGps?: boolean };
        const locationFiltered: EnrichedWorker[] = [];

        for (const w of notEngaged) {
          const loc = workerLocations.get(w.worker_id);
          // fail-closed: worker not found in our DB → exclude
          if (!loc) {
            console.info(`[LocationGuard] worker ${w.worker_id} not in local DB → excluded`);
            continue;
          }

          if (loc.locationMode === "radius") {
            // Radius-mode: check haversine distance against worker's searchRadiusKm
            if (jobLat == null || jobLng == null) {
              // No job coords → include but flag as unverified distance
              locationFiltered.push({ ...w, locationMissingGps: !loc.workerLatitude || !loc.workerLongitude });
              continue;
            }
            if (!loc.workerLatitude || !loc.workerLongitude) {
              // Worker has no GPS → include with flag (was previously excluded; now included per fix)
              locationFiltered.push({ ...w, locationMissingGps: true });
              continue;
            }
            const R = 6371;
            const dLat = ((jobLat - Number(loc.workerLatitude)) * Math.PI) / 180;
            const dLng = ((jobLng - Number(loc.workerLongitude)) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((Number(loc.workerLatitude) * Math.PI) / 180) *
                Math.cos((jobLat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (distKm <= (loc.searchRadiusKm ?? 5)) {
              locationFiltered.push({ ...w, locationMissingGps: false });
            }
            continue;
          }

          // city-mode (default): prefer placeId comparison (canonical, locale-independent),
          // fall back to city-name text comparison for workers/jobs that predate placeId.
          if (!jobCity && !jobPlaceId) {
            locationFiltered.push({ ...w, locationMissingGps: false }); // no city on job → include all
            continue;
          }

          // ── Primary: placeId match ─────────────────────────────────────────────────────────
          // If both job and worker have a placeId, use it as the single source of truth.
          if (jobPlaceId && loc.preferredCityPlaceId) {
            if (loc.preferredCityPlaceId === jobPlaceId) {
              locationFiltered.push({ ...w, locationMissingGps: false });
            } else {
              console.info(
                `[LocationGuard] worker ${w.worker_id} placeId mismatch: worker=${loc.preferredCityPlaceId} job=${jobPlaceId} → excluded`
              );
            }
            continue;
          }

          // ── Fallback: city-name text comparison ─────────────────────────────────────────
          // Used when either side lacks a placeId (legacy data or Maps API unavailable).
          if (!jobCity) {
            locationFiltered.push({ ...w, locationMissingGps: false }); // job has no city text either → include
            continue;
          }

          // Check preferredCities (array of city IDs) first — canonical field from CityPicker.
          if (loc.preferredCities && loc.preferredCities.length > 0) {
            const matches = loc.preferredCities.some((id) => {
              const name = cityNameMap.get(id);
              return name ? name.trim().toLowerCase() === jobCity : false;
            });
            if (matches) locationFiltered.push({ ...w, locationMissingGps: false });
            continue;
          }

          // Last resort: legacy preferredCity string field
          if (!loc.preferredCity) continue; // worker has no city preference → exclude
          if (loc.preferredCity.trim().toLowerCase() === jobCity) {
            locationFiltered.push({ ...w, locationMissingGps: false });
          }
        }

        console.info(
          `[LocationGuard] job ${input.jobId} (${job.city}): ${notEngaged.length} → ${locationFiltered.length} workers after location filter`
        );

        // Enrich with names, ratings, profile photos and availability in a single batch query
        const photoMap = await getWorkerNamesByIds(locationFiltered.map((w) => w.worker_id));
        const enrichedFiltered = locationFiltered.map((w) => ({
          ...w,
          name: photoMap.get(w.worker_id)?.name ?? null,
          rating: photoMap.get(w.worker_id)?.workerRating ?? null,
          profilePhoto: photoMap.get(w.worker_id)?.profilePhoto ?? null,
          availabilityStatus: photoMap.get(w.worker_id)?.availabilityStatus ?? null,
        }));
        return { workers: enrichedFiltered };
      } catch (err) {
        console.warn("[MatchWorkers] External API call failed:", err);
        return { workers: [] as { worker_id: number; score: number }[] };
      }
    }),

  /**
   * Send a job offer to a specific worker via external API.
   */
  sendJobOffer: protectedProcedure
    .input(z.object({ jobId: z.number(), workerId: z.number(), origin: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      if (job.postedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Block if job is closed because the candidate cap was reached
      if (job.status === "closed" && job.closedReason === "cap_reached") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `המשרה נסגרה — כבר התקבלו ${MAX_ACCEPTED_CANDIDATES} מועמדים.`,
        });
      }

      // Prevent duplicate offers
      const existing = await getApplicationByWorkerAndJob(input.workerId, input.jobId);
      if (existing) {
        // If already offered/applied, just return success without re-notifying
        return { success: true, alreadyExists: true };
      }

      // Enforce maximum active offers per job
      const activeOfferCount = await countActiveOffers(input.jobId);
      if (activeOfferCount >= MAX_ACTIVE_OFFERS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `לא ניתן לשלוח יותר מ-${MAX_ACTIVE_OFFERS} הצעות עבודה פעילות בו-זמנית למשרה זו. המתן לתגובת העובדים שכבר קיבלו הצעה.`,
        });
      }

      // Block if accepted candidate cap is already reached
      const acceptedCount = await countAcceptedCandidates(input.jobId);
      if (acceptedCount >= MAX_ACCEPTED_CANDIDATES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `המשרה כבר מלאה — ${MAX_ACCEPTED_CANDIDATES} מועמדים אישרו.`,
        });
      }

      // Get worker profile to determine notification prefs and phone
      const worker = await getWorkerProfile(input.workerId);
      if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "עובד לא נמצא" });

      // Create application record with status "offered"
      await createJobOffer(input.workerId, input.jobId);

      const jobUrl = `${input.origin ?? "https://avodanow.co.il"}/job/${input.jobId}`;
      const employerName = ctx.user.name ?? "מעסיק";
      const jobLabel = job.category ?? job.title ?? "משרה";

      const notifPrefs = worker.notificationPrefs ?? "both";

      // Send SMS if prefs allow
      if ((notifPrefs === "both" || notifPrefs === "sms_only") && worker.phone) {
        const smsBody = `שלום ${worker.name ?? ""},\n${employerName} שלח לך הצעת עבודה: ${jobLabel}.\nלצפייה ואישור/דחייה: ${jobUrl}\n\nלהסרה מרשימת ההתראות: https://avodanow.co.il/worker-profile`;
        sendSms(worker.phone, smsBody).catch(e => console.warn("[JobOffer] SMS failed:", e));
      }

      // Send Push if prefs allow
      if (notifPrefs === "both" || notifPrefs === "push_only") {
        sendPushToUser(input.workerId, {
          title: `💼 הצעת עבודה: ${jobLabel}`,
          body: `${employerName} שלח לך הצעת עבודה. לחץ לצפייה ואישור.`,
          url: "/my-applications",
        }).catch(e => console.warn("[JobOffer] Push failed:", e));
      }

      console.log(`[JobOffer] Offered job #${input.jobId} to worker #${input.workerId} (prefs: ${notifPrefs})`);
      return { success: true, alreadyExists: false };
    }),

  /** Worker responds to an employer's job offer: reveal phone or reject */
  respondToOffer: protectedProcedure
    .input(z.object({
      applicationId: z.number(),
      action: z.enum(["accept", "reject"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getApplicationById(input.applicationId);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "הצעה לא נמצאה" });
      if (app.workerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "offered") throw new TRPCError({ code: "BAD_REQUEST", message: "הצעה זו כבר טופלה" });

      // Block accept if the job was already closed due to cap_reached
      if (input.action === "accept") {
        const job = await getJobById(app.jobId);
        if (job && job.status === "closed" && job.closedReason === "cap_reached") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "העבודה נסגרה — כבר התקבל מספר המועמדים המקסימלי.",
          });
        }
      }

      await respondToJobOffer(input.applicationId, input.action);

      if (input.action === "accept") {
        const workerPhone = app.workerPhone ?? "";
        const workerName = app.workerName ?? "עובד";
        const jobTitle = app.jobTitle ?? "";
        const employerId = app.jobPostedBy;
        const employerPhone = app.employerPhone;
        const employerPrefs = app.employerNotificationPrefs ?? "both";

        // Auto-close the job if the candidate cap is now reached
        const capReached = await autoCloseJobIfCapReached(app.jobId, MAX_ACCEPTED_CANDIDATES);
        if (capReached) {
          console.log(`[CandidateCap] Job #${app.jobId} auto-closed (cap_reached after ${MAX_ACCEPTED_CANDIDATES} acceptances)`);
          // Notify employer that the job is now filled
          if (employerId && (employerPrefs === "push_only" || employerPrefs === "both")) {
            sendPushToUser(employerId, {
              title: `✅ המשרה הושלמה!`,
              body: `קיבלת ${MAX_ACCEPTED_CANDIDATES} מועמדים למשרה "${jobTitle}". המשרה נסגרה אוטומטית.`,
              url: `/job/${app.jobId}/applications`,
            }).catch(e => console.warn("[CandidateCap] Push to employer failed:", e));
          }
        }

        // SMS to employer with worker phone
        if (employerPhone && (employerPrefs === "sms_only" || employerPrefs === "both")) {
          sendSms(
            employerPhone,
            `אישררור הצעה! ${workerName} אישר את הצעתך למשרה "${jobTitle}". הטלפון שלו: ${workerPhone}`
          ).catch(e => console.warn("[JobOffer] SMS to employer failed:", e));
        }

        // Push to employer with worker phone
        if (employerId && (employerPrefs === "push_only" || employerPrefs === "both")) {
          sendPushToUser(employerId, {
            title: `📞 ${workerName} אישר את הצעתך!`,
            body: `משרה: ${jobTitle}. טלפון העובד: ${workerPhone}`,
            url: `/job/${app.jobId}/applications`,
          }).catch(e => console.warn("[JobOffer] Push to employer failed:", e));
        }
      }

      return { success: true };
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
      await reportJob({ jobId: input.jobId, reason: sanitizeText(input.reason), reporterPhone: input.reporterPhone, reporterIp: ip });
      return { success: true };
    }),

  /** Worker applies to a job — records application and sends SMS to employer */
  applyToJob: phoneRequiredProcedure
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

      // ── Server-side minor eligibility guard (category + hours) ───────────────
      await assertMinorEligible(ctx.user.id, {
        category: job.category,
        workEndTime: job.workEndTime,
      });
      // ── minAge requirement check (applies to all ages) ────────────────────────
      const birthDate = await getWorkerBirthDate(ctx.user.id);
      const age = calcAge(birthDate)!; // assertMinorEligible already threw if null
      if (!meetsMinAgeRequirement(age, job.minAge)) {
        const required = job.minAge === 18 ? "18" : String(job.minAge);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `משרה זו מיועדת לעובדים מגיל ${required} בלבד`,
        });
      }
      // ── End age gate ──────────────────────────────────────────────────────────
      // Prevent duplicate applications
      const existing = await getApplicationByWorkerAndJob(ctx.user.id, input.jobId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "כבר הגשת מועמדות למשרה זו" });
      }

      // Record the application (sanitize message to prevent XSS)
      const sanitizedMessage = input.message ? sanitizeText(input.message) : input.message;
      await createApplication(ctx.user.id, input.jobId, sanitizedMessage);

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
      const acceptedCount = await countAcceptedCandidates(input.jobId);
      // Strip phone for non-accepted applicants
      return {
        jobStatus: job.status,
        jobClosedReason: job.closedReason ?? null,
        acceptedCount,
        applicants: rows.map((r) => ({
          ...r,
          workerPhone: r.contactRevealed ? r.workerPhone : null,
        })),
      };
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

      // ── Minor eligibility guard (only when accepting) ───────────────────────────
      // Prevents an employer from accepting a minor worker into a restricted job.
      if (input.action === "accept" && app.workerId) {
        await assertMinorEligible(app.workerId, {
          category: app.jobCategory,
          workEndTime: app.jobWorkEndTime,
        });
      }
      // ── End minor eligibility guard ────────────────────────────────────────────

      // ── Candidate cap guard (only when accepting) ──────────────────────────────
      if (input.action === "accept") {
        const alreadyAccepted = await countAcceptedCandidates(app.jobId);
        if (alreadyAccepted >= MAX_ACCEPTED_CANDIDATES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `המשרה כבר מלאה — כבר התקבלו ${MAX_ACCEPTED_CANDIDATES} מועמדים.`,
          });
        }
      }
      // ── End candidate cap guard ────────────────────────────────────────────────

      await updateApplicationStatus(input.id, input.action);

      // Auto-close the job if the candidate cap is now reached
      if (input.action === "accept") {
        const capReached = await autoCloseJobIfCapReached(app.jobId, MAX_ACCEPTED_CANDIDATES);
        if (capReached) {
          console.log(`[CandidateCap] Job #${app.jobId} auto-closed (cap_reached after ${MAX_ACCEPTED_CANDIDATES} acceptances via updateApplicationStatus)`);
        }
      }

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

  // ─── Job Publish OTP ─────────────────────────────────────────────────────────

  /**
   * Step 1: Send a 6-digit OTP to the employer's phone (SMS) or email.
   * The OTP is scoped to job publishing — it reuses the existing Twilio Verify
   * and emailOtp infrastructure but is a separate call so it doesn't interfere
   * with the login flow.
   */
  sendPublishOtp: phoneRequiredProcedure
    .input(z.object({
      channel: z.enum(["sms", "email"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;

      // ── Rate limit: max 3 sends per user per 10 minutes ────────────────────
      const rlKey = `publish-otp:${user.id}`;
      const rlResult = publishOtpRateLimiter.check(rlKey);
      if (!rlResult.allowed) {
        const minutes = Math.ceil(rlResult.retryAfterMs / 60_000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `שלחת יותר מדי קודות. נסה שוב בעוד ${minutes} דקות`,
        });
      }

      if (input.channel === "email") {
        const email = user.email;
        if (!email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצאה כתובת מייל בחשבונך" });
        }
        // Cooldown check
        const cooldownMs = await getEmailSendCooldown(email);
        if (cooldownMs > 0) {
          const seconds = Math.ceil(cooldownMs / 1000);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `המתן ${seconds} שניות לפני שליחה חוזרת` });
        }
        const code = await createEmailOtp(email);
        await sendEmailOtp(email, code);
        return { channel: "email" as const, maskedTarget: email.replace(/(.{2}).*(@.*)/, "$1***$2") };
      } else {
        // SMS via Twilio Verify
        const phone = user.phone;
        if (!phone) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצא מספר טלפון בחשבונך" });
        }
        const result = await smsProvider.sendOtp(phone);
        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "שליחת קוד SMS נכשלה. נסה שוב" });
        }
        const last4 = phone.slice(-4);
        return { channel: "sms" as const, maskedTarget: `****${last4}` };
      }
    }),

  /**
   * Step 2: Verify the OTP and, if valid, create the job.
   * Accepts the full job payload so the job is only created after OTP success.
   */
  verifyPublishOtp: phoneRequiredProcedure
    .input(z.object({
      channel: z.enum(["sms", "email"]),
      code: z.string().length(6),
      jobData: jobInputSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;

      // ── Verify OTP ──────────────────────────────────────────────────────────
      if (input.channel === "email") {
        const email = user.email;
        if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצאה כתובת מייל" });
        const result = await verifyEmailOtp(email, input.code);
        if (result === "not_found" || result === "expired") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "הקוד פג תוקף. שלח קוד חדש" });
        }
        if (result === "max_attempts") {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `חרגת ${EMAIL_OTP_MAX_ATTEMPTS} ניסיונות. שלח קוד חדש` });
        }
        if (result === "wrong") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "קוד שגוי. נסה שוב" });
        }
      } else {
        // SMS via Twilio Verify
        const phone = user.phone;
        if (!phone) throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצא מספר טלפון" });
        const verifyResult = await smsProvider.verifyOtp(phone, input.code);
        if (!verifyResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "קוד שגוי או פג תוקף. נסה שוב" });
        }
      }

      // ── OTP valid — create the job (same logic as jobs.create) ──────────────
      const jobInput = input.jobData;

      if (user.role !== "admin") {
        const regionCheck = await checkRegionActiveForJob(jobInput.latitude, jobInput.longitude);
        if (!regionCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `האזור עדיין בהרצה ונפתח בקרוב למעסיקים.`,
            cause: { regionId: regionCheck.regionId, regionName: regionCheck.regionName, regionSlug: regionCheck.regionSlug },
          });
        }
      }

      const contactPhone = user.phone ?? jobInput.contactPhone;
      if (!contactPhone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "לא נמצא מספר טלפון בחשבונך" });
      }

      const durationDays = parseInt(jobInput.activeDuration);
      const expiresMs = jobInput.isUrgent ? 12 * 60 * 60 * 1000 : durationDays * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + expiresMs);

      const extractCity = (addr: string): string => {
        const parts = addr.split(",").map(p => p.trim()).filter(Boolean);
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          if (/^\d+$/.test(part)) continue;
          if (part === "ישראל" || part === "Israel") continue;
          return part;
        }
        return parts[0] ?? addr;
      };
      const city = jobInput.city ?? extractCity(jobInput.address);

      const sanitizedInput = {
        ...jobInput,
        title: sanitizeText(jobInput.title),
        description: sanitizeRichText(jobInput.description),
        address: sanitizeText(jobInput.address),
        city: sanitizeText(city),
        contactName: sanitizeText(jobInput.contactName),
        businessName: sanitizeText(jobInput.businessName),
        workingHours: sanitizeText(jobInput.workingHours),
        jobTags: sanitizeTextArray(jobInput.jobTags ?? [jobInput.category]),
      };

      const job = await createJob({
        ...sanitizedInput,
        contactPhone,
        city: sanitizedInput.city,
        latitude: jobInput.latitude.toString(),
        longitude: jobInput.longitude.toString(),
        salary: jobInput.salary?.toString(),
        hourlyRate: jobInput.hourlyRate?.toString(),
        estimatedHours: jobInput.estimatedHours?.toString(),
        expiresAt,
        isUrgent: jobInput.isUrgent ?? false,
        isLocalBusiness: jobInput.isLocalBusiness ?? false,
        showPhone: jobInput.showPhone ?? false,
        startDateTime: jobInput.startDateTime ? new Date(jobInput.startDateTime) : null,
        postedBy: user.id,
        status: "active",
        jobTags: jobInput.jobTags ?? [jobInput.category],
        jobLocationMode: jobInput.jobLocationMode ?? "radius",
        jobSearchRadiusKm: jobInput.jobSearchRadiusKm ?? 5,
        jobDate: jobInput.jobDate ?? null,
        workStartTime: jobInput.workStartTime ?? null,
        workEndTime: jobInput.workEndTime ?? null,
        imageUrls: jobInput.imageUrls ?? null,
        minAge: jobInput.minAge ?? null,
        cityPlaceId: jobInput.cityPlaceId ?? null,
      });

      // Fire-and-forget: matching + alerts (same as jobs.create)
      const MATCHING_API_URL = process.env.MATCHING_API_URL;
      if (MATCHING_API_URL) {
        fetch(`${MATCHING_API_URL}/match-workers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: job.id, job_description: jobInput.description, latitude: jobInput.latitude, longitude: jobInput.longitude, city, location_mode: jobInput.jobLocationMode ?? "radius" }),
        }).catch((err) => console.warn("[MatchAPI] Pre-compute call failed:", err));
      }
      const jobMeta = { title: jobInput.title, city, category: jobInput.category, isUrgent: jobInput.isUrgent ?? false, id: job.id };
      getWorkersMatchingJob(jobInput.category, city, user.id, 100, jobInput.latitude, jobInput.longitude)
        .then(async (workers) => {
          const smsSent = await sendJobAlerts(workers, jobMeta);
          if (smsSent > 0) console.log(`[JobAlert] Sent SMS to ${smsSent} workers for job #${job.id}`);
          const workerIds = workers.map((w) => w.id);
          if (workerIds.length > 0) {
            const pushSent = await sendJobPushNotifications(workerIds, jobMeta);
            if (pushSent > 0) console.log(`[JobAlert] Sent Push to ${pushSent} workers for job #${job.id}`);
          }
        })
        .catch((err) => console.warn("[JobAlert] Error sending alerts:", err));

      return job;
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
    .mutation(async ({ input, ctx }) => {
      await adminBlockUser(input.userId);
      securityLogger.warn({ adminId: ctx.user.id, targetUserId: input.userId, event: "admin_block_user" }, "Admin blocked user");
      return { success: true };
    }),

  /** Unblock a user */
  unblockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await adminUnblockUser(input.userId);
      securityLogger.info({ adminId: ctx.user.id, targetUserId: input.userId, event: "admin_unblock_user" }, "Admin unblocked user");
      return { success: true };
    }),

  /** Set user role */
  setUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "test"]) }))
    .mutation(async ({ input, ctx }) => {
      await adminSetUserRole(input.userId, input.role);
      securityLogger.warn({ adminId: ctx.user.id, targetUserId: input.userId, newRole: input.role, event: "admin_set_role" }, "Admin changed user role");
      return { success: true };
    }),

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

  /** Force-expire all active sessions for a user */
  forceLogoutUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await adminForceLogoutUser(input.userId);
      securityLogger.warn({ adminId: ctx.user.id, targetUserId: input.userId, event: "admin_force_logout" }, "Admin force-logged out user");
      return { success: true };
    }),

  /** Clear the forced-logout flag so the user can log in again */
  clearForcedLogout: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await adminClearForcedLogout(input.userId);
      securityLogger.info({ adminId: ctx.user.id, targetUserId: input.userId, event: "admin_clear_forced_logout" }, "Admin cleared forced logout");
      return { success: true };
    }),

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
  /** Get current employer-lock status */
  getEmployerLock: adminProcedure.query(async () => {
    const active = await isEmployerLockActive();
    return { active };
  }),
  /** Toggle employer-lock on/off */
  setEmployerLock: adminProcedure
    .input(z.object({ active: z.boolean() }))
    .mutation(async ({ input }) => {
      await setSystemSetting("employerLock", input.active ? "true" : "false");
      return { success: true, active: input.active };
    }),

  /** Paginated audit log of all birthDate changes — for legal/compliance review */
  getBirthdateChanges: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const rows = await adminGetBirthdateChanges({ limit: input.limit, offset: input.offset });
      return rows;
    }),

  /** Paginated system logs with phone/level/event filters — for debugging and support */
  getSystemLogs: adminProcedure
    .input(z.object({
      phone: z.string().max(32).optional(),
      level: z.enum(["info", "warn", "error"]).optional(),
      event: z.string().max(128).optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return getLogs({
        phone: input.phone,
        level: input.level,
        event: input.event,
        limit: input.limit,
        offset: input.offset,
      });
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
      /** Minimum worker age (16 or 18) from employer preferences. Workers
       *  without a recorded birthDate are excluded when this is set. */
      minWorkerAge: z.number().int().min(16).max(99).optional().nullable(),
    }))
    .query(async ({ input, ctx }) => {
      const workers = await getNearbyWorkers(
        input.lat,
        input.lng,
        input.radiusKm,
        input.limit ?? 50,
        input.minWorkerAge ?? null,
      );
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
  /**
   * Check whether an email address is available for registration.
   * Returns { available: true } if the email is not yet registered,
   * or { available: false, loginMethod } so the frontend can guide
   * the user to the correct sign-in method.
   * Public — no auth required (called before Google OAuth redirect).
   */
  checkEmailAvailable: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .query(async ({ input }) => {
      const existing = await getUserByEmail(input.email.toLowerCase().trim());
      if (!existing) return { available: true, loginMethod: null };
      return {
        available: false,
        loginMethod: existing.loginMethod ?? "phone",
      };
    }),

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
        preferredCity: z.string().max(100).nullable().optional().superRefine((v, ctx) => { if (v) cityZodRefine(v, ctx); }),
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
        preferredCityPlaceId: z.string().max(100).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Normalize phone if provided (only for OAuth users without phone)
      let normalizedPhone: string | undefined = undefined;
      let normalizedPhonePrefix: string | undefined = undefined;
      let normalizedPhoneNumber: string | undefined = undefined;
      if (input.phone && ctx.user.loginMethod !== "phone_otp") {
        try {
          normalizedPhone = normalizeIsraeliPhone(input.phone);
          if (!isValidIsraeliPhone(normalizedPhone)) {
            normalizedPhone = undefined;
          } else {
            // Split into prefix/number for IsraeliPhoneInput compatibility
            const split = splitIsraeliE164Phone(normalizedPhone);
            if (split) {
              normalizedPhonePrefix = split.prefix;
              normalizedPhoneNumber = split.number;
            }
          }
        } catch { normalizedPhone = undefined; }
      }
      try {
        await updateWorkerProfile(ctx.user.id, {
          name: input.name,
          phone: normalizedPhone,
          ...(normalizedPhonePrefix !== undefined ? { phonePrefix: normalizedPhonePrefix } : {}),
          ...(normalizedPhoneNumber !== undefined ? { phoneNumber: normalizedPhoneNumber } : {}),
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
          preferredCityPlaceId: input.preferredCityPlaceId,
          signupCompleted: true,
        });
        void logEvent("info", "signup.complete", "Worker completed signup wizard", {
          userId: ctx.user.id,
          phone: ctx.user.phone ?? normalizedPhone,
          meta: { name: input.name, locationMode: input.locationMode, categories: input.preferredCategories },
        });

        // Send welcome email (fire-and-forget — don't block the response)
        // Skip for email_otp users: they already received the welcome email in verifyEmailCode
        const userEmail = ctx.user.email;
        if (userEmail && ctx.user.loginMethod !== "email_otp") {
          sendWelcomeEmailOtp({ to: userEmail, name: input.name })
            .catch((err) => console.warn("[completeSignup] sendWelcomeEmail error:", err));
        }

        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        void logEvent("error", "signup.complete.failed", `completeSignup failed: ${msg}`, {
          userId: ctx.user.id,
          phone: ctx.user.phone ?? normalizedPhone,
          meta: { error: msg },
        });
        throw err;
      }
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
        preferredCity: z.string().max(100).nullable().optional().superRefine((v, ctx) => { if (v) cityZodRefine(v, ctx); }),
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
        preferredCityPlaceId: z.string().max(100).nullable().optional(),
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
      // Duplicate phone check before updating profile
      if (normalizedPhone) {
        const existingWithPhone = await getUserByNormalizedPhone(normalizedPhone, normalizeIsraeliPhone);
        if (existingWithPhone && existingWithPhone.id !== ctx.user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "מספר הטלפון כבר משויך לחשבון אחר במערכת.",
          });
        }
      }
      // Strip 'night' slot for minor users — enforced server-side regardless of client input
      let sanitizedTimeSlots = input.preferredTimeSlots;
      if (sanitizedTimeSlots && sanitizedTimeSlots.includes("night")) {
        const birthDate = await getWorkerBirthDate(ctx.user.id);
        const age = calcAge(birthDate);
        if (isMinor(age)) {
          sanitizedTimeSlots = sanitizedTimeSlots.filter(s => s !== "night");
        }
      }

      await updateWorkerProfile(ctx.user.id, {
        name: input.name ? sanitizeText(input.name) : input.name,
        phone: normalizedPhone,
        ...(phonePrefix !== undefined ? { phonePrefix } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber } : {}),
        preferredCategories: input.preferredCategories,
        preferredCity: input.preferredCity ? sanitizeText(input.preferredCity) : input.preferredCity,
        workerBio: input.workerBio ? sanitizeText(input.workerBio) : input.workerBio,
        locationMode: input.locationMode,
        workerLatitude: input.workerLatitude,
        workerLongitude: input.workerLongitude,
        searchRadiusKm: input.searchRadiusKm ?? undefined,
        preferenceText: input.preferenceText ? sanitizeText(input.preferenceText) : input.preferenceText,
        workerTags: input.workerTags ? sanitizeTextArray(input.workerTags) : input.workerTags,
        preferredDays: input.preferredDays,
        preferredTimeSlots: sanitizedTimeSlots,
        preferredCities: input.preferredCities,
        preferredCityPlaceId: input.preferredCityPlaceId,
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

  // ── Employer Profile ──────────────────────────────────────────────────────────────────

  /** Get the current employer's profile */
  getEmployerProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getEmployerProfile(ctx.user.id);
    return profile;
  }),

  /** Update the current employer's profile */
  updateEmployerProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().min(9).max(20).nullable().optional(),
        phonePrefix: z.string().length(3).nullable().optional(),
        phoneNumber: z.string().length(7).regex(/^\d{7}$/).nullable().optional(),
        email: z.string().email().max(320).nullable().optional(),
        companyName: z.string().max(120).nullable().optional(),
        employerBio: z.string().max(500).nullable().optional(),
        defaultJobCity: z.string().max(100).nullable().optional(),
        defaultJobCityId: z.number().int().nullable().optional(),
        defaultJobLatitude: z.string().nullable().optional(),
        defaultJobLongitude: z.string().nullable().optional(),
        workerSearchCity: z.string().max(100).nullable().optional().superRefine((v, ctx) => { if (v) cityZodRefine(v, ctx); }),
        workerSearchCityId: z.number().int().nullable().optional(),
        workerSearchRadiusKm: z.number().int().min(1).max(200).nullable().optional(),
        workerSearchLatitude: z.string().nullable().optional(),
        workerSearchLongitude: z.string().nullable().optional(),
        workerSearchLocationMode: z.enum(["city", "radius"]).optional(),
        minWorkerAge: z.union([z.literal(16), z.literal(18)]).nullable().optional(),
        signupCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Phone validation (same pattern as worker profile)
      let normalizedPhone: string | undefined = undefined;
      if (input.phone !== undefined && input.phone !== null) {
        if (ctx.user.loginMethod === "phone_otp") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "שינוי מספר טלפון אינו מותר למשתמשים שנכנסו עם OTP" });
        }
        try {
          normalizedPhone = normalizeIsraeliPhone(input.phone);
          if (!isValidIsraeliPhone(normalizedPhone)) throw new Error();
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין" });
        }
      }
      let phonePrefix: string | undefined = undefined;
      let phoneNumber: string | undefined = undefined;
      if (input.phonePrefix != null && input.phoneNumber != null) {
        const prefixValid = await isValidPhonePrefix(input.phonePrefix);
        if (!prefixValid) throw new TRPCError({ code: "BAD_REQUEST", message: "קידומת טלפון לא תקינה" });
        if (!/^\d{7}$/.test(input.phoneNumber)) throw new TRPCError({ code: "BAD_REQUEST", message: "מספר הטלפון חייב להכיל בדייק 7 ספרות" });
        phonePrefix = input.phonePrefix;
        phoneNumber = input.phoneNumber;
        const combined = `${input.phonePrefix}${input.phoneNumber}`;
        try {
          normalizedPhone = normalizeIsraeliPhone(combined);
          if (!isValidIsraeliPhone(normalizedPhone)) normalizedPhone = undefined;
        } catch { normalizedPhone = undefined; }
      }
      if (normalizedPhone) {
        const existing = await getUserByNormalizedPhone(normalizedPhone, normalizeIsraeliPhone);
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "מספר הטלפון כבר משויך לחשבון אחר במערכת." });
        }
      }
      await updateEmployerProfile(ctx.user.id, {
        name: input.name,
        phone: normalizedPhone,
        phonePrefix,
        phoneNumber,
        email: input.email ?? undefined,
        companyName: input.companyName ?? undefined,
        employerBio: input.employerBio ?? undefined,
        defaultJobCity: input.defaultJobCity ?? undefined,
        defaultJobCityId: input.defaultJobCityId ?? undefined,
        defaultJobLatitude: input.defaultJobLatitude ?? undefined,
        defaultJobLongitude: input.defaultJobLongitude ?? undefined,
        workerSearchCity: input.workerSearchCity ?? undefined,
        workerSearchCityId: input.workerSearchCityId ?? undefined,
        workerSearchRadiusKm: input.workerSearchRadiusKm ?? undefined,
        workerSearchLatitude: input.workerSearchLatitude ?? undefined,
        workerSearchLongitude: input.workerSearchLongitude ?? undefined,
        workerSearchLocationMode: input.workerSearchLocationMode,
        minWorkerAge: input.minWorkerAge ?? undefined,
        signupCompleted: input.signupCompleted,
      });
      return { success: true };
    }),

  /** Upload employer profile photo to S3 */
  uploadEmployerProfilePhoto: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const key = `employer-photos/${ctx.user.id}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      await updateEmployerProfile(ctx.user.id, { profilePhoto: url });
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
      try {
        await updateUserPhone(ctx.user.id, normalized, input.phonePrefix ?? null, input.phoneNumber ?? null, normalizeIsraeliPhone);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.startsWith("PHONE_DUPLICATE:")) {
          await logPhoneChange({ userId: ctx.user.id, oldPhone: ctx.user.phone, newPhone: normalized, ipAddress: ip, result: "failed" });
          throw new TRPCError({
            code: "CONFLICT",
            message: "מספר הטלפון כבר שייך למשתמש אחר במערכת.",
          });
        }
        throw err;
      }
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

  /**
   * Record a user's explicit consent to a legal document.
   * Idempotent — re-consenting to the same type is a no-op.
   */
  recordConsent: protectedProcedure
    .input(z.object({
      consentType: z.enum([
        "terms",
        "privacy",
        "age_18",
        "job_posting_policy",
        "safety_policy",
        "user_content_policy",
        "reviews_policy",
      ]),
      documentVersion: z.string().max(32).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ip = getClientIp(ctx.req);
      const ua = ctx.req.headers["user-agent"]?.slice(0, 512);
      await recordUserConsent(ctx.user.id, input.consentType, {
        ipAddress: ip,
        userAgent: ua,
        documentVersion: input.documentVersion,
      });
      return { success: true };
    }),

  /** Get all consent records for the current user */
  getMyConsents: protectedProcedure.query(async ({ ctx }) => {
    return getUserConsents(ctx.user.id);
  }),

  /**
   * Returns a list of consent types where the user's accepted version
   * is older than the current LEGAL_DOCUMENT_VERSIONS.
   * Used by the ReConsentModal to prompt re-consent (blocking modal).
   */
  checkOutdatedConsents: protectedProcedure.query(async ({ ctx }) => {
    const existing = await getUserConsents(ctx.user.id);
    const existingMap = new Map(
      existing.map((c) => [c.consentType as LegalConsentType, c.documentVersion])
    );
    const outdated: LegalConsentType[] = [];
    for (const [type, currentVersion] of Object.entries(LEGAL_DOCUMENT_VERSIONS) as [LegalConsentType, string][]) {
      const acceptedVersion = existingMap.get(type);
      // Outdated if: never accepted, OR accepted an older version
      if (!acceptedVersion || acceptedVersion < currentVersion) {
        // Only flag core documents (terms + privacy) — policy docs are informational
        if (type === "terms" || type === "privacy") {
          outdated.push(type);
        }
      }
    }
    return { outdated, currentVersions: LEGAL_DOCUMENT_VERSIONS };
  }),

  /**
   * Complete a Google OAuth registration by saving phone, name, and
   * recording termsAcceptedAt + consents. Called once after the OAuth
   * callback when the user chose "Continue with Google" on the
   * channel-selection screen. Idempotent — safe to call multiple times.
   */
  completeGoogleRegistration: protectedProcedure
    .input(z.object({
      // phone is optional — CompleteProfileModal will prompt for it if missing
      phone: z.string().min(9).max(20).optional(),
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().max(320).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only applicable for Google OAuth users
      if (ctx.user.loginMethod !== "google_oauth") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only applicable for Google sign-in" });
      }
      // Validate and normalize phone if provided
      let normalizedPhone: string | undefined = undefined;
      if (input.phone) {
        try {
          normalizedPhone = normalizeIsraeliPhone(input.phone);
          if (!isValidIsraeliPhone(normalizedPhone)) throw new Error("invalid");
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "מספר טלפון לא תקין" });
        }
      }
      // Save phone (if provided) + termsAcceptedAt + optional email
      // (idempotent — only updates if termsAcceptedAt IS NULL)
      await completeGoogleRegistration(ctx.user.id, {
        phone: normalizedPhone,
        name: input.name,
        email: input.email,
      });
      // Record consents (terms, privacy, age_18)
      const ip = getClientIp(ctx.req);
      const ua = ctx.req.headers["user-agent"]?.slice(0, 512);
      const consentTypes = ["terms", "privacy", "age_18"] as const;
      await Promise.all(
        consentTypes.map((ct) =>
          recordUserConsent(ctx.user.id, ct, {
            ipAddress: ip,
            userAgent: ua,
            documentVersion: LEGAL_DOCUMENT_VERSIONS[ct],
          })
        )
      );
      return { success: true };
    }),

  /**
   * Save the current worker's birth date after they confirm the declaration.
   * Validates:
   *  - date is a valid YYYY-MM-DD string
   *  - worker is at least 16 years old
   * Logs a legal_acknowledgement record on success.
   */
  saveBirthDate: protectedProcedure
    .input(z.object({
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
      jobId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const age = calcAge(input.birthDate);
      if (age === null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "תאריך לידה לא תקין." });
      }
      if (isTooYoung(age)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "הרשמה כעובד זמינה מגיל 16 בלבד.",
        });
      }
      await saveBirthDate(ctx.user.id, input.birthDate);
      await logLegalAcknowledgement({
        userId: ctx.user.id,
        jobId: input.jobId,
        ackType: "birth_date_declaration",
        approved: true,
      });
      return { success: true, age, isMinor: isMinor(age) };
    }),

  /**
   * Update an existing birthDate — requires re-declaration, enforces 30-day rate limit,
   * and writes an immutable audit row to birthdate_changes.
   */
  updateBirthDate: protectedProcedure
    .input(z.object({
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
      /** Frontend must pass true — confirms the declaration checkbox was checked */
      declarationConfirmed: z.literal(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate date semantics
      const age = calcAge(input.birthDate);
      if (age === null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "תאריך לידה לא תקין." });
      }
      if (isTooYoung(age)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "הרשמה כעובד זמינה מגיל 16 בלבד." });
      }
      // 30-day rate limit
      const lastChange = await getLastBirthDateChange(ctx.user.id);
      if (lastChange) {
        const daysSince = (Date.now() - new Date(lastChange.changedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          const nextAllowed = new Date(new Date(lastChange.changedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `ניתן לעדכן תאריך לידה פעם ב-30 יום. ניסיון הבא מותר ב-${nextAllowed.toLocaleDateString("he-IL")}.`,
          });
        }
      }
      // Write audit row + update user
      // IP is extracted from the raw HTTP request via ctx if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ip = (ctx as any).req?.ip ?? (ctx as any).req?.headers?.["x-forwarded-for"] ?? null;
      await updateBirthDateWithAudit({
        userId: ctx.user.id,
        newBirthDate: input.birthDate,
        ipAddress: typeof ip === "string" ? ip.split(",")[0].trim() : null,
      });
      // Log legal acknowledgement
      await logLegalAcknowledgement({
        userId: ctx.user.id,
        ackType: "birth_date_update_declaration",
        approved: true,
      });
      return { success: true, age, isMinor: isMinor(age) };
    }),

  /**
   * Get the current worker's birth date and computed age/isMinor flags.
   * Returns null values if birth date has not been set yet.
   */
  getBirthDateInfo: protectedProcedure.query(async ({ ctx }) => {
    const birthDate = await getWorkerBirthDate(ctx.user.id);
    const age = calcAge(birthDate);
    // Rate-limit info: when can the user change their birthDate next?
    const lastChange = await getLastBirthDateChange(ctx.user.id);
    let lastChangedAt: string | null = null;
    let canChangeAfter: string | null = null;
    if (lastChange) {
      const changedAtMs = new Date(lastChange.changedAt).getTime();
      lastChangedAt = new Date(changedAtMs).toISOString();
      const nextAllowedMs = changedAtMs + 30 * 24 * 60 * 60 * 1000;
      if (nextAllowedMs > Date.now()) {
        canChangeAfter = new Date(nextAllowedMs).toISOString();
      }
    }
    return {
      birthDate,
      age,
      isMinor: isMinor(age),
      isTooYoung: isTooYoung(age),
      lastChangedAt,
      canChangeAfter,
    };
  }),
  /** Get isMinor status for multiple worker IDs — used by employer views */
  getWorkersMinorStatus: protectedProcedure
    .input(z.object({ workerIds: z.array(z.number().int()).max(200) }))
    .query(async ({ input }) => {
      return getWorkersMinorStatus(input.workerIds);
    }),

  /**
   * Returns a map of workerId → availabilityStatus for a batch of workers.
   * Used for real-time availability dot refresh without re-running the matching algorithm.
   */
  getWorkersAvailabilityStatus: protectedProcedure
    .input(z.object({ workerIds: z.array(z.number().int()).max(200) }))
    .query(async ({ input }) => {
      if (input.workerIds.length === 0) return {} as Record<number, string | null>;
      const nameMap = await getWorkerNamesByIds(input.workerIds);
      const result: Record<number, string | null> = {};
      for (const id of input.workerIds) {
        result[id] = nameMap.get(id)?.availabilityStatus ?? null;
      }
      return result;
    }),

  /**
   * Check if a specific job is accessible to the current worker based on age.
   * Returns { accessible: true } or { accessible: false, reason }.
   */
  checkJobAgeAccess: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const birthDate = await getWorkerBirthDate(ctx.user.id);
      if (!birthDate) {
        return { accessible: false, reason: "no_birth_date" as const };
      }
      const age = calcAge(birthDate);
      if (age === null || isTooYoung(age)) {
        return { accessible: false, reason: "too_young" as const };
      }
      const job = await getJobById(input.jobId);
      if (!job) {
        return { accessible: false, reason: "job_not_found" as const };
      }
      if (isMinor(age)) {
        if (!isJobAccessibleToMinor(job.workEndTime)) {
          return { accessible: false, reason: "late_end_time" as const };
        }
      }
      if (!meetsMinAgeRequirement(age, job.minAge)) {
        return { accessible: false, reason: "min_age_requirement" as const };
      }
      return { accessible: true, reason: null };
    }),
});
// ─── Push Notifications Router ──────────────────────────────────────────────

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
      allowedForMinors: z.boolean().optional(),
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
      allowedForMinors: z.boolean().optional(),
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

// ─── Platform Router (public settings readable by frontend) ─────────────────────
const platformRouter = router({
  /** Public: check employer-lock status.
   * Admins and test users always receive locked=false so they can access all areas.
   */
  settings: publicProcedure.query(async ({ ctx }) => {
    const employerLock = await isEmployerLockActive();
    // Admins and test users bypass the lock
    const bypassLock = ctx.user?.role === "admin" || ctx.user?.role === "test";
    return {
      employerLock: bypassLock ? false : employerLock,
    };
  }),
});
// ─── Support Router ──────────────────────────────────────────────────────────────────
/** In-memory rate-limit store: key=ip|userId → { count, windowStart } */
const supportRateLimitStore = new Map<string, { count: number; windowStart: number }>();

const supportRouter = router({
  /**
   * Public: submit a support report with optional screenshot.
   * Rate-limited to SUPPORT_REPORT_RATE_LIMIT per IP/user per hour.
   */
  reportProblem: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(5000),
        subject: z.string().max(200).optional(),
        phone: z.string().max(20).optional(),
        pageUrl: z.string().max(500),
        userAgent: z.string().max(500),
        screenResolution: z.string().max(50).optional(),
        timestamp: z.string(),
        screenshotBase64: z.string().max(5_000_000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sendSupportReport } = await import("./supportEmail");

      const ip =
        ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
        ctx.req.socket?.remoteAddress ??
        "unknown";
      const rlKey = ctx.user ? `user:${ctx.user.id}` : `ip:${ip}`;

      const now = Date.now();
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const entry = supportRateLimitStore.get(rlKey);
      if (entry && now - entry.windowStart < ONE_HOUR_MS) {
        if (entry.count >= SUPPORT_REPORT_RATE_LIMIT) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "הגעת למגבלת הדיוחים לשעה. נסה שוב מאוחר יותר.",
          });
        }
        entry.count++;
      } else {
        supportRateLimitStore.set(rlKey, { count: 1, windowStart: now });
      }

      await sendSupportReport({
        userId: ctx.user?.id != null ? String(ctx.user.id) : null,
        phone: input.phone ?? ctx.user?.phone ?? null,
        subject: input.subject ?? null,
        message: input.message,
        pageUrl: input.pageUrl,
        userAgent: input.userAgent,
        screenResolution: input.screenResolution ?? null,
        timestamp: input.timestamp,
        screenshotBase64: input.screenshotBase64 ?? null,
      });

      return { success: true };
    }),
});

// ─── App Router ────────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  maintenance: maintenanceRouter,
  platform: platformRouter,
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
  support: supportRouter,
});
export type AppRouter = typeof appRouter;

import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  countActiveJobsByUser,
  createJob,
  createOtp,
  createUserByPhone,
  deleteJob,
  getActiveJobs,
  getJobById,
  getJobsNearLocation,
  getMyJobs,
  getUserByPhone,
  getValidOtp,
  markOtpUsed,
  reportJob,
  updateJob,
  updateJobStatus,
  updateUserLastSignedIn,
} from "./db";

// ─── OTP Auth ────────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  sendOtp: publicProcedure
    .input(z.object({ phone: z.string().min(9).max(15) }))
    .mutation(async ({ input }) => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await createOtp(input.phone, code, expiresAt);
      console.log(`[OTP] Phone: ${input.phone} → Code: ${code}`);
      return { success: true, devCode: process.env.NODE_ENV === "development" ? code : undefined };
    }),

  verifyOtp: publicProcedure
    .input(z.object({ phone: z.string(), code: z.string().length(6), name: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const otp = await getValidOtp(input.phone, input.code);
      if (!otp) throw new TRPCError({ code: "BAD_REQUEST", message: "קוד שגוי או פג תוקף" });

      await markOtpUsed(otp.id);

      let user = await getUserByPhone(input.phone);
      if (!user) {
        user = await createUserByPhone(input.phone, input.name);
      } else {
        await updateUserLastSignedIn(user.id);
      }

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "שגיאה ביצירת משתמש" });

      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const token = await new SignJWT({
        sub: user.openId,
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);

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
    "events", "volunteer", "other",
  ]),
  address: z.string().min(2),
  city: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  salary: z.number().optional(),
  salaryType: z.enum(["hourly", "daily", "monthly", "volunteer"]).default("hourly"),
  contactPhone: z.string().min(9),
  contactName: z.string().min(2),
  businessName: z.string().optional(),
  workingHours: z.string().optional(),
  startTime: z.enum(["today", "tomorrow", "this_week", "flexible"]).default("flexible"),
  workersNeeded: z.number().int().min(1).default(1),
  activeDuration: z.enum(["1", "3", "7"]).default("7"),
  jobTags: z.array(z.string()).optional(),
});

const jobsRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getActiveJobs(input.limit ?? 50, input.category);
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
    .query(async ({ input }) => {
      return getJobsNearLocation(input.lat, input.lng, input.radiusKm, input.category, input.limit ?? 50);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "משרה לא נמצאה" });
      return job;
    }),

  create: protectedProcedure
    .input(jobInputSchema)
    .mutation(async ({ input, ctx }) => {
      // Anti-spam: max 3 active jobs per user
      const activeCount = await countActiveJobsByUser(ctx.user.id);
      if (activeCount >= 3) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "הגעת למגבלת 3 משרות פעילות. סגור משרה קיימת כדי לפרסם חדשה.",
        });
      }

      const durationDays = parseInt(input.activeDuration);
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Extract city from address (first segment before comma)
      const city = input.city ?? input.address.split(",")[0].trim();

      const job = await createJob({
        ...input,
        city,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        salary: input.salary?.toString(),
        expiresAt,
        postedBy: ctx.user.id,
        status: "active",
        jobTags: input.jobTags ?? [input.category],
      });
      return job;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: jobInputSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
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
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateJobStatus(input.id, ctx.user.id, input.status);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.postedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteJob(input.id, ctx.user.id);
      return { success: true };
    }),

  myJobs: protectedProcedure.query(async ({ ctx }) => {
    return getMyJobs(ctx.user.id);
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

      const ip = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] ??
        ctx.req.socket?.remoteAddress ?? "unknown";

      await reportJob({
        jobId: input.jobId,
        reason: input.reason,
        reporterPhone: input.reporterPhone,
        reporterIp: ip,
      });

      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;

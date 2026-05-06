import { NOT_ADMIN_ERR_MSG, PHONE_REQUIRED_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Pass cause data (e.g. regionId/regionName) through to the client
    const causeData = error.cause && typeof error.cause === "object" && !(error.cause instanceof Error) ? error.cause as Record<string, unknown> : {};

    // For unexpected server errors, replace the raw message with a generic one.
    // The real error is captured in system_logs via the onError handler.
    const isInternalError = error.code === "INTERNAL_SERVER_ERROR";
    const safeMessage = isInternalError
      ? "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר או פנה לתמיכה."
      : shape.message;

    return {
      ...shape,
      message: safeMessage,
      data: {
        ...shape.data,
        ...causeData,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Like protectedProcedure but also enforces that the user has a phone number.
 * Use for any action that requires a verified phone (job posting, profile updates, etc.).
 * Throws FORBIDDEN with PHONE_REQUIRED_ERR_MSG so the frontend can intercept
 * and redirect the user to the phone-entry / registration flow.
 *
 * Exempt routes (use plain protectedProcedure instead):
 *  - auth.me, auth.logout — needed to read/clear session
 *  - user.completeSignup  — the route that sets the phone in the first place
 *  - user.updateProfile   — allows updating phone
 */
const requirePhone = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: UNAUTHED_ERR_MSG });
  }
  if (!ctx.user.phone) {
    throw new TRPCError({ code: 'FORBIDDEN', message: PHONE_REQUIRED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Requires both authentication AND a phone number on the account. */
export const phoneRequiredProcedure = t.procedure.use(requirePhone);

// כינוי תואם-לאחור לשם הישן שבו הראוטרים משתמשים.
export const registeredProcedure = phoneRequiredProcedure;

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

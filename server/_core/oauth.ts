import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function resolveOAuthRedirectPath(req: Request): string {
  const returnTo = getQueryParam(req, "returnTo");
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }
  return returnTo;
}

type ExistingOAuthUser = {
  termsAcceptedAt?: Date | null;
  email?: string | null;
  phone?: string | null;
};

export type OAuthLoginErrorCode =
  | "google_existing_only"
  | "google_email_required";

export function isEligibleExistingOAuthUser(
  user: ExistingOAuthUser | null | undefined
): boolean {
  return Boolean(
    user?.termsAcceptedAt &&
    user.email?.trim() &&
    user.phone?.trim()
  );
}

export function buildOAuthLoginRedirectPath(
  req: Request,
  authError?: OAuthLoginErrorCode
): string {
  const url = new URL("/", "http://local.avodanow");
  url.searchParams.set("auth", "login");

  const returnTo = resolveOAuthRedirectPath(req);
  if (returnTo !== "/") {
    url.searchParams.set("returnTo", returnTo);
  }

  if (authError) {
    url.searchParams.set("authError", authError);
  }

  return `${url.pathname}${url.search}`;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const rawEmail = userInfo.email?.trim() || null;
      const normalizedEmail = rawEmail?.toLowerCase() || null;

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const existingByOpenId = await db.getUserByOpenId(userInfo.openId);
      let existingByEmail: Awaited<ReturnType<typeof db.getUserByEmail>> | undefined;
      if (rawEmail) {
        existingByEmail =
          await db.getUserByEmail(rawEmail) ||
          (normalizedEmail && normalizedEmail !== rawEmail
            ? await db.getUserByEmail(normalizedEmail)
            : undefined);
      }
      const existingUser = existingByOpenId ?? existingByEmail;

      if (!existingUser) {
        res.redirect(302, buildOAuthLoginRedirectPath(req, "google_existing_only"));
        return;
      }

      if (!isEligibleExistingOAuthUser(existingUser)) {
        res.redirect(302, buildOAuthLoginRedirectPath(req, "google_existing_only"));
        return;
      }

      if (!normalizedEmail && !existingByOpenId) {
        res.redirect(302, buildOAuthLoginRedirectPath(req, "google_email_required"));
        return;
      }

      // Check if a phone-registered account already exists with the same email.
      // If so, merge: update the existing account's openId to the Google openId
      // so the user keeps all their data (jobs, ratings, profile) under one account.
      if (existingByEmail && existingByEmail.openId !== userInfo.openId) {
        // Merge: adopt the Google openId on the existing account
        await db.mergeAccountToGoogleOpenId(
          existingByEmail.openId,
          userInfo.openId,
          userInfo.loginMethod ?? "google_oauth"
        );
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: normalizedEmail ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "google_oauth",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, resolveOAuthRedirectPath(req));
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

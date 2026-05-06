import { COOKIE_NAME, LEGAL_DOCUMENT_VERSIONS, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { buildAuthLoginRedirectPath, resolveAuthRedirectPath } from "./authRedirect";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

type GoogleIdTokenClaims = {
  sub: string;
  email?: string | null;
  email_verified?: boolean;
  name?: string | null;
  aud?: string | string[];
  iss?: string;
};

type GoogleStatePayload = {
  returnTo: string;
  iat: number;
};

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signGoogleState(payload: GoogleStatePayload): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", ENV.cookieSecret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function decodeGoogleState(state: string): GoogleStatePayload | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = createHmac("sha256", ENV.cookieSecret)
    .update(encodedPayload)
    .digest("base64url");

  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as GoogleStatePayload;
    return {
      returnTo: parsed.returnTo,
      iat: parsed.iat,
    };
  } catch {
    return null;
  }
}

function getGoogleCallbackUrl(): string {
  return `${ENV.appBaseUrl}/api/auth/google/callback`;
}

async function exchangeGoogleCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    redirect_uri: getGoogleCallbackUrl(),
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<{ id_token?: string }>;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenClaims> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: ENV.googleClientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });

  return payload as unknown as GoogleIdTokenClaims;
}

function getRequestIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  return req.socket?.remoteAddress || undefined;
}

async function recordCoreConsents(req: Request, userId: number) {
  const userAgent = req.headers["user-agent"]?.slice(0, 512);
  const ipAddress = getRequestIp(req);

  await Promise.all(
    (["terms", "privacy"] as const).map((consentType) =>
      db.recordUserConsent(userId, consentType, {
        ipAddress,
        userAgent,
        documentVersion: LEGAL_DOCUMENT_VERSIONS[consentType],
      })
    )
  );
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret || !ENV.cookieSecret) {
      res.redirect(302, buildAuthLoginRedirectPath(req, "google_unavailable"));
      return;
    }

    const returnTo = resolveAuthRedirectPath(req);
    const state = signGoogleState({
      returnTo,
      iat: Date.now(),
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", getGoogleCallbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", state);

    res.redirect(302, url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const rawState = typeof req.query.state === "string" ? req.query.state : "";

    if (!code || !rawState) {
      res.redirect(302, buildAuthLoginRedirectPath(req, "google_unavailable"));
      return;
    }

    const state = decodeGoogleState(rawState);
    if (!state) {
      res.redirect(302, buildAuthLoginRedirectPath(req, "google_unavailable"));
      return;
    }

    try {
      console.log("[GoogleAuth] step=exchange_code");
      const tokenResponse = await exchangeGoogleCode(code);
      if (!tokenResponse.id_token) {
        throw new Error("Google id_token missing");
      }

      console.log("[GoogleAuth] step=verify_token");
      const claims = await verifyGoogleIdToken(tokenResponse.id_token);
      const rawEmail = claims.email?.trim() || null;
      const normalizedEmail = rawEmail?.toLowerCase() || null;
      const name = claims.name?.trim() || null;
      const googleOpenId = claims.sub;

      if (!googleOpenId || !normalizedEmail || claims.email_verified !== true) {
        console.warn("[GoogleAuth] email_required: googleOpenId=%s verified=%s", googleOpenId, claims.email_verified);
        res.redirect(302, buildAuthLoginRedirectPath(req, "google_email_required"));
        return;
      }

      console.log("[GoogleAuth] step=lookup_user email=%s", normalizedEmail);
      const existingByOpenId = await db.getUserByOpenId(googleOpenId);
      const existingByEmail =
        await db.getUserByEmail(normalizedEmail) ||
        (rawEmail && rawEmail !== normalizedEmail
          ? await db.getUserByEmail(rawEmail)
          : undefined);
      const existingUser = existingByOpenId ?? existingByEmail;

      console.log("[GoogleAuth] existingByOpenId=%s existingByEmail=%s", !!existingByOpenId, !!existingByEmail);

      if (!existingUser) {
        console.log("[GoogleAuth] step=create_new_user");
        await db.createUserByGoogle({
          openId: googleOpenId,
          email: normalizedEmail,
          name,
          loginMethod: "google",
        });
      } else {
        // merge רק אם המשתמש עוד לא קיים כ-Google user — כדי להימנע מ-unique constraint על openId
        if (!existingByOpenId && existingByEmail && existingByEmail.openId !== googleOpenId) {
          console.log("[GoogleAuth] step=merge_account oldOpenId=%s", existingByEmail.openId);
          await db.mergeAccountToGoogleOpenId(
            existingByEmail.openId,
            googleOpenId,
            "google"
          );
        }

        console.log("[GoogleAuth] step=upsert_user signupCompleted=%s", existingUser.signupCompleted);
        await db.upsertUser({
          openId: googleOpenId,
          name,
          email: normalizedEmail,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });

        // אחרי merge לחשבון Google — signupCompleted חייב להיות true
        if (!existingUser.signupCompleted) {
          console.log("[GoogleAuth] step=set_signup_completed userId=%s", existingUser.id);
          await db.setSignupCompleted(existingUser.id);
        }
      }

      console.log("[GoogleAuth] step=create_session");
      const sessionToken = await sdk.createSessionToken(googleOpenId, {
        name: name || normalizedEmail,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      console.log("[GoogleAuth] success returnTo=%s", state.returnTo);
      res.redirect(302, state.returnTo);
    } catch (error) {
      console.error("[GoogleAuth] Callback failed", error);
      res.redirect(302, buildAuthLoginRedirectPath(req, "google_unavailable"));
    }
  });
}

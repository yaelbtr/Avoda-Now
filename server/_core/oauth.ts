import type { Express, Request, Response } from "express";

export function registerOAuthRoutes(app: Express) {
  // OAuth callback is disabled — this platform uses phone/email OTP authentication only.
  // Blocking this endpoint prevents external OAuth providers (Google, etc.) from
  // creating accounts that bypass the phone-number requirement.
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    console.warn("[OAuth] Blocked OAuth callback attempt — OAuth login is disabled");
    res.redirect(302, "/?auth_error=oauth_disabled");
  });
}

import type { Request } from "express";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export type AuthLoginErrorCode =
  | "google_email_required"
  | "google_unavailable";

export function resolveAuthRedirectPathFromValue(returnTo?: string | null): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }
  return returnTo;
}

export function resolveAuthRedirectPath(req: Request): string {
  return resolveAuthRedirectPathFromValue(getQueryParam(req, "returnTo"));
}

export function buildAuthLoginRedirectPath(
  req: Request,
  authError?: AuthLoginErrorCode
): string {
  const url = new URL("/", "http://local.avodanow");
  url.searchParams.set("auth", "login");

  const returnTo = resolveAuthRedirectPath(req);
  if (returnTo !== "/") {
    url.searchParams.set("returnTo", returnTo);
  }

  if (authError) {
    url.searchParams.set("authError", authError);
  }

  return `${url.pathname}${url.search}`;
}

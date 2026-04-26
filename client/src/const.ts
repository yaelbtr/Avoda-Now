export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Routes that require authentication — redirect to home on logout */
export const PROTECTED_PATHS = [
  "/my-jobs",
  "/worker-profile",
  "/my-applications",
  "/applications",
  "/employer-profile",
  "/admin",
  "/matched-workers",
  "/available-workers",
  "/my-referrals",
];

/** Key used to persist the pre-login path in sessionStorage */
const RETURN_PATH_KEY = "avodanow_return_path";

/** Save current page path before redirecting to login */
export const saveReturnPath = (path?: string) => {
  const p = path ?? window.location.pathname + window.location.search;
  if (p && p !== "/") sessionStorage.setItem(RETURN_PATH_KEY, p);
};

/** Retrieve and clear the saved return path (returns null if none) */
export const popReturnPath = (): string | null => {
  const p = sessionStorage.getItem(RETURN_PATH_KEY);
  if (p) sessionStorage.removeItem(RETURN_PATH_KEY);
  return p;
};

type AuthEnv = {
  VITE_ENABLE_GOOGLE_LOGIN?: string;
};

function normalizeReturnPath(returnPath?: string | null): string | null {
  const raw = returnPath?.trim();
  if (!raw || raw === "/") return null;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("?") || raw.startsWith("#")) return `/${raw}`;
  return `/${raw}`;
}

export function isGoogleLoginEnabled(
  env: AuthEnv = import.meta.env as AuthEnv
): boolean {
  return env.VITE_ENABLE_GOOGLE_LOGIN === "true";
}

export function buildLocalLoginUrl(options: {
  currentOrigin: string;
  returnPath?: string | null;
}): string {
  const url = new URL("/", options.currentOrigin);
  url.searchParams.set("auth", "login");
  const normalizedReturnPath = normalizeReturnPath(options.returnPath);
  if (normalizedReturnPath) {
    url.searchParams.set("returnTo", normalizedReturnPath);
  }
  return url.toString();
}

export function buildGoogleLoginUrl(options: {
  currentOrigin: string;
  returnPath?: string | null;
}): string {
  const url = new URL("/api/auth/google/start", options.currentOrigin);
  const normalizedReturnPath = normalizeReturnPath(options.returnPath);
  if (normalizedReturnPath) {
    url.searchParams.set("returnTo", normalizedReturnPath);
  }
  return url.toString();
}

function getCurrentOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export const getLoginUrl = (returnPath?: string) => {
  const currentOrigin = getCurrentOrigin();
  return buildLocalLoginUrl({ currentOrigin, returnPath });
};

export const getGoogleLoginUrl = (returnPath?: string) => {
  const currentOrigin = getCurrentOrigin();
  if (!isGoogleLoginEnabled()) {
    return buildLocalLoginUrl({ currentOrigin, returnPath });
  }

  return buildGoogleLoginUrl({
    currentOrigin,
    returnPath,
  });
};

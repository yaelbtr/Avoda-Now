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

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (provider?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  if (provider) url.searchParams.set("provider", provider);

  return url.toString();
};

/** Shorthand: login URL that pre-selects the Google provider */
export const getGoogleLoginUrl = () => getLoginUrl("google");

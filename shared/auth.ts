export function isGoogleLoginMethod(loginMethod: string | null | undefined): boolean {
  return loginMethod === "google" || loginMethod === "google_oauth";
}

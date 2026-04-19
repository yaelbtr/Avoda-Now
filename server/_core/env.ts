function normalizeBaseUrl(value: string | undefined): string {
  const fallback = "http://localhost:3000";
  const raw = value?.trim() || fallback;
  return raw.replace(/\/+$/, "");
}

function toOrigin(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "";
  }
}

function resolveAppId(value: string | undefined): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return process.env.NODE_ENV === "development" ? "local-dev-app" : "";
}

function readFirstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

const appBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);

export const ENV = {
  appId: resolveAppId(process.env.VITE_APP_ID),
  appBaseUrl,
  appOrigin: toOrigin(appBaseUrl),
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: readFirstEnv("OAUTH_SERVER_URL"),
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: readFirstEnv("FORGE_API_URL", "BUILT_IN_FORGE_API_URL"),
  forgeApiKey: readFirstEnv("FORGE_API_KEY", "BUILT_IN_FORGE_API_KEY"),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "465", 10),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
};

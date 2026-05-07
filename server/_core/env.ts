function normalizeBaseUrl(value: string | undefined): string {
  const fallback =
    process.env.NODE_ENV === "production"
      ? "https://avoda-go.co.il"
      : "http://localhost:3000";
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

function readFirstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function readListEnv(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

const appBaseUrl = normalizeBaseUrl(
  readFirstEnv("APP_BASE_URL", "FRONTEND_URL", "CLIENT_URL")
);

export const ENV = {
  appId: "avodago",
  appBaseUrl,
  appOrigin: toOrigin(appBaseUrl),
  allowedOrigins: readListEnv("ALLOWED_ORIGINS"),
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  googleClientId: readFirstEnv("GOOGLE_CLIENT_ID", "VITE_GOOGLE_CLIENT_ID"),
  googleClientSecret: readFirstEnv("GOOGLE_CLIENT_SECRET"),
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

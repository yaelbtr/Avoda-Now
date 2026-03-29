import {
  boolean,
  numeric,
  integer,
  bigint,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  serial,
  index,
  customType,
} from "drizzle-orm/pg-core";

/**
 * PostGIS geometry(Point, 4326) column type.
 * Stored as WKB in PostgreSQL; Drizzle treats it as an opaque string.
 * Use ST_SetSRID(ST_MakePoint(lng, lat), 4326) to write,
 * and ST_Distance() / ST_DWithin() to query.
 */
export const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
});

// ─── Enums ────────────────────────────────────────────────────────────────────
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "test"]);
export const userModeEnum = pgEnum("user_mode", ["worker", "employer"]);
export const locationModeEnum = pgEnum("location_mode", ["city", "radius"]);
export const availabilityStatusEnum = pgEnum("availability_status", [
  "available_now",
  "available_today",
  "available_hours",
  "not_available",
]);
export const notificationPrefsEnum = pgEnum("notification_prefs", [
  "both",
  "push_only",
  "sms_only",
  "none",
]);
// NOTE: category is stored as a free-form varchar that matches the `categories.slug` column.
// Do NOT use a pgEnum here — the categories table is the single source of truth for valid slugs.
export const JOB_CATEGORY_SLUGS = [
  "delivery",
  "warehouse",
  "agriculture",
  "kitchen",
  "cleaning",
  "security",
  "construction",
  "childcare",
  "eldercare",
  "retail",
  "events",
  "volunteer",
  "emergency_support",
  "passover_jobs",
  "reserve_families",
  "gardening",
  "serving",
  "electricity",
  "plumbing",
  "moving",
  "other",
] as const;
export type JobCategory = typeof JOB_CATEGORY_SLUGS[number];
export const salaryTypeEnum = pgEnum("salary_type", [
  "hourly",
  "daily",
  "monthly",
  "volunteer",
]);
export const startTimeEnum = pgEnum("start_time", [
  "today",
  "tomorrow",
  "this_week",
  "flexible",
]);
export const activeDurationEnum = pgEnum("active_duration", ["1", "3", "7"]);
export const jobStatusEnum = pgEnum("job_status", [
  "active",
  "closed",
  "expired",
  "under_review",
]);
export const closedReasonEnum = pgEnum("closed_reason", [
  "found_worker",
  "expired",
  "manual",
  /** Job automatically closed because MAX_ACCEPTED_CANDIDATES workers accepted */
  "cap_reached",
]);
export const jobLocationModeEnum = pgEnum("job_location_mode", [
  "city",
  "radius",
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "viewed",
  "accepted",
  "rejected",
  "offered",       // employer proactively offered the job to the worker
  "offer_rejected", // worker declined the employer's offer
]);
export const phoneChangeResultEnum = pgEnum("phone_change_result", [
  "success",
  "failed",
  "locked",
]);
export const regionStatusEnum = pgEnum("region_status", [
  "collecting_workers",
  "active",
  "paused",
]);
export const workerRegionMatchTypeEnum = pgEnum("worker_region_match_type", [
  "gps_radius",
  "preferred_city",
]);
export const regionNotifTypeEnum = pgEnum("region_notif_type", [
  "worker",
  "employer",
]);
export const consentTypeEnum = pgEnum("consent_type", [
  "terms",
  "privacy",
  "age_18",
  "job_posting_policy",
  "safety_policy",
  "user_content_policy",
  "reviews_policy",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * Users authenticated via Twilio SMS OTP.
 * phone is the primary identity — stored in E.164 format (+972XXXXXXXXX).
 * openId is kept for backward-compat with the OAuth context layer but is
 * set to the phone number for phone-auth users.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Manus OAuth openId OR phone number (for phone-auth users). Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  /** E.164 phone number, e.g. +972501234567. Unique per user. */
  phone: varchar("phone", { length: 20 }).unique(),
  /** Israeli phone prefix, e.g. "052" */
  phonePrefix: varchar("phonePrefix", { length: 5 }),
  /** 7-digit phone number without prefix, e.g. "1234567" */
  phoneNumber: varchar("phoneNumber", { length: 7 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** active | suspended */
  status: userStatusEnum("status").default("active").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  /** User's chosen mode: worker (job seeker) or employer (job poster). Null = not yet chosen. */
  userMode: userModeEnum("userMode"),
  /** JSON array of normalized skill/interest tags for future AI matching */
  workerTags: json("workerTags").$type<string[]>(),
  /** Worker's preferred job categories (JSON array of category values) */
  preferredCategories: json("preferredCategories").$type<string[]>(),
  /** Worker's preferred city / area (legacy single city) */
  preferredCity: varchar("preferredCity", { length: 100 }),
  /** Google Maps place_id for the worker's preferred city — canonical city identifier */
  preferredCityPlaceId: varchar("preferredCityPlaceId", { length: 100 }),
  /** Worker's preferred cities (JSON array of city IDs from the cities table) */
  preferredCities: json("preferredCities").$type<number[]>(),
  /** Worker's location mode for matching: city or radius */
  locationMode: locationModeEnum("locationMode").default("city"),
  /** Worker's GPS latitude for radius-based matching */
  workerLatitude: numeric("workerLatitude", { precision: 10, scale: 7 }),
  /** Worker's GPS longitude for radius-based matching */
  workerLongitude: numeric("workerLongitude", { precision: 10, scale: 7 }),
  /**
   * PostGIS Point geometry (SRID 4326) — auto-computed from workerLatitude/workerLongitude.
   * Used for ST_DWithin radius queries; faster than Haversine at scale.
   * Populated by updateWorkerProfile whenever lat/lng are saved.
   */
  workerLocation: geometry("workerLocation"),
  /** Worker's preferred search radius in km */
  searchRadiusKm: integer("searchRadiusKm").default(5),
  /** Free text describing work preferences for AI matching */
  preferenceText: text("preferenceText"),
  /** Preferred work days: e.g. ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] */
  preferredDays: json("preferredDays").$type<string[]>(),
  /** Preferred time slots: e.g. ["morning","afternoon","evening","night"] */
  preferredTimeSlots: json("preferredTimeSlots").$type<string[]>(),
  /** Short bio / note from worker */
  workerBio: text("workerBio"),
  /** Worker's profile photo URL (stored in S3) */
  profilePhoto: text("profilePhoto"),
  /** Worker's expected hourly rate in ILS */
  expectedHourlyRate: numeric("expectedHourlyRate", { precision: 8, scale: 2 }),
  /** Worker's current availability status */
  availabilityStatus: availabilityStatusEnum("availabilityStatus"),
  /** Worker's average rating (1.0 - 5.0), set by employers after job completion */
  workerRating: numeric("workerRating", { precision: 3, scale: 2 }),
  /** Total number of jobs completed by this worker */
  completedJobsCount: integer("completedJobsCount").default(0).notNull(),
  /** Whether the worker has completed the onboarding signup flow */
  signupCompleted: boolean("signupCompleted").default(false).notNull(),
  /** The region this worker is associated with (set automatically on profile save) */
  regionId: integer("regionId"),
  /** Which channels to use for new-applicant alerts: both | push_only | sms_only | none */
  notificationPrefs: notificationPrefsEnum("notificationPrefs").default("both").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
  /** The user ID who referred this user (set at signup via ?ref= link) */
  referredBy: integer("referredBy"),
  /** Timestamp when the user accepted the terms of service (null = never accepted / legacy user) */
  termsAcceptedAt: timestamp("termsAcceptedAt", { withTimezone: true }),
  /**
   * Worker's date of birth in YYYY-MM-DD format (e.g. "2008-05-14").
   * Used to dynamically compute age and is_minor flag at query time.
   * Workers under 16 are blocked; workers 16-17 see only jobs ending before 22:00.
   */
  birthDate: varchar("birthDate", { length: 10 }),
  /**
   * UTC timestamp (ms) set by an admin to force-expire all sessions issued
   * before this moment. Any JWT with iat < forcedLogoutAt is rejected.
   * Null means no forced logout has been issued.
   */
  forcedLogoutAt: bigint("forcedLogoutAt", { mode: "number" }),

  // ── Employer-specific profile fields ─────────────────────────────────────
  /** Company name (optional) — displayed on job cards and employer profile */
  companyName: varchar("companyName", { length: 120 }),
  /** Short bio / description for the employer */
  employerBio: text("employerBio"),
  /**
   * Default job location city ID — pre-filled when posting a new job.
   * References the cities table.
   */
  defaultJobCityId: integer("defaultJobCityId"),
  /** Default job location free-text city name (for display) */
  defaultJobCity: varchar("defaultJobCity", { length: 100 }),
  /** Default job latitude for map display */
  defaultJobLatitude: numeric("defaultJobLatitude", { precision: 10, scale: 7 }),
  /** Default job longitude for map display */
  defaultJobLongitude: numeric("defaultJobLongitude", { precision: 10, scale: 7 }),
  /**
   * Employer preferred worker search city — used to filter available workers.
   */
  workerSearchCity: varchar("workerSearchCity", { length: 100 }),
  /** Worker search city ID */
  workerSearchCityId: integer("workerSearchCityId"),
  /** Worker search radius in km (default 10) */
  workerSearchRadiusKm: integer("workerSearchRadiusKm").default(10),
  /** Worker search latitude (for radius-based search) */
  workerSearchLatitude: numeric("workerSearchLatitude", { precision: 10, scale: 7 }),
  /** Worker search longitude (for radius-based search) */
  workerSearchLongitude: numeric("workerSearchLongitude", { precision: 10, scale: 7 }),
  /** Worker search location mode: city or radius */
  workerSearchLocationMode: locationModeEnum("workerSearchLocationMode").default("city"),
  /**
   * Minimum worker age the employer is willing to hire.
   * Values: 16 | 18 (null = no restriction).
   */
  minWorkerAge: integer("minWorkerAge"),
  /**
   * UTM / referral source captured at first visit and saved at registration.
   * Values: "facebook" (fbclid), "google" (gclid), "organic", or raw utm_source.
   * Set once at signup — never overwritten on subsequent logins.
   */
  referralSource: varchar("referralSource", { length: 64 }),
  /** utm_campaign value captured on first visit (e.g. "summer_promo") */
  utmCampaign: varchar("utmCampaign", { length: 128 }),
  /** utm_medium value captured on first visit (e.g. "cpc", "social") */
  utmMedium: varchar("utmMedium", { length: 64 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Rate-limiting table for OTP send requests.
 * Tracks how many times a phone (or IP) has requested an OTP in the last hour.
 * Twilio handles the actual OTP code storage and verification.
 */
export const otpRateLimit = pgTable("otp_rate_limit", {
  id: serial("id").primaryKey(),
  /** E.164 phone number being rate-limited */
  phone: varchar("phone", { length: 20 }).notNull(),
  /** IP address of the requester */
  ip: varchar("ip", { length: 45 }),
  /** Number of OTP send attempts in the current window */
  sendCount: integer("sendCount").default(1).notNull(),
  /** Number of verification attempts (wrong code) */
  verifyAttempts: integer("verifyAttempts").default(0).notNull(),
  /** Window start — reset after 1 hour */
  windowStart: timestamp("windowStart", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type OtpRateLimit = typeof otpRateLimit.$inferSelect;

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  /** Category slug — matches categories.slug (free-form varchar, not enum) */
  category: varchar("category", { length: 64 }).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  city: varchar("city", { length: 100 }),
  /** Google Maps place_id for the job's city — canonical city identifier for matching */
  cityPlaceId: varchar("cityPlaceId", { length: 100 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  salary: numeric("salary", { precision: 10, scale: 2 }),
  salaryType: salaryTypeEnum("salaryType").default("hourly").notNull(),
  contactPhone: varchar("contactPhone", { length: 20 }).notNull(),
  contactName: varchar("contactName", { length: 100 }).notNull(),
  businessName: varchar("businessName", { length: 200 }),
  workingHours: varchar("workingHours", { length: 100 }),
  startTime: startTimeEnum("startTime").default("flexible").notNull(),
  /** Exact date/time when the job starts. If within 24h from now → badge "עבודה להיום" */
  startDateTime: timestamp("startDateTime", { withTimezone: true }),
  /** Urgent flag: employer needs a worker immediately → shown at top of listings */
  isUrgent: boolean("isUrgent").default(false).notNull(),
  /** Local business badge: shown on job card as "עסק מקומי" */
  isLocalBusiness: boolean("isLocalBusiness").default(false).notNull(),
  /** When the 6-hour reminder was sent to the employer */
  reminderSentAt: timestamp("reminderSentAt", { withTimezone: true }),
  /** Why the job was closed */
  closedReason: closedReasonEnum("closedReason"),
  workersNeeded: integer("workersNeeded").default(1).notNull(),
  postedBy: integer("postedBy").references(() => users.id),
  /** Duration in days: 1, 3, or 7. Default is 1 (24 hours) for instant jobs */
  activeDuration: activeDurationEnum("activeDuration").default("1").notNull(),
  /** Computed expiry timestamp = createdAt + activeDuration days */
  expiresAt: timestamp("expiresAt", { withTimezone: true }),
  status: jobStatusEnum("status").default("active").notNull(),
  reportCount: integer("reportCount").default(0).notNull(),
  /** JSON array of normalized tags for future AI matching */
  jobTags: json("jobTags").$type<string[]>(),
  /** Job location mode for matching: city or radius */
  jobLocationMode: jobLocationModeEnum("jobLocationMode").default("radius"),
  /** Job search radius in km (used when jobLocationMode = radius) */
  jobSearchRadiusKm: integer("jobSearchRadiusKm").default(5),
  /** Hourly rate for the job (ILS per hour) */
  hourlyRate: numeric("hourlyRate", { precision: 10, scale: 2 }),
  /** Estimated number of hours for the job */
  estimatedHours: numeric("estimatedHours", { precision: 5, scale: 1 }),
  /** Whether the employer's phone number is visible to workers on the job card */
  showPhone: boolean("showPhone").default(false).notNull(),
  /** Specific date for the job in YYYY-MM-DD format (e.g. "2026-03-15") */
  jobDate: varchar("jobDate", { length: 10 }),
  /** Work start time in HH:MM format (e.g. "14:00") */
  workStartTime: varchar("workStartTime", { length: 5 }),
  /** Work end time in HH:MM format (e.g. "18:00") */
  workEndTime: varchar("workEndTime", { length: 5 }),
  /**
   * Minimum worker age for this job.
   * null = no restriction, 16 = must be 16+, 18 = must be 18+ (adults only).
   * Enforced server-side in applyToJob.
   */
  minAge: integer("minAge"),
  /** JSON array of up to 5 S3 image URLs uploaded by the employer */
  imageUrls: json("imageUrls").$type<string[]>(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  /** PostGIS Point geometry (SRID 4326) — populated from latitude/longitude for spatial queries */
  location: geometry("location"),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Job applications — tracks when a worker applies to a job.
 * Prevents duplicate applications and provides employer with applicant details.
 */
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id),
  workerId: integer("workerId").notNull().references(() => users.id),
  /** Status of the application */
  status: applicationStatusEnum("status").default("pending").notNull(),
  /** Optional message from the worker */
  message: text("message"),
  /** Whether the employer has revealed the worker's contact details */
  contactRevealed: boolean("contactRevealed").default(false).notNull(),
  /** Timestamp when the employer first revealed contact details */
  revealedAt: timestamp("revealedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export const jobReports = pgTable("job_reports", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id),
  reporterPhone: varchar("reporterPhone", { length: 20 }),
  reporterIp: varchar("reporterIp", { length: 45 }),
  reason: varchar("reason", { length: 200 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type JobReport = typeof jobReports.$inferSelect;
export type InsertJobReport = typeof jobReports.$inferInsert;

/**
 * Tracks workers who are currently available to work.
 * Availability expires automatically after availableUntil timestamp.
 * Workers can set a note (e.g. "available in Tel Aviv area").
 */
export const workerAvailability = pgTable("worker_availability", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  /** Worker's current latitude */
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  /** Worker's current longitude */
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  /** City name for display */
  city: varchar("city", { length: 100 }),
  /** Optional note from worker */
  note: varchar("note", { length: 200 }),
  /** Availability expires at this time (default: 4 hours from now) */
  availableUntil: timestamp("availableUntil", { withTimezone: true }).notNull(),
  /** Timestamp when the 30-min expiry reminder SMS was sent */
  reminderSentAt: timestamp("reminderSentAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  /** PostGIS Point geometry (SRID 4326) — populated from latitude/longitude for spatial queries */
  location: geometry("location"),
});

export type WorkerAvailability = typeof workerAvailability.$inferSelect;
export type InsertWorkerAvailability = typeof workerAvailability.$inferInsert;

/**
 * Batches application notifications per job so the employer receives
 * a single summary SMS instead of one per applicant.
 *
 * Lifecycle:
 *  pending  → batch is collecting; a flush is scheduled for scheduledAt
 *  sent     → SMS was dispatched
 */
export const notificationBatches = pgTable("notification_batches", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id),
  /** Phone number of the employer who posted the job */
  employerPhone: varchar("employerPhone", { length: 20 }).notNull(),
  /** How many new applications have been collected in this batch */
  pendingCount: integer("pendingCount").notNull().default(0),
  /** When the delayed flush is scheduled to fire (now + 10 min) */
  scheduledAt: timestamp("scheduledAt", { withTimezone: true }).notNull(),
  /** When the SMS was actually sent (null = not yet sent) */
  sentAt: timestamp("sentAt", { withTimezone: true }),
  /** pending | sent */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type NotificationBatch = typeof notificationBatches.$inferSelect;
export type InsertNotificationBatch = typeof notificationBatches.$inferInsert;

/**
 * Stores Web Push subscriptions for workers.
 * Each row represents one browser/device subscription.
 */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  endpoint: varchar("endpoint", { length: 2048 }).notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("push_endpoint_idx").on(t.endpoint),
]);
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Israeli cities reference table.
 * Populated once from a seed script; read-only at runtime.
 */
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  cityCode: integer("city_code"),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en"),
  district: varchar("district", { length: 100 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  isActive: boolean("is_active").default(true).notNull(),
});
export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

/**
 * Israeli phone number prefixes lookup table.
 * Seeded once; read-only at runtime.
 */
export const phonePrefixes = pgTable("phone_prefixes", {
  id: serial("id").primaryKey(),
  /** The 3-digit prefix, e.g. "050", "052" */
  prefix: varchar("prefix", { length: 5 }).notNull().unique(),
  /** Hebrew description, e.g. "פלאפון" */
  description: varchar("description", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});
export type PhonePrefix = typeof phonePrefixes.$inferSelect;
export type InsertPhonePrefix = typeof phonePrefixes.$inferInsert;

/**
 * Audit log for phone number changes.
 * Records every phone change attempt (successful or locked-out).
 */
export const phoneChangeLogs = pgTable("phone_change_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  /** Phone number before the change (E.164) */
  oldPhone: varchar("oldPhone", { length: 20 }),
  /** Phone number after the change (E.164) */
  newPhone: varchar("newPhone", { length: 20 }),
  /** IP address of the request */
  ipAddress: varchar("ipAddress", { length: 45 }),
  /** success | failed | locked */
  result: phoneChangeResultEnum("result").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});
export type PhoneChangeLog = typeof phoneChangeLogs.$inferSelect;
export type InsertPhoneChangeLog = typeof phoneChangeLogs.$inferInsert;

export const savedJobs = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  jobId: integer("jobId").notNull(),
  savedAt: timestamp("savedAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("saved_jobs_user_job_idx").on(t.userId, t.jobId),
]);
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = typeof savedJobs.$inferInsert;

/**
 * Worker ratings submitted by employers after job completion.
 * One rating per employer per worker (unique constraint).
 * workerRating on users table is auto-updated to the rolling average.
 */
export const workerRatings = pgTable("worker_ratings", {
  id: serial("id").primaryKey(),
  /** The worker being rated */
  workerId: integer("workerId").notNull().references(() => users.id),
  /** The employer submitting the rating */
  employerId: integer("employerId").notNull().references(() => users.id),
  /** Optional: the job application this rating is tied to */
  applicationId: integer("applicationId"),
  /** 1–5 stars */
  rating: integer("rating").notNull(),
  /** Optional text review */
  comment: text("comment"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("worker_ratings_employer_worker_idx").on(t.employerId, t.workerId),
]);
export type WorkerRating = typeof workerRatings.$inferSelect;
export type InsertWorkerRating = typeof workerRatings.$inferInsert;

/**
 * Admin-managed job categories.
 * Replaces the hardcoded JOB_CATEGORIES and SPECIAL_CATEGORIES arrays.
 * All screens fetch categories dynamically from this table.
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  /** URL-safe slug used as the category value in jobs, filters, and SEO routes */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  /** Hebrew display name */
  name: varchar("name", { length: 100 }).notNull(),
  /** Emoji or icon string for display */
  icon: varchar("icon", { length: 16 }).default("💼"),
  /** Logical group: e.g. "home", "events", "special", "general" */
  groupName: varchar("groupName", { length: 64 }).default("general"),
  /** Optional CDN URL to a category image */
  imageUrl: text("imageUrl"),
  /** Whether the category is visible to users and included in filters */
  isActive: boolean("isActive").default(true).notNull(),
  /**
   * Whether this category is permitted for display to users under 18.
   * Defaults to true (most categories are allowed).
   * Set to false for categories involving alcohol, nightlife, security, or other
   * roles restricted by the Youth Labour Law (חוק עבודת הנוער).
   */
  allowedForMinors: boolean("allowedForMinors").default(true).notNull(),
  /** Display order (lower = shown first) */
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Regional activation system.
 * Each region has a center city with GPS coordinates.
 * Workers who register within activationRadiusKm are associated with the region.
 * When currentWorkers >= minWorkersRequired the region becomes active
 * and employers in that region can start posting jobs.
 */
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  /** URL-safe slug, e.g. "tel-aviv", "bnei-brak" */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  /** Hebrew display name, e.g. "תל אביב" */
  name: varchar("name", { length: 100 }).notNull(),
  /** Name of the center city in Hebrew */
  centerCity: varchar("centerCity", { length: 100 }).notNull(),
  /** GPS latitude of the region center */
  centerLat: numeric("centerLat", { precision: 10, scale: 7 }).notNull(),
  /** GPS longitude of the region center */
  centerLng: numeric("centerLng", { precision: 10, scale: 7 }).notNull(),
  /** Radius in km within which workers are counted for this region */
  activationRadiusKm: integer("activationRadiusKm").default(15).notNull(),
  /** Radius expressed in travel-time minutes (display only, informational) */
  radiusMinutes: integer("radiusMinutes").default(20).notNull(),
  /** Minimum workers required to transition status → active */
  minWorkersRequired: integer("minWorkersRequired").default(50).notNull(),
  /** Current number of workers associated with this region */
  currentWorkers: integer("currentWorkers").default(0).notNull(),
  /** collecting_workers → active → paused */
  status: regionStatusEnum("status").default("collecting_workers").notNull(),
  /** Optional short description shown on the worker landing page */
  description: text("description"),
  /** Optional hero image URL for the worker landing page */
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type Region = typeof regions.$inferSelect;
export type InsertRegion = typeof regions.$inferInsert;

/**
 * worker_regions — many-to-many mapping between workers and regions.
 * A worker can belong to multiple regions:
 *   1. Any region whose center is within the worker's GPS radius.
 *   2. Any region whose centerCity matches one of the worker's preferredCities.
 */
export const workerRegions = pgTable(
  "worker_regions",
  {
    workerId: integer("worker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    regionId: integer("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
    /** Distance in km between worker location and region center (null for city-based matches) */
    distanceKm: numeric("distance_km", { precision: 8, scale: 3 }),
    /** How the association was created: gps_radius | preferred_city */
    matchType: workerRegionMatchTypeEnum("match_type").default("gps_radius").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.workerId, t.regionId] })]
);
export type WorkerRegion = typeof workerRegions.$inferSelect;
export type InsertWorkerRegion = typeof workerRegions.$inferInsert;

/**
 * region_notification_requests — stores requests from users (workers or employers)
 * who want to be notified when a region becomes active.
 * Unique per user + region combination.
 */
export const regionNotificationRequests = pgTable(
  "region_notification_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    regionId: integer("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
    /** "worker" = worker waiting for employers | "employer" = employer waiting to post */
    type: regionNotifTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uniq_user_region_notif").on(t.userId, t.regionId)]
);
export type RegionNotificationRequest = typeof regionNotificationRequests.$inferSelect;
export type InsertRegionNotificationRequest = typeof regionNotificationRequests.$inferInsert;

/**
 * System settings — key/value store for global configuration flags.
 * Examples: maintenanceMode = "true" | "false"
 */
export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type SystemSetting = typeof systemSettings.$inferSelect;

/**
 * user_consents — records explicit user consent to legal documents.
 * Stores one row per user per consent type with the document version they agreed to.
 * Used for GDPR/legal compliance audit trail.
 */
export const userConsents = pgTable(
  "user_consents",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** The type of consent given */
    consentType: consentTypeEnum("consent_type").notNull(),
    /** Version string of the document consented to, e.g. "2026-03" */
    documentVersion: varchar("document_version", { length: 32 }).notNull().default("2026-03"),
    /** IP address at time of consent (optional, for audit) */
    ipAddress: varchar("ip_address", { length: 45 }),
    /** User-agent string at time of consent (optional) */
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uniq_user_consent_type").on(t.userId, t.consentType)]
);
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = typeof userConsents.$inferInsert;

/**
 * legal_acknowledgements — audit log for legal confirmations.
 * Currently used to record when a worker submits their birth date
 * and declares the information is accurate (ack_type = "birth_date_declaration").
 * Future use: employer confirmation when hiring a minor worker.
 */
export const legalAcknowledgements = pgTable("legal_acknowledgements", {
  id: serial("id").primaryKey(),
  /** The user who gave the acknowledgement */
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Optional: worker being hired (for employer-side acks) */
  workerId: integer("worker_id").references(() => users.id, { onDelete: "set null" }),
  /** Optional: job context */
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  /**
   * Type of acknowledgement:
   * - "birth_date_declaration" — worker confirmed their birth date is accurate
   * - "minor_employment_confirmation" — employer confirmed compliance with Youth Employment Law
   */
  ackType: varchar("ack_type", { length: 64 }).notNull(),
  approved: boolean("approved").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type LegalAcknowledgement = typeof legalAcknowledgements.$inferSelect;
export type InsertLegalAcknowledgement = typeof legalAcknowledgements.$inferInsert;

/**
 * birthdate_changes — immutable audit log for every birthDate update.
 * Provides a forensic trail for legal/compliance purposes.
 * Rate-limiting: check this table to enforce max 1 change per 30 days.
 */
export const birthdateChanges = pgTable("birthdate_changes", {
  id: serial("id").primaryKey(),
  /** The user whose birthDate was changed */
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Previous value (null on first-time set) */
  oldBirthDate: varchar("old_birth_date", { length: 10 }),
  /** New value saved */
  newBirthDate: varchar("new_birth_date", { length: 10 }).notNull(),
  /** UTC timestamp of the change */
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  /** Client IP address for forensic purposes */
  ipAddress: varchar("ip_address", { length: 64 }),
});
export type BirthdateChange = typeof birthdateChanges.$inferSelect;
export type InsertBirthdateChange = typeof birthdateChanges.$inferInsert;

// ─── System Logs ──────────────────────────────────────────────────────────────
/**
 * system_logs — centralised event/error log for debugging and support.
 *
 * level:  "info" | "warn" | "error"
 * event:  machine-readable key, e.g. "otp.send", "otp.verify.fail", "signup.complete"
 * phone:  normalised phone string for fast filtering (nullable for non-phone events)
 * userId: FK to users if the actor is known at log time (nullable for pre-auth events)
 * message: human-readable description of what happened
 * meta:   arbitrary JSON payload (request params, error details, etc.)
 */
export const logLevelEnum = pgEnum("log_level", ["info", "warn", "error"]);

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: logLevelEnum("level").notNull().default("info"),
  event: varchar("event", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  meta: json("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = typeof systemLogs.$inferInsert;

/**
 * email_verifications — stores hashed OTP codes for email-based authentication.
 * - codeHash: SHA-256 of the 6-digit code (never store raw code)
 * - expiresAt: 5 minutes from creation
 * - attempts: incremented on each wrong guess; blocked after 5
 */
export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("email_verifications_email_idx").on(t.email)]
);
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;

/**
 * email_unsubscribes — tracks users who have opted out of marketing emails.
 * - token: a unique random token used in the unsubscribe link (no auth required)
 * - unsubscribedAt: set when the user confirms unsubscribe; null = token created but not yet confirmed
 */
export const emailUnsubscribes = pgTable(
  "email_unsubscribes",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("email_unsubscribes_email_idx").on(t.email),
    index("email_unsubscribes_token_idx").on(t.token),
  ]
);
export type EmailUnsubscribe = typeof emailUnsubscribes.$inferSelect;
export type InsertEmailUnsubscribe = typeof emailUnsubscribes.$inferInsert;

/**
 * referral_links — admin-managed trackable referral links.
 * Each link has a unique short code (e.g. "fb-jan26") that redirects to the
 * homepage while recording a click. When a user registers after clicking the
 * link (referralSource matches the code), the registration is attributed.
 *
 * - code: short unique identifier used in the URL (/r/:code)
 * - label: human-readable name for the admin panel (e.g. "פייסבוק ינואר 2026")
 * - source: the referralSource value written to users.referralSource on registration
 * - clicks: incremented atomically on every visit to /r/:code
 * - isActive: soft-disable without deleting
 */
export const referralLinks = pgTable(
  "referral_links",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    label: varchar("label", { length: 128 }).notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("referral_links_code_idx").on(t.code),
    index("referral_links_source_idx").on(t.source),
  ]
);
export type ReferralLink = typeof referralLinks.$inferSelect;
export type InsertReferralLink = typeof referralLinks.$inferInsert;

// ─── Notification Logs ────────────────────────────────────────────────────────
/**
 * notification_logs — per-worker delivery record for every notification dispatch.
 * One row per worker per batch. Enables the admin panel to show exactly who was
 * notified, via which channel, and whether delivery succeeded.
 *
 * channel: "sms" | "push"
 * status:  "sent" | "failed" | "skipped"
 * errorMsg: populated only on failure (e.g. "Twilio error 21211", "no subscription")
 */
export const notificationChannelEnum = pgEnum("notification_channel", ["sms", "push"]);
export const notificationStatusEnum = pgEnum("notification_status", ["sent", "failed", "skipped"]);

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: serial("id").primaryKey(),
    /** The notification batch this log belongs to */
    batchId: integer("batch_id").references(() => notificationBatches.id, { onDelete: "set null" }),
    /** The job this notification was about */
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    /** The worker who received (or should have received) the notification */
    workerId: integer("worker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Delivery channel */
    channel: notificationChannelEnum("channel").notNull(),
    /** Delivery outcome */
    status: notificationStatusEnum("status").notNull(),
    /** Error detail when status = 'failed' */
    errorMsg: text("error_msg"),
    /** Phone number used for SMS (E.164), null for push */
    phone: varchar("phone", { length: 20 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notif_logs_job_idx").on(t.jobId),
    index("notif_logs_worker_idx").on(t.workerId),
    index("notif_logs_batch_idx").on(t.batchId),
  ]
);
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

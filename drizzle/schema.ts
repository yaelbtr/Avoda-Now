import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Users authenticated via Twilio SMS OTP.
 * phone is the primary identity — stored in E.164 format (+972XXXXXXXXX).
 * openId is kept for backward-compat with the OAuth context layer but is
 * set to the phone number for phone-auth users.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** User's chosen mode: worker (job seeker) or employer (job poster). Null = not yet chosen. */
  userMode: mysqlEnum("userMode", ["worker", "employer"]),
  /** JSON array of normalized skill/interest tags for future AI matching */
  workerTags: json("workerTags").$type<string[]>(),
  /** Worker's preferred job categories (JSON array of category values) */
  preferredCategories: json("preferredCategories").$type<string[]>(),
  /** Worker's preferred city / area (legacy single city) */
  preferredCity: varchar("preferredCity", { length: 100 }),
  /** Worker's preferred cities (JSON array of city IDs from the cities table) */
  preferredCities: json("preferredCities").$type<number[]>(),
  /** Worker's location mode for matching: city or radius */
  locationMode: mysqlEnum("locationMode", ["city", "radius"]).default("city"),
  /** Worker's GPS latitude for radius-based matching */
  workerLatitude: decimal("workerLatitude", { precision: 10, scale: 7 }),
  /** Worker's GPS longitude for radius-based matching */
  workerLongitude: decimal("workerLongitude", { precision: 10, scale: 7 }),
  /** Worker's preferred search radius in km */
  searchRadiusKm: int("searchRadiusKm").default(5),
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
  expectedHourlyRate: decimal("expectedHourlyRate", { precision: 8, scale: 2 }),
  /** Worker's current availability status */
  availabilityStatus: mysqlEnum("availabilityStatus", ["available_now", "available_today", "available_hours", "not_available"]),
  /** Worker's average rating (1.0 - 5.0), set by employers after job completion */
  workerRating: decimal("workerRating", { precision: 3, scale: 2 }),
  /** Total number of jobs completed by this worker */
  completedJobsCount: int("completedJobsCount").default(0).notNull(),
  /** Whether the worker has completed the onboarding signup flow */
  signupCompleted: boolean("signupCompleted").default(false).notNull(),
  /** The region this worker is associated with (set automatically on profile save) */
  regionId: int("regionId"),
  /** Which channels to use for new-applicant alerts: both | push_only | sms_only | none */
  notificationPrefs: mysqlEnum("notificationPrefs", ["both", "push_only", "sms_only", "none"]).default("both").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** The user ID who referred this user (set at signup via ?ref= link) */
  referredBy: int("referredBy"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Rate-limiting table for OTP send requests.
 * Tracks how many times a phone (or IP) has requested an OTP in the last hour.
 * Twilio handles the actual OTP code storage and verification.
 */
export const otpRateLimit = mysqlTable("otp_rate_limit", {
  id: int("id").autoincrement().primaryKey(),
  /** E.164 phone number being rate-limited */
  phone: varchar("phone", { length: 20 }).notNull(),
  /** IP address of the requester */
  ip: varchar("ip", { length: 45 }),
  /** Number of OTP send attempts in the current window */
  sendCount: int("sendCount").default(1).notNull(),
  /** Number of verification attempts (wrong code) */
  verifyAttempts: int("verifyAttempts").default(0).notNull(),
  /** Window start — reset after 1 hour */
  windowStart: timestamp("windowStart").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OtpRateLimit = typeof otpRateLimit.$inferSelect;

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", [
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
    "other",
  ]).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  salaryType: mysqlEnum("salaryType", ["hourly", "daily", "monthly", "volunteer"]).default("hourly").notNull(),
  contactPhone: varchar("contactPhone", { length: 20 }).notNull(),
  contactName: varchar("contactName", { length: 100 }).notNull(),
  businessName: varchar("businessName", { length: 200 }),
  workingHours: varchar("workingHours", { length: 100 }),
  startTime: mysqlEnum("startTime", ["today", "tomorrow", "this_week", "flexible"]).default("flexible").notNull(),
  /** Exact date/time when the job starts. If within 24h from now → badge "עבודה להיום" */
  startDateTime: timestamp("startDateTime"),
  /** Urgent flag: employer needs a worker immediately → shown at top of listings */
  isUrgent: boolean("isUrgent").default(false).notNull(),
  /** Local business badge: shown on job card as "עסק מקומי" */
  isLocalBusiness: boolean("isLocalBusiness").default(false).notNull(),
  /** When the 6-hour reminder was sent to the employer */
  reminderSentAt: timestamp("reminderSentAt"),
  /** Why the job was closed */
  closedReason: mysqlEnum("closedReason", ["found_worker", "expired", "manual"]),
  workersNeeded: int("workersNeeded").default(1).notNull(),
  postedBy: int("postedBy").references(() => users.id),
  /** Duration in days: 1, 3, or 7. Default is 1 (24 hours) for instant jobs */
  activeDuration: mysqlEnum("activeDuration", ["1", "3", "7"]).default("1").notNull(),
  /** Computed expiry timestamp = createdAt + activeDuration days */
  expiresAt: timestamp("expiresAt"),
  status: mysqlEnum("status", ["active", "closed", "expired", "under_review"]).default("active").notNull(),
  reportCount: int("reportCount").default(0).notNull(),
  /** JSON array of normalized tags for future AI matching */
  jobTags: json("jobTags").$type<string[]>(),
  /** Job location mode for matching: city or radius */
  jobLocationMode: mysqlEnum("jobLocationMode", ["city", "radius"]).default("radius"),
  /** Job search radius in km (used when jobLocationMode = radius) */
  jobSearchRadiusKm: int("jobSearchRadiusKm").default(5),
  /** Hourly rate for the job (ILS per hour) */
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  /** Estimated number of hours for the job */
  estimatedHours: decimal("estimatedHours", { precision: 5, scale: 1 }),
  /** Whether the employer's phone number is visible to workers on the job card */
  showPhone: boolean("showPhone").default(false).notNull(),
  /** Specific date for the job in YYYY-MM-DD format (e.g. "2026-03-15") */
  jobDate: varchar("jobDate", { length: 10 }),
  /** Work start time in HH:MM format (e.g. "14:00") */
  workStartTime: varchar("workStartTime", { length: 5 }),
  /** Work end time in HH:MM format (e.g. "18:00") */
  workEndTime: varchar("workEndTime", { length: 5 }),
  /** JSON array of up to 5 S3 image URLs uploaded by the employer */
  imageUrls: json("imageUrls").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Job applications — tracks when a worker applies to a job.
 * Prevents duplicate applications and provides employer with applicant details.
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull().references(() => jobs.id),
  workerId: int("workerId").notNull().references(() => users.id),
  /** Status of the application */
  status: mysqlEnum("status", ["pending", "viewed", "accepted", "rejected"]).default("pending").notNull(),
  /** Optional message from the worker */
  message: text("message"),
  /** Whether the employer has revealed the worker's contact details */
  contactRevealed: boolean("contactRevealed").default(false).notNull(),
  /** Timestamp when the employer first revealed contact details */
  revealedAt: timestamp("revealedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export const jobReports = mysqlTable("job_reports", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull().references(() => jobs.id),
  reporterPhone: varchar("reporterPhone", { length: 20 }),
  reporterIp: varchar("reporterIp", { length: 45 }),
  reason: varchar("reason", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobReport = typeof jobReports.$inferSelect;
export type InsertJobReport = typeof jobReports.$inferInsert;

/**
 * Tracks workers who are currently available to work.
 * Availability expires automatically after availableUntil timestamp.
 * Workers can set a note (e.g. "available in Tel Aviv area").
 */
export const workerAvailability = mysqlTable("worker_availability", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  /** Worker's current latitude */
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  /** Worker's current longitude */
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  /** City name for display */
  city: varchar("city", { length: 100 }),
  /** Optional note from worker */
  note: varchar("note", { length: 200 }),
  /** Availability expires at this time (default: 4 hours from now) */
  availableUntil: timestamp("availableUntil").notNull(),
  /** Timestamp when the 30-min expiry reminder SMS was sent */
  reminderSentAt: timestamp("reminderSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const notificationBatches = mysqlTable("notification_batches", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull().references(() => jobs.id),
  /** Phone number of the employer who posted the job */
  employerPhone: varchar("employerPhone", { length: 20 }).notNull(),
  /** How many new applications have been collected in this batch */
  pendingCount: int("pendingCount").notNull().default(0),
  /** When the delayed flush is scheduled to fire (now + 10 min) */
  scheduledAt: timestamp("scheduledAt").notNull(),
  /** When the SMS was actually sent (null = not yet sent) */
  sentAt: timestamp("sentAt"),
  /** pending | sent */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NotificationBatch = typeof notificationBatches.$inferSelect;
export type InsertNotificationBatch = typeof notificationBatches.$inferInsert;

/**
 * Stores Web Push subscriptions for workers.
 * Each row represents one browser/device subscription.
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  endpoint: varchar("endpoint", { length: 2048 }).notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  endpointIdx: uniqueIndex("push_endpoint_idx").on(t.endpoint),
}));
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Israeli cities reference table.
 * Populated once from a seed script; read-only at runtime.
 */
export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  cityCode: int("city_code"),
  nameHe: text("name_he").notNull(),
  nameEn: text("name_en"),
  district: varchar("district", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isActive: boolean("is_active").default(true).notNull(),
});
export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

/**
 * Israeli phone number prefixes lookup table.
 * Seeded once; read-only at runtime.
 */
export const phonePrefixes = mysqlTable("phone_prefixes", {
  id: int("id").autoincrement().primaryKey(),
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
export const phoneChangeLogs = mysqlTable("phone_change_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  /** Phone number before the change (E.164) */
  oldPhone: varchar("oldPhone", { length: 20 }),
  /** Phone number after the change (E.164) */
  newPhone: varchar("newPhone", { length: 20 }),
  /** IP address of the request */
  ipAddress: varchar("ipAddress", { length: 45 }),
  /** success | failed | locked */
  result: mysqlEnum("result", ["success", "failed", "locked"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PhoneChangeLog = typeof phoneChangeLogs.$inferSelect;
export type InsertPhoneChangeLog = typeof phoneChangeLogs.$inferInsert;

export const savedJobs = mysqlTable("saved_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  jobId: int("jobId").notNull(),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
}, (t) => ({
  userJobIdx: uniqueIndex("saved_jobs_user_job_idx").on(t.userId, t.jobId),
}));
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = typeof savedJobs.$inferInsert;

/**
 * Worker ratings submitted by employers after job completion.
 * One rating per employer per worker (unique constraint).
 * workerRating on users table is auto-updated to the rolling average.
 */
export const workerRatings = mysqlTable("worker_ratings", {
  id: int("id").autoincrement().primaryKey(),
  /** The worker being rated */
  workerId: int("workerId").notNull().references(() => users.id),
  /** The employer submitting the rating */
  employerId: int("employerId").notNull().references(() => users.id),
  /** Optional: the job application this rating is tied to */
  applicationId: int("applicationId"),
  /** 1–5 stars */
  rating: int("rating").notNull(),
  /** Optional text review */
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  employerWorkerIdx: uniqueIndex("worker_ratings_employer_worker_idx").on(t.employerId, t.workerId),
}));
export type WorkerRating = typeof workerRatings.$inferSelect;
export type InsertWorkerRating = typeof workerRatings.$inferInsert;

/**
 * Admin-managed job categories.
 * Replaces the hardcoded JOB_CATEGORIES and SPECIAL_CATEGORIES arrays.
 * All screens fetch categories dynamically from this table.
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
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
  /** Display order (lower = shown first) */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const regions = mysqlTable("regions", {
  id: int("id").autoincrement().primaryKey(),
  /** URL-safe slug, e.g. "tel-aviv", "bnei-brak" */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  /** Hebrew display name, e.g. "תל אביב" */
  name: varchar("name", { length: 100 }).notNull(),
  /** Name of the center city in Hebrew */
  centerCity: varchar("centerCity", { length: 100 }).notNull(),
  /** GPS latitude of the region center */
  centerLat: decimal("centerLat", { precision: 10, scale: 7 }).notNull(),
  /** GPS longitude of the region center */
  centerLng: decimal("centerLng", { precision: 10, scale: 7 }).notNull(),
  /** Radius in km within which workers are counted for this region */
  activationRadiusKm: int("activationRadiusKm").default(15).notNull(),
  /** Radius expressed in travel-time minutes (display only, informational) */
  radiusMinutes: int("radiusMinutes").default(20).notNull(),
  /** Minimum workers required to transition status → active */
  minWorkersRequired: int("minWorkersRequired").default(50).notNull(),
  /** Current number of workers associated with this region */
  currentWorkers: int("currentWorkers").default(0).notNull(),
  /** collecting_workers → active → paused */
  status: mysqlEnum("status", ["collecting_workers", "active", "paused"]).default("collecting_workers").notNull(),
  /** Optional short description shown on the worker landing page */
  description: text("description"),
  /** Optional hero image URL for the worker landing page */
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Region = typeof regions.$inferSelect;
export type InsertRegion = typeof regions.$inferInsert;

/**
 * worker_regions — many-to-many mapping between workers and regions.
 * A worker can belong to multiple regions:
 *   1. Any region whose center is within the worker's GPS radius.
 *   2. Any region whose centerCity matches one of the worker's preferredCities.
 */
export const workerRegions = mysqlTable(
  "worker_regions",
  {
    workerId: int("worker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    regionId: int("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
    /** Distance in km between worker location and region center (null for city-based matches) */
    distanceKm: decimal("distance_km", { precision: 8, scale: 3 }),
    /** How the association was created: gps_radius | preferred_city */
    matchType: mysqlEnum("match_type", ["gps_radius", "preferred_city"]).default("gps_radius").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const regionNotificationRequests = mysqlTable(
  "region_notification_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    regionId: int("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
    /** "worker" = worker waiting for employers | "employer" = employer waiting to post */
    type: mysqlEnum("type", ["worker", "employer"]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uniq_user_region_notif").on(t.userId, t.regionId)]
);
export type RegionNotificationRequest = typeof regionNotificationRequests.$inferSelect;
export type InsertRegionNotificationRequest = typeof regionNotificationRequests.$inferInsert;

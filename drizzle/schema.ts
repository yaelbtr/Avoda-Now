import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
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
  /** Worker's preferred city / area */
  preferredCity: varchar("preferredCity", { length: 100 }),
  /** Short bio / note from worker */
  workerBio: text("workerBio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
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
  /** Whether the employer's phone number is visible to workers on the job card */
  showPhone: boolean("showPhone").default(false).notNull(),
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

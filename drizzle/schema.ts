import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkerAvailability = typeof workerAvailability.$inferSelect;
export type InsertWorkerAvailability = typeof workerAvailability.$inferInsert;

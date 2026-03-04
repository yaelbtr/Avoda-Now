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

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** JSON array of normalized skill/interest tags for future AI matching */
  workerTags: json("workerTags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const otpCodes = mysqlTable("otp_codes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

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
  workersNeeded: int("workersNeeded").default(1).notNull(),
  postedBy: int("postedBy").references(() => users.id),
  /** Duration in days: 1, 3, or 7 */
  activeDuration: mysqlEnum("activeDuration", ["1", "3", "7"]).default("7").notNull(),
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

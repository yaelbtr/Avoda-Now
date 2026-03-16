CREATE TYPE "public"."active_duration" AS ENUM('1', '3', '7');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('pending', 'viewed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available_now', 'available_today', 'available_hours', 'not_available');--> statement-breakpoint
CREATE TYPE "public"."closed_reason" AS ENUM('found_worker', 'expired', 'manual');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms', 'privacy', 'age_18', 'job_posting_policy', 'safety_policy', 'user_content_policy', 'reviews_policy');--> statement-breakpoint
CREATE TYPE "public"."job_category" AS ENUM('delivery', 'warehouse', 'agriculture', 'kitchen', 'cleaning', 'security', 'construction', 'childcare', 'eldercare', 'retail', 'events', 'volunteer', 'emergency_support', 'passover_jobs', 'reserve_families', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_location_mode" AS ENUM('city', 'radius');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('active', 'closed', 'expired', 'under_review');--> statement-breakpoint
CREATE TYPE "public"."location_mode" AS ENUM('city', 'radius');--> statement-breakpoint
CREATE TYPE "public"."notification_prefs" AS ENUM('both', 'push_only', 'sms_only', 'none');--> statement-breakpoint
CREATE TYPE "public"."phone_change_result" AS ENUM('success', 'failed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."region_notif_type" AS ENUM('worker', 'employer');--> statement-breakpoint
CREATE TYPE "public"."region_status" AS ENUM('collecting_workers', 'active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."salary_type" AS ENUM('hourly', 'daily', 'monthly', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."start_time" AS ENUM('today', 'tomorrow', 'this_week', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."user_mode" AS ENUM('worker', 'employer');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'test');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."worker_region_match_type" AS ENUM('gps_radius', 'preferred_city');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobId" integer NOT NULL,
	"workerId" integer NOT NULL,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"contactRevealed" boolean DEFAULT false NOT NULL,
	"revealedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(16) DEFAULT '💼',
	"groupName" varchar(64) DEFAULT 'general',
	"imageUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_code" integer,
	"name_he" text NOT NULL,
	"name_en" text,
	"district" varchar(100),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobId" integer NOT NULL,
	"reporterPhone" varchar(20),
	"reporterIp" varchar(45),
	"reason" varchar(200),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"category" "job_category" NOT NULL,
	"address" varchar(300) NOT NULL,
	"city" varchar(100),
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"salary" numeric(10, 2),
	"salaryType" "salary_type" DEFAULT 'hourly' NOT NULL,
	"contactPhone" varchar(20) NOT NULL,
	"contactName" varchar(100) NOT NULL,
	"businessName" varchar(200),
	"workingHours" varchar(100),
	"startTime" "start_time" DEFAULT 'flexible' NOT NULL,
	"startDateTime" timestamp with time zone,
	"isUrgent" boolean DEFAULT false NOT NULL,
	"isLocalBusiness" boolean DEFAULT false NOT NULL,
	"reminderSentAt" timestamp with time zone,
	"closedReason" "closed_reason",
	"workersNeeded" integer DEFAULT 1 NOT NULL,
	"postedBy" integer,
	"activeDuration" "active_duration" DEFAULT '1' NOT NULL,
	"expiresAt" timestamp with time zone,
	"status" "job_status" DEFAULT 'active' NOT NULL,
	"reportCount" integer DEFAULT 0 NOT NULL,
	"jobTags" json,
	"jobLocationMode" "job_location_mode" DEFAULT 'radius',
	"jobSearchRadiusKm" integer DEFAULT 5,
	"hourlyRate" numeric(10, 2),
	"estimatedHours" numeric(5, 1),
	"showPhone" boolean DEFAULT false NOT NULL,
	"jobDate" varchar(10),
	"workStartTime" varchar(5),
	"workEndTime" varchar(5),
	"imageUrls" json,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobId" integer NOT NULL,
	"employerPhone" varchar(20) NOT NULL,
	"pendingCount" integer DEFAULT 0 NOT NULL,
	"scheduledAt" timestamp with time zone NOT NULL,
	"sentAt" timestamp with time zone,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_rate_limit" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"ip" varchar(45),
	"sendCount" integer DEFAULT 1 NOT NULL,
	"verifyAttempts" integer DEFAULT 0 NOT NULL,
	"windowStart" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_change_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"oldPhone" varchar(20),
	"newPhone" varchar(20),
	"ipAddress" varchar(45),
	"result" "phone_change_result" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_prefixes" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" varchar(5) NOT NULL,
	"description" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "phone_prefixes_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"endpoint" varchar(2048) NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_notification_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"region_id" integer NOT NULL,
	"type" "region_notif_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"centerCity" varchar(100) NOT NULL,
	"centerLat" numeric(10, 7) NOT NULL,
	"centerLng" numeric(10, 7) NOT NULL,
	"activationRadiusKm" integer DEFAULT 15 NOT NULL,
	"radiusMinutes" integer DEFAULT 20 NOT NULL,
	"minWorkersRequired" integer DEFAULT 50 NOT NULL,
	"currentWorkers" integer DEFAULT 0 NOT NULL,
	"status" "region_status" DEFAULT 'collecting_workers' NOT NULL,
	"description" text,
	"imageUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"jobId" integer NOT NULL,
	"savedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"document_version" varchar(32) DEFAULT '2026-03' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"phone" varchar(20),
	"phonePrefix" varchar(5),
	"phoneNumber" varchar(7),
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"userMode" "user_mode",
	"workerTags" json,
	"preferredCategories" json,
	"preferredCity" varchar(100),
	"preferredCities" json,
	"locationMode" "location_mode" DEFAULT 'city',
	"workerLatitude" numeric(10, 7),
	"workerLongitude" numeric(10, 7),
	"searchRadiusKm" integer DEFAULT 5,
	"preferenceText" text,
	"preferredDays" json,
	"preferredTimeSlots" json,
	"workerBio" text,
	"profilePhoto" text,
	"expectedHourlyRate" numeric(8, 2),
	"availabilityStatus" "availability_status",
	"workerRating" numeric(3, 2),
	"completedJobsCount" integer DEFAULT 0 NOT NULL,
	"signupCompleted" boolean DEFAULT false NOT NULL,
	"regionId" integer,
	"notificationPrefs" "notification_prefs" DEFAULT 'both' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	"referredBy" integer,
	"termsAcceptedAt" timestamp with time zone,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "worker_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"city" varchar(100),
	"note" varchar(200),
	"availableUntil" timestamp with time zone NOT NULL,
	"reminderSentAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"workerId" integer NOT NULL,
	"employerId" integer NOT NULL,
	"applicationId" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_regions" (
	"worker_id" integer NOT NULL,
	"region_id" integer NOT NULL,
	"distance_km" numeric(8, 3),
	"match_type" "worker_region_match_type" DEFAULT 'gps_radius' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worker_regions_worker_id_region_id_pk" PRIMARY KEY("worker_id","region_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_workerId_users_id_fk" FOREIGN KEY ("workerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_postedBy_users_id_fk" FOREIGN KEY ("postedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_jobId_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_change_logs" ADD CONSTRAINT "phone_change_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_notification_requests" ADD CONSTRAINT "region_notification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_notification_requests" ADD CONSTRAINT "region_notification_requests_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_availability" ADD CONSTRAINT "worker_availability_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_ratings" ADD CONSTRAINT "worker_ratings_workerId_users_id_fk" FOREIGN KEY ("workerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_ratings" ADD CONSTRAINT "worker_ratings_employerId_users_id_fk" FOREIGN KEY ("employerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_regions" ADD CONSTRAINT "worker_regions_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_regions" ADD CONSTRAINT "worker_regions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_region_notif" ON "region_notification_requests" USING btree ("user_id","region_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_jobs_user_job_idx" ON "saved_jobs" USING btree ("userId","jobId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_consent_type" ON "user_consents" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_ratings_employer_worker_idx" ON "worker_ratings" USING btree ("employerId","workerId");
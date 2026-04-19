CREATE TYPE "public"."notification_channel" AS ENUM('sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('sent', 'failed', 'skipped');--> statement-breakpoint
ALTER TYPE "public"."closed_reason" ADD VALUE 'cap_reached';--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer,
	"job_id" integer NOT NULL,
	"worker_id" integer NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" NOT NULL,
	"error_msg" text,
	"phone" varchar(20),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"label" varchar(128) NOT NULL,
	"source" varchar(64) NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cityPlaceId" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferredCityPlaceId" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referralSource" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utmCampaign" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utmMedium" varchar(64);--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_batch_id_notification_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."notification_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notif_logs_job_idx" ON "notification_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "notif_logs_worker_idx" ON "notification_logs" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "notif_logs_batch_idx" ON "notification_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "referral_links_code_idx" ON "referral_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "referral_links_source_idx" ON "referral_links" USING btree ("source");
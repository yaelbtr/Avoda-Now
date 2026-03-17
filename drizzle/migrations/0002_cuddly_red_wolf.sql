ALTER TABLE "jobs" ALTER COLUMN "category" SET DATA TYPE varchar(64);--> statement-breakpoint
DROP TYPE "public"."job_category";
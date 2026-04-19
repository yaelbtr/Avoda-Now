ALTER TABLE "users" ADD COLUMN "companyName" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employerBio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "defaultJobCityId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "defaultJobCity" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "defaultJobLatitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "defaultJobLongitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workerSearchCity" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workerSearchCityId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workerSearchRadiusKm" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workerSearchLatitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workerSearchLongitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workerSearchLocationMode" "location_mode" DEFAULT 'city';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "minWorkerAge" integer;
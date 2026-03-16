ALTER TABLE "jobs" ADD COLUMN "location" geometry(Point, 4326);--> statement-breakpoint
ALTER TABLE "worker_availability" ADD COLUMN "location" geometry(Point, 4326);
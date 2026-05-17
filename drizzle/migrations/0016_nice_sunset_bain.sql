CREATE TABLE "landing_page_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"source" varchar(32) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "landing_page_visits_slug_source_idx" ON "landing_page_visits" USING btree ("slug","source");
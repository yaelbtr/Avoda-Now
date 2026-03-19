CREATE TABLE "birthdate_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"old_birth_date" varchar(10),
	"new_birth_date" varchar(10) NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "birthdate_changes" ADD CONSTRAINT "birthdate_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
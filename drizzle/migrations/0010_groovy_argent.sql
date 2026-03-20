CREATE TABLE "email_unsubscribes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"token" varchar(64) NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_unsubscribes_email_unique" UNIQUE("email"),
	CONSTRAINT "email_unsubscribes_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX "email_unsubscribes_email_idx" ON "email_unsubscribes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_unsubscribes_token_idx" ON "email_unsubscribes" USING btree ("token");
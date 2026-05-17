CREATE TABLE "category_groups" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" varchar(64) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "category_groups" ("slug", "name", "sortOrder") VALUES
  ('home',    'עבודות בית', 0),
  ('events',  'אירועים',    1),
  ('care',    'טיפול',      2),
  ('general', 'כללי',       3),
  ('special', 'מיוחד',      4)
ON CONFLICT ("slug") DO NOTHING;

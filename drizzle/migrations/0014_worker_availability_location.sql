-- Add PostGIS geometry column to worker_availability for ST_DWithin queries
ALTER TABLE "worker_availability" ADD COLUMN IF NOT EXISTS "location" geometry(Point, 4326);
UPDATE "worker_availability" SET "location" = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND "location" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_worker_availability_location" ON "worker_availability" USING GIST("location");

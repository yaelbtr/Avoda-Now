-- Add GIST index on users."workerLocation" for PostGIS ST_DWithin performance.
-- CONCURRENTLY allows the index to be built without locking the table.
-- IF NOT EXISTS prevents failure if the index was already created manually.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_worker_location
  ON public.users
  USING GIST ("workerLocation");

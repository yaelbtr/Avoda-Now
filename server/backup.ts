/**
 * server/backup.ts — Automated Database Backup
 * ──────────────────────────────────────────────
 * Exports a `runDatabaseBackup()` function that:
 *   1. Exports all critical tables as JSON via Drizzle queries
 *   2. Compresses the export to a gzipped JSON buffer
 *   3. Uploads the backup to S3 under the `db-backups/` prefix
 *
 * The backup is scheduled to run daily at 02:00 UTC from the server startup.
 * Backups are stored as: db-backups/backup-YYYY-MM-DD-<timestamp>.json.gz
 *
 * Usage (server startup):
 *   import { scheduleDailyBackup } from "./backup";
 *   scheduleDailyBackup();
 */

import { gzipSync } from "zlib";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { logger } from "./logger";
import {
  users,
  jobs,
  applications,
  workerRatings,
  categories,
  regions,
} from "../drizzle/schema";

/**
 * Export critical tables and upload a compressed backup to S3.
 * Returns the S3 key and size of the created backup.
 */
export async function runDatabaseBackup(): Promise<{ key: string; sizeBytes: number }> {
  const db = await getDb();
  if (!db) throw new Error("[Backup] Database not available");

  logger.info({ event: "backup_start" }, "Starting daily database backup");

  // Export all critical tables in parallel
  const [usersData, jobsData, applicationsData, ratingsData, categoriesData, regionsData] =
    await Promise.all([
      db.select().from(users),
      db.select().from(jobs),
      db.select().from(applications),
      db.select().from(workerRatings),
      db.select().from(categories),
      db.select().from(regions),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    tables: {
      users: usersData,
      jobs: jobsData,
      applications: applicationsData,
      workerRatings: ratingsData,
      categories: categoriesData,
      regions: regionsData,
    },
    counts: {
      users: usersData.length,
      jobs: jobsData.length,
      applications: applicationsData.length,
      workerRatings: ratingsData.length,
      categories: categoriesData.length,
      regions: regionsData.length,
    },
  };

  // Compress to gzip
  const json = JSON.stringify(exportData);
  const compressed = gzipSync(Buffer.from(json, "utf8"));

  // Upload to S3
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `db-backups/backup-${dateStr}-${Date.now()}.json.gz`;
  await storagePut(key, compressed, "application/gzip");

  logger.info(
    {
      event: "backup_complete",
      key,
      sizeBytes: compressed.length,
      counts: exportData.counts,
    },
    `Database backup uploaded: ${key} (${(compressed.length / 1024).toFixed(1)} KB)`
  );

  return { key, sizeBytes: compressed.length };
}

/**
 * Schedule the daily backup to run at 02:00 UTC every day.
 * Call this once from server startup.
 */
export function scheduleDailyBackup(): void {
  const scheduleNext = () => {
    const now = new Date();
    const next2am = new Date(now);
    next2am.setUTCHours(2, 0, 0, 0);
    // If 02:00 UTC has already passed today, schedule for tomorrow
    if (next2am <= now) {
      next2am.setUTCDate(next2am.getUTCDate() + 1);
    }
    const msUntilNext = next2am.getTime() - now.getTime();

    logger.info(
      { nextBackupAt: next2am.toISOString(), msUntilNext, event: "backup_scheduled" },
      `[Backup] Next backup scheduled at ${next2am.toISOString()}`
    );

    setTimeout(async () => {
      try {
        await runDatabaseBackup();
      } catch (err) {
        logger.error({ err, event: "backup_error" }, "[Backup] Daily backup failed");
      }
      // Schedule the next day's backup after this one completes
      scheduleNext();
    }, msUntilNext);
  };

  scheduleNext();
}

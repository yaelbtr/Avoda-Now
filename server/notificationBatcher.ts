/**
 * Batched application notification system.
 *
 * When a worker applies to a job:
 *  1. We look for an existing "pending" batch for that job.
 *  2. If none → create one (pendingCount=1) and schedule a flush after WINDOW_MS.
 *  3. If one exists → increment pendingCount.
 *  4. If pendingCount reaches THRESHOLD → flush immediately.
 *
 * Flush = send a single SMS to the employer summarising the new applicants.
 *
 * The in-process timer map (batchTimers) prevents double-scheduling.
 * markBatchSent uses a DB-level guard (status=pending check) to prevent
 * double-send even if two Node processes race.
 */

import {
  getPendingBatchForJob,
  createNotificationBatch,
  incrementBatchCount,
  markBatchSent,
} from "./db";
import { sendSms } from "./sms";

/** Number of applicants that triggers an immediate flush (before the window). */
export const BATCH_THRESHOLD = 3;

/** Collection window in milliseconds (default 10 minutes). */
export const BATCH_WINDOW_MS = 10 * 60 * 1000;

/** In-process map: jobId → NodeJS.Timeout handle for the scheduled flush. */
const batchTimers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Builds the SMS body for the employer.
 */
function buildSmsBody(
  jobId: number,
  count: number,
  origin = "https://avodanow.co.il"
): string {
  const plural = count === 1 ? "עובד חדש הגיש מועמדות" : `${count} עובדים חדשים הגישו מועמדות`;
  return (
    `AvodaNow: ${plural} למשרה שלך.\n` +
    `לצפייה במועמדים: ${origin}/jobs/${jobId}/applications`
  );
}

/**
 * Flushes a batch: sends the SMS and marks it as sent.
 * Safe to call multiple times — DB guard prevents double-send.
 */
async function flushBatch(
  batchId: number,
  jobId: number,
  employerPhone: string,
  count: number
): Promise<void> {
  // Cancel any pending timer for this job (in case we're flushing early)
  const timer = batchTimers.get(jobId);
  if (timer) {
    clearTimeout(timer);
    batchTimers.delete(jobId);
  }

  try {
    // Mark as sent first (DB guard prevents double-send)
    await markBatchSent(batchId);
    // Send SMS
    const body = buildSmsBody(jobId, count);
    const result = await sendSms(employerPhone, body);
    if (result.success) {
      console.log(`[NotificationBatcher] Sent batch ${batchId} for job ${jobId} (${count} applicants)`);
    } else {
      console.warn(`[NotificationBatcher] SMS failed for batch ${batchId}: ${result.error}`);
    }
  } catch (err) {
    console.error(`[NotificationBatcher] Error flushing batch ${batchId}:`, err);
  }
}

/**
 * Called every time a worker applies to a job.
 *
 * @param jobId         The job being applied to.
 * @param employerPhone The employer's E.164 phone number.
 * @param windowMs      Override the collection window (useful in tests).
 * @param threshold     Override the immediate-flush threshold (useful in tests).
 */
export async function recordApplicationAndNotify(
  jobId: number,
  employerPhone: string,
  windowMs = BATCH_WINDOW_MS,
  threshold = BATCH_THRESHOLD
): Promise<void> {
  try {
    let batch = await getPendingBatchForJob(jobId);

    if (!batch) {
      // First application in this window — create a new batch
      batch = await createNotificationBatch(jobId, employerPhone, windowMs);
      if (!batch) return; // DB unavailable

      // Schedule a delayed flush
      const timer = setTimeout(() => {
        batchTimers.delete(jobId);
        void flushBatch(batch!.id, jobId, employerPhone, batch!.pendingCount);
      }, windowMs);
      batchTimers.set(jobId, timer);

      console.log(
        `[NotificationBatcher] Created batch ${batch.id} for job ${jobId}, flush in ${windowMs / 1000}s`
      );
    } else {
      // Existing batch — increment count
      const updated = await incrementBatchCount(batch.id);
      if (!updated) return;

      const newCount = updated.pendingCount;
      console.log(
        `[NotificationBatcher] Batch ${batch.id} for job ${jobId}: count=${newCount}`
      );

      // Immediate flush if threshold reached
      if (newCount >= threshold) {
        console.log(
          `[NotificationBatcher] Threshold (${threshold}) reached for job ${jobId} — flushing immediately`
        );
        await flushBatch(batch.id, jobId, employerPhone, newCount);
      }
    }
  } catch (err) {
    // Never throw — notifications are fire-and-forget
    console.error("[NotificationBatcher] Unexpected error:", err);
  }
}

/**
 * Exposed for testing: clears all in-process timers.
 */
export function clearAllBatchTimers(): void {
  batchTimers.forEach((timer) => clearTimeout(timer));
  batchTimers.clear();
}

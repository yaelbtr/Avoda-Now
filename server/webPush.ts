import webpush from "web-push";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { pushSubscriptions, type PushSubscription } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let initialized = false;

function ensureInit() {
  if (initialized) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not set — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@avodanow.co.il",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  initialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send a Web Push notification to all subscriptions for a given user.
 * Silently removes invalid/expired subscriptions (410 Gone).
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  ensureInit();
  if (!initialized) return;

  const db = await getDb();
  if (!db) return;
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  const message = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub: PushSubscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired — remove it
          const db2 = await getDb();
          if (db2) await db2
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`[WebPush] Failed to send to sub ${sub.id}:`, err);
        }
      }
    })
  );
}

/**
 * Fan-out: send a "new job" push notification to all workers whose profile
 * matches the given job category and city.
 * Uses getWorkersMatchingJob from db.ts (same matching logic as SMS alerts).
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendJobPushNotifications(
  workerIds: number[],
  job: { title: string; city: string | null; category: string; isUrgent: boolean; id: number }
): Promise<number> {
  ensureInit();
  if (!initialized || workerIds.length === 0) return 0;
  const urgentPrefix = job.isUrgent ? "🔴 דחוף! " : "💼 ";
  const cityPart = job.city ? ` ב${job.city}` : "";
  const payload: PushPayload = {
    title: `${urgentPrefix}משרה חדשה תואמת לפרופיל שלך`,
    body: `${job.title}${cityPart}`,
    url: `/jobs/${job.id}`,
    icon: "/favicon.ico",
  };
  let sent = 0;
  // Process in parallel batches of 20 to avoid overwhelming the push service
  const BATCH = 20;
  for (let i = 0; i < workerIds.length; i += BATCH) {
    const batch = workerIds.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((id) => sendPushToUser(id, payload)));
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
    }
  }
  return sent;
}

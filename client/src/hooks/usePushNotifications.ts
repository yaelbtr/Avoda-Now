import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Manages Web Push subscription lifecycle:
 * - Registers the service worker
 * - Fetches the VAPID public key from the server
 * - Subscribes / unsubscribes the browser
 * - Syncs the subscription with the server
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: vapidData } = trpc.push.vapidKey.useQuery();
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // Check current subscription state on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {/* ignore */});
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);

    if (!vapidData?.publicKey) {
      setError("מפתח VAPID לא זמין — נסה שוב בעוד רגע");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("הדפדפן שלך אינו תומך בהתראות Push");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("יש לאשר הרשאת התראות בדפדפן כדי לקבל עדכונים");
        return;
      }

      // 2. Register / retrieve service worker
      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // SW may already be registered — use existing
        reg = await navigator.serviceWorker.ready;
      }

      // Wait for SW to become active
      await navigator.serviceWorker.ready;

      // 3. Subscribe to push — pass Uint8Array directly (NOT .buffer)
      const keyBytes = urlBase64ToUint8Array(vapidData.publicKey);
      // PushManager expects ArrayBuffer; copy Uint8Array into a fresh ArrayBuffer
      const applicationServerKey = keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength
      ) as ArrayBuffer;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("אובייקט ה-subscription אינו תקין");
      }

      // 4. Sync with server
      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });

      setIsSubscribed(true);
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? "שגיאה ברישום להתראות";
      // Translate common DOMException messages to Hebrew
      if (msg.includes("denied") || msg.includes("permission")) {
        setError("ההרשאה נדחתה — אפשר התראות בהגדרות הדפדפן");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        setError("שגיאת רשת — בדוק חיבור לאינטרנט ונסה שוב");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [vapidData, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (e) {
      setError((e as Error).message ?? "שגיאה בביטול התראות");
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMutation]);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  return { isSupported, isSubscribed, permission, isLoading, error, subscribe, unsubscribe };
}

/** Convert VAPID base64url public key to Uint8Array for PushManager.subscribe() */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

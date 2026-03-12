/**
 * WorkerRegionBanner — shown on the worker homepage when ALL of the worker's
 * associated regions are inactive (collecting_workers or paused).
 *
 * Displays a friendly message and lets the worker subscribe for a push
 * notification when any of their regions becomes active.
 */
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, MapPin, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function WorkerRegionBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: regionStatus, isLoading } = trpc.regions.workerRegionStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: myNotifications } = trpc.regions.myNotifications.useQuery(undefined, {
    staleTime: 60_000,
  });

  const requestNotif = trpc.regions.requestNotification.useMutation({
    onSuccess: (d) => {
      if (d.alreadySubscribed) {
        toast.info("כבר נרשמת לקבל התראה עבור אזור זה");
      } else {
        toast.success("נרשמת! נשלח לך התראה כשהאזור ייפתח למעסיקים.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelNotif = trpc.regions.cancelNotification.useMutation({
    onSuccess: () => toast.success("ביטלת את ההתראה"),
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  // Don't show if loading, no regions, already has active region, or dismissed
  if (isLoading || !regionStatus || !regionStatus.hasAnyRegion || regionStatus.hasActiveRegion || dismissed) {
    return null;
  }

  const subscribedRegionIds = new Set((myNotifications ?? []).map((n) => n.regionId));

  const handleToggleNotif = (regionId: number) => {
    if (subscribedRegionIds.has(regionId)) {
      cancelNotif.mutate(
        { regionId },
        { onSuccess: () => utils.regions.myNotifications.invalidate() }
      );
    } else {
      requestNotif.mutate(
        { regionId, type: "worker" },
        { onSuccess: () => utils.regions.myNotifications.invalidate() }
      );
    }
  };

  return (
    <div
      dir="rtl"
      className="relative rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-right shadow-sm"
      role="alert"
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 left-3 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="סגור"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 rounded-full bg-amber-100 p-2">
          <MapPin className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm leading-snug">
            האזור שלך טרם נפתח למעסיקים
          </p>
          <p className="mt-1 text-xs text-amber-700 leading-relaxed">
            אנו עובדים על כך שבקרוב תוכל לקבל הצעות ממעסיקים באזורים שבחרת.
            הירשם לקבל התראה ברגע שהאזור ייפתח.
          </p>

          {/* Per-region subscribe buttons */}
          {regionStatus.inactiveRegions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {regionStatus.inactiveRegions.map((region) => {
                const subscribed = subscribedRegionIds.has(region.id);
                return (
                  <button
                    key={region.id}
                    onClick={() => handleToggleNotif(region.id)}
                    disabled={requestNotif.isPending || cancelNotif.isPending}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      subscribed
                        ? "border-amber-400 bg-amber-200 text-amber-800 hover:bg-amber-100"
                        : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {subscribed ? (
                      <BellOff className="w-3 h-3" />
                    ) : (
                      <Bell className="w-3 h-3" />
                    )}
                    {region.name}
                    {subscribed ? " — בטל התראה" : " — הודע לי"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

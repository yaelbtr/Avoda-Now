/**
 * WorkerJobsContext — Shared Worker Data Service
 *
 * Single source of truth for:
 *  1. All job panels on the worker home screen (urgent, today, nearby, latest)
 *  2. Saved job IDs — shared between HomeWorker and FindJobs so a save/unsave
 *     in either page is immediately reflected everywhere without a second network call.
 *
 * Design decisions:
 * - jobs.getWorkerDashboard: staleTime=3min, gcTime=10min — survives page navigation
 * - savedIds: staleTime=5min, gcTime=15min — auth-gated, only fetches when logged in
 * - Optimistic save/unsave: updates the local Set immediately, rolls back on error
 * - Geo input is stabilised with useMemo to prevent infinite query re-triggers
 * - DRY: save/unsave mutations defined once here, consumed by HomeWorker + FindJobs
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DashboardJob = {
  id: number;
  title: string;
  category: string | null;
  city: string | null;
  description: string | null;
  workDate: string | null;
  workStartTime: string | null;
  workEndTime: string | null;
  salary: number | null;
  salaryType: string | null;
  isUrgent: boolean | null;
  status: string;
  postedBy: number;
  contactPhone: null;
  latitude: string | null;
  longitude: string | null;
  jobLocationMode: string | null;
  minAge: number | null;
  [key: string]: unknown;
};

export type NearbyJob = DashboardJob & { distance: number };

export interface WorkerJobsState {
  // ── Dashboard panels ────────────────────────────────────────────────────────
  isLoading: boolean;
  error: Error | null;
  urgentJobs: DashboardJob[];
  todayJobs: DashboardJob[];
  nearbyJobs: NearbyJob[];
  latestJobs: DashboardJob[];
  isFallback: boolean;
  nearbyRadius: number;
  setNearbyRadius: (r: number) => void;
  setLocation: (lat: number, lng: number) => void;
  refetch: () => void;

  // ── Saved jobs (shared between HomeWorker + FindJobs) ───────────────────────
  /** Memoised Set of saved job IDs — O(1) lookup */
  savedIds: Set<number>;
  isSavedLoading: boolean;
  /** Toggle save state optimistically. Requires authentication. */
  toggleSave: (jobId: number, currentlySaved: boolean, onLoginRequired?: (msg: string) => void) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WorkerJobsContext = createContext<WorkerJobsState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function WorkerJobsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  // ── Geo state ──────────────────────────────────────────────────────────────
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [nearbyRadius, setNearbyRadius] = useState(10);

  // Stabilise query input — new object on every render would cause infinite re-fetches
  const dashboardInput = useMemo(
    () => ({ lat, lng, radiusKm: nearbyRadius }),
    [lat, lng, nearbyRadius]
  );

  // ── Dashboard query ────────────────────────────────────────────────────────
  const dashboardQuery = trpc.jobs.getWorkerDashboard.useQuery(dashboardInput, {
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });

  // ── Saved IDs query (auth-gated) ───────────────────────────────────────────
  const utils = trpc.useUtils();

  const savedIdsQuery = trpc.savedJobs.getSavedIds.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    throwOnError: false,
  });

  // Memoised Set — O(1) lookup, stable reference when data hasn't changed
  const savedIds = useMemo(
    () => new Set<number>(savedIdsQuery.data?.ids ?? []),
    [savedIdsQuery.data]
  );

  // ── Save mutation (optimistic) ─────────────────────────────────────────────
  const saveMutation = trpc.savedJobs.save.useMutation({
    onMutate: async ({ jobId }) => {
      await utils.savedJobs.getSavedIds.cancel();
      const prev = utils.savedJobs.getSavedIds.getData();
      utils.savedJobs.getSavedIds.setData(undefined, (old) => ({
        ids: [...(old?.ids ?? []), jobId],
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.savedJobs.getSavedIds.setData(undefined, ctx.prev);
      toast.error("שגיאה בשמירת המשרה");
    },
    onSettled: () => {
      utils.savedJobs.getSavedIds.invalidate();
    },
  });

  // ── Unsave mutation (optimistic) ───────────────────────────────────────────
  const unsaveMutation = trpc.savedJobs.unsave.useMutation({
    onMutate: async ({ jobId }) => {
      await utils.savedJobs.getSavedIds.cancel();
      const prev = utils.savedJobs.getSavedIds.getData();
      utils.savedJobs.getSavedIds.setData(undefined, (old) => ({
        ids: (old?.ids ?? []).filter((id) => id !== jobId),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.savedJobs.getSavedIds.setData(undefined, ctx.prev);
      toast.error("שגיאה בהסרת המשרה");
    },
    onSettled: () => {
      utils.savedJobs.getSavedIds.invalidate();
    },
  });

  // ── Stable toggleSave callback ─────────────────────────────────────────────
  const toggleSave = useCallback(
    (
      jobId: number,
      currentlySaved: boolean,
      onLoginRequired?: (msg: string) => void
    ) => {
      if (!isAuthenticated) {
        onLoginRequired?.("כדי לשמור משרות יש להתחבר למערכת");
        return;
      }
      if (currentlySaved) {
        unsaveMutation.mutate({ jobId });
      } else {
        saveMutation.mutate({ jobId });
      }
    },
    [isAuthenticated, saveMutation, unsaveMutation]
  );

  // ── Stable setLocation ─────────────────────────────────────────────────────
  const setLocation = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  // ── Context value (memoised to prevent unnecessary re-renders) ─────────────
  const value = useMemo<WorkerJobsState>(
    () => ({
      isLoading: dashboardQuery.isLoading,
      error: dashboardQuery.error as Error | null,
      urgentJobs: (dashboardQuery.data?.urgent ?? []) as DashboardJob[],
      todayJobs: (dashboardQuery.data?.today ?? []) as DashboardJob[],
      nearbyJobs: (dashboardQuery.data?.nearby ?? []) as NearbyJob[],
      latestJobs: (dashboardQuery.data?.latest ?? []) as DashboardJob[],
      isFallback: dashboardQuery.data?.isFallback ?? false,
      nearbyRadius,
      setNearbyRadius,
      setLocation,
      refetch: dashboardQuery.refetch,
      savedIds,
      isSavedLoading: savedIdsQuery.isLoading,
      toggleSave,
    }),
    [
      dashboardQuery.isLoading,
      dashboardQuery.error,
      dashboardQuery.data,
      dashboardQuery.refetch,
      nearbyRadius,
      setLocation,
      savedIds,
      savedIdsQuery.isLoading,
      toggleSave,
    ]
  );

  return (
    <WorkerJobsContext.Provider value={value}>
      {children}
    </WorkerJobsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useWorkerJobs — consume the shared worker data service.
 * Must be used inside <WorkerJobsProvider>.
 * Returns stable references — safe to use as useEffect/useMemo dependencies.
 */
export function useWorkerJobs(): WorkerJobsState {
  const ctx = useContext(WorkerJobsContext);
  if (!ctx) {
    throw new Error("useWorkerJobs must be used inside <WorkerJobsProvider>");
  }
  return ctx;
}

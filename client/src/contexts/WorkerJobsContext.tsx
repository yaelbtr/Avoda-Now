/**
 * WorkerJobsContext — Shared Worker Dashboard Data Service
 *
 * Single source of truth for all job panels on the worker home screen.
 * Replaces 4 parallel tRPC calls (listUrgent, listToday, list, search) with
 * one unified query: jobs.getWorkerDashboard.
 *
 * Design decisions:
 * - staleTime: 3 min  → data stays fresh across page navigation without refetch
 * - gcTime: 10 min    → TanStack Query keeps the cache alive for 10 min after
 *                        the last consumer unmounts (survives route transitions)
 * - The context exposes the raw query result + derived panel arrays so consumers
 *   never re-derive the same data independently (DRY principle).
 * - Geo input is stabilised with useMemo to prevent infinite query re-triggers.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { trpc } from "@/lib/trpc";

// ── Types ─────────────────────────────────────────────────────────────────────

// Mirror the server-side return shape (contactPhone is always null for workers)
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
  [key: string]: unknown; // allow extra columns without breaking
};

export type NearbyJob = DashboardJob & { distance: number };

export interface WorkerJobsState {
  /** True while the initial fetch is in-flight */
  isLoading: boolean;
  /** Non-null when the query failed */
  error: Error | null;
  /** Up to 4 urgent jobs */
  urgentJobs: DashboardJob[];
  /** Up to 4 jobs starting today */
  todayJobs: DashboardJob[];
  /** Up to 8 jobs near the worker's location */
  nearbyJobs: NearbyJob[];
  /** Up to 6 most-recent active jobs */
  latestJobs: DashboardJob[];
  /** True when nearby fell back to 100 km radius */
  isFallback: boolean;
  /** Update the worker's current location (triggers a single re-fetch) */
  setLocation: (lat: number, lng: number) => void;
  /** Radius used for the nearby panel (km) */
  nearbyRadius: number;
  setNearbyRadius: (r: number) => void;
  /** Force an immediate refetch (e.g. after availability change) */
  refetch: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WorkerJobsContext = createContext<WorkerJobsState | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function WorkerJobsProvider({ children }: { children: React.ReactNode }) {
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [nearbyRadius, setNearbyRadius] = useState(10);

  // Stabilise the query input — new object on every render would cause infinite
  // re-fetches (see template Common Pitfalls: unstable references).
  const queryInput = useMemo(
    () => ({ lat, lng, radiusKm: nearbyRadius }),
    [lat, lng, nearbyRadius]
  );

  const query = trpc.jobs.getWorkerDashboard.useQuery(queryInput, {
    // 3 minutes: data stays valid across page navigation without a new network call
    staleTime: 3 * 60 * 1000,
    // 10 minutes: keep the cache alive after the last consumer unmounts so that
    // navigating away and back is instant
    gcTime: 10 * 60 * 1000,
    // Never throw to an error boundary — surface errors via context instead
    throwOnError: false,
    // Retry once on failure before surfacing the error
    retry: 1,
  });

  const setLocation = useMemo(
    () => (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
    },
    []
  );

  const value = useMemo<WorkerJobsState>(
    () => ({
      isLoading: query.isLoading,
      error: query.error as Error | null,
      urgentJobs: (query.data?.urgent ?? []) as DashboardJob[],
      todayJobs: (query.data?.today ?? []) as DashboardJob[],
      nearbyJobs: (query.data?.nearby ?? []) as NearbyJob[],
      latestJobs: (query.data?.latest ?? []) as DashboardJob[],
      isFallback: query.data?.isFallback ?? false,
      setLocation,
      nearbyRadius,
      setNearbyRadius,
      refetch: query.refetch,
    }),
    [query.isLoading, query.error, query.data, setLocation, nearbyRadius, query.refetch]
  );

  return (
    <WorkerJobsContext.Provider value={value}>
      {children}
    </WorkerJobsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useWorkerJobs — consume the shared worker dashboard data service.
 *
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

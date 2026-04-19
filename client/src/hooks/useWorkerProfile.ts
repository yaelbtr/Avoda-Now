/**
 * useWorkerProfile — shared hook for fetching a worker's public profile.
 *
 * Caching strategy (two layers):
 *  1. tRPC / React-Query cache: `staleTime` of 10 minutes means the same
 *     worker profile is never re-fetched within a session unless explicitly
 *     invalidated (e.g. after a rating is submitted).
 *  2. Module-level in-memory Map: stores the last-known profile for each
 *     userId so that components can render immediately from the warm cache
 *     while React-Query decides whether a background refetch is needed.
 *     This prevents the "flash of empty content" when re-opening a profile
 *     that was already viewed.
 *
 * Usage:
 *   const { profile, isLoading, error } = useWorkerProfile(workerId);
 *
 * Invalidation:
 *   import { invalidateWorkerProfile } from "@/hooks/useWorkerProfile";
 *   invalidateWorkerProfile(utils, workerId);
 */

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerPublicProfile = NonNullable<
  inferRouterOutputs<AppRouter>["user"]["getPublicProfile"]
>;

// ─── Module-level in-memory cache ─────────────────────────────────────────────
// Keyed by userId. Survives React re-renders and component unmounts.
// Cleared only on full page reload (intentional — profiles rarely change mid-session).

const profileMemCache = new Map<number, WorkerPublicProfile>();

/** Read a cached profile synchronously (returns undefined on cache miss). */
export function getCachedWorkerProfile(userId: number): WorkerPublicProfile | undefined {
  return profileMemCache.get(userId);
}

/** Imperatively invalidate a single worker's cache entry (call after rating/update). */
export function invalidateWorkerProfile(
  utils: ReturnType<typeof trpc.useUtils>,
  userId: number,
): void {
  profileMemCache.delete(userId);
  utils.user.getPublicProfile.invalidate({ userId });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches and caches a worker's public profile.
 *
 * @param userId  - The worker's user ID. Pass `null` / `undefined` to skip fetching.
 * @param enabled - Optional override to disable the query (default: true).
 */
export function useWorkerProfile(
  userId: number | null | undefined,
  enabled = true,
) {
  const query = trpc.user.getPublicProfile.useQuery(
    { userId: userId! },
    {
      enabled: enabled && userId != null && userId > 0,
      // 10 minutes — profiles are effectively immutable within a session
      staleTime: 10 * 60 * 1000,
      // Keep data in React-Query cache for 30 minutes after last use
      gcTime: 30 * 60 * 1000,
      // Don't re-fetch just because the user switched tabs
      refetchOnWindowFocus: false,
      // Use the in-memory cache as the initial data so components render immediately
      initialData: userId != null ? profileMemCache.get(userId) : undefined,
    },
  );

  // Populate the in-memory cache whenever fresh data arrives
  useEffect(() => {
    if (query.data && userId != null) {
      profileMemCache.set(userId, query.data);
    }
  }, [query.data, userId]);

  return {
    profile: query.data ?? (userId != null ? profileMemCache.get(userId) : undefined),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}

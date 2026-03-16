/**
 * usePlatformSettings — fetches public platform settings from the server.
 *
 * Currently exposes:
 *  - employerLock: boolean — when true, all employer-facing routes/actions are blocked.
 *    Admins and test users always receive false (bypass handled server-side).
 *
 * The query is cached for 60 seconds to avoid hammering the server on every render.
 */
import { trpc } from "@/lib/trpc";

export function usePlatformSettings() {
  const { data, isLoading } = trpc.platform.settings.useQuery(undefined, {
    staleTime: 60 * 1000, // 60 s
    refetchOnWindowFocus: false,
  });

  return {
    employerLock: data?.employerLock ?? false,
    isLoading,
  };
}

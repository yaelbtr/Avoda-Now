/**
 * useAuthQuery — Single Source of Truth for authenticated tRPC query options.
 *
 * Combines `!authLoading && isAuthenticated` into one stable guard so every
 * protected query waits for the auth state to resolve before firing.
 *
 * Usage:
 *   const authQuery = useAuthQuery();
 *
 *   // Basic auth guard
 *   trpc.user.getProfile.useQuery(undefined, authQuery());
 *
 *   // With extra options (merged, caller wins on conflicts)
 *   trpc.jobs.myJobs.useQuery(undefined, authQuery({ staleTime: 60_000 }));
 *
 *   // With additional conditions (e.g. role check, param presence)
 *   trpc.admin.users.useQuery(undefined, authQuery({ enabled: user?.role === "admin" }));
 *   // → fires only when: !authLoading && isAuthenticated && user.role === "admin"
 *
 * The `enabled` field in the extra options object is ANDed with the auth guard,
 * so callers never need to repeat the auth check themselves.
 */
import { useAuth } from "@/contexts/AuthContext";

type QueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
  retry?: boolean | number;
  [key: string]: unknown;
};

export function useAuthQuery() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const authReady = !authLoading && isAuthenticated;

  /**
   * Returns a query options object with the auth guard applied.
   * @param extra  Additional tRPC query options. If `enabled` is provided it
   *               is ANDed with the auth guard — the auth guard always wins.
   */
  return function authQueryOptions<T extends QueryOptions>(extra?: T): T & { enabled: boolean } {
    const callerEnabled = extra?.enabled ?? true;
    return {
      ...(extra as T),
      enabled: authReady && callerEnabled,
    };
  };
}

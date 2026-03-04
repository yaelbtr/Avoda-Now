import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./AuthContext";

type UserMode = "worker" | "employer" | null;

const LS_KEY = "avoda_now_role";
// We store the userId alongside the role so we can detect cross-user reuse
const LS_USER_KEY = "avoda_now_role_user";

function loadRoleFromStorage(currentUserId?: number): UserMode {
  try {
    const savedUserId = localStorage.getItem(LS_USER_KEY);
    const v = localStorage.getItem(LS_KEY);
    // Only trust the stored role if it belongs to the same user
    if (
      currentUserId !== undefined &&
      savedUserId !== null &&
      Number(savedUserId) !== currentUserId
    ) {
      // Different user — clear stale data
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_USER_KEY);
      return null;
    }
    if (v === "worker" || v === "employer") return v;
  } catch {}
  return null;
}

function saveRoleToStorage(mode: "worker" | "employer", userId?: number) {
  try {
    localStorage.setItem(LS_KEY, mode);
    if (userId !== undefined) localStorage.setItem(LS_USER_KEY, String(userId));
  } catch {}
}

function clearRoleFromStorage() {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_USER_KEY);
  } catch {}
}

interface UserModeContextValue {
  userMode: UserMode;
  isLoadingMode: boolean;
  setUserMode: (mode: "worker" | "employer") => void;
  needsRoleSelection: boolean;
}

const UserModeContext = createContext<UserModeContextValue>({
  userMode: null,
  isLoadingMode: false,
  setUserMode: () => {},
  needsRoleSelection: false,
});

export function UserModeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  // Initialise from localStorage — but only if it belongs to the current user.
  // We can't know userId synchronously on first render, so start with null and
  // let the effect below set it once auth resolves.
  const [localMode, setLocalMode] = useState<UserMode>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [localInitialized, setLocalInitialized] = useState(false);

  // Once we know the userId, load the matching localStorage role
  useEffect(() => {
    if (userId !== undefined && !localInitialized) {
      const stored = loadRoleFromStorage(userId);
      setLocalMode(stored);
      setLocalInitialized(true);
    }
    if (!isAuthenticated) {
      // Reset on logout so next login starts fresh
      setLocalMode(null);
      setHasChecked(false);
      setLocalInitialized(false);
      // Clear stored role so the role selection screen always appears on next login
      clearRoleFromStorage();
    }
  }, [userId, isAuthenticated, localInitialized]);

  // Fetch mode from server when authenticated
  const modeQuery = trpc.user.getMode.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      setLocalMode(vars.mode);
      saveRoleToStorage(vars.mode, userId);
      modeQuery.refetch();
    },
  });

  const serverMode = modeQuery.data?.mode ?? null;

  // Mark as checked once the first fetch completes
  useEffect(() => {
    if (isAuthenticated && !modeQuery.isLoading && !hasChecked) {
      setHasChecked(true);
    }
    if (!isAuthenticated) {
      setHasChecked(false);
    }
  }, [isAuthenticated, modeQuery.isLoading, hasChecked]);

  // After the first server fetch completes:
  // - If server has a mode → use it (and sync to localStorage)
  // - If server has null → server is authoritative; clear any stale localStorage
  useEffect(() => {
    if (!hasChecked) return;
    if (serverMode) {
      setLocalMode(serverMode);
      saveRoleToStorage(serverMode, userId);
    } else {
      // Server explicitly says no mode — clear stale local value so the
      // role selection screen is shown
      setLocalMode(null);
      clearRoleFromStorage();
    }
  }, [hasChecked, serverMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effective mode:
  // - Before first server check: use localMode (fast path for returning users)
  // - After first server check: server is authoritative
  const userMode: UserMode = isAuthenticated
    ? hasChecked
      ? serverMode  // server wins once we've fetched
      : localMode   // optimistic pre-fetch (avoids flash for returning users)
    : localMode;

  // Show loading spinner only on first fetch when we have no local fallback
  const isLoadingMode = isAuthenticated && !hasChecked && localMode === null;

  // Show role selection only when: authenticated, done loading, and no mode
  const needsRoleSelection = isAuthenticated && !isLoadingMode && userMode === null;

  const setUserMode = (mode: "worker" | "employer") => {
    setLocalMode(mode);
    saveRoleToStorage(mode, userId);
    if (isAuthenticated) {
      setModeMutation.mutate({ mode });
    }
  };

  return (
    <UserModeContext.Provider value={{ userMode, isLoadingMode, setUserMode, needsRoleSelection }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  return useContext(UserModeContext);
}

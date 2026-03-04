import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./AuthContext";

type UserMode = "worker" | "employer" | null;

const LS_KEY = "avoda_now_role";

function loadRoleFromStorage(): UserMode {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "worker" || v === "employer") return v;
  } catch {}
  return null;
}

function saveRoleToStorage(mode: "worker" | "employer") {
  try { localStorage.setItem(LS_KEY, mode); } catch {}
}

function clearRoleFromStorage() {
  try { localStorage.removeItem(LS_KEY); } catch {}
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
  const { isAuthenticated } = useAuth();
  // Initialise from localStorage so returning users never see the modal again
  const [localMode, setLocalMode] = useState<UserMode>(() => loadRoleFromStorage());
  // Track whether we've completed at least one successful fetch
  const [hasChecked, setHasChecked] = useState(false);

  // Fetch mode from server when authenticated
  const modeQuery = trpc.user.getMode.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    // Keep previous data during refetch so we don't flash isLoading=true
    placeholderData: (prev) => prev,
  });

  const setModeMutation = trpc.user.setMode.useMutation({
    onSuccess: (_, vars) => {
      setLocalMode(vars.mode);
      saveRoleToStorage(vars.mode);
      modeQuery.refetch();
    },
  });

  const serverMode = modeQuery.data?.mode ?? null;
  const userMode: UserMode = isAuthenticated ? (serverMode ?? localMode) : localMode;

  // Mark as checked once the first fetch completes (success or error)
  useEffect(() => {
    if (isAuthenticated && !modeQuery.isLoading && !hasChecked) {
      setHasChecked(true);
    }
    if (!isAuthenticated) {
      setHasChecked(false);
      // Don't clear localStorage on logout — keep role as fallback for next login
    }
  }, [isAuthenticated, modeQuery.isLoading, hasChecked]);

  // Only show loading on the very first fetch, not on subsequent refetches
  const isLoadingMode = isAuthenticated && !hasChecked && localMode === null;
  const needsRoleSelection = isAuthenticated && !isLoadingMode && userMode === null;

  const setUserMode = (mode: "worker" | "employer") => {
    setLocalMode(mode);
    saveRoleToStorage(mode);
    if (isAuthenticated) {
      setModeMutation.mutate({ mode });
    }
  };

  // Sync localMode from server when it loads
  useEffect(() => {
    if (serverMode) {
      setLocalMode(serverMode);
      saveRoleToStorage(serverMode);
    }
  }, [serverMode]);

  return (
    <UserModeContext.Provider value={{ userMode, isLoadingMode, setUserMode, needsRoleSelection }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  return useContext(UserModeContext);
}

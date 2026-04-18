/**
 * IdleLogoutManager
 *
 * Invisible component that activates the idle-logout hook for authenticated
 * users and renders the warning dialog when the countdown starts.
 * Mount this once inside the AuthProvider tree (e.g. in App.tsx).
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { IdleWarningDialog } from "./IdleWarningDialog";

export function IdleLogoutManager() {
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const [, navigate] = useLocation();
  const logout = trpc.auth.logout.useMutation();

  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  const handleWarning = useCallback((secs: number) => {
    setSecondsLeft(secs);
    setWarningOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    setWarningOpen(false);
    try {
      await logout.mutateAsync();
    } catch {
      // Session may already be expired — proceed to redirect regardless
    }
    navigate("/");
  }, [logout, navigate]);

  const handleResume = useCallback(() => {
    setWarningOpen(false);
  }, []);

  const handleStayLoggedIn = useCallback(() => {
    // Closing the dialog triggers an activity event (click), which resets the
    // timer via the event listener in useIdleLogout.
    setWarningOpen(false);
  }, []);

  useIdleLogout({
    ...authQuery(),
    onWarning: handleWarning,
    onLogout: handleLogout,
    onResume: handleResume,
  });

  return (
    <IdleWarningDialog
      open={warningOpen}
      secondsLeft={secondsLeft}
      onStayLoggedIn={handleStayLoggedIn}
    />
  );
}

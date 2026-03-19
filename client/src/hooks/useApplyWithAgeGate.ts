/**
 * useApplyWithAgeGate
 *
 * Single Source of Truth for the "apply to job" flow with age-gate.
 *
 * Behaviour:
 *  1. If user is not authenticated → call onLoginRequired and abort.
 *  2. If birthDateInfo is still loading → show "מאמת פרטים..." toast, store
 *     pending params; a useEffect retries automatically once the query resolves.
 *  3. If user has no birthDate on record → open BirthDateModal (via returned state),
 *     store the pending apply params, and abort the mutation.
 *  4. After BirthDateModal reports success → invalidate getBirthDateInfo cache so
 *     all components reflect the new value, then automatically retry the stored mutation.
 *  5. If birthDate already exists → call applyToJob immediately.
 *
 * Usage:
 *   const { apply, isPending, birthDateModalOpen, closeBirthDateModal, handleBirthDateSuccess } =
 *     useApplyWithAgeGate({ isAuthenticated, onLoginRequired, onSuccess });
 *
 *   // In JSX:
 *   <BirthDateModal
 *     isOpen={birthDateModalOpen}
 *     onClose={closeBirthDateModal}
 *     onSuccess={handleBirthDateSuccess}
 *   />
 *
 *   // On apply button click:
 *   apply({ jobId, message, origin });
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ApplyParams {
  jobId: number;
  message?: string;
  origin: string;
}

interface UseApplyWithAgeGateOptions {
  isAuthenticated: boolean;
  onLoginRequired?: (msg: string) => void;
  /** Called after a successful application (e.g. to update local applied state) */
  onSuccess?: () => void;
}

export function useApplyWithAgeGate({
  isAuthenticated,
  onLoginRequired,
  onSuccess,
}: UseApplyWithAgeGateOptions) {
  const utils = trpc.useUtils();

  // Pending params stored while BirthDateModal is open or query is loading
  const [pendingParams, setPendingParams] = useState<ApplyParams | null>(null);
  const [birthDateModalOpen, setBirthDateModalOpen] = useState(false);

  // Track whether we already showed the "מאמת פרטים..." toast to avoid duplicates
  const loadingToastShownRef = useRef(false);

  // Fetch birth date info (cached, only when authenticated)
  const birthDateInfoQuery = trpc.user.getBirthDateInfo.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const applyMutation = trpc.jobs.applyToJob.useMutation({
    onSuccess: () => {
      utils.jobs.myApplications.invalidate();
      toast.success("מועמדות הוגשה בהצלחה!");
      onSuccess?.();
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        toast.info("כבר הגשת מועמדות למשרה זו");
        onSuccess?.(); // treat as success for UI state
      } else {
        toast.error(err.message || "שגיאה בהגשת מועמדות");
      }
    },
  });

  // When the query finishes loading and we have pending params, continue the flow.
  useEffect(() => {
    if (pendingParams && !birthDateInfoQuery.isLoading) {
      loadingToastShownRef.current = false; // reset for next time
      const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
      if (!hasBirthDate) {
        setBirthDateModalOpen(true);
      } else {
        applyMutation.mutate(pendingParams);
        setPendingParams(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDateInfoQuery.isLoading, birthDateInfoQuery.data]);

  /** Trigger the apply flow. Handles auth check + age gate automatically. */
  const apply = useCallback(
    (params: ApplyParams) => {
      if (!isAuthenticated) {
        onLoginRequired?.("כדי להגיש מועמדות יש להתחבר");
        return;
      }

      // If birthDateInfo is still loading, store params and show a toast so the
      // user knows something is happening. The useEffect above will retry.
      if (birthDateInfoQuery.isLoading) {
        setPendingParams(params);
        if (!loadingToastShownRef.current) {
          loadingToastShownRef.current = true;
          toast.loading("מאמת פרטים...", { id: "age-gate-loading", duration: 4000 });
        }
        return;
      }

      const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
      if (!hasBirthDate) {
        setPendingParams(params);
        setBirthDateModalOpen(true);
        return;
      }

      applyMutation.mutate(params);
    },
    [isAuthenticated, onLoginRequired, birthDateInfoQuery.isLoading, birthDateInfoQuery.data, applyMutation]
  );

  /** Call this from BirthDateModal's onSuccess prop */
  const handleBirthDateSuccess = useCallback(
    (_result: { age: number; isMinor: boolean }) => {
      setBirthDateModalOpen(false);
      // Invalidate cache so all components (CarouselJobCard, SearchJobCard, etc.)
      // immediately reflect the newly saved birthDate without a stale read.
      utils.user.getBirthDateInfo.invalidate();
      if (pendingParams) {
        applyMutation.mutate(pendingParams);
        setPendingParams(null);
      }
    },
    [pendingParams, applyMutation, utils.user.getBirthDateInfo]
  );

  /** Call this from BirthDateModal's onClose prop */
  const closeBirthDateModal = useCallback(() => {
    setBirthDateModalOpen(false);
    setPendingParams(null);
  }, []);

  return {
    apply,
    isPending: applyMutation.isPending,
    birthDateModalOpen,
    handleBirthDateSuccess,
    closeBirthDateModal,
  };
}

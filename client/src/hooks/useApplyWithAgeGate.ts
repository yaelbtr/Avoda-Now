/**
 * useApplyWithAgeGate
 *
 * Single Source of Truth for the "apply to job" flow with age-gate.
 *
 * Behaviour:
 *  1. If user is not authenticated → call onLoginRequired and abort.
 *  2. If user has no birthDate on record → open BirthDateModal (via returned state),
 *     store the pending apply params, and abort the mutation.
 *  3. After BirthDateModal reports success → automatically retry the stored mutation.
 *  4. If birthDate already exists → call applyToJob immediately.
 *
 * Usage:
 *   const { apply, birthDateModalOpen, closeBirthDateModal, handleBirthDateSuccess } =
 *     useApplyWithAgeGate({ isAuthenticated, onLoginRequired });
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
import { useState, useCallback, useEffect } from "react";
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

  // Pending params stored while BirthDateModal is open
  const [pendingParams, setPendingParams] = useState<ApplyParams | null>(null);
  const [birthDateModalOpen, setBirthDateModalOpen] = useState(false);

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
        onLoginRequired?.("\u05db\u05d3\u05d9 \u05dc\u05d4\u05d2\u05d9\u05e9 \u05de\u05d5\u05e2\u05de\u05d3\u05d5\u05ea \u05d9\u05e9 \u05dc\u05d4\u05ea\u05d7\u05d1\u05e8");
        return;
      }

      // Wait until the birth-date query has resolved before deciding.
      // If still loading, store params and let the effect below retry.
      if (birthDateInfoQuery.isLoading) {
        setPendingParams(params);
        return;
      }

      const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
      if (!hasBirthDate) {
        // Store params and open modal
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
      if (pendingParams) {
        applyMutation.mutate(pendingParams);
        setPendingParams(null);
      }
    },
    [pendingParams, applyMutation]
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

/**
 * useApplyWithAgeGate
 *
 * Single Source of Truth for the "apply to job" flow with full pre-action gates.
 *
 * Gate order:
 *  1. Not authenticated            → call onLoginRequired, abort.
 *  2. No phone on profile          → toast CTA to complete worker profile, abort.
 *  3. No termsAcceptedAt           → open RealActionConsentModal (first real-action only).
 *  4. birthDateInfo loading        → store params, retry via useEffect.
 *  5. No birthDate                 → open BirthDateModal.
 *  6. All gates pass               → call applyToJob mutation.
 *
 * Error handling:
 *  - CONFLICT          → treat as success (already applied).
 *  - message includes "אישור הורי" → specific parental-approval toast.
 *  - other             → generic error toast.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ApplyParams {
  jobId: number;
  message?: string;
  origin: string;
}

interface UseApplyWithAgeGateOptions {
  isAuthenticated: boolean;
  onLoginRequired?: (msg: string) => void;
  onSuccess?: () => void;
}

export function useApplyWithAgeGate({
  isAuthenticated,
  onLoginRequired,
  onSuccess,
}: UseApplyWithAgeGateOptions) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [pendingParams, setPendingParams] = useState<ApplyParams | null>(null);
  const [birthDateModalOpen, setBirthDateModalOpen] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const loadingToastShownRef = useRef(false);

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
        onSuccess?.();
      } else if (err.message?.includes("אישור הורי")) {
        toast.error("דרוש אישור הורי — הפיצ'ר יושק בקרוב");
      } else {
        toast.error(err.message || "שגיאה בהגשת מועמדות");
      }
    },
  });

  // Retry after birthDateInfo resolves while pending
  useEffect(() => {
    if (pendingParams && !birthDateInfoQuery.isLoading) {
      loadingToastShownRef.current = false;
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

  const apply = useCallback(
    (params: ApplyParams) => {
      if (!isAuthenticated) {
        onLoginRequired?.("כדי להגיש מועמדות יש להתחבר");
        return;
      }

      // Gate: phone required
      if (!user?.phone) {
        toast.error("יש להשלים את הפרטים האישיים לפני הגשת מועמדות", {
          action: {
            label: "השלם פרטים",
            onClick: () => navigate("/worker-profile"),
          },
          duration: 6000,
        });
        return;
      }

      // Gate: consent required (first real action only)
      if (!user?.termsAcceptedAt) {
        setPendingParams(params);
        setConsentModalOpen(true);
        return;
      }

      // Gate: birthDate loading
      if (birthDateInfoQuery.isLoading) {
        setPendingParams(params);
        if (!loadingToastShownRef.current) {
          loadingToastShownRef.current = true;
          toast.loading("מאמת פרטים...", { id: "age-gate-loading", duration: 4000 });
        }
        return;
      }

      // Gate: birthDate required
      const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
      if (!hasBirthDate) {
        setPendingParams(params);
        setBirthDateModalOpen(true);
        return;
      }

      applyMutation.mutate(params);
    },
    [isAuthenticated, onLoginRequired, user, birthDateInfoQuery, applyMutation, navigate]
  );

  /** Called by RealActionConsentModal after successful consent recording */
  const handleConsentConfirm = useCallback(() => {
    setConsentModalOpen(false);
    utils.auth.me.invalidate(); // refresh termsAcceptedAt in auth context
    if (!pendingParams) return;

    if (birthDateInfoQuery.isLoading) {
      // Keep pendingParams; useEffect will continue once query resolves
      return;
    }

    const hasBirthDate = birthDateInfoQuery.data?.birthDate != null;
    if (!hasBirthDate) {
      setBirthDateModalOpen(true);
    } else {
      applyMutation.mutate(pendingParams);
      setPendingParams(null);
    }
  }, [pendingParams, birthDateInfoQuery, applyMutation, utils]);

  const closeConsentModal = useCallback(() => {
    setConsentModalOpen(false);
    setPendingParams(null);
  }, []);

  const handleBirthDateSuccess = useCallback(
    (_result: { age: number; isMinor: boolean }) => {
      setBirthDateModalOpen(false);
      utils.user.getBirthDateInfo.invalidate();
      if (pendingParams) {
        applyMutation.mutate(pendingParams);
        setPendingParams(null);
      }
    },
    [pendingParams, applyMutation, utils.user.getBirthDateInfo]
  );

  const closeBirthDateModal = useCallback(() => {
    setBirthDateModalOpen(false);
    setPendingParams(null);
  }, []);

  return {
    apply,
    isPending: applyMutation.isPending,
    consentModalOpen,
    handleConsentConfirm,
    closeConsentModal,
    birthDateModalOpen,
    handleBirthDateSuccess,
    closeBirthDateModal,
  };
}

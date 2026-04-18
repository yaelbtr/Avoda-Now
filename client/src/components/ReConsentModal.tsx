import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import {
  LEGAL_DOCUMENT_LABELS,
  LEGAL_DOCUMENT_PATHS,
  type LegalConsentType,
} from "@shared/const";

/**
 * ReConsentModal
 *
 * A mandatory, non-dismissable modal shown to authenticated users
 * whose accepted legal document versions are older than the current
 * LEGAL_DOCUMENT_VERSIONS constants.
 *
 * The user must check all required checkboxes before they can continue
 * using the platform. This replaces the previous TermsUpdateBanner.
 *
 * Blocking guarantees:
 * - No close button / overlay click dismiss
 * - Escape key is intercepted and suppressed
 * - Body scroll is locked while the modal is visible
 * - The "אישור והמשך" CTA is disabled until every checkbox is ticked
 *
 * Flow:
 * 1. On mount (only for authenticated users), calls checkOutdatedConsents
 * 2. If any outdated core consents exist → shows a blocking modal
 * 3. Each outdated document gets its own checkbox with a link to the doc
 * 4. The "אישור והמשך" button is enabled only when all boxes are checked
 * 5. On submit → records re-consent for all outdated docs → modal closes
 * 6. On error → shows inline error message, allows retry
 */
export default function ReConsentModal() {
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = trpc.user.checkOutdatedConsents.useQuery(undefined, {
    ...authQuery(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const utils = trpc.useUtils();
  const recordConsent = trpc.user.recordConsent.useMutation({
    onSuccess: () => {
      utils.user.checkOutdatedConsents.invalidate();
      utils.user.getMyConsents.invalidate();
    },
  });

  // Determine visibility: show only when there are outdated consents
  const outdated = (!isLoading && data?.outdated && data.outdated.length > 0)
    ? (data.outdated as LegalConsentType[])
    : null;
  const isVisible = isAuthenticated && !isLoading && !submitted && outdated !== null;

  // ── Escape key suppression ────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isVisible, handleKeyDown]);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isVisible]);

  if (!isVisible || !outdated) return null;

  const currentVersions = data!.currentVersions;
  const allChecked = outdated.every((type) => !!checked[type]);

  const handleToggle = (type: LegalConsentType) => {
    setChecked((prev) => ({ ...prev, [type]: !prev[type] }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!allChecked || recordConsent.isPending) return;
    setError(null);
    try {
      // Record re-consent for all outdated documents sequentially
      for (const type of outdated) {
        await recordConsent.mutateAsync({
          consentType: type,
          documentVersion: currentVersions[type],
        });
      }
      setSubmitted(true);
    } catch {
      setError("אירעה שגיאה בשמירת הסכמתך. אנא נסה שנית.");
    }
  };

  return (
    /* Backdrop — non-dismissable: no onClick handler, Escape blocked via useEffect */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconsent-title"
      aria-describedby="reconsent-desc"
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#fefcf4" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex items-start gap-3"
          style={{ borderBottom: "1px solid #e8e0cc" }}
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#3d4a28" }}
            aria-hidden="true"
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2
              id="reconsent-title"
              className="text-lg font-bold leading-tight"
              style={{ color: "#1a2510" }}
            >
              עדכנו את המסמכים המשפטיים שלנו
            </h2>
            <p
              id="reconsent-desc"
              className="text-sm mt-1"
              style={{ color: "#5a6a40" }}
            >
              נדרש אישורך מחדש לפני המשך השימוש באתר
            </p>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="px-6 py-5 space-y-4">
          {outdated.map((type) => (
            <label
              key={type}
              htmlFor={`reconsent-${type}`}
              className="flex items-start gap-3 cursor-pointer"
            >
              <div className="flex h-6 items-center flex-shrink-0">
                <input
                  type="checkbox"
                  id={`reconsent-${type}`}
                  checked={!!checked[type]}
                  onChange={() => handleToggle(type)}
                  className="h-5 w-5 rounded border-gray-300 cursor-pointer"
                  style={{ accentColor: "#3d4a28" }}
                  aria-label={`אשר ${LEGAL_DOCUMENT_LABELS[type]}`}
                />
              </div>
              <span
                className="text-sm leading-6 select-none"
                style={{ color: "#374151" }}
              >
                קראתי ואני מסכים/ה ל
                {/* Space before link */}{" "}
                <a
                  href={LEGAL_DOCUMENT_PATHS[type]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: "#3d4a28" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {LEGAL_DOCUMENT_LABELS[type]}
                </a>
                {" "}המעודכנ{type === "privacy" ? "ת" : "ים"}
              </span>
            </label>
          ))}
        </div>

        {/* Version note */}
        <p
          className="px-6 pb-3 text-xs"
          style={{ color: "#9ca3af" }}
          aria-live="polite"
        >
          גרסה נוכחית:{" "}
          {outdated.map((t, i) => (
            <span key={t}>
              {LEGAL_DOCUMENT_LABELS[t]} ({currentVersions[t]})
              {i < outdated.length - 1 && ", "}
            </span>
          ))}
        </p>

        {/* Error message */}
        {error && (
          <div
            className="mx-6 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Submit button */}
        <div
          className="px-6 pb-6 pt-2"
          style={{ borderTop: "1px solid #e8e0cc" }}
        >
          <button
            onClick={handleSubmit}
            disabled={!allChecked || recordConsent.isPending}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              backgroundColor: allChecked ? "#3d4a28" : "#9ca3af",
              color: "#ffffff",
            }}
            aria-disabled={!allChecked}
          >
            {recordConsent.isPending ? (
              <>
                <span
                  className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                  aria-hidden="true"
                />
                שומר...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                אישור והמשך
              </>
            )}
          </button>
          {!allChecked && (
            <p className="text-xs text-center mt-2" style={{ color: "#9ca3af" }}>
              יש לסמן את כל התיבות כדי להמשיך
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

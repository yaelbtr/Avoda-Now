import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, X, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthQuery } from "@/hooks/useAuthQuery";
import { LEGAL_DOCUMENT_LABELS, LEGAL_DOCUMENT_PATHS, type LegalConsentType } from "@shared/const";
import { C_BRAND_HEX, C_HONEY_HEX } from "@/lib/colors";

/**
 * TermsUpdateBanner
 *
 * Shown at the top of the page when an authenticated user has accepted
 * an older version of the core legal documents (terms or privacy).
 *
 * Flow:
 * 1. Calls trpc.user.checkOutdatedConsents on mount (only for authenticated users)
 * 2. If outdated consents exist, renders a sticky banner with:
 *    - List of outdated document names with links
 *    - "I agree" button that records re-consent for all outdated docs
 *    - Dismiss button (hides for session only — will reappear on next visit)
 * 3. On re-consent success, hides the banner
 */
export default function TermsUpdateBanner() {
  const { isAuthenticated } = useAuth();
  const authQuery = useAuthQuery();
  const [dismissed, setDismissed] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const { data, isLoading } = trpc.user.checkOutdatedConsents.useQuery(undefined, {
    ...authQuery(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const utils = trpc.useUtils();
  const recordConsent = trpc.user.recordConsent.useMutation({
    onSuccess: () => {
      setAccepted(true);
      // Invalidate so the banner won't reappear after navigation
      utils.user.checkOutdatedConsents.invalidate();
      utils.user.getMyConsents.invalidate();
    },
  });

  // Don't render if: not authenticated, loading, no outdated consents, dismissed, or accepted
  if (!isAuthenticated || isLoading || dismissed || accepted) return null;
  if (!data?.outdated || data.outdated.length === 0) return null;

  const outdated = data.outdated as LegalConsentType[];
  const currentVersions = data.currentVersions;

  const handleAcceptAll = () => {
    // Record re-consent for all outdated documents
    outdated.forEach((type) => {
      recordConsent.mutate({
        consentType: type,
        documentVersion: currentVersions[type],
      });
    });
  };

  return (
    <div
      dir="rtl"
      role="alert"
      aria-live="polite"
      className="w-full z-50 border-b"
      style={{
        backgroundColor: C_BRAND_HEX,
        borderColor: "rgba(255,255,255,0.15)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-3">
        {/* Icon */}
        <AlertTriangle
          className="flex-shrink-0 mt-0.5 h-4 w-4"
          style={{ color: C_HONEY_HEX }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug">
            עדכנו את המסמכים המשפטיים שלנו
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            נדרש אישורך מחדש עבור:{" "}
            {outdated.map((type, i) => (
              <span key={type}>
                <Link
                  href={LEGAL_DOCUMENT_PATHS[type]}
                  className="underline underline-offset-2 hover:text-white transition-colors"
                  style={{ color: C_HONEY_HEX }}
                >
                  {LEGAL_DOCUMENT_LABELS[type]}
                </Link>
                {i < outdated.length - 1 && ", "}
              </span>
            ))}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAcceptAll}
            disabled={recordConsent.isPending}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            style={{
              backgroundColor: C_HONEY_HEX,
              color: C_BRAND_HEX,
            }}
            aria-label="אשר מחדש את כל המסמכים המשפטיים"
          >
            {recordConsent.isPending ? (
              <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            מאשר/ת
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.6)" }}
            aria-label="סגור הודעה"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

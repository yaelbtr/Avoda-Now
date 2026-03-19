/**
 * Returns the #mobile-root element as the portal target so that overlays,
 * modals, and bottom-sheets are constrained within the 420px mobile-wrapper
 * on desktop. Falls back to document.body if the element is not found
 * (e.g., during SSR or tests).
 *
 * Single source of truth — import this instead of referencing document.body
 * directly in createPortal calls.
 */
export function getMobileRoot(): HTMLElement {
  return (document.getElementById("mobile-root") ?? document.body) as HTMLElement;
}

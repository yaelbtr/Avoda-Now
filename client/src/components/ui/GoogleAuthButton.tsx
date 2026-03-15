/**
 * GoogleAuthButton — Shared Google OAuth button.
 *
 * Single source of truth for the Google sign-in/sign-up button used across
 * the login and registration flows. Keeps the Google logo SVG, border style,
 * hover state, and disabled state in one place.
 *
 * Props:
 *   label    — button text (e.g. "כניסה עם Google" / "הרשמה עם Google")
 *   onClick  — click handler (caller decides whether to check terms, etc.)
 *   disabled — when true: grayed-out, cursor-not-allowed, opacity-60
 *   size     — "default" (py-2.5, 18px icon) | "sm" (py-2, 16px icon)
 *              defaults to "default"
 */

interface GoogleAuthButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}

/** Google G logo as an inline SVG — 48×48 viewBox, scaled via width/height */
function GoogleLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0
           14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94
           c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59
           l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6
           c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91
           l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export function GoogleAuthButton({
  label,
  onClick,
  disabled = false,
  size = "default",
  className = "",
}: GoogleAuthButtonProps) {
  const iconSize = size === "sm" ? 16 : 18;
  const paddingY = size === "sm" ? "py-2" : "py-2.5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full flex items-center justify-center gap-3 border rounded-xl",
        paddingY,
        "transition-colors text-sm font-semibold",
        disabled
          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
          : "hover:bg-gray-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        disabled
          ? undefined
          : {
              background: "#ffffff",
              borderColor: "oklch(0.88 0.04 122)",
              color: "#374151",
            }
      }
    >
      <GoogleLogo size={iconSize} />
      {label}
    </button>
  );
}

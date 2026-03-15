/**
 * AppFormField — Shared design-system form controls
 *
 * Provides AppInput, AppTextarea, and AppSelect with the same visual language
 * as IsraeliPhoneInput:
 *   - Rounded border (10px), olive-green palette
 *   - Label above in dark olive (#4F583B), 13px semi-bold
 *   - Icon slot on the right (RTL)
 *   - Focus ring in brand green
 *   - Error state (red border + message below)
 *   - Disabled / read-only state (muted background)
 *
 * Single Source of Truth: all design tokens live here.
 */

import React, { forwardRef, useState } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────

const TOKENS = {
  /** Label color */
  labelColor: "#4F583B",
  /** Default border */
  borderDefault: "oklch(0.88 0.04 122)",
  /** Focused border */
  borderFocus: "oklch(0.55 0.12 140)",
  /** Error border */
  borderError: "#e53e3e",
  /** Focus ring */
  ringFocus: "0 0 0 3px oklch(0.55 0.12 140 / 0.15)",
  /** Error ring */
  ringError: "0 0 0 3px #e53e3e22",
  /** Input text */
  textColor: "#111827",
  /** Placeholder */
  placeholderColor: "#9ca3af",
  /** Disabled background */
  bgDisabled: "oklch(0.96 0.01 100)",
  /** Normal background */
  bgNormal: "#ffffff",
  /** Border radius */
  radius: 10,
  /** Font size for input text */
  fontSize: 15,
  /** Padding inside input */
  paddingY: 9,
  paddingX: 12,
  /** Icon area width */
  iconAreaWidth: 44,
} as const;

// ─── Shared style helpers ─────────────────────────────────────────────────────

function getBorderColor(focused: boolean, error?: string) {
  if (error) return TOKENS.borderError;
  if (focused) return TOKENS.borderFocus;
  return TOKENS.borderDefault;
}

function getBoxShadow(focused: boolean, error?: string) {
  if (error) return TOKENS.ringError;
  if (focused) return TOKENS.ringFocus;
  return "none";
}

// ─── AppLabel ─────────────────────────────────────────────────────────────────

interface AppLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  style?: React.CSSProperties;
}

export function AppLabel({ htmlFor, children, required, style }: AppLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontSize: 13,
        fontWeight: 600,
        color: TOKENS.labelColor,
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
      {required && (
        <span style={{ color: "#e53e3e", marginRight: 2 }}>*</span>
      )}
    </label>
  );
}

// ─── AppInput ─────────────────────────────────────────────────────────────────

export interface AppInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Label text shown above the field */
  label?: React.ReactNode;
  /** Show required asterisk on label */
  required?: boolean;
  /** Error message shown below the field */
  error?: string;
  /** Icon element rendered on the right side (RTL) */
  icon?: React.ReactNode;
  /** Wrapper div className */
  wrapperClassName?: string;
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      label,
      required,
      error,
      icon,
      wrapperClassName = "",
      disabled,
      readOnly,
      id,
      ...rest
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const borderColor = getBorderColor(focused, error);
    const boxShadow = getBoxShadow(focused, error);

    return (
      <div dir="rtl" style={{ width: "100%" }} className={wrapperClassName}>
        {label !== undefined && label !== null && label !== '' && (
          <AppLabel htmlFor={id} required={required}>
            {label}
          </AppLabel>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: TOKENS.radius,
            border: `1.5px solid ${borderColor}`,
            boxShadow,
            background:
              disabled || readOnly ? TOKENS.bgDisabled : TOKENS.bgNormal,
            overflow: "hidden",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            readOnly={readOnly}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: `${TOKENS.paddingY}px ${icon ? TOKENS.iconAreaWidth : TOKENS.paddingX}px ${TOKENS.paddingY}px ${TOKENS.paddingX}px`,
              border: "none",
              outline: "none",
              background: "transparent",
              color:
                disabled || readOnly ? "#888" : TOKENS.textColor,
              fontSize: TOKENS.fontSize,
              fontWeight: 400,
              cursor: disabled || readOnly ? "not-allowed" : "text",
            }}
            {...rest}
          />

          {icon && (
            <div
              style={{
                width: TOKENS.iconAreaWidth,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TOKENS.placeholderColor,
                flexShrink: 0,
                pointerEvents: "none",
              }}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p
            style={{
              fontSize: 12,
              color: TOKENS.borderError,
              marginTop: 4,
              textAlign: "right",
            }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
AppInput.displayName = "AppInput";

// ─── AppTextarea ──────────────────────────────────────────────────────────────

export interface AppTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
  wrapperClassName?: string;
}

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  (
    {
      label,
      required,
      error,
      wrapperClassName = "",
      disabled,
      readOnly,
      id,
      ...rest
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const borderColor = getBorderColor(focused, error);
    const boxShadow = getBoxShadow(focused, error);

    return (
      <div dir="rtl" style={{ width: "100%" }} className={wrapperClassName}>
        {label !== undefined && label !== null && label !== '' && (
          <AppLabel htmlFor={id} required={required}>
            {label}
          </AppLabel>
        )}

        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={{
            width: "100%",
            padding: `${TOKENS.paddingY}px ${TOKENS.paddingX}px`,
            borderRadius: TOKENS.radius,
            border: `1.5px solid ${borderColor}`,
            boxShadow,
            background:
              disabled || readOnly ? TOKENS.bgDisabled : TOKENS.bgNormal,
            color: disabled || readOnly ? "#888" : TOKENS.textColor,
            fontSize: TOKENS.fontSize,
            fontWeight: 400,
            outline: "none",
            resize: "vertical",
            transition: "border-color 0.15s, box-shadow 0.15s",
            cursor: disabled || readOnly ? "not-allowed" : "text",
            fontFamily: "inherit",
          }}
          {...rest}
        />

        {error && (
          <p
            style={{
              fontSize: 12,
              color: TOKENS.borderError,
              marginTop: 4,
              textAlign: "right",
            }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
AppTextarea.displayName = "AppTextarea";

// ─── AppSelect ────────────────────────────────────────────────────────────────

export interface AppSelectOption {
  value: string;
  label: string;
}

export interface AppSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  options?: AppSelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(
  (
    {
      label,
      required,
      error,
      options = [],
      placeholder,
      wrapperClassName = "",
      disabled,
      id,
      ...rest
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    // Determine if the current value is the empty placeholder
    const isEmpty = rest.value === "" || rest.value === undefined || rest.defaultValue === "";
    const borderColor = getBorderColor(focused, error);
    const boxShadow = getBoxShadow(focused, error);

    return (
      <div dir="rtl" style={{ width: "100%" }} className={wrapperClassName}>
        {label !== undefined && label !== null && label !== '' && (
          <AppLabel htmlFor={id} required={required}>
            {label}
          </AppLabel>
        )}

        <div style={{ position: "relative" }}>
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            style={{
              width: "100%",
              padding: `${TOKENS.paddingY}px ${TOKENS.paddingX}px`,
              paddingLeft: 36, // space for chevron
              borderRadius: TOKENS.radius,
              border: `1.5px solid ${borderColor}`,
              boxShadow,
              background: disabled ? TOKENS.bgDisabled : TOKENS.bgNormal,
              color: isEmpty ? TOKENS.placeholderColor : TOKENS.textColor,
              fontSize: TOKENS.fontSize,
              fontWeight: 400,
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "border-color 0.15s, box-shadow 0.15s",
              fontFamily: "inherit",
            }}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: TOKENS.placeholderColor,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {error && (
          <p
            style={{
              fontSize: 12,
              color: TOKENS.borderError,
              marginTop: 4,
              textAlign: "right",
            }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
AppSelect.displayName = "AppSelect";

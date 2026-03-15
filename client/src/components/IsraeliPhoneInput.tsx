import { useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhoneValue {
  prefix: string;
  number: string;
}

interface IsraeliPhoneInputProps {
  value: PhoneValue;
  onChange: (val: PhoneValue) => void;
  disabled?: boolean;
  /** If true, the field is read-only */
  readOnly?: boolean;
  /** Error message to display below the field */
  error?: string;
  /** Label text — defaults to "מספר טלפון" */
  label?: string;
  /** Show the label above the field */
  showLabel?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Israeli mobile & landline prefixes */
const IL_PREFIXES = [
  "050", "051", "052", "053", "054", "055", "056", "057", "058", "059",
  "02", "03", "04", "08", "09",
  "072", "073", "074", "076", "077", "078", "079",
];

const DEFAULT_PREFIX = "050";
const COUNTRY_CODE = "+972";
const COUNTRY_FLAG = "🇮🇱";

// ─── Utility functions (exported for reuse & testing) ─────────────────────────

/**
 * Strip all non-digit characters from a string.
 */
export function stripNonDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Apply Israeli phone mask: prefix-XXX-XXXX (e.g. 054-123-4567)
 * Works for both 2-digit and 3-digit prefixes.
 */
export function applyPhoneMask(digits: string): string {
  if (!digits) return "";
  // Detect prefix length: 2-digit prefixes start with 0 then 2/3/4/8/9
  const twoDigitPrefixes = ["02", "03", "04", "08", "09"];
  const isTwoDigit = twoDigitPrefixes.some((p) => digits.startsWith(p));
  const prefixLen = isTwoDigit ? 2 : 3;
  const part1 = digits.slice(0, prefixLen);
  const part2 = digits.slice(prefixLen, prefixLen + 3);
  const part3 = digits.slice(prefixLen + 3, prefixLen + 7);
  let masked = part1;
  if (part2) masked += "-" + part2;
  if (part3) masked += "-" + part3;
  return masked;
}

/**
 * Convert a masked display value back to a PhoneValue.
 * Handles both 2-digit and 3-digit prefixes.
 */
export function maskedToPhoneValue(masked: string): PhoneValue {
  const digits = stripNonDigits(masked);
  if (!digits) return { prefix: DEFAULT_PREFIX, number: "" };

  // Detect 2-digit prefix
  const twoDigitPrefixes = ["02", "03", "04", "08", "09"];
  const isTwoDigit = twoDigitPrefixes.some((p) => digits.startsWith(p));
  const prefixLen = isTwoDigit ? 2 : 3;

  const prefix = digits.slice(0, prefixLen) || DEFAULT_PREFIX;
  const number = digits.slice(prefixLen, prefixLen + 7);
  return { prefix, number };
}

/**
 * Normalize a raw phone string (with or without +972) to a clean PhoneValue.
 * Handles paste scenarios: strips spaces, dashes, parentheses.
 */
export function normalizeRawPhone(raw: string): PhoneValue {
  // Remove all non-digit chars except leading +
  let cleaned = raw.replace(/[^\d+]/g, "");
  // Handle +972XXXXXXXXX → 0XXXXXXXXX
  if (cleaned.startsWith("+972")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("972") && cleaned.length >= 12) {
    cleaned = "0" + cleaned.slice(3);
  }
  return maskedToPhoneValue(cleaned);
}

/**
 * Parse a full Israeli phone number (e.g. "0521234567" or "+972521234567")
 * into { prefix, number } for use with IsraeliPhoneInput.
 */
export function parseIsraeliPhone(phone: string | null | undefined): PhoneValue {
  if (!phone) return { prefix: DEFAULT_PREFIX, number: "" };
  return normalizeRawPhone(phone);
}

/**
 * Combine prefix + number into a single local phone string (e.g. "0521234567").
 */
export function combinePhone(val: PhoneValue): string {
  return `${val.prefix}${val.number}`;
}

/**
 * Convert a PhoneValue to E.164 format (+972XXXXXXXXX).
 * Strips leading 0 from prefix.
 */
export function toE164(val: PhoneValue): string {
  const local = combinePhone(val);
  if (!local.startsWith("0")) return local;
  return COUNTRY_CODE + local.slice(1);
}

/**
 * Validate that a PhoneValue represents a complete Israeli phone number.
 */
export function isValidPhoneValue(val: PhoneValue): boolean {
  const digits = val.prefix + val.number;
  // Israeli numbers are 9-10 digits (2-digit prefix + 7 = 9, 3-digit prefix + 7 = 10)
  const twoDigitPrefixes = ["02", "03", "04", "08", "09"];
  const isTwoDigit = twoDigitPrefixes.some((p) => val.prefix === p);
  const expectedTotal = isTwoDigit ? 9 : 10;
  return digits.length === expectedTotal && IL_PREFIXES.includes(val.prefix);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * RTL-aware Israeli phone number input.
 *
 * Single field UX:
 * - Country picker (🇮🇱 +972) on the right (RTL)
 * - Single text field with dynamic masking (054-123-4567)
 * - Numeric keyboard on mobile (inputMode="tel")
 * - Paste cleanup: strips spaces, dashes, parentheses, handles +972 prefix
 * - Real-time validation (10 digits for mobile, 9 for landline)
 * - Backward-compatible: still exposes PhoneValue { prefix, number }
 */
export function IsraeliPhoneInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  error,
  label = "מספר טלפון",
  showLabel = true,
}: IsraeliPhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Derive the masked display value from PhoneValue
  const displayValue = (() => {
    const digits = value.prefix + value.number;
    if (!digits || digits === DEFAULT_PREFIX.slice(0, digits.length)) {
      // Only show prefix if user hasn't typed the number part yet
      return applyPhoneMask(digits);
    }
    return applyPhoneMask(digits);
  })();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Strip mask characters to get raw digits
      const digits = stripNonDigits(raw).slice(0, 10); // max 10 digits for Israeli numbers
      const newVal = maskedToPhoneValue(digits);
      onChange(newVal);
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const normalized = normalizeRawPhone(pasted);
      onChange(normalized);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowed = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (allowed.includes(e.key)) return;
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) return;
      // Block non-digit keys
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    },
    []
  );

  const isValid = isValidPhoneValue(value);
  const hasContent = (value.prefix + value.number).length > 0;

  const borderColor = error
    ? "#e53e3e"
    : focused
    ? "oklch(0.55 0.12 140)"
    : "oklch(0.88 0.04 122)";

  const boxShadow = focused && !error
    ? "0 0 0 3px oklch(0.55 0.12 140 / 0.15)"
    : error
    ? "0 0 0 3px #e53e3e22"
    : "none";

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      {showLabel && (
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#4F583B",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}

      {/* Single-field row: country picker + input */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          borderRadius: 10,
          border: `1.5px solid ${borderColor}`,
          boxShadow,
          background: disabled || readOnly ? "oklch(0.96 0.01 100)" : "white",
          overflow: "hidden",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Country picker — rightmost in RTL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "10px 10px 10px 8px",
            borderLeft: `1.5px solid ${borderColor}`,
            background: "oklch(0.97 0.02 120)",
            flexShrink: 0,
            cursor: "default",
            userSelect: "none",
            transition: "border-color 0.15s",
          }}
          title="ישראל +972"
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{COUNTRY_FLAG}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#4F583B",
              letterSpacing: "0.01em",
            }}
          >
            {COUNTRY_CODE}
          </span>
        </div>

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9\-]*"
          value={displayValue}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          readOnly={readOnly}
          placeholder="054-123-4567"
          dir="ltr"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 12px",
            border: "none",
            outline: "none",
            background: "transparent",
            color: disabled || readOnly ? "#888" : "#333",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "0.06em",
            cursor: disabled || readOnly ? "not-allowed" : "text",
            textAlign: "left",
          }}
        />

        {/* Validity indicator */}
        {hasContent && !error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingRight: 10,
              paddingLeft: 4,
              color: isValid ? "oklch(0.55 0.12 140)" : "oklch(0.65 0.05 120)",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {isValid ? "✓" : ""}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          style={{
            fontSize: 12,
            color: "#e53e3e",
            marginTop: 4,
            textAlign: "right",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

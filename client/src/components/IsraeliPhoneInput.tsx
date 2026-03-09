import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export interface PhoneValue {
  prefix: string;
  number: string;
}

interface IsraeliPhoneInputProps {
  value: PhoneValue;
  onChange: (val: PhoneValue) => void;
  disabled?: boolean;
  /** If true, the prefix dropdown is shown but the number field is read-only */
  readOnly?: boolean;
  /** Error message to display below the fields */
  error?: string;
  /** Label text — defaults to "מספר טלפון" */
  label?: string;
  /** Show the label above the fields */
  showLabel?: boolean;
}

/**
 * RTL-aware Israeli phone number input.
 * Renders: [ prefix dropdown ] [ 7-digit number field ]
 * The prefix list is loaded from the phone_prefixes table via tRPC.
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
  const { data: prefixes = [], isLoading } = trpc.user.getPhonePrefixes.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  // Auto-select first prefix if none selected yet and prefixes are loaded
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (!didAutoSelect.current && prefixes.length > 0 && !value.prefix) {
      didAutoSelect.current = true;
      onChange({ ...value, prefix: prefixes[0].prefix });
    }
  }, [prefixes, value, onChange]);

  const handlePrefixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, prefix: e.target.value });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 7 characters
    const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
    onChange({ ...value, number: digits });
  };

  const isValid = value.prefix.length === 3 && value.number.length === 7;

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      {showLabel && (
        <label style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#4F583B",
          marginBottom: 6,
        }}>
          {label}
        </label>
      )}

      {/* Two-field row: prefix on right, number on left (RTL) */}
      <div style={{
        display: "flex",
        flexDirection: "row-reverse",
        gap: 8,
        alignItems: "stretch",
      }}>
        {/* Prefix dropdown — rightmost in RTL */}
        <select
          value={value.prefix}
          onChange={handlePrefixChange}
          disabled={disabled || isLoading || readOnly}
          style={{
            width: 90,
            flexShrink: 0,
            padding: "10px 8px",
            borderRadius: 10,
            border: error ? "1.5px solid #e53e3e" : "1.5px solid oklch(0.88 0.04 122)",
            background: disabled || readOnly ? "oklch(0.96 0.01 100)" : "white",
            color: "#4F583B",
            fontSize: 15,
            fontWeight: 700,
            textAlign: "center",
            cursor: disabled || readOnly ? "not-allowed" : "pointer",
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234F583B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center left 8px",
            paddingLeft: 24,
          }}
        >
          {isLoading ? (
            <option value="">טוען...</option>
          ) : (
            prefixes.map((p) => (
              <option key={p.id} value={p.prefix}>
                {p.prefix}
              </option>
            ))
          )}
        </select>

        {/* 7-digit number field — leftmost in RTL */}
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value.number}
          onChange={handleNumberChange}
          disabled={disabled}
          readOnly={readOnly}
          placeholder="1234567"
          maxLength={7}
          dir="ltr"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 12px",
            borderRadius: 10,
            border: error ? "1.5px solid #e53e3e" : "1.5px solid oklch(0.88 0.04 122)",
            background: disabled || readOnly ? "oklch(0.96 0.01 100)" : "white",
            color: "#333",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "0.08em",
            outline: "none",
            cursor: disabled || readOnly ? "not-allowed" : "text",
            textAlign: "left",
          }}
        />
      </div>

      {/* Combined preview */}
      {isValid && !error && (
        <p style={{
          fontSize: 11,
          color: "oklch(0.55 0.10 145)",
          marginTop: 4,
          textAlign: "right",
        }}>
          ✓ {value.prefix}{value.number}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p style={{
          fontSize: 12,
          color: "#e53e3e",
          marginTop: 4,
          textAlign: "right",
        }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Parse a full Israeli phone number (e.g. "0521234567" or "+972521234567")
 * into { prefix, number } for use with IsraeliPhoneInput.
 */
export function parseIsraeliPhone(phone: string | null | undefined): PhoneValue {
  if (!phone) return { prefix: "", number: "" };
  // Remove +972 prefix if present
  let local = phone.replace(/^\+972/, "0").replace(/\s/g, "");
  // Must start with 0 and be 10 digits
  if (local.startsWith("0") && local.length === 10) {
    return {
      prefix: local.slice(0, 3),
      number: local.slice(3),
    };
  }
  return { prefix: "", number: "" };
}

/**
 * Combine prefix + number into a single phone string for API calls.
 */
export function combinePhone(val: PhoneValue): string {
  return `${val.prefix}${val.number}`;
}

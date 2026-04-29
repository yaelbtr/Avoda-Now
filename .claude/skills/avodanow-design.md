---
name: avodanow-design
description: AvodaNow visual design language and shared component system. Use when building, modifying, or reviewing any UI in the AvodaNow / job-now project — forms, cards, modals, navigation, typography, color palette. Contains all design tokens, component APIs, and RTL layout rules.
---

# AvodaNow Design Language

## Design Philosophy
RTL-first (Hebrew), mobile-first, olive-green brand palette. Clean, trustworthy, compact. Every form field follows the same visual contract: rounded border, label above, icon right, focus ring, error state below.

---

## Color Tokens (OKLCH)

| Role | Value | Usage |
|---|---|---|
| Brand primary | `oklch(0.50 0.14 85)` / `#4a5d23` | Buttons, active states, links |
| Brand focus ring | `oklch(0.55 0.12 140 / 0.15)` | Input focus shadow |
| Border default | `oklch(0.88 0.04 122)` | Input borders at rest |
| Border focus | `oklch(0.55 0.12 140)` | Input border on focus |
| Border error | `#e53e3e` | Error state border |
| Label color | `#4F583B` | All form labels |
| Input text | `#111827` | Input value text |
| Placeholder | `#9ca3af` | Input placeholder |
| Disabled bg | `oklch(0.96 0.01 100)` | Disabled input background |
| Page bg | `#f8f5ee` / `oklch(0.97 0.02 100)` | App background |
| Card bg | `#ffffff` | Cards and modals |
| Dark nav bg | `oklch(0.28 0.06 122.3)` | Navbar / dark sections |

---

## Typography

- **Font family**: Heebo (Google Fonts), fallback `sans-serif`
- **Direction**: `dir="rtl"` on `<html>` and all form wrappers
- **Form labels**: 13px, weight 600, color `#4F583B`
- **Body text**: 14–15px, weight 400
- **Headings**: 18–24px, weight 700, color `#1a2010`
- **Subtext / captions**: 11–12px, color `#6b7280`

---

## Shared Form Components

All form controls live in `client/src/components/ui/AppFormField.tsx`.

### AppInput
```tsx
import { AppInput } from "@/components/ui/AppFormField";

<AppInput
  label="שם מלא"          // label above field (optional)
  required                 // adds red asterisk to label
  type="text"
  placeholder="ישראל ישראלי"
  dir="rtl"
  icon={<User className="h-4 w-4" />}  // icon on right side
  error={nameError}        // red border + message below
  wrapperClassName="col-span-2"        // grid layout helper
  value={name}
  onChange={e => setName(e.target.value)}
/>
```

### AppTextarea
```tsx
<AppTextarea
  label="תיאור"
  required
  rows={3}
  dir="rtl"
  error={descError}
  value={desc}
  onChange={e => setDesc(e.target.value)}
/>
```

### AppSelect
```tsx
<AppSelect
  label="קטגוריה"
  required
  placeholder="בחר קטגוריה"
  options={[
    { value: "cleaning", label: "🧹 ניקיון" },
    { value: "moving", label: "📦 הובלות" },
  ]}
  value={category}
  onChange={e => setValue("category", e.target.value)}
  error={errors.category?.message}
/>
```

### AppLabel (standalone)
```tsx
import { AppLabel } from "@/components/ui/AppFormField";
<AppLabel required>שם מלא</AppLabel>
```

### IsraeliPhoneInput
```tsx
import { IsraeliPhoneInput } from "@/components/IsraeliPhoneInput";

<IsraeliPhoneInput
  value={phoneVal}          // { prefix: "054", number: "1234567" }
  onChange={v => setPhoneVal(v)}
  label="מספר טלפון"
  error={phoneError}
/>
```
Helper utilities exported from the same file:
- `toE164(val)` → `+972XXXXXXXXX`
- `isValidPhoneValue(val)` → boolean
- `parseIsraeliPhone(str)` → PhoneValue

---

## Design Tokens (AppFormField.tsx)

```ts
const TOKENS = {
  labelColor: "#4F583B",
  borderDefault: "oklch(0.88 0.04 122)",
  borderFocus:   "oklch(0.55 0.12 140)",
  borderError:   "#e53e3e",
  ringFocus:     "0 0 0 3px oklch(0.55 0.12 140 / 0.15)",
  ringError:     "0 0 0 3px #e53e3e22",
  textColor:     "#111827",
  placeholderColor: "#9ca3af",
  bgDisabled:    "oklch(0.96 0.01 100)",
  bgNormal:      "#ffffff",
  radius:        10,   // px
  fontSize:      15,   // px
  paddingY:      9,    // px
  paddingX:      12,   // px
  iconAreaWidth: 44,   // px
};
```
**Never duplicate these values** — always import from `AppFormField.tsx`.

---

## RTL Layout Rules

- Always set `dir="rtl"` on form wrappers and the `<html>` element.
- Icons go on the **right** side of inputs (RTL natural position).
- Labels are **right-aligned** by default (`text-align: right`).
- Flex rows reverse for RTL: use `flex-row-reverse` or `dir="rtl"` on the container.
- Chevrons in `AppSelect` are positioned on the **left** (LTR end = RTL start).
- OTP digit inputs use `dir="ltr"` with `justify-center` for centered display.

---

## Spacing & Sizing

| Context | Value |
|---|---|
| Form section card padding | `p-5` (20px) |
| Space between form fields | `space-y-3` (compact) / `space-y-4` (normal) |
| Modal bottom-sheet padding | `px-6 pt-2 pb-4` |
| Card border radius | `rounded-xl` (12px) |
| Input border radius | 10px (TOKENS.radius) |
| Button border radius | `rounded-xl` (12px) |
| Section heading | `font-semibold text-foreground text-right` |

---

## AppButton Variants

```tsx
import { AppButton } from "@/components/AppButton";

<AppButton variant="brand" size="lg" className="w-full">הרשמה</AppButton>
<AppButton variant="secondary" size="sm">ביטול</AppButton>
<AppButton variant="outline" size="default">ערוך</AppButton>
```
- `variant="brand"` → olive-green fill, white text
- `variant="secondary"` → muted background
- `variant="outline"` → transparent bg, brand border

---

## Modal / Bottom-Sheet Pattern

Registration and login use a bottom-sheet on mobile:
- `borderRadius: "20px 20px 0 0"`, `maxHeight: "95dvh"`, `overflowY: "auto"`
- Drag handle: 40×4px rounded pill, animated pulse
- Header: back arrow (left) + title (center) + spacer (right)
- Content: `px-6 pt-2 pb-4 space-y-3`
- Icon block: `rounded-xl p-2.5`, icon `w-8 h-8`
- Title: `text-xl font-bold`, subtitle: `text-xs`

---

## Validation Patterns

```ts
// Name validation
function validateName(v: string): string | null {
  if (!v.trim()) return "שם מלא הוא שדה חובה";
  if (v.trim().length < 2) return "שם חייב להכיל לפחות 2 תווים";
  return null;
}

// Email validation
function validateEmail(v: string): string | null {
  if (!v.trim()) return null; // optional unless required
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "כתובת אימייל אינה תקינה";
  return null;
}
```
Show errors `onBlur` and on every `onChange` after first blur.

---

## Key Files

| File | Purpose |
|---|---|
| `client/src/components/ui/AppFormField.tsx` | All shared form controls + design tokens |
| `client/src/components/IsraeliPhoneInput.tsx` | Phone input + E.164 utilities |
| `client/src/components/AppButton.tsx` | Brand button variants |
| `client/src/index.css` | Global CSS variables, Heebo font, RTL defaults |
| `client/index.html` | Google Fonts CDN link for Heebo |
| `shared/categories.ts` | SALARY_TYPES, START_TIMES, JOB_CATEGORIES constants |

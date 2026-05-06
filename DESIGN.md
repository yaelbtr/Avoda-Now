---
name: Editorial Artisan Light
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#46483d'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#77786c'
  outline-variant: '#c7c7ba'
  surface-tint: '#586339'
  primary: '#313b15'
  on-primary: '#ffffff'
  primary-container: '#48522a'
  on-primary-container: '#b9c592'
  inverse-primary: '#c0cc99'
  secondary: '#795900'
  on-secondary: '#ffffff'
  secondary-container: '#fed174'
  on-secondary-container: '#785800'
  tertiary: '#492e49'
  on-tertiary: '#ffffff'
  tertiary-container: '#614461'
  on-tertiary-container: '#d9b4d6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce8b3'
  primary-fixed-dim: '#c0cc99'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#414b23'
  secondary-fixed: '#ffdfa0'
  secondary-fixed-dim: '#ecc165'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#fed6fa'
  tertiary-fixed-dim: '#e1bbde'
  on-tertiary-fixed: '#2b122c'
  on-tertiary-fixed-variant: '#5a3d5a'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display-lg:
    fontFamily: var(--font-rubik)
    fontSize: 3.5rem
    fontWeight: '900'
    lineHeight: '1.1'
  headline-md:
    fontFamily: var(--font-secular)
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: '1.2'
  title-sm:
    fontFamily: var(--font-rubik)
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: var(--font-rubik)
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base_unit: 8px
  section_gap: 40px
  card_padding: 24px
  stack_sm: 8px
  stack_md: 16px
---

# Design System Document

## 1. Overview & Creative North Star: "The Editorial Artisan" (Light Edition)

This design system is built to transform the job search experience from a chaotic marketplace into a curated, professional journey. We move away from the "app-template" look by adopting an **Editorial Artisan** approach, now optimized for a bright, clean, and professional light-mode environment.

The Creative North Star centers on high-end typography, intentional whitespace, and organic cream tones. Rather than using harsh borders and rigid grids, we use subtle tonal shifts and "breathing room" to guide the user. The aesthetic is inspired by premium physical stationery and architectural minimalism—where every element feels intentional, weighted, and bespoke, evoking the tactile quality of a high-end publication.

---

## 2. Colors

Our palette is anchored in a sophisticated Olive Green (`primary: #48522A`), supported by warm neutrals and a golden secondary accent (`#8B6914`).

### Surface Hierarchy & Nesting
To move beyond standard flat UI, we utilize **Tonal Layering** optimized for a light environment. Boundaries are defined by color shifts where "higher" elements or specific content areas are subtly differentiated.
- **The "No-Line" Rule:** 1px solid borders for sectioning are discouraged. Use `surface-container-low` for background sections and the base `background` (#FDFCF8) for the main canvas.
- **Nesting Strategy:** 
    - **Base:** `background` (The warm, primary canvas)
    - **Sections:** `surface-container` (Subtly darker/more saturated to create depth)
    - **Interactive Cards:** `surface-bright` or `surface-container-lowest` (The cleanest surfaces to pop against the layout)
- **Glass & Gradient Rule:** For floating headers or action sheets, use `surface` colors at 80% opacity with a `20px` backdrop-blur to maintain the airy feel.
- **Signature Textures:** For primary CTAs, use the solid `primary` (#48522A) or a subtle linear gradient to add "soul" and depth without breaking the clean aesthetic.

---

## 3. Typography

The system uses **Rubik** for primary display moments and buttons, **Secular** for secondary headlines, and **Inter** for longer clinical, highly-readable body content.

| Level | Font Family | Size | Intent |
| :--- | :--- | :--- | :--- |
| **Display-LG** | `var(--font-rubik)` | 3.5rem | Primary H1 and bold editorial statements |
| **Headline-MD** | `var(--font-secular)` | 1.75rem | Secondary headlines and major section headers |
| **Title-SM** | `var(--font-rubik)` | 1rem | Card titles, buttons, and primary labels |
| **Body-MD** | Inter | 0.875rem | Standard content and job descriptions |
| **Label-SM** | `var(--font-rubik)` | 0.6875rem | Button labels, metadata, and micro-copy |

**Creative Direction:** Use dramatic scale shifts. A `Headline-LG` title next to a `Body-SM` metadata string creates a high-contrast, editorial feel. In light mode, ensure text is rendered in `on-surface` (#1B1C1A) to provide a sharp, professional contrast against the cream-toned background.

**Primary H1 Usage:**

```tsx
<h1 className="font-[family-name:var(--font-rubik)] font-black">כותרת</h1>
```

```css
h1 {
  font-family: var(--font-rubik);
  font-weight: 900;
}
```

**Secondary Headline Usage:**

```tsx
<h1 className="font-[family-name:var(--font-secular)]">כותרת</h1>
```

**Button Usage:**

```tsx
<button className="font-[family-name:var(--font-rubik)] font-semibold">
  חפש עבודה
</button>
```

```css
:root {
  --font-editorial-ui: var(--font-rubik);
}
```

```css
.headline-md {
  font-family: var(--font-secular);
}
```

**H2 Style:**

```css
h2 {
  font-size: 20px;
  font-weight: 600;
  color: #332a2c;
  font-family: var(--font-editorial-headline);
  letter-spacing: 0px;
}
```

---

## 4. Elevation & Depth

We avoid the "shadow-heavy" look. Instead, we use subtle tonal changes and high-diffusion light physics to define space.

- **The Layering Principle:** Depth is achieved by "stacking" surface tiers. In this light theme, a `surface-container-lowest` element (pure white) feels closer as it lifts off the warm `background` (#FDFCF8).
- **Ambient Shadows:** Only use shadows for floating elements (e.g., Fab, Modals). Use a very soft shadow at 5-8% opacity with a 24px blur. This mimics natural sunlight casting a soft lift on paper.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` at **20% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** `primary` background with `on_primary` text. `xl` (1.5rem) rounded corners. 
- **Secondary:** `secondary_fixed` background. No border.
- **Tertiary:** Transparent background, `primary` text, medium weight.

### Input Fields
- **Styling:** Use `surface_container_low` for the fill. Avoid borders; use a bottom-weighted `primary` indicator only on focus to guide the user's eye.
- **Corners:** `md` (0.75rem).
- **Icons:** Use `on_surface_variant` for leading icons to keep the focus on user input.

### Cards & Lists
- **The No-Divider Rule:** Never use horizontal line dividers. Separate list items using `8px` of vertical whitespace or alternating `surface` and `surface_container_low` backgrounds.
- **Rounding:** All job cards must use `xl` (1.5rem) corner radius for a soft, premium feel.

### Selection Chips
- **Filter Chips:** `outline_variant` at 20% opacity for the container. On selection, transition to `primary` with `on_primary` text. Use `full` (9999px) rounding.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical layouts to create visual tension and an editorial look.
- **Do** utilize the `background` color (#FDFCF8) as your primary canvas—it is more sophisticated than pure white.
- **Do** prioritize large amounts of whitespace (`spacing-16` or `spacing-20`) to maintain the "Artisan" sense of luxury and space.

### Don't
- **Don't** use pure black (#000000) for text. Use `on_surface` (#1B1C1A) to keep the palette organic and integrated.
- **Don't** use standard "drop shadows" on every card. Use tonal shifts (making the card lighter/whiter than the background) to denote elevation.
- **Don't** use sharp 90-degree corners. Even the smallest components should have at least `sm` (0.25rem) rounding to maintain the "Organic" brand promise.

<!-- # Design System Document

## 1. Overview & Creative North Star: "The Editorial Artisan"

This design system is built to transform the job search experience from a chaotic marketplace into a curated, professional journey. We move away from the "app-template" look by adopting an **Editorial Artisan** approach.

The Creative North Star centers on high-end typography, intentional whitespace, and organic tones. Rather than using harsh borders and rigid grids, we use tonal depth and "breathing room" to guide the user. The aesthetic is inspired by premium physical stationery and architectural minimalism--where every element feels intentional, weighted, and bespoke.

---

## 2. Colors

Our palette is anchored in a sophisticated Olive Green (`primary: #313b15`), supported by warm, paper-like neutrals.

### Surface Hierarchy & Nesting

To move beyond standard flat UI, we utilize **Tonal Layering**. Boundaries are defined by color shifts rather than lines.

- **The "No-Line" Rule:** 1px solid borders for sectioning are prohibited. Use `surface-container-low` for background sections and `surface-container-lowest` for cards to create separation.
- **Nesting Strategy:**
  - **Base:** `background` (#faf9f5)
  - **Sections:** `surface-container` (#efeeea)
  - **Interactive Cards:** `surface-container-lowest` (#ffffff)
- **Glass & Gradient Rule:** For floating headers or action sheets, use `surface` colors at 80% opacity with a `20px` backdrop-blur.
- **Signature Textures:** For primary CTAs, use a subtle linear gradient from `primary` (#313b15) to `primary_container` (#48522a) at a 135-degree angle to add "soul" and depth.

---

## 3. Typography

The system uses **Rubik** for primary display moments and buttons, **Secular** for secondary headlines, and **Inter** for longer clinical, highly-readable body content.

| Level | Font Family | Size | Intent |
| :--- | :--- | :--- | :--- |
| **Display-LG** | `var(--font-rubik)` | 3.5rem | Primary H1 and bold editorial statements |
| **Headline-MD** | `var(--font-secular)` | 1.75rem | Secondary headlines and major section headers |
| **Title-SM** | `var(--font-rubik)` | 1rem | Card titles, buttons, and primary labels |
| **Body-MD** | Inter | 0.875rem | Standard content and job descriptions |
| **Label-SM** | `var(--font-rubik)` | 0.6875rem | Button labels, metadata, and micro-copy |

**Creative Direction:** Use dramatic scale shifts. A `Headline-LG` title next to a `Body-SM` metadata string creates a high-contrast, editorial feel that distinguishes this system from generic "Material" implementations.

---

## 4. Elevation & Depth

We avoid the "shadow-heavy" look of 2010s apps. Instead, we use light and physics to define space.

- **The Layering Principle:** Depth is achieved by "stacking" surface tiers. A `surface-container-highest` element feels closer to the user than a `surface-container-low` element.
- **Ambient Shadows:** Only use shadows for floating elements (e.g., FAB, Modals). Use the `on-surface` color (#1b1c1a) at 4% opacity with a 24px blur and a 4px Y-offset. This mimics soft, natural gallery lighting.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (#c7c7ba) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons

- **Primary:** `primary` background with `on_primary` text. `xl` (1.5rem) rounded corners. Use the signature gradient texture.
- **Secondary:** `secondary_fixed` background. No border.
- **Tertiary:** Transparent background, `primary` text, medium weight.

### Input Fields

- **Styling:** Use `surface_container_low` for the fill. Avoid borders; use a bottom-weighted `primary` indicator only on focus.
- **Corners:** `md` (0.75rem).
- **Icons:** Use `on_surface_variant` for leading icons to keep the focus on user input.

### Cards & Lists

- **The No-Divider Rule:** Never use horizontal line dividers. Separate list items using `8px` of vertical whitespace or alternating `surface` and `surface_container_low` backgrounds.
- **Rounding:** All job cards must use `xl` (1.5rem) corner radius for a soft, premium feel.

### Selection Chips

- **Filter Chips:** `outline_variant` at 20% opacity for the container. On selection, transition to `primary` with `on_primary` text. Use `full` (9999px) rounding.

---

## 6. Do's and Don'ts

### Do

- **Do** use asymmetrical layouts. For example, left-align a headline but right-align the call to action to create visual tension.
- **Do** utilize the `primary_fixed` (#dce8b3) color for low-priority highlights--it provides the "olive" brand feel without being heavy.
- **Do** prioritize large amounts of whitespace (`spacing-16` or `spacing-20`) between major content blocks.

### Don't

- **Don't** use pure black (#000000) for text. Always use `on_surface` (#1b1c1a) to maintain the soft, editorial tone.
- **Don't** use standard "drop shadows." If an element needs to pop, use a tonal background shift or a blur-heavy ambient shadow.
- **Don't** use sharp 90-degree corners. Even the smallest components should have at least `sm` (0.25rem) rounding to maintain the "Organic" brand promise. -->

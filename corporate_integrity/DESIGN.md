---
name: Corporate Integrity
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#424752'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#727784'
  outline-variant: '#c2c6d4'
  surface-tint: '#115cb9'
  primary: '#003f87'
  on-primary: '#ffffff'
  primary-container: '#0056b3'
  on-primary-container: '#bbd0ff'
  inverse-primary: '#acc7ff'
  secondary: '#526069'
  on-secondary: '#ffffff'
  secondary-container: '#d3e2ed'
  on-secondary-container: '#56656e'
  tertiary: '#3f4243'
  on-tertiary: '#ffffff'
  tertiary-container: '#57595a'
  on-tertiary-container: '#ced0d1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004491'
  secondary-fixed: '#d6e5ef'
  secondary-fixed-dim: '#bac9d3'
  on-secondary-fixed: '#0f1d25'
  on-secondary-fixed-variant: '#3b4951'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin: 48px
  max_width: 1440px
---

## Brand & Style

The design system is engineered to project stability, efficiency, and institutional trust for the Korean enterprise sector. The brand personality is "The Reliable Partner"—authoritative yet accessible, focusing on clarity over decoration. 

The aesthetic is **Corporate Modern**, prioritizing a high-density information display that remains legible and organized. By utilizing a flat design base with strategic depth through soft shadows, the system ensures a familiar, professional interface that reduces cognitive load for power users in a business productivity context.

## Colors

The palette is anchored by a deep blue to evoke traditional business trust and Korean corporate excellence. 

- **Primary (#0056b3):** Used for primary actions, active states, and brand-critical elements.
- **Secondary (#E3F2FD):** A light sky blue used for subtle backgrounds, hover states on large areas, and categorized tags.
- **Neutral/Surface:** A progression of grays (#F8F9FA, #DEE2E6, #ADB5BD) provides structure.
- **Success/Error/Warning:** Standard semantic colors should be adjusted to match the saturation of the primary blue to maintain visual harmony.

## Typography

This design system utilizes **Manrope** for headlines to provide a modern, refined geometric feel that remains professional. **Inter** is used for body text and labels due to its exceptional legibility and systematic performance, especially when paired with Korean glyphs (Pretendard or Noto Sans KR should be used as the fall-back font for CJK characters to maintain visual weight parity).

Line heights are slightly increased to accommodate the vertical complexity of Korean characters, ensuring that dense data tables and long-form documents remain readable.

## Layout & Spacing

The system employs a **Fixed Grid** philosophy for desktop layouts to ensure consistency across various business modules. 

- **Grid:** A 12-column system with a 24px gutter. 
- **Rhythm:** An 8pt spacing system (with 4px increments for tight components) governs all padding and margins. 
- **Alignment:** Content is generally left-aligned to accommodate standard reading patterns. Data-heavy views should utilize maximum horizontal space while maintaining side margins of 48px to prevent visual crowding at the edges of the screen.

## Elevation & Depth

Visual hierarchy is established through a combination of **Tonal Layering** and **Ambient Shadows**. 

1.  **Base Layer:** White (#FFFFFF) for the primary content canvas.
2.  **Surface Layer:** Light Gray (#F8F9FA) for navigation sidebars or background groupings.
3.  **Raised State:** Elements like cards or dropdowns use a very soft, diffused shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
4.  **Overlay State:** Modals and high-priority popovers use a more defined shadow: `0 12px 32px rgba(0, 0, 0, 0.1)`.

Borders are used sparingly to define structure without adding visual noise, typically using 1px solid #DEE2E6.

## Shapes

The design system utilizes **Soft** roundedness to strike a balance between a rigorous professional tool and a modern web application.

- **Standard (4px):** Used for buttons, input fields, and small UI widgets.
- **Large (8px):** Used for cards, containers, and modals.
- **Extra Large (12px):** Used for primary hero containers or distinct dashboard segments.

This subtle rounding softens the "industrial" feel of a business platform while maintaining a crisp, grid-aligned silhouette.

## Components

- **Buttons:** Primary buttons use the deep blue (#0056b3) with white text. Secondary buttons use a ghost style with a 1px border or the light sky blue background. 
- **Inputs:** Clean, 1px bordered fields that transition to a 2px primary blue border on focus. Labels are always positioned above the field for clarity.
- **Chips/Tags:** Used for status (e.g., "In Progress," "Approved"). They utilize the secondary sky blue background with darkened text for contrast.
- **Data Tables:** The core of the productivity suite. High-density with 1px horizontal dividers only. Header rows use a light gray (#F8F9FA) background with semibold labels.
- **Cards:** White background with an 8px corner radius and a subtle 1px border or a soft shadow (but not both) to indicate interactivity.
- **Search:** A prominent, global search bar with a secondary blue tint or light gray background to make it easily discoverable in the header.
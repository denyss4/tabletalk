---
name: TableTalk
description: A precise, calm receipt-splitting interface for auditable shared totals.
colors:
  ledger-green: "#116a51"
  ledger-green-hover: "#0e5944"
  ledger-green-deep: "#153e34"
  paper: "#f4f5f7"
  surface: "#ffffff"
  ink: "#19232d"
  secondary-surface: "#edf1f2"
  secondary-ink: "#263641"
  muted-surface: "#f1f3f4"
  muted-ink: "#5b6b76"
  border: "#dfe4e7"
  soft-accent: "#e0eee8"
  accent-ink: "#184d3c"
  focus: "#54a896"
  destructive: "#af3b34"
  warning-surface: "#fff6df"
  warning-ink: "#594414"
  settled-surface: "#e3f3ea"
  settled-ink: "#256340"
  voice-action: "#eef5b4"
  voice-action-hover: "#f5facd"
  voice-action-ink: "#24392e"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "clamp(30px, 3vw, 42px)"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-1.2px"
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.7px"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.6px"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "1.15px"
rounded:
  compact: "5px"
  choice: "6px"
  field: "7px"
  control: "8px"
  dialog: "12px"
  voice: "15px"
  surface: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-green}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "11px 23px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ledger-green-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "11px 15px"
    height: "44px"
  button-voice:
    backgroundColor: "{colors.voice-action}"
    textColor: "{colors.voice-action-ink}"
    rounded: "{rounded.control}"
    padding: "11px"
    height: "44px"
    width: "100%"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  owner-choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.choice}"
    padding: "5px 11px"
  status-settled:
    backgroundColor: "{colors.settled-surface}"
    textColor: "{colors.settled-ink}"
    rounded: "{rounded.compact}"
    padding: "5px 8px"
---

# Design System: TableTalk

## Overview

**Creative North Star: "The Quiet Ledger"**

TableTalk should feel like a carefully kept bill placed at the center of the table: exact, calm, and immediately legible. The interface uses cool paper neutrals, dark ledger green, compact controls, and clear structural divisions so users can verify a split without feeling that they are operating accounting software.

The visual voice is precise and calm. Density is moderate: receipt rows stay compact enough to scan as a list, while decisions and final totals receive enough space to prevent accidental taps or misreading. Components are restrained and dependable. Brand character comes from the receipt-like content structure, tabular money, and measured green palette rather than ornamental effects.

**Key Characteristics:**

- Flat, bordered surfaces with clear information hierarchy.
- Ledger green reserved for primary actions, trust, and settled states.
- Receipt rows and totals designed for quick comparison and auditability.
- Mobile-first controls with a minimum 44px touch target.
- Uncertainty shown as a visible state that requires a decision.

## Colors

The palette combines cool paper neutrals with a reserved ledger green; warning, error, and settled colors communicate state without turning the screen into a dashboard.

### Primary

- **Ledger Green** (`ledger-green`): primary buttons, progress, focus-related emphasis, and trusted action states.
- **Deep Ledger Green** (`ledger-green-deep`): the voice panel and strongest branded surface.
- **Soft Ledger Wash** (`soft-accent`): quiet selection and supporting emphasis.

### Secondary

- **Voice Slip** (`voice-action`): the high-contrast action inside the dark voice panel.
- **Settled Mint** (`settled-surface`): completion status after every item reconciles.
- **Clarification Paper** (`warning-surface`): ambiguity and receipt details that still need confirmation.

### Neutral

- **Cool Paper** (`paper`): the page canvas.
- **Clean Receipt** (`surface`): panels, fields, dialogs, and receipt content.
- **Ledger Ink** (`ink`): primary text and amounts.
- **Quiet Ink** (`muted-ink`): explanatory copy, evidence labels, and unfinished totals.
- **Rule Line** (`border`): panel outlines, dividers, and field strokes.

### Named Rules

**The Reserved Green Rule.** Use ledger green for actions, verified progress, and state that earns trust; do not use it as general decoration.

**The Explicit Uncertainty Rule.** Warning paper, destructive red, and settled mint represent distinct states and must never be substituted for one another.

## Typography

**Display Font:** Arial with Helvetica and sans-serif fallbacks.
**Body Font:** Arial with Helvetica and sans-serif fallbacks.

**Character:** A familiar utility sans keeps recognition, ownership, and totals easy to scan. Hierarchy comes from scale, weight, restrained negative tracking, and tabular numerals rather than a decorative type pairing.

### Hierarchy

- **Display** (`display`): the single page heading; balanced and compact enough for narrow screens.
- **Headline** (`headline`): merchant names and receipt-level identity.
- **Title** (`title`): the voice prompt and other prominent task instructions.
- **Body** (`body`): instructions and general interface copy; descriptive paragraphs stay within roughly 70 characters per line.
- **Label** (`label`): compact metadata and printed-row counts; uppercase is reserved for real metadata, not decorative kickers.
- **Amounts:** use tabular numerals, right alignment, and stable no-wrap treatment wherever people compare money.

### Named Rules

**The Ledger Number Rule.** Every monetary total uses tabular numerals and remains visually anchored when values change.

**The One Heading Rule.** Each surface gets one clear heading; do not add decorative eyebrows above page-level headings.

## Layout

The desktop shell is centered at a maximum width of 1280px with 48px side padding. The work area uses two unequal columns with a 24px gap: the receipt is slightly wider than the allocation and totals column. Panels align to the top so receipt growth never forces unrelated content into vertical centering.

At 900px and below, the workspace becomes one column with a maximum content width of 720px and 24px page padding. At 640px and below, page padding becomes 16px plus device safe-area insets. The people panel precedes the voice action on mobile, interactive controls reach at least 44px, and flexible labels wrap without displacing monetary totals.

Spacing follows a compact ledger rhythm: 4–12px inside control groups, 16–24px inside surfaces, and 24–48px between major regions. Receipt rows use structural dividers and consistent vertical padding rather than independent cards.

## Elevation & Depth

The system is flat with structural borders. White receipt surfaces sit on cool paper and are separated by one-pixel rules, background tone, and spacing. Shadows are exceptional and functional: the tilted receipt thumbnail gets a small physical shadow, while the dialog receives standard platform elevation to establish protected focus.

### Shadow Vocabulary

- **Receipt slip** (`0 2px 4px #0002`): only for the small rotated photo thumbnail.
- **Dialog lift** (`shadow-lg` from the component layer): only for modal content above the dark overlay.
- **Focus ring** (`3px solid focus`, offset `3px`): keyboard focus on every interactive element; it communicates interaction rather than depth.

### Named Rules

**The Flat Ledger Rule.** Surfaces are flat at rest. Use borders, tone, and spacing before introducing a shadow.

## Shapes

The form language uses gently curved controls and larger but still restrained surface corners. Choice chips use 5–7px corners, primary controls use 8px, dialogs use 12px, the voice surface uses 15px, and major panels use 16px. Avatars are the only circular elements and exist solely to identify people.

Borders stay one pixel and cool gray. Dashed rules are reserved for receipt accounting boundaries. The slight five-degree rotation of the photo thumbnail is the only intentionally irregular silhouette.

## Components

### Buttons

Buttons feel restrained and dependable.

- **Shape:** compact rounded rectangle (`control`), never pill-shaped.
- **Primary:** ledger green with white text, a minimum height of 44px, and medium-to-semibold weight.
- **Hover / Focus:** hover deepens the green; keyboard focus uses the shared teal ring; active state moves down by 1px.
- **Secondary:** white surface, cool border, and green text for evidence export and lower-priority actions.
- **Quiet:** text-led and underlined where the action is contextual rather than primary.
- **Voice:** pale yellow-green on the deep ledger panel, full width, and centered.

### Chips

Owner choices are compact outlined controls that sit directly under their receipt row. Unselected choices use a white surface and quiet ink. Selected choices use the assigned person's tint and stronger text; a check icon appears only for a single owner. Shared ownership uses the same geometry and a people icon.

### Cards / Containers

- **Corner Style:** gently rounded major surfaces (`surface`).
- **Background:** clean receipt white over cool paper.
- **Shadow Strategy:** flat by default, following the Flat Ledger Rule.
- **Border:** one-pixel rule line.
- **Internal Padding:** normally 19–25px, reduced only where row density is essential.

### Inputs / Fields

- **Style:** white field, one-pixel cool border, `field` radius, and 16px text to prevent mobile zoom.
- **Focus:** shared three-pixel teal focus ring with offset.
- **Error:** destructive border and a linked alert message; focus moves to the first invalid field.
- **Disabled:** retains structure at reduced opacity and removes the active cursor.

### Navigation

The top bar is a single-level product header. The receipt-shaped brand mark, wordmark, and compact scope label form one horizontal line. The edition label disappears below 900px; the product name and language/currency scope remain visible.

### Voice Panel

The deep ledger panel is the signature action surface. It contains one short instruction, one concrete spoken example, one full-width voice button, and quiet upload/sample fallbacks. Recording changes the action color and adds one pulse animation; reduced-motion settings remove that animation.

### Receipt Ledger

Each printed unit occupies one row with its amount anchored at the right. Ownership controls remain inside that row, repeated items retain numbered identities, and unresolved recognition uses clarification paper. The total area separates subtotal, proportional service, and receipt total with accounting-style rules.

## Do's and Don'ts

### Do:

- **Do** make the allocation and settlement state understandable within one scan.
- **Do** use stable item identities and tabular, right-aligned money.
- **Do** reserve the strongest green surface for the voice action and trusted primary actions.
- **Do** keep touch targets at least 44px and preserve safe-area padding on narrow devices.
- **Do** use warning, error, loading, disabled, and settled states with explicit recovery or next actions.

### Don't:

- **Don't** present unresolved allocations or uncertain receipt values as complete.
- **Don't** add shadows, gradients, glass effects, or decorative cards where a border and spacing explain the structure.
- **Don't** turn every receipt row or metric into an independent card.
- **Don't** use pills for primary controls or status-heavy dashboard decoration.
- **Don't** introduce decorative headings, step numbers, or ornamental labels that compete with the current task.
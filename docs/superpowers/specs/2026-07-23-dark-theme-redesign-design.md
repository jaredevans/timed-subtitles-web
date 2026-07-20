# Dark Theme Redesign — Design

**Date:** 2026-07-23
**Status:** Approved

## Purpose

Restyle the app to a modern, sleek dark theme. Pure visual work: no behavior,
layout-structure, or logic changes. Existing tests stay green untouched.

## Approach

CSS-only restyle built on design tokens (CSS custom properties), plus minor
className/markup tweaks in components only where the design needs a hook.
No new npm dependencies. Rejected: Tailwind (full markup rewrite for a
4-component app) and component libraries (too few widgets to justify).

## Foundation (`src/index.css`)

- `color-scheme: dark`.
- Token block on `:root`:
  - `--bg: #0f1117` (page), `--surface: #171a23` (cards),
    `--surface-2: #1f2330` (inputs/buttons), `--border: rgba(255,255,255,.08)`
  - `--text: #e5e7ef`, `--text-dim: #9aa1b5`
  - `--accent: #818cf8` (indigo), `--green: #34d399`, `--red: #f87171`,
    `--amber: #fbbf24` (overlap warnings)
  - `--radius: 12px`; one soft layered shadow token
- Typography: keep the system-ui stack; slightly tighter heading weight and
  letter-spacing; keep `tabular-nums` for time displays.

## Layout & chrome (`src/App.css`)

- Grid layout unchanged (3fr/2fr, 1-column under 900px).
- Header: slim sticky bar, frosted-glass blur (`backdrop-filter`), subtle
  bottom border.
- Panels — video area, timing controls, setup panel, line list — become
  rounded cards: `--surface`, 1px `--border`, soft shadow, consistent padding.

## Controls

- Shared button base: rounded, `--surface-2`, 1px border, hover lift
  (slight brightness/translate), visible indigo focus ring
  (`:focus-visible`), disabled at reduced opacity.
- Filled primary actions: "Start timing" indigo; capture "Start" green,
  "End" red (dark text on filled backgrounds for contrast).
- "Reset all": quiet ghost button with red text/border on hover (danger
  affordance). Confirm banners (`.confirm-reset`): inline pill with
  red-tinted background.
- Inputs and textarea: `--surface-2` background, 1px border, indigo focus
  border, `--text` color.

## States

- Active line: 3px indigo left-edge bar + indigo-tinted background.
- Timed (done) lines: `--green` text, as today.
- Hover rows: subtle surface lightening.
- Errors: `--red`; overlap warnings: `--amber`; privacy notes: muted green.
- Video placeholder: dashed drop-zone card.
- Line list: slim custom scrollbar (`::-webkit-scrollbar` + fallback).
- Transitions ~150ms on hover/focus states only.

## Component tweaks (markup)

Only className additions/wrappers where CSS needs a hook (e.g. a `card`
class on panels). No prop, state, or logic changes in any component.

## Testing

- All existing unit tests pass unchanged (`npm test`, 25 tests).
- `npm run build` (tsc + vite) clean.
- Browser screenshot verification of setup and timing phases (with video
  loaded) to confirm the visual result.

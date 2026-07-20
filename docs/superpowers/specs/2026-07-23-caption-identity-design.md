# Broadcast-Caption Identity Pass — Design

**Date:** 2026-07-23
**Status:** Approved (direction A; refined via frontend-design skill critique)

## Purpose

Give the dark theme a distinctive identity grounded in the app's subject —
captioning. One signature element (an on-screen caption band), real
typography, and a consistent captioning vocabulary. Visual + copy only: no
logic, prop, or state changes; the 25-test suite stays green untouched.

## Token system

Palette (unchanged from the dark theme, plus the band):

| Token | Value | Role |
|---|---|---|
| Studio black | `#0f1117` | page (existing `--bg`) |
| Panel slate | `#171a23` | cards (existing `--surface`) |
| Control slate | `#1f2330` | inputs/buttons (existing `--surface-2`) |
| Cue indigo | `#818cf8` | interactive accent (existing `--accent`) |
| Band black | `rgba(8, 9, 12, 0.88)` | caption band background (new `--band`) |
| Caption white | `#f8f8f2` | caption band text (new `--caption`) |

Semantic colors (`--green`, `--red`, `--amber`) unchanged.

Type roles (fonts self-hosted via @fontsource, imported in `src/index.css`;
bundled by Vite — no external requests, preserving the privacy story):

- **Display — Bricolage Grotesque** (`@fontsource/bricolage-grotesque`,
  weights 600/700): wordmark `h1` and panel `h2`s only. Restraint: nowhere
  else.
- **Mono — JetBrains Mono** (`@fontsource/jetbrains-mono`, weights
  400/600): everything numeric — header progress counter, time inputs,
  captured `✓ 1.25s` readouts in the capture buttons, the caption eyebrow.
  Always with `font-variant-numeric: tabular-nums`.
- **Body — system-ui** (unchanged): all other text, including the caption
  band (see critique note).

New tokens in `:root`: `--font-display`, `--font-mono`, `--band`,
`--caption`.

## Signature: the caption band

In `TimingControls`, the current line becomes an on-screen caption preview,
directly under the video:

- Eyebrow above the band: `CAPTION 1 OF 3` — JetBrains Mono 400,
  `0.7rem`, `letter-spacing: 0.14em`, uppercase, `--text-dim`. The number
  is real sequence information, not decoration.
- The band: centered text on `--band` background, `--caption` color,
  body sans at weight 600, `1.1rem`, `padding: 0.7rem 1.2rem`,
  `border-radius: 6px`, max-width fitted to content (`width: fit-content`,
  `margin: 0.5rem auto 0`), like a subtitle rendered on screen.
- Markup: inside `TimingControls`, `.current-line` keeps its container
  role; `.line-number` becomes the eyebrow (class stays, copy changes),
  `.line-text` gets the band styling via a new class `caption-band`.

Motion (the one added moment): when the active caption changes, the band
text crossfades in (~150ms opacity). Implementation: CSS-only — a
`key={index}` on the band element remounts it per caption, and a
`@keyframes` fade plays on mount. Wrapped in
`@media (prefers-reduced-motion: no-preference)`.

## Microcopy — captioning vocabulary

The app commits to the word "caption" everywhere; sentence case; active
verbs; an action keeps its name through the flow.

| Location | Current | New |
|---|---|---|
| Header counter | `2 / 5 lines timed` | `2 / 5 captions timed` |
| Line list heading | `Lines` | `Captions` |
| Timing eyebrow | `Line 1 of 3` | `CAPTION 1 OF 3` (uppercase via CSS; source text `Caption 1 of 3`) |
| Capture buttons | `Start` / `End` | `Mark start` / `Mark end` (captured readouts `✓ 1.25s` keep appended form) |
| End-time error | `End time must be after the start time — keep playing, then click End.` | `The end must come after the start — keep playing, then mark the end.` |
| Setup hint | `Paste your transcript — sentences are split one per row.` | `Paste your transcript — each sentence becomes a caption.` |
| Textarea placeholder | `First subtitle line\nSecond subtitle line\n…` | `First caption\nSecond caption\n…` |
| Confirm (Reset all) | `Clears the video and transcript.` | unchanged |
| Reset-timings confirm | `Resets all timings.` | unchanged |

Copy lives in component JSX; changes are text-only.

## Critique record (frontend-design skill)

- Band typeface revised mono → body sans 600: broadcast captions are sans;
  mono would read "terminal," and long captions set in mono lose
  readability. Mono is reserved for timecode data, where it is
  subject-true.
- Dark-with-one-accent base is adjacent to a known AI-default look; kept
  because the prior approved spec pins the dark indigo theme (the brief
  wins). Identity divergence carried by the band, timecode mono, true
  sequence eyebrows, and vocabulary.
- Eyebrow numbering kept: captions are a real ordered sequence.
- No further decoration: boldness is spent on the band alone.

## Quality floor

- `prefers-reduced-motion` respected for the band fade.
- Existing keyboard focus rings, responsive grid, and AA contrast retained;
  caption white on band black is high-contrast by construction.

## Files touched

- `package.json`: add `@fontsource/bricolage-grotesque`,
  `@fontsource/jetbrains-mono` (the only new dependencies; both
  build-time, self-hosted).
- `src/index.css`: font imports, new tokens.
- `src/App.css`: type-role assignments, caption band + eyebrow styles,
  fade keyframes.
- `src/components/TimingControls.tsx`: eyebrow/band markup + copy.
- `src/components/LineList.tsx`, `src/components/SetupPanel.tsx`,
  `src/App.tsx`: copy strings only.

## Testing

- `npm test` (25 tests) passes unchanged; `npm run build` clean.
- Browser verification: band renders under video, crossfade on caption
  change, mono timecodes, display face on headings, all copy updated.

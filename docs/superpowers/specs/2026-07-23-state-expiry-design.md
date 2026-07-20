# Saved-State Expiry — Design

**Date:** 2026-07-23
**Status:** Approved

## Purpose

Transcripts persisted in localStorage currently survive indefinitely, so on
a shared machine the next person sees the previous person's transcript
auto-restored (security review advisory). Add a 30-minute sliding expiry:
active work keeps refreshing the clock; 30+ minutes of inactivity clears
the saved state. Only the resume feature expires — exported files are
unaffected.

## Behavior

- Every `saveState` write stamps the payload with `savedAt` (epoch ms).
  The app already saves on every change, which makes the expiry sliding.
- `loadState` returns the state only if `Date.now() - savedAt` is
  ≤ 30 minutes. Otherwise (expired, missing, or invalid `savedAt` —
  including legacy pre-expiry payloads) it removes the stored entry and
  returns `null`, so the app boots into a pristine setup phase.
- `STATE_EXPIRY_MS = 30 * 60 * 1000`, defined beside the storage key in
  `src/lib/storage.ts`.

## Interface

- Public `SavedState` stays `{ lines, activeIndex }`; `App.tsx` and all
  components are untouched. No UI changes.
- Internal `StoredState = SavedState & { savedAt: number }`.
  `deserializeState` validates `savedAt` as a number (like the existing
  field checks) and returns `StoredState | null`; `loadState` applies the
  expiry and returns `SavedState | null`.

## Testing (TDD, `src/lib/storage.test.ts`)

Vitest fake timers (`vi.setSystemTime`):
- load within 30 minutes returns the state
- load at 30+ minutes returns `null` AND removes the localStorage key
- legacy JSON without `savedAt` returns `null` and clears the entry
- `deserializeState` rejects non-numeric `savedAt`
- existing tests updated to include `savedAt` in fixtures; full suite green

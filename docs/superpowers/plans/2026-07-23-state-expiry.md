# Saved-State Expiry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saved timing state expires 30 minutes after the last edit, so transcripts don't linger on shared machines.

**Architecture:** Storage-module-only change: `saveState` stamps `savedAt` on every write (sliding expiry, since the app saves on every change); `loadState` clears and returns `null` for expired, legacy, or invalid payloads. Public `SavedState` and all components unchanged.

**Tech Stack:** TypeScript, Vitest fake timers, `vi.stubGlobal` localStorage mock (tests run in Node).

**Spec:** `docs/superpowers/specs/2026-07-23-state-expiry-design.md`

## Global Constraints

- No new dependencies; no changes outside `src/lib/storage.ts` and `src/lib/storage.test.ts`.
- `STATE_EXPIRY_MS = 30 * 60 * 1000`, exported, defined beside the storage key.
- Public `SavedState` stays `{ lines, activeIndex }`; `App.tsx` untouched.
- Legacy payloads without `savedAt` are treated as expired: cleared and `null`.
- Expired/invalid loads must REMOVE the stored entry, not just return `null`.
- TDD: failing tests first. `npm test` and `npm run build` must pass before committing.
- All commands run from the repo root: `/Users/jared/github_projects/timed-subtitles-web`.

---

### Task 1: Expiring storage

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts` (full replace)

**Interfaces:**
- Consumes: existing `SubtitleLine` type from `../types`.
- Produces: `STATE_EXPIRY_MS: number` (exported const); `deserializeState(json: string): StoredState | null` where internal `StoredState = SavedState & { savedAt: number }`; `loadState(): SavedState | null`; `saveState(state: SavedState): void`; `clearState(): void` (unchanged). No consumer changes: `App.tsx` already calls `loadState`/`saveState`/`clearState` with these exact shapes.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/lib/storage.test.ts` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deserializeState, loadState, saveState, STATE_EXPIRY_MS } from './storage';

const KEY = 'timed-subtitles-state-v1';

function localStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock());
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-23T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const state = {
  lines: [{ text: 'a', start: 1.5, end: null }],
  activeIndex: 0,
};

describe('deserializeState', () => {
  it('round-trips a valid stored state', () => {
    const stored = { ...state, savedAt: 1000 };
    expect(deserializeState(JSON.stringify(stored))).toEqual(stored);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeState('not json')).toBeNull();
  });

  it('returns null when the shape is wrong', () => {
    expect(deserializeState(JSON.stringify({ lines: 'nope', activeIndex: 0 }))).toBeNull();
    expect(deserializeState(JSON.stringify({ lines: [], activeIndex: 'x' }))).toBeNull();
    expect(
      deserializeState(
        JSON.stringify({ lines: [{ text: 5, start: null, end: null }], activeIndex: 0, savedAt: 1 }),
      ),
    ).toBeNull();
  });

  it('returns null when savedAt is missing or not a number', () => {
    expect(deserializeState(JSON.stringify(state))).toBeNull();
    expect(deserializeState(JSON.stringify({ ...state, savedAt: 'now' }))).toBeNull();
  });
});

describe('saveState / loadState expiry', () => {
  it('loads state saved moments ago', () => {
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it('loads state saved just under 30 minutes ago', () => {
    saveState(state);
    vi.advanceTimersByTime(STATE_EXPIRY_MS - 1000);
    expect(loadState()).toEqual(state);
  });

  it('clears and returns null past the 30-minute expiry', () => {
    saveState(state);
    vi.advanceTimersByTime(STATE_EXPIRY_MS + 1);
    expect(loadState()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('re-saving slides the expiry window', () => {
    saveState(state);
    vi.advanceTimersByTime(STATE_EXPIRY_MS - 1000);
    saveState(state);
    vi.advanceTimersByTime(STATE_EXPIRY_MS - 1000);
    expect(loadState()).toEqual(state);
  });

  it('clears and returns null for legacy payloads without savedAt', () => {
    localStorage.setItem(KEY, JSON.stringify(state));
    expect(loadState()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — the file fails to load because `./storage` does not export `STATE_EXPIRY_MS` (all cases in the file error for this run; that is expected).

- [ ] **Step 3: Implement**

Replace the full contents of `src/lib/storage.ts` with:

```ts
import type { SubtitleLine } from '../types';

export interface SavedState {
  lines: SubtitleLine[];
  activeIndex: number;
}

type StoredState = SavedState & { savedAt: number };

const KEY = 'timed-subtitles-state-v1';

// Sliding expiry: saveState re-stamps savedAt on every write, so this is
// 30 minutes since the last edit, not since the session began.
export const STATE_EXPIRY_MS = 30 * 60 * 1000;

function isSubtitleLine(value: unknown): value is SubtitleLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.text === 'string' &&
    (typeof line.start === 'number' || line.start === null) &&
    (typeof line.end === 'number' || line.end === null)
  );
}

export function deserializeState(json: string): StoredState | null {
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    const state = data as Record<string, unknown>;
    if (!Array.isArray(state.lines) || typeof state.activeIndex !== 'number') return null;
    if (typeof state.savedAt !== 'number') return null;
    if (!state.lines.every(isSubtitleLine)) return null;
    return { lines: state.lines, activeIndex: state.activeIndex, savedAt: state.savedAt };
  } catch {
    return null;
  }
}

export function loadState(): SavedState | null {
  const json = localStorage.getItem(KEY);
  if (json === null) return null;
  const stored = deserializeState(json);
  if (stored === null || Date.now() - stored.savedAt > STATE_EXPIRY_MS) {
    clearState();
    return null;
  }
  return { lines: stored.lines, activeIndex: stored.activeIndex };
}

export function saveState(state: SavedState): void {
  localStorage.setItem(KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
}

export function clearState(): void {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Full suite, build, commit**

Run: `npm test`
Expected: PASS — 4 files, 31 tests.

Run: `npm run build`
Expected: tsc and vite build succeed.

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: expire saved timing state 30 minutes after last edit"
```

---

### Controller follow-up (not a subagent task)

Browser verification: with the dev server, paste + start timing, confirm state restores on reload; then set the stored `savedAt` back 31 minutes via devtools JS and reload — app must boot into setup with the localStorage key removed.

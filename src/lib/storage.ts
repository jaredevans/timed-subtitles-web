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

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

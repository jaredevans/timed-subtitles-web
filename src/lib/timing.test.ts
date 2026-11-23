import { describe, expect, it } from 'vitest';
import { clearTimings, linesToTranscript, nextCaptionIndex } from './timing';
import type { SubtitleLine } from '../types';

function timed(text: string): SubtitleLine {
  return { text, start: 1, end: 2 };
}

function untimed(text: string): SubtitleLine {
  return { text, start: null, end: null };
}

describe('nextCaptionIndex', () => {
  it('advances to the next caption when untimed captions follow', () => {
    const lines = [timed('a'), untimed('b'), untimed('c')];
    expect(nextCaptionIndex(lines, 0)).toBe(1);
  });

  it('advances to the next caption even when subsequent captions are already timed', () => {
    const lines = [timed('a'), timed('b'), timed('c')];
    expect(nextCaptionIndex(lines, 0)).toBe(1);
    expect(nextCaptionIndex(lines, 1)).toBe(2);
  });

  it('advances sequentially rather than jumping backward to an earlier untimed caption', () => {
    const lines = [untimed('a'), timed('b'), timed('c')];
    expect(nextCaptionIndex(lines, 1)).toBe(2);
  });

  it('wraps to the first untimed caption after finishing the last caption', () => {
    const lines = [timed('a'), untimed('b'), timed('c')];
    expect(nextCaptionIndex(lines, 2)).toBe(1);
  });

  it('stays on the last caption when all captions are timed', () => {
    const lines = [timed('a'), timed('b'), timed('c')];
    expect(nextCaptionIndex(lines, 2)).toBe(2);
  });
});

describe('clearTimings', () => {
  it('clears start and end while keeping caption text', () => {
    const lines: SubtitleLine[] = [
      { text: 'First', start: 0.5, end: 2.0 },
      { text: 'Second', start: 2.5, end: null },
      { text: 'Third', start: null, end: null },
    ];
    expect(clearTimings(lines)).toEqual([
      { text: 'First', start: null, end: null },
      { text: 'Second', start: null, end: null },
      { text: 'Third', start: null, end: null },
    ]);
  });
});

describe('linesToTranscript', () => {
  it('joins caption text into newline-separated transcript lines', () => {
    const lines = [timed('First line.'), timed('Second line.')];
    expect(linesToTranscript(lines)).toBe('First line.\nSecond line.');
  });
});

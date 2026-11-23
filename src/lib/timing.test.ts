import { describe, expect, it } from 'vitest';
import {
  clearTimings,
  findCaptionIndexAtTime,
  findPlayingCaptionIndex,
  linesToTranscript,
  nextCaptionIndex,
} from './timing';
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

describe('findCaptionIndexAtTime', () => {
  const lines: SubtitleLine[] = [
    { text: 'First', start: 1, end: 4 },
    { text: 'Second', start: 5, end: 8 },
    { text: 'Third', start: 8, end: 12 },
    { text: 'Fourth', start: null, end: null },
  ];

  it('returns the caption covering the timestamp', () => {
    expect(findCaptionIndexAtTime(lines, 1)).toBe(0);
    expect(findCaptionIndexAtTime(lines, 2.5)).toBe(0);
    expect(findCaptionIndexAtTime(lines, 6)).toBe(1);
    expect(findCaptionIndexAtTime(lines, 10)).toBe(2);
  });

  it('prefers the starting caption on an adjacent end/start boundary', () => {
    expect(findCaptionIndexAtTime(lines, 8)).toBe(2);
  });

  it('matches an exact end timestamp when no next caption starts there', () => {
    expect(findCaptionIndexAtTime(lines, 4)).toBe(0);
    expect(findCaptionIndexAtTime(lines, 12)).toBe(2);
  });

  it('picks the next upcoming timed caption when seeking before or between captions', () => {
    expect(findCaptionIndexAtTime(lines, 0)).toBe(0);
    expect(findCaptionIndexAtTime(lines, 4.5)).toBe(1);
  });

  it('picks the next untimed caption (or last timed caption) when seeking past all timed captions', () => {
    expect(findCaptionIndexAtTime(lines, 14)).toBe(3);
    expect(findCaptionIndexAtTime(lines.slice(0, 3), 14)).toBe(2);
  });

  it('returns null when no captions are timed yet', () => {
    expect(findCaptionIndexAtTime([], 5)).toBeNull();
    expect(findCaptionIndexAtTime([untimed('a'), untimed('b')], 5)).toBeNull();
    expect(findCaptionIndexAtTime([{ text: 'a', start: 1, end: null }], 5)).toBeNull();
  });
});

describe('findPlayingCaptionIndex', () => {
  const lines: SubtitleLine[] = [
    { text: 'First', start: 1, end: 4 },
    { text: 'Second', start: 5, end: 8 },
    { text: 'Third', start: 8, end: 12 },
    { text: 'Fourth', start: null, end: null },
  ];

  it('matches captions strictly within [start, end)', () => {
    expect(findPlayingCaptionIndex(lines, 1)).toBe(0);
    expect(findPlayingCaptionIndex(lines, 3.99)).toBe(0);
    expect(findPlayingCaptionIndex(lines, 5)).toBe(1);
    expect(findPlayingCaptionIndex(lines, 8)).toBe(2);
    expect(findPlayingCaptionIndex(lines, 11.5)).toBe(2);
  });

  it('returns null before, between, at exact end, or after timed captions', () => {
    expect(findPlayingCaptionIndex(lines, 0.5)).toBeNull();
    expect(findPlayingCaptionIndex(lines, 4)).toBeNull();
    expect(findPlayingCaptionIndex(lines, 4.5)).toBeNull();
    expect(findPlayingCaptionIndex(lines, 12)).toBeNull();
    expect(findPlayingCaptionIndex(lines, 15)).toBeNull();
  });

  it('prefers the latest starting caption when intervals overlap', () => {
    const overlapping: SubtitleLine[] = [
      { text: 'A', start: 1, end: 5 },
      { text: 'B', start: 4, end: 8 },
    ];
    expect(findPlayingCaptionIndex(overlapping, 3)).toBe(0);
    expect(findPlayingCaptionIndex(overlapping, 4.5)).toBe(1);
  });
});

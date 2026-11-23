import type { SubtitleLine } from '../types';

/**
 * Advances to the next caption after marking an end time.
 * Always moves to `from + 1` when another caption follows (even during a
 * re-timing pass where later captions already have timestamps). When at the
 * last caption, wraps to the first remaining untimed caption if any exist.
 */
export function nextCaptionIndex(lines: readonly SubtitleLine[], from: number): number {
  if (lines.length === 0) return 0;
  if (from + 1 < lines.length) return from + 1;
  for (let i = 0; i < from; i++) {
    if (lines[i].start === null || lines[i].end === null) return i;
  }
  return from;
}

export function clearTimings(lines: readonly SubtitleLine[]): SubtitleLine[] {
  return lines.map((l) => ({ text: l.text, start: null, end: null }));
}

export function linesToTranscript(lines: readonly SubtitleLine[]): string {
  return lines.map((l) => l.text).join('\n');
}

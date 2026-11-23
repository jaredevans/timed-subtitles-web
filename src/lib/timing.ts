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

/**
 * Finds the caption index corresponding to a video timestamp after a seek:
 * 1. A timed caption covering `timeSec` (`start <= timeSec < end`, or
 *    `timeSec === end` if no half-open interval matches).
 * 2. Otherwise, the next timed caption starting after `timeSec`.
 * 3. Otherwise (past the last timed caption), the following untimed caption if
 *    one exists, or the last timed caption itself.
 *
 * Returns `null` when no captions have been timed yet.
 */
export function findCaptionIndexAtTime(
  lines: readonly SubtitleLine[],
  timeSec: number,
): number | null {
  if (!Number.isFinite(timeSec) || lines.length === 0) return null;

  let exactEndMatch: number | null = null;
  let nextTimedAfter: number | null = null;
  let lastTimedIndex: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const { start, end } = lines[i];
    if (start === null || end === null) continue;

    lastTimedIndex = i;

    if (timeSec >= start && timeSec < end) {
      return i;
    }
    if (timeSec === end && exactEndMatch === null) {
      exactEndMatch = i;
    }
    if (start > timeSec && nextTimedAfter === null) {
      nextTimedAfter = i;
    }
  }

  if (exactEndMatch !== null) return exactEndMatch;
  if (nextTimedAfter !== null) return nextTimedAfter;
  if (lastTimedIndex === null) return null;

  return lastTimedIndex + 1 < lines.length ? lastTimedIndex + 1 : lastTimedIndex;
}

/**
 * Finds the caption index actively covering `timeSec` during video playback
 * (`start <= timeSec < end`). Returns `null` when no timed caption covers
 * `timeSec` (e.g. gaps between captions or untimed regions).
 */
export function findPlayingCaptionIndex(
  lines: readonly SubtitleLine[],
  timeSec: number,
): number | null {
  if (!Number.isFinite(timeSec) || lines.length === 0) return null;

  let match: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const { start, end } = lines[i];
    if (start !== null && end !== null && timeSec >= start && timeSec < end) {
      match = i;
    }
  }
  return match;
}

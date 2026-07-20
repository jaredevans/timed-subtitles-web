import type { SubtitleLine } from '../types';

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function formatSrtTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export function generateSrt(lines: SubtitleLine[]): string {
  const entries = lines.map((line, i) => {
    if (line.start === null || line.end === null) {
      throw new Error(`Line ${i + 1} is missing a start or end time`);
    }
    return `${i + 1}\n${formatSrtTime(line.start)} --> ${formatSrtTime(line.end)}\n${line.text}`;
  });
  return entries.join('\n\n') + '\n';
}

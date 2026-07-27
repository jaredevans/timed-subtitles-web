import type { SubtitleLine } from '../types';
import { formatTimecode } from './timecode';

export function formatSrtTime(seconds: number): string {
  return formatTimecode(seconds, ',');
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

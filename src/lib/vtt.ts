import type { SubtitleLine } from '../types';
import { formatTimecode } from './timecode';

export function formatVttTime(seconds: number): string {
  return formatTimecode(seconds, '.');
}

// WebVTT parses cue text as markup (<i>, <c.loud>), so these characters are
// encoded to keep transcript text literal. `&` must go first — replacing `<`
// first would turn the resulting `&lt;` into `&amp;lt;`. Encoding `>` also
// defuses a literal `-->` in the text, which would otherwise be read as a
// cue timing line.
function escapeCueText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateVtt(lines: SubtitleLine[]): string {
  const cues = lines.map((line, i) => {
    if (line.start === null || line.end === null) {
      throw new Error(`Line ${i + 1} is missing a start or end time`);
    }
    return `${i + 1}\n${formatVttTime(line.start)} --> ${formatVttTime(line.end)}\n${escapeCueText(line.text)}`;
  });
  return 'WEBVTT\n\n' + cues.join('\n\n') + '\n';
}

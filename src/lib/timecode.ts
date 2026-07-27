function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

// SRT separates milliseconds with a comma, WebVTT with a period; the rest of
// the timecode is identical, so both formats share this one implementation.
export function formatTimecode(seconds: number, msSeparator: ',' | '.'): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}${msSeparator}${pad(ms, 3)}`;
}

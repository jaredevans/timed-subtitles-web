export interface SubtitleLine {
  text: string;
  start: number | null; // seconds
  end: number | null; // seconds
}

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
}

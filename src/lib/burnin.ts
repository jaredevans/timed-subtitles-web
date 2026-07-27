// Pure helpers for the burn-in MP4 export. Kept side-effect-free so they are
// unit testable without a browser/wasm environment.

/** libass force_style string, scaled to the source height so captions are
 *  neither tiny on 4K nor oversized on 480p. ASS colours are &HAABBGGRR. */
export function burnInStyle(videoWidth: number, videoHeight: number): string {
  const fontSize = Math.round(videoHeight / 20);
  const outline = Math.max(1, Math.round(videoHeight / 540));
  const marginV = Math.round(videoHeight / 27);
  return [
    'FontName=DejaVu Sans',
    `FontSize=${fontSize}`,
    'PrimaryColour=&H00FFFFFF',
    'OutlineColour=&H00000000',
    'BorderStyle=1',
    `Outline=${outline}`,
    'Shadow=0',
    'Alignment=2',
    `MarginV=${marginV}`,
    // ffmpeg's SRT->ASS header hardcodes PlayResX 384 / PlayResY 288, and
    // libass scales every style value by frame_height / PlayResY. Pinning the
    // script resolution to the source frame is what makes the pixel-based
    // sizes above mean what they say.
    `PlayResX=${videoWidth}`,
    `PlayResY=${videoHeight}`,
  ].join(',');
}

/** ffmpeg args to burn `subs.srt` into the video with libass and re-encode.
 *  force_style is single-quoted inside the filter value: its commas would
 *  otherwise be parsed as filtergraph separators. */
export function buildBurnInArgs(
  inputName: string,
  outName: string,
  style: string,
): string[] {
  return [
    '-i', inputName,
    '-vf', `subtitles=subs.srt:fontsdir=/fonts:force_style='${style}'`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    outName,
  ];
}

/** Derive the download filename: strip the source extension, add a suffix. */
export function burnInFileName(videoName: string): string {
  const base = videoName.replace(/\.[^./\\]+$/, '').trim();
  return (base || 'video') + '-burned-in.mp4';
}

/** Rough encode-time range in whole minutes, relative to a 720p baseline.
 *  A warning device, not a prediction — the spread is wide on purpose. */
export function estimateEncodeMinutes(
  width: number,
  height: number,
  durationSec: number,
): [number, number] {
  const factor = (width * height) / (1280 * 720);
  const videoMinutes = durationSec / 60;
  const low = Math.max(1, Math.ceil(videoMinutes * factor * 3));
  const high = Math.max(low + 1, Math.ceil(videoMinutes * factor * 8));
  return [low, high];
}

/** Human-readable source duration for the confirm dialog. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

import { fetchFile } from '@ffmpeg/util';
import { loadFfmpeg, inputNameFor } from './ffmpeg-engine';

export type BurnInPhase = 'loading-engine' | 'preparing' | 'encoding' | 'done';

const FONT_DIR = '/fonts';
const FONT_FILE = `${FONT_DIR}/DejaVuSans.ttf`;

/** Burn the timed captions into the video pixels and re-encode with x264.
 *  Runs entirely in-browser; the video never leaves the machine. */
export async function exportMp4WithBurnedSubtitles(
  file: File,
  srt: string,
  videoWidth: number,
  videoHeight: number,
  onPhase?: (p: BurnInPhase) => void,
  onProgress?: (percent: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  onPhase?.('loading-engine');
  const ffmpeg = await loadFfmpeg();

  const inputName = inputNameFor(file.name);
  const handleProgress = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
  };
  ffmpeg.on('progress', handleProgress);

  try {
    onPhase?.('preparing');
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.writeFile('subs.srt', new TextEncoder().encode(srt));

    // libass has no fontconfig in this core build, so it needs a real font
    // file on disk plus an explicit family name in force_style.
    try {
      await ffmpeg.createDir(FONT_DIR);
    } catch {
      // Expected once the dir already exists (an earlier export in this
      // session created it) — this API gives no reliable errno to
      // distinguish that from a real failure, so it is not re-checked here.
      // A genuine failure (e.g. a full/broken MEMFS) surfaces on the
      // writeFile call just below instead, with a less specific message.
    }
    const fontUrl = import.meta.env.BASE_URL + 'fonts/DejaVuSans.ttf';
    await ffmpeg.writeFile(FONT_FILE, await fetchFile(fontUrl));

    onPhase?.('encoding');
    const exitCode = await ffmpeg.exec(
      buildBurnInArgs(inputName, 'output.mp4', burnInStyle(videoWidth, videoHeight)),
    );
    if (exitCode !== 0) {
      throw new Error(`ffmpeg failed to burn in subtitles (exit code ${exitCode}).`);
    }

    const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    const blob = new Blob([data], { type: 'video/mp4' });

    onPhase?.('done');
    return { blob, fileName: burnInFileName(file.name) };
  } finally {
    ffmpeg.off('progress', handleProgress);
    // Best-effort cleanup so repeat exports don't accumulate MEMFS files.
    for (const name of [inputName, 'subs.srt', 'output.mp4', FONT_FILE]) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        // ignore
      }
    }
  }
}

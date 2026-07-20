// Pure helpers for the MP4 export. Kept side-effect-free so they are unit
// testable without a browser/wasm environment.

/** Derive the download filename: strip the source extension, add a suffix. */
export function outputFileName(videoName: string): string {
  const base = videoName.replace(/\.[^./\\]+$/, '').trim();
  return (base || 'video') + '-subtitled.mp4';
}

/** ffmpeg args to remux `inputName` + `subs.srt` into `outName` with a
 *  default-on mov_text (tx3g) subtitle track. No re-encode (`-c copy`). */
export function buildFfmpegArgs(inputName: string, outName: string): string[] {
  return [
    '-i', inputName,
    '-i', 'subs.srt',
    '-c', 'copy',
    '-c:s', 'mov_text',
    '-metadata:s:s:0', 'language=eng',
    '-disposition:s:0', 'default',
    outName,
  ];
}

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type Mp4Phase = 'loading-engine' | 'muxing' | 'done';

let ffmpegSingleton: FFmpeg | null = null;

/** Load the single-threaded core once from self-hosted assets and cache it. */
async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  const ffmpeg = new FFmpeg();
  const base = import.meta.env.BASE_URL + 'ffmpeg';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  ffmpegSingleton = ffmpeg;
  return ffmpeg;
}

/** ffmpeg keys the input demuxer partly off the extension; preserve it. */
function inputNameFor(videoName: string): string {
  const m = videoName.match(/\.([^./\\]+)$/);
  const ext = m ? m[1].toLowerCase() : 'mp4';
  return `input.${ext}`;
}

/** Remux the local video + SRT into an MP4 with an embedded, default-on
 *  subtitle track. Runs entirely in-browser; the video never leaves. */
export async function exportMp4WithSubtitles(
  file: File,
  srt: string,
  onPhase?: (p: Mp4Phase) => void,
): Promise<{ blob: Blob; fileName: string }> {
  onPhase?.('loading-engine');
  const ffmpeg = await loadFfmpeg();

  const inputName = inputNameFor(file.name);
  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.writeFile('subs.srt', new TextEncoder().encode(srt));

    onPhase?.('muxing');
    const exitCode = await ffmpeg.exec(buildFfmpegArgs(inputName, 'output.mp4'));
    if (exitCode !== 0) {
      throw new Error(`ffmpeg failed to add subtitles (exit code ${exitCode}).`);
    }

    const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    const blob = new Blob([data], { type: 'video/mp4' });

    onPhase?.('done');
    return { blob, fileName: outputFileName(file.name) };
  } finally {
    // Best-effort cleanup so repeat exports don't accumulate MEMFS files.
    for (const name of [inputName, 'subs.srt', 'output.mp4']) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        /* ignore */
      }
    }
  }
}

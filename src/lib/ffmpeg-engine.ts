// Shared ffmpeg.wasm engine plumbing. Both MP4 exports go through this so the
// ~30 MB core is fetched and initialized once per session.
//
// Callers share one FFmpeg instance and one MEMFS namespace: both drivers
// (mp4.ts, burnin.ts) write and read fixed filenames (`input.<ext>`,
// `subs.srt`, `output.mp4`) rather than per-call unique names. Consequently
// only one export may run at a time, or their filesystem operations will
// collide. This is enforced today by the `exporting` lock in `App.tsx`, not
// by anything in this module.

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegSingleton: FFmpeg | null = null;

/** Load the single-threaded core once from self-hosted assets and cache it. */
export async function loadFfmpeg(): Promise<FFmpeg> {
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
export function inputNameFor(videoName: string): string {
  const m = videoName.match(/\.([^./\\]+)$/);
  const ext = m ? m[1].toLowerCase() : 'mp4';
  return `input.${ext}`;
}

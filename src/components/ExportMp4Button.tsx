import { useState } from 'react';
import { exportMp4WithSubtitles, type Mp4Phase } from '../lib/mp4';

// Soft warning threshold: the 32-bit single-threaded wasm (~2 GB address
// space) holds input + output in MEMFS, so large files risk OOM.
const LARGE_FILE_BYTES = 600 * 1024 * 1024;

const PHASE_LABEL: Record<Mp4Phase, string> = {
  'loading-engine': 'Loading engine (~30 MB)…',
  muxing: 'Muxing…',
  done: 'Done',
};

interface Props {
  videoFile: File | null;
  allTimed: boolean;
  getSrt: () => string;
}

export function ExportMp4Button({ videoFile, allTimed, getSrt }: Props) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Mp4Phase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || !allTimed || !videoFile;
  const title = !allTimed
    ? 'Time all captions to enable export'
    : !videoFile
      ? 'Re-select the video to export MP4'
      : undefined;

  async function handleClick() {
    if (!videoFile) return;
    setError(null);
    if (
      videoFile.size > LARGE_FILE_BYTES &&
      !window.confirm(
        'Large file — MP4 export may run out of browser memory. ' +
          'SRT export always works. Continue anyway?',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { blob, fileName } = await exportMp4WithSubtitles(
        videoFile,
        getSrt(),
        setPhase,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // ffmpeg.wasm failures can cross the worker boundary as non-Error values,
      // so fall back to String(e) rather than a generic message to keep the
      // real cause visible.
      const detail = e instanceof Error ? e.message : String(e);
      setError(`MP4 export failed: ${detail || 'unknown error'}`);
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  return (
    <span className="export-mp4">
      <button disabled={disabled} onClick={handleClick} title={title}>
        {busy && phase ? PHASE_LABEL[phase] : 'Export MP4'}
      </button>
      {error && (
        <span className="export-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

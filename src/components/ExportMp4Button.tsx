import { useState } from 'react';
import { exportMp4WithSubtitles, type Mp4Phase } from '../lib/mp4';
import { downloadBlob } from '../lib/download';

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
  exporting: boolean;
  setExporting: (value: boolean) => void;
}

export function ExportMp4Button({
  videoFile,
  allTimed,
  getSrt,
  exporting,
  setExporting,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Mp4Phase | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `exporting` is the shared lock: both MP4 exports write the same MEMFS
  // filenames to one cached ffmpeg instance, so only one may run at a time.
  const disabled = exporting || !allTimed || !videoFile;
  const title = exporting
    ? 'Another MP4 export is running'
    : !allTimed
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
    setExporting(true);
    try {
      const { blob, fileName } = await exportMp4WithSubtitles(
        videoFile,
        getSrt(),
        setPhase,
      );
      downloadBlob(blob, fileName);
    } catch (e) {
      // ffmpeg.wasm failures can cross the worker boundary as non-Error values,
      // so fall back to String(e) rather than a generic message to keep the
      // real cause visible.
      const detail = e instanceof Error ? e.message : String(e);
      setError(`MP4 export failed: ${detail || 'unknown error'}`);
    } finally {
      setBusy(false);
      setExporting(false);
      setPhase(null);
    }
  }

  return (
    <span className="export-mp4">
      <button disabled={disabled} onClick={handleClick} title={title}>
        {busy && phase ? PHASE_LABEL[phase] : 'Export Soft-subtitled MP4'}
      </button>
      {error && (
        <span className="export-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

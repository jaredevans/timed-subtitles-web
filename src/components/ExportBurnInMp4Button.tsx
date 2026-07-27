import { useState } from 'react';
import type { VideoMeta } from '../types';
import {
  estimateEncodeMinutes,
  exportMp4WithBurnedSubtitles,
  formatDuration,
  type BurnInPhase,
} from '../lib/burnin';
import { downloadBlob } from '../lib/download';

// Burn-in holds the input, the output, and encoder state at once in a 32-bit
// (~2 GB) address space, so it runs out of memory at a lower size than the
// remux does.
const LARGE_FILE_BYTES = 250 * 1024 * 1024;

const PHASE_LABEL: Record<BurnInPhase, string> = {
  'loading-engine': 'Loading engine (~30 MB)…',
  preparing: 'Preparing…',
  encoding: 'Encoding…',
  done: 'Done',
};

interface Props {
  videoFile: File | null;
  allTimed: boolean;
  getSrt: () => string;
  getVideoMeta: () => VideoMeta | null;
  exporting: boolean;
  setExporting: (value: boolean) => void;
}

export function ExportBurnInMp4Button({
  videoFile,
  allTimed,
  getSrt,
  getVideoMeta,
  exporting,
  setExporting,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<BurnInPhase | null>(null);
  const [percent, setPercent] = useState(0);
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

    const meta = getVideoMeta();
    if (!meta) {
      setError('Burn-in export failed: could not read the video dimensions.');
      return;
    }

    const [low, high] = estimateEncodeMinutes(
      meta.width,
      meta.height,
      meta.durationSec,
    );
    const sizeWarning =
      videoFile.size > LARGE_FILE_BYTES
        ? '\n\nThis file is large — the export may run out of browser memory.'
        : '';
    if (
      !window.confirm(
        'Burn-in re-encodes every frame in your browser.\n\n' +
          `${meta.width}x${meta.height}, ${formatDuration(meta.durationSec)}\n` +
          `Rough estimate: ${low}-${high} minutes. Keep this tab open.` +
          sizeWarning +
          '\n\nContinue?',
      )
    ) {
      return;
    }

    setBusy(true);
    setExporting(true);
    setPercent(0);
    try {
      const { blob, fileName } = await exportMp4WithBurnedSubtitles(
        videoFile,
        getSrt(),
        meta.width,
        meta.height,
        setPhase,
        setPercent,
      );
      downloadBlob(blob, fileName);
    } catch (e) {
      // ffmpeg.wasm failures can cross the worker boundary as non-Error values,
      // so fall back to String(e) rather than a generic message to keep the
      // real cause visible.
      const detail = e instanceof Error ? e.message : String(e);
      setError(`Burn-in export failed: ${detail || 'unknown error'}`);
    } finally {
      setBusy(false);
      setExporting(false);
      setPhase(null);
    }
  }

  return (
    <span className="export-mp4">
      <button disabled={disabled} onClick={handleClick} title={title}>
        {busy && phase
          ? phase === 'encoding'
            ? `Encoding… ${percent}%`
            : PHASE_LABEL[phase]
          : 'Export Burn-In subtitled MP4'}
      </button>
      {error && (
        <span className="export-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

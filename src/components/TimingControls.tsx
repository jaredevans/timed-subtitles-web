import type { SubtitleLine } from '../types';

interface Props {
  line: SubtitleLine;
  index: number;
  total: number;
  error: string | null;
  onCaptureStart: () => void;
  onCaptureEnd: () => void;
}

export function TimingControls({ line, index, total, error, onCaptureStart, onCaptureEnd }: Props) {
  return (
    <section className="timing-controls">
      <div className="current-line">
        <span className="line-number">
          Caption {index + 1} of {total}
        </span>
        <p className="caption-band" key={index}>
          {line.text}
        </p>
      </div>
      <div className="capture-buttons">
        <button className="start-btn" onClick={onCaptureStart}>
          Mark start{' '}
          {line.start !== null && <span className="mark-time">✓ {line.start.toFixed(2)}s</span>}
        </button>
        <button className="end-btn" onClick={onCaptureEnd} disabled={line.start === null}>
          Mark end{' '}
          {line.end !== null && <span className="mark-time">✓ {line.end.toFixed(2)}s</span>}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

import { useEffect } from 'react';
import type { SubtitleLine } from '../types';
import { getTimingShortcut } from '../lib/shortcuts';

interface Props {
  line: SubtitleLine;
  index: number;
  total: number;
  error: string | null;
  onCaptureStart: () => void;
  onCaptureEnd: () => void;
}

export function TimingControls({ line, index, total, error, onCaptureStart, onCaptureEnd }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const action = getTimingShortcut({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        repeat: e.repeat,
        target,
      });
      if (!action) return;

      e.preventDefault();
      if (action === 'mark-start') {
        onCaptureStart();
      } else if (line.start !== null) {
        onCaptureEnd();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCaptureStart, onCaptureEnd, line.start]);

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
        <button className="start-btn" onClick={onCaptureStart} title="Shortcut: ,">
          Mark start <kbd className="shortcut-key">,</kbd>
          {line.start !== null && <span className="mark-time">✓ {line.start.toFixed(2)}s</span>}
        </button>
        <button
          className="end-btn"
          onClick={onCaptureEnd}
          disabled={line.start === null}
          title="Shortcut: ."
        >
          Mark end <kbd className="shortcut-key">.</kbd>
          {line.end !== null && <span className="mark-time">✓ {line.end.toFixed(2)}s</span>}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

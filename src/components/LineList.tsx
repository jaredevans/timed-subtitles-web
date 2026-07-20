import type { SubtitleLine } from '../types';

interface Props {
  lines: SubtitleLine[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onEditTime: (index: number, field: 'start' | 'end', value: number | null) => void;
}

function TimeInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      step={0.001}
      value={value ?? ''}
      placeholder="–"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const raw = e.target.value;
        onCommit(raw === '' ? null : Math.max(0, Number(raw)));
      }}
    />
  );
}

function lineStatus(line: SubtitleLine): 'done' | 'partial' | 'untimed' {
  if (line.start !== null && line.end !== null) return 'done';
  if (line.start !== null || line.end !== null) return 'partial';
  return 'untimed';
}

export function LineList({ lines, activeIndex, onSelect, onEditTime }: Props) {
  return (
    <section className="line-list">
      <h2>Captions</h2>
      <ol>
        {lines.map((line, i) => {
          const prev = i > 0 ? lines[i - 1] : undefined;
          const overlaps =
            prev !== undefined && prev.end !== null && line.start !== null && line.start < prev.end;
          const classes = [lineStatus(line), i === activeIndex ? 'active' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <li key={i} className={classes} onClick={() => onSelect(i)}>
              <span className="line-text">{line.text}</span>
              <span className="times">
                <TimeInput value={line.start} onCommit={(v) => onEditTime(i, 'start', v)} />
                –
                <TimeInput value={line.end} onCommit={(v) => onEditTime(i, 'end', v)} />
                {overlaps && (
                  <span className="overlap" title="Overlaps the previous caption">
                    ⚠︎
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

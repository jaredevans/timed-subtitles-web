# Timed Subtitles Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-side React web app where a user uploads an MP4/MOV video, pastes a pre-split transcript, captures each line's start/end times with buttons while the video plays, and exports an SRT file.

**Architecture:** Single-page React + Vite + TypeScript app with no backend. Pure logic (transcript parsing, SRT generation, state serialization) lives in `src/lib/` with Vitest unit tests; UI components in `src/components/` with state owned by `App.tsx`. Video loads locally via `URL.createObjectURL`; progress persists to localStorage.

**Tech Stack:** Node 22, Vite 6, React 19, TypeScript 5 (strict), Vitest 3.

**Spec:** `docs/superpowers/specs/2026-07-20-timed-subtitles-design.md`

## Global Constraints

- Entirely client-side; no server code, no network calls. The video file never leaves the machine.
- TypeScript `strict: true`; `npm run build` (which runs `tsc`) must pass with zero errors at every commit.
- File input restricted to `video/mp4,video/quicktime,.mp4,.mov`.
- localStorage key: `timed-subtitles-state-v1`.
- Times stored internally as seconds (floating point, from `video.currentTime`).
- SRT timestamps formatted `HH:MM:SS,mmm` (comma before milliseconds).
- Do not use `alert()`/`confirm()`/`prompt()` anywhere — use inline UI instead.
- Working directory: `/Users/jared/github_projects/timed-subtitles-web` (repo root = project root).

---

### Task 1: Project scaffold

Manual scaffold (no `npm create vite` — it prompts interactively in a non-empty dir).

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx` (placeholder), `src/index.css`

**Interfaces:**
- Produces: a building Vite React TS project; `npm run dev`, `npm run build`, `npm test` scripts.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "timed-subtitles-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "typescript": "~5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Timed Subtitles</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 6: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Write placeholder `src/App.tsx`**

```tsx
export default function App() {
  return <h1>Timed Subtitles</h1>;
}
```

- [ ] **Step 8: Write `src/index.css`**

```css
:root {
  color-scheme: light;
}

body {
  margin: 0;
  background: #fafafc;
  color: #1a1d24;
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 9: Install and verify build + tests**

Run: `npm install`
Expected: completes without errors (warnings OK).

Run: `npm run build`
Expected: `tsc` silent, then `vite build` reports `✓ built in …` with a `dist/` output.

Run: `npm test`
Expected: exits 0 with "No test files found" (passWithNoTests).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project with Vitest"
```

---

### Task 2: Types and transcript parsing

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/transcript.ts`
- Test: `src/lib/transcript.test.ts`

**Interfaces:**
- Produces: `interface SubtitleLine { text: string; start: number | null; end: number | null }` (in `src/types.ts`); `parseTranscript(text: string): string[]` (in `src/lib/transcript.ts`).

- [ ] **Step 1: Write `src/types.ts`**

```ts
export interface SubtitleLine {
  text: string;
  start: number | null; // seconds
  end: number | null; // seconds
}
```

- [ ] **Step 2: Write the failing test `src/lib/transcript.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseTranscript } from './transcript';

describe('parseTranscript', () => {
  it('splits text into lines', () => {
    expect(parseTranscript('hello\nworld')).toEqual(['hello', 'world']);
  });

  it('drops empty and whitespace-only lines', () => {
    expect(parseTranscript('one\n\n   \ntwo\n')).toEqual(['one', 'two']);
  });

  it('handles Windows line endings', () => {
    expect(parseTranscript('a\r\nb\r\n')).toEqual(['a', 'b']);
  });

  it('trims surrounding whitespace on each line', () => {
    expect(parseTranscript('  padded  \n\ttabbed\t')).toEqual(['padded', 'tabbed']);
  });

  it('returns empty array for empty input', () => {
    expect(parseTranscript('')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/transcript.test.ts`
Expected: FAIL — cannot resolve `./transcript`.

- [ ] **Step 4: Write `src/lib/transcript.ts`**

```ts
export function parseTranscript(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/transcript.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/transcript.ts src/lib/transcript.test.ts
git commit -m "feat: add SubtitleLine type and transcript parsing"
```

---

### Task 3: SRT formatting and generation

**Files:**
- Create: `src/lib/srt.ts`
- Test: `src/lib/srt.test.ts`

**Interfaces:**
- Consumes: `SubtitleLine` from `src/types.ts`.
- Produces: `formatSrtTime(seconds: number): string`; `generateSrt(lines: SubtitleLine[]): string` (throws `Error` if any line is missing a time).

- [ ] **Step 1: Write the failing test `src/lib/srt.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatSrtTime, generateSrt } from './srt';

describe('formatSrtTime', () => {
  it('formats zero', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000');
  });

  it('rounds to the nearest millisecond', () => {
    expect(formatSrtTime(1.2345)).toBe('00:00:01,235');
  });

  it('formats minutes and seconds', () => {
    expect(formatSrtTime(75.5)).toBe('00:01:15,500');
  });

  it('formats hours', () => {
    expect(formatSrtTime(3661.007)).toBe('01:01:01,007');
  });

  it('carries millisecond rounding into the seconds place', () => {
    expect(formatSrtTime(59.9996)).toBe('00:01:00,000');
  });
});

describe('generateSrt', () => {
  it('generates numbered entries separated by blank lines', () => {
    const srt = generateSrt([
      { text: 'First line', start: 0.5, end: 2 },
      { text: 'Second line', start: 2.25, end: 4.75 },
    ]);
    expect(srt).toBe(
      '1\n00:00:00,500 --> 00:00:02,000\nFirst line\n\n' +
        '2\n00:00:02,250 --> 00:00:04,750\nSecond line\n',
    );
  });

  it('throws if a line is missing a time', () => {
    expect(() => generateSrt([{ text: 'x', start: 1, end: null }])).toThrow(/missing/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/srt.test.ts`
Expected: FAIL — cannot resolve `./srt`.

- [ ] **Step 3: Write `src/lib/srt.ts`**

```ts
import type { SubtitleLine } from '../types';

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function formatSrtTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export function generateSrt(lines: SubtitleLine[]): string {
  const entries = lines.map((line, i) => {
    if (line.start === null || line.end === null) {
      throw new Error(`Line ${i + 1} is missing a start or end time`);
    }
    return `${i + 1}\n${formatSrtTime(line.start)} --> ${formatSrtTime(line.end)}\n${line.text}`;
  });
  return entries.join('\n\n') + '\n';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/srt.test.ts`
Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/srt.ts src/lib/srt.test.ts
git commit -m "feat: add SRT timestamp formatting and file generation"
```

---

### Task 4: localStorage persistence helpers

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `SubtitleLine` from `src/types.ts`.
- Produces: `interface SavedState { lines: SubtitleLine[]; activeIndex: number }`; `deserializeState(json: string): SavedState | null` (pure, validating); `loadState(): SavedState | null`; `saveState(state: SavedState): void`; `clearState(): void`.

Only `deserializeState` gets unit tests (pure). The three wrappers are one-line localStorage calls verified in the browser in Task 6.

- [ ] **Step 1: Write the failing test `src/lib/storage.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { deserializeState } from './storage';

describe('deserializeState', () => {
  it('round-trips a valid state', () => {
    const state = {
      lines: [{ text: 'a', start: 1.5, end: null }],
      activeIndex: 0,
    };
    expect(deserializeState(JSON.stringify(state))).toEqual(state);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeState('not json')).toBeNull();
  });

  it('returns null when the shape is wrong', () => {
    expect(deserializeState(JSON.stringify({ lines: 'nope', activeIndex: 0 }))).toBeNull();
    expect(deserializeState(JSON.stringify({ lines: [], activeIndex: 'x' }))).toBeNull();
    expect(
      deserializeState(
        JSON.stringify({ lines: [{ text: 5, start: null, end: null }], activeIndex: 0 }),
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 3: Write `src/lib/storage.ts`**

```ts
import type { SubtitleLine } from '../types';

export interface SavedState {
  lines: SubtitleLine[];
  activeIndex: number;
}

const KEY = 'timed-subtitles-state-v1';

function isSubtitleLine(value: unknown): value is SubtitleLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.text === 'string' &&
    (typeof line.start === 'number' || line.start === null) &&
    (typeof line.end === 'number' || line.end === null)
  );
}

export function deserializeState(json: string): SavedState | null {
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    const state = data as Record<string, unknown>;
    if (!Array.isArray(state.lines) || typeof state.activeIndex !== 'number') return null;
    if (!state.lines.every(isSubtitleLine)) return null;
    return { lines: state.lines, activeIndex: state.activeIndex };
  } catch {
    return null;
  }
}

export function loadState(): SavedState | null {
  const json = localStorage.getItem(KEY);
  return json === null ? null : deserializeState(json);
}

export function saveState(state: SavedState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add validated localStorage persistence helpers"
```

---

### Task 5: UI — components, App state, and styling

The full interactive app: setup panel, video panel with capture controls, line list, export, persistence wiring.

**Files:**
- Create: `src/components/SetupPanel.tsx`
- Create: `src/components/VideoPanel.tsx`
- Create: `src/components/TimingControls.tsx`
- Create: `src/components/LineList.tsx`
- Create: `src/App.css`
- Modify: `src/App.tsx` (replace placeholder entirely)

**Interfaces:**
- Consumes: `parseTranscript`, `generateSrt`, `loadState`/`saveState`/`clearState`, `SubtitleLine`.
- Produces: the complete app UI. No downstream code consumers.

Behavior requirements implemented here (from the spec):
- **Start** captures `video.currentTime` into the active line's `start`. If the line already had an `end` ≤ the new start, the stale `end` is cleared.
- **End** captures `currentTime` into `end` only if a start exists and `end > start`; otherwise shows the inline error "End time must be after the start time — keep playing, then click End." On success it auto-advances to the next line missing a time (searching forward, wrapping to the beginning; stays put if none).
- **End** button is disabled while the active line has no start.
- Skip-back button rewinds 3 seconds (floor 0).
- Line list: click selects a line; per-line editable number inputs for start/end (empty = null); a line whose `start` is earlier than the previous line's `end` shows a ⚠︎ overlap flag; status classes `untimed`/`partial`/`done`; active line highlighted.
- Export enabled only when every line has both times; downloads `<video-basename>.srt` (fallback `subtitles.srt`).
- "Edit transcript" uses an inline Reset/Cancel confirmation (no `confirm()`), then clears storage and returns to setup.
- On mount, saved state restores lines/activeIndex and jumps to timing phase with a "re-select your video" hint until a video is chosen.
- State saves to localStorage on every lines/activeIndex change while in timing phase.

- [ ] **Step 1: Write `src/components/SetupPanel.tsx`**

```tsx
import { useState } from 'react';

interface Props {
  onStartTiming: (transcript: string) => void;
}

export function SetupPanel({ onStartTiming }: Props) {
  const [text, setText] = useState('');
  const canStart = text.trim().length > 0;

  return (
    <section className="setup-panel">
      <h2>Transcript</h2>
      <p className="hint">Paste your transcript — one subtitle line per row.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'First subtitle line\nSecond subtitle line\n…'}
        rows={16}
      />
      <button disabled={!canStart} onClick={() => onStartTiming(text)}>
        Start timing
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Write `src/components/VideoPanel.tsx`**

```tsx
import type { ChangeEvent, RefObject } from 'react';

interface Props {
  videoUrl: string | null;
  videoName: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFileSelected: (file: File) => void;
  showReselectHint: boolean;
}

const ACCEPT = 'video/mp4,video/quicktime,.mp4,.mov';

export function VideoPanel({
  videoUrl,
  videoName,
  videoRef,
  onFileSelected,
  showReselectHint,
}: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  function skipBack() {
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(0, video.currentTime - 3);
  }

  if (!videoUrl) {
    return (
      <section className="video-panel">
        <div className="video-placeholder">
          {showReselectHint && (
            <p className="hint">
              Restored your saved timing session — re-select the same video file to continue.
            </p>
          )}
          <label className="file-label">
            Choose MP4 or MOV video
            <input type="file" accept={ACCEPT} onChange={handleChange} />
          </label>
        </div>
      </section>
    );
  }

  return (
    <section className="video-panel">
      <video ref={videoRef} src={videoUrl} controls />
      <div className="video-meta">
        <span className="video-name">{videoName}</span>
        <button onClick={skipBack}>⟲ 3s</button>
        <label className="change-video">
          Change video
          <input type="file" accept={ACCEPT} onChange={handleChange} />
        </label>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write `src/components/TimingControls.tsx`**

```tsx
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
          Line {index + 1} of {total}
        </span>
        <p className="line-text">{line.text}</p>
      </div>
      <div className="capture-buttons">
        <button className="start-btn" onClick={onCaptureStart}>
          Start{line.start !== null ? ` ✓ ${line.start.toFixed(2)}s` : ''}
        </button>
        <button className="end-btn" onClick={onCaptureEnd} disabled={line.start === null}>
          End{line.end !== null ? ` ✓ ${line.end.toFixed(2)}s` : ''}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 4: Write `src/components/LineList.tsx`**

```tsx
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
      <h2>Lines</h2>
      <ol>
        {lines.map((line, i) => {
          const prev = i > 0 ? lines[i - 1] : undefined;
          const overlaps =
            prev !== undefined &&
            prev.end !== null &&
            line.start !== null &&
            line.start < prev.end;
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
                  <span className="overlap" title="Overlaps the previous line">
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
```

- [ ] **Step 5: Replace `src/App.tsx` entirely**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { SubtitleLine } from './types';
import { parseTranscript } from './lib/transcript';
import { generateSrt } from './lib/srt';
import { clearState, loadState, saveState } from './lib/storage';
import { SetupPanel } from './components/SetupPanel';
import { VideoPanel } from './components/VideoPanel';
import { TimingControls } from './components/TimingControls';
import { LineList } from './components/LineList';
import './App.css';

type Phase = 'setup' | 'timing';

function nextUntimed(lines: SubtitleLine[], from: number): number {
  for (let i = from + 1; i < lines.length; i++) {
    if (lines[i].start === null || lines[i].end === null) return i;
  }
  for (let i = 0; i <= from; i++) {
    if (lines[i].start === null || lines[i].end === null) return i;
  }
  return from;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [restored, setRestored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const saved = loadState();
    if (saved && saved.lines.length > 0) {
      setLines(saved.lines);
      setActiveIndex(Math.min(saved.activeIndex, saved.lines.length - 1));
      setPhase('timing');
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (phase === 'timing' && lines.length > 0) {
      saveState({ lines, activeIndex });
    }
  }, [phase, lines, activeIndex]);

  function handleFileSelected(file: File) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
  }

  function handleStartTiming(text: string) {
    const parsed = parseTranscript(text);
    if (parsed.length === 0) return;
    setLines(parsed.map((t) => ({ text: t, start: null, end: null })));
    setActiveIndex(0);
    setCaptureError(null);
    setPhase('timing');
  }

  function captureStart() {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    setCaptureError(null);
    setLines((ls) =>
      ls.map((l, i) =>
        i === activeIndex
          ? { ...l, start: t, end: l.end !== null && l.end <= t ? null : l.end }
          : l,
      ),
    );
  }

  function captureEnd() {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    const line = lines[activeIndex];
    if (!line || line.start === null) return;
    if (t <= line.start) {
      setCaptureError('End time must be after the start time — keep playing, then click End.');
      return;
    }
    setCaptureError(null);
    const updated = lines.map((l, i) => (i === activeIndex ? { ...l, end: t } : l));
    setLines(updated);
    setActiveIndex(nextUntimed(updated, activeIndex));
  }

  function handleSelectLine(index: number) {
    setActiveIndex(index);
    setCaptureError(null);
  }

  function handleEditTime(index: number, field: 'start' | 'end', value: number | null) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function handleExport() {
    const srt = generateSrt(lines);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (videoName.replace(/\.[^.]+$/, '') || 'subtitles') + '.srt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleResetTranscript() {
    clearState();
    setLines([]);
    setActiveIndex(0);
    setCaptureError(null);
    setConfirmingReset(false);
    setRestored(false);
    setPhase('setup');
  }

  const allTimed = lines.length > 0 && lines.every((l) => l.start !== null && l.end !== null);
  const timedCount = lines.filter((l) => l.start !== null && l.end !== null).length;
  const activeLine = lines[activeIndex];

  return (
    <div className="app">
      <header>
        <h1>Timed Subtitles</h1>
        {phase === 'timing' && (
          <div className="header-actions">
            <span className="progress">
              {timedCount} / {lines.length} lines timed
            </span>
            {confirmingReset ? (
              <span className="confirm-reset">
                Resets all timings.
                <button onClick={handleResetTranscript}>Reset</button>
                <button onClick={() => setConfirmingReset(false)}>Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirmingReset(true)}>Edit transcript</button>
            )}
            <button
              disabled={!allTimed}
              onClick={handleExport}
              title={allTimed ? undefined : 'Time all lines to enable export'}
            >
              Export SRT
            </button>
          </div>
        )}
      </header>
      <main>
        <div className="left">
          <VideoPanel
            videoUrl={videoUrl}
            videoName={videoName}
            videoRef={videoRef}
            onFileSelected={handleFileSelected}
            showReselectHint={restored && !videoUrl}
          />
          {phase === 'timing' && activeLine && videoUrl && (
            <TimingControls
              line={activeLine}
              index={activeIndex}
              total={lines.length}
              error={captureError}
              onCaptureStart={captureStart}
              onCaptureEnd={captureEnd}
            />
          )}
        </div>
        <div className="right">
          {phase === 'setup' ? (
            <SetupPanel onStartTiming={handleStartTiming} />
          ) : (
            <LineList
              lines={lines}
              activeIndex={activeIndex}
              onSelect={handleSelectLine}
              onEditTime={handleEditTime}
            />
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/App.css`**

```css
* {
  box-sizing: border-box;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem 3rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

header h1 {
  font-size: 1.4rem;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.progress {
  color: #667;
  font-variant-numeric: tabular-nums;
}

.confirm-reset {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  color: #a33;
}

main {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  main {
    grid-template-columns: 1fr;
  }
}

button {
  font: inherit;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid #99a;
  background: #f5f5f7;
  cursor: pointer;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.hint {
  color: #667;
  font-size: 0.9rem;
}

.error {
  color: #c33;
  margin: 0.6rem 0 0;
}

.video-panel video {
  width: 100%;
  border-radius: 8px;
  background: #000;
}

.video-placeholder {
  border: 2px dashed #aab;
  border-radius: 8px;
  padding: 3rem 1.5rem;
  text-align: center;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.video-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #667;
}

.change-video {
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.85rem;
  color: #667;
}

.change-video input {
  display: none;
}

.timing-controls {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #ccd;
  border-radius: 8px;
}

.line-number {
  font-size: 0.8rem;
  color: #667;
}

.current-line .line-text {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.capture-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.capture-buttons button {
  flex: 1;
  padding: 0.7rem;
  font-size: 1rem;
}

.start-btn {
  border-color: #2a7;
}

.end-btn {
  border-color: #d66;
}

.setup-panel textarea {
  width: 100%;
  font: inherit;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid #aab;
  resize: vertical;
}

.setup-panel button {
  margin-top: 0.75rem;
}

.line-list ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 70vh;
  overflow-y: auto;
}

.line-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
}

.line-list li:hover {
  background: #eef0f4;
}

.line-list li.active {
  border-color: #58a;
  background: #e8f0fb;
}

.line-list li.done > .line-text {
  color: #2a7;
}

.line-list li > .line-text {
  flex: 1;
  min-width: 0;
}

.line-list .times {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-variant-numeric: tabular-nums;
}

.line-list input {
  width: 5.5rem;
  font: inherit;
  padding: 0.15rem 0.3rem;
  border: 1px solid #bbc;
  border-radius: 4px;
}

.overlap {
  color: #c80;
}
```

- [ ] **Step 7: Verify typecheck, tests, and build**

Run: `npm test && npm run build`
Expected: all unit tests pass; `tsc` clean; vite build succeeds.

- [ ] **Step 8: Manual smoke check in the browser**

Run: `npm run dev` (default http://localhost:5173)

Verify (manually or with browser automation):
1. Setup phase shows the video placeholder (left) and transcript textarea (right); "Start timing" disabled until text entered.
2. Paste 3 lines, click "Start timing" → line list appears with 3 untimed lines; header shows "0 / 3 lines timed".
3. Without a video, the timing controls are hidden. Choose a video file → video renders, timing controls appear showing line 1.
4. Play the video, click Start, then End a moment later → line 1 gets both times, active line advances to line 2.
5. Click End before Start on line 2 → End is disabled (no start yet). Click Start, immediately pause, click End at the same timestamp → inline error appears.
6. Click line 1 in the list → it becomes active; Start/End recapture works. Edit a time in the list inputs directly.
7. ⟲ 3s button rewinds playback.
8. Reload the page → lines and times restore, "re-select the same video file" hint shows; picking the video resumes work.
9. Time all lines → "Export SRT" enables; clicking downloads `<video-basename>.srt`; open it and check `HH:MM:SS,mmm --> HH:MM:SS,mmm` entries.
10. "Edit transcript" shows inline Reset/Cancel; Reset returns to setup and clears saved state (reload stays in setup).

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/App.css src/components
git commit -m "feat: add full timing UI - setup, video capture, line list, export"
```

---

### Task 6: README and final verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: everything; final gate.

- [ ] **Step 1: Write `README.md`**

```markdown
# Timed Subtitles

A local, in-browser tool for manually timing subtitles against a video and
exporting an SRT file. No server — your video never leaves your machine.

## Usage

1. `npm install && npm run dev`, then open http://localhost:5173
2. Choose an MP4 or MOV video file.
3. Paste your transcript — one subtitle line per row — and click
   **Start timing**.
4. Play the video. For each line: click **Start** when the line begins,
   **End** when it finishes. The next line loads automatically.
   Use **⟲ 3s** to rewind, or click any line in the list to re-time it.
   Times can also be edited directly in the list.
5. When every line is timed, click **Export SRT**.

Progress is saved in your browser (localStorage) — reloading keeps your
timings; just re-select the video file.

## Development

- `npm run dev` — dev server
- `npm test` — unit tests (Vitest)
- `npm run build` — typecheck + production build
```

- [ ] **Step 2: Full verification**

Run: `npm test && npm run build`
Expected: all tests pass, build clean.

Re-run the Task 5 Step 8 manual checklist end-to-end once against the production preview if desired: `npm run preview`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage instructions"
```

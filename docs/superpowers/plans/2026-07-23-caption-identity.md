# Broadcast-Caption Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the caption-band signature element, real typography (Bricolage Grotesque display + JetBrains Mono timecodes), and captioning microcopy to the dark theme.

**Architecture:** Task 1 lays the foundation — two self-hosted @fontsource packages, new tokens, and all CSS (type roles, caption band, eyebrow, fade). Task 2 applies the markup and copy changes in four components. Visual + copy only; no logic, prop, or state changes.

**Tech Stack:** React 19, plain CSS, `@fontsource/bricolage-grotesque` 5.3.0, `@fontsource/jetbrains-mono` 5.3.0 (both bundled by Vite — no external requests).

**Spec:** `docs/superpowers/specs/2026-07-23-caption-identity-design.md`

## Global Constraints

- Only new dependencies allowed: `@fontsource/bricolage-grotesque` and `@fontsource/jetbrains-mono`.
- No behavior, logic, prop, or state changes — visual and copy only.
- New token values verbatim: `--band: rgba(8, 9, 12, 0.88)`, `--caption: #f8f8f2`, `--font-display: 'Bricolage Grotesque', system-ui, sans-serif`, `--font-mono: 'JetBrains Mono', ui-monospace, monospace`.
- Display face ONLY on `h1` and panel `h2`s; mono ONLY on numeric/timecode elements and the eyebrow; caption band uses the body sans at weight 600 (NOT mono).
- Band fade is 150ms opacity, wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Copy: the app says "caption(s)", never "line(s)", in user-facing text; buttons are "Mark start" / "Mark end".
- Existing dark-theme tokens, grid layout, and behavior unchanged.
- All commands run from the repo root: `/Users/jared/github_projects/timed-subtitles-web`.
- `npm test` (25 tests) and `npm run build` must pass before each commit.

---

### Task 1: Fonts, tokens, and caption CSS

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/index.css` (full replace)
- Modify: `src/App.css` (targeted edits below)

**Interfaces:**
- Consumes: existing dark-theme tokens and selectors in `src/App.css`.
- Produces: CSS classes Task 2's markup will use: `.caption-band` (the band, replaces `.current-line .line-text` styling), `.line-number` (restyled as mono eyebrow), `.mark-time` (mono readout span inside capture buttons). Also tokens `--font-display`, `--font-mono`, `--band`, `--caption`.

No unit-test surface; verification is build + suite + the controller's browser pass after Task 2.

- [ ] **Step 1: Install the font packages**

Run: `npm install @fontsource/bricolage-grotesque @fontsource/jetbrains-mono`
Expected: both added to `package.json` dependencies at ^5.3.0; install completes with 0 vulnerabilities.

- [ ] **Step 2: Replace `src/index.css`**

Full new contents:

```css
@import '@fontsource/bricolage-grotesque/600.css';
@import '@fontsource/bricolage-grotesque/700.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/600.css';

:root {
  color-scheme: dark;

  --bg: #0f1117;
  --surface: #171a23;
  --surface-2: #1f2330;
  --border: rgba(255, 255, 255, 0.08);
  --text: #e5e7ef;
  --text-dim: #9aa1b5;
  --accent: #818cf8;
  --accent-hover: #93a0ff;
  --accent-tint: rgba(129, 140, 248, 0.12);
  --on-accent: #14162b;
  --green: #34d399;
  --on-green: #06251a;
  --red: #f87171;
  --on-red: #2b0b0b;
  --red-tint: rgba(248, 113, 113, 0.12);
  --amber: #fbbf24;
  --radius: 12px;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.25);
  --band: rgba(8, 9, 12, 0.88);
  --caption: #f8f8f2;
  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 3: Apply targeted edits to `src/App.css`**

Each edit shows the exact current block and its replacement.

Edit 3a — display face on the wordmark. Replace:

```css
header h1 {
  font-size: 1.25rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  margin: 0;
}
```

with:

```css
header h1 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}
```

Edit 3b — display face on panel headings. Replace:

```css
.setup-panel h2,
.line-list h2 {
  margin: 0 0 0.6rem;
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}
```

with:

```css
.setup-panel h2,
.line-list h2 {
  font-family: var(--font-display);
  margin: 0 0 0.6rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
```

Edit 3c — mono progress counter. Replace:

```css
.progress {
  color: var(--text-dim);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}
```

with:

```css
.progress {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
```

Edit 3d — eyebrow. Replace:

```css
.line-number {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}
```

with:

```css
.line-number {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-dim);
}
```

Edit 3e — caption band replaces the current-line paragraph styling. Replace:

```css
.current-line .line-text {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
  font-weight: 600;
}
```

with:

```css
.caption-band {
  width: fit-content;
  max-width: 100%;
  margin: 0.5rem auto 0;
  padding: 0.7rem 1.2rem;
  border-radius: 6px;
  background: var(--band);
  color: var(--caption);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}

@media (prefers-reduced-motion: no-preference) {
  .caption-band {
    animation: caption-in 150ms ease;
  }
}

@keyframes caption-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

Edit 3f — capture buttons host a mono readout span. Replace:

```css
.capture-buttons button {
  flex: 1;
  padding: 0.7rem;
  font-size: 1rem;
}
```

with:

```css
.capture-buttons button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem;
  font-size: 1rem;
}

.mark-time {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}
```

Edit 3g — mono time inputs. Replace:

```css
.line-list input {
  width: 5.5rem;
  font: inherit;
  color: var(--text);
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  transition: border-color 150ms ease;
}
```

with:

```css
.line-list input {
  width: 5.5rem;
  font: inherit;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text);
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  transition: border-color 150ms ease;
}
```

- [ ] **Step 4: Build and test**

Run: `npm run build`
Expected: tsc and vite build succeed; the four font CSS imports resolve (woff2 assets appear in the bundle output).

Run: `npm test`
Expected: PASS — 4 files, 25 tests.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/index.css src/App.css
git commit -m "feat: add caption identity foundation - fonts, tokens, band styles"
```

---

### Task 2: Caption band markup and captioning copy

**Files:**
- Modify: `src/components/TimingControls.tsx` (full replace)
- Modify: `src/components/LineList.tsx` (one string)
- Modify: `src/components/SetupPanel.tsx` (two strings)
- Modify: `src/App.tsx` (two strings)

**Interfaces:**
- Consumes: CSS classes from Task 1: `.caption-band`, `.line-number` (eyebrow), `.mark-time`.
- Produces: nothing later tasks rely on; this is the final task.

Copy rules from the spec: user-facing text says "caption(s)", never "line(s)"; buttons "Mark start" / "Mark end". CSS class names (`line-list`, `line-text`, `line-number`) are NOT user-facing — leave them unchanged.

- [ ] **Step 1: Replace `src/components/TimingControls.tsx`**

Full new contents:

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
          Caption {index + 1} of {total}
        </span>
        <p className="caption-band" key={index}>
          {line.text}
        </p>
      </div>
      <div className="capture-buttons">
        <button className="start-btn" onClick={onCaptureStart}>
          Mark start
          {line.start !== null && <span className="mark-time">✓ {line.start.toFixed(2)}s</span>}
        </button>
        <button className="end-btn" onClick={onCaptureEnd} disabled={line.start === null}>
          Mark end
          {line.end !== null && <span className="mark-time">✓ {line.end.toFixed(2)}s</span>}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
```

(The `key={index}` remounts the band when the active caption changes, which replays the CSS `caption-in` fade — that is the spec's crossfade mechanism.)

- [ ] **Step 2: Update `src/components/LineList.tsx`**

Change only the heading (line 42): `<h2>Lines</h2>` → `<h2>Captions</h2>`.

- [ ] **Step 3: Update `src/components/SetupPanel.tsx`**

Two string changes only:
- Hint: `Paste your transcript — one subtitle line per row.` or current equivalent → `Paste your transcript — each sentence becomes a caption.` (the current hint reads `Paste your transcript — sentences are split one per row.`)
- Placeholder: `{'First subtitle line\nSecond subtitle line\n…'}` → `{'First caption\nSecond caption\n…'}`

- [ ] **Step 4: Update `src/App.tsx`**

Two string changes only:
- Progress counter: `{timedCount} / {lines.length} lines timed` → `{timedCount} / {lines.length} captions timed`
- Capture-end error: `'End time must be after the start time — keep playing, then click End.'` → `'The end must come after the start — keep playing, then mark the end.'`

- [ ] **Step 5: Build and test**

Run: `npm run build`
Expected: tsc and vite build succeed.

Run: `npm test`
Expected: PASS — 4 files, 25 tests (no test asserts component copy).

- [ ] **Step 6: Commit**

```bash
git add src/components/TimingControls.tsx src/components/LineList.tsx src/components/SetupPanel.tsx src/App.tsx
git commit -m "feat: render current caption as on-screen band, adopt captioning copy"
```

---

### Controller follow-up (not a subagent task)

Browser verification per the spec: band renders under the video with white-on-black styling and centered fit-content width; fade replays when selecting a different caption; display face visible on wordmark/headings; mono on counter, inputs, eyebrow, and mark readouts; all copy says captions; reduced-motion disables the fade.

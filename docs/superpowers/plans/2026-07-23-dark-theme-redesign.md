# Dark Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the app to a modern, sleek dark theme (indigo accent) with zero behavior changes.

**Architecture:** Pure CSS restyle built on design tokens (CSS custom properties) in `src/index.css`, with a full rewrite of `src/App.css` styling the existing class hooks. The only markup change is one className added to the "Reset all" button in `src/App.tsx`.

**Tech Stack:** Plain CSS (custom properties), React 19 markup untouched except one className. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-23-dark-theme-redesign-design.md`

## Global Constraints

- No new npm dependencies.
- No behavior, logic, prop, or state changes in any component — visual only.
- Token values from the spec, verbatim: `--bg: #0f1117`, `--surface: #171a23`, `--surface-2: #1f2330`, `--border: rgba(255,255,255,.08)`, `--text: #e5e7ef`, `--text-dim: #9aa1b5`, `--accent: #818cf8`, `--green: #34d399`, `--red: #f87171`, `--amber: #fbbf24`, `--radius: 12px`.
- Typography stays on the `system-ui` font stack; `tabular-nums` kept for time displays.
- Grid layout unchanged: `minmax(0, 3fr) minmax(0, 2fr)`, 1-column under 900px.
- Transitions ~150ms, on hover/focus states only.
- All commands run from the repo root: `/Users/jared/github_projects/timed-subtitles-web`.
- `npm test` (25 tests) and `npm run build` must pass before committing.

---

### Task 1: Dark theme stylesheets

**Files:**
- Modify: `src/index.css` (full replace)
- Modify: `src/App.css` (full replace)
- Modify: `src/App.tsx` (one className)

**Interfaces:**
- Consumes: existing class names only — `.app`, `header`, `.header-actions`, `.progress`, `.confirm-reset`, `.hint`, `.error`, `.video-panel`, `.video-placeholder`, `.file-label`, `.video-meta`, `.video-name`, `.change-video`, `.timing-controls`, `.current-line`, `.line-number`, `.line-text`, `.capture-buttons`, `.start-btn`, `.end-btn`, `.setup-panel`, `.line-list`, `.times`, `.overlap`, `.privacy-note`, `.export-mp4`, `.export-error`, plus li states `.active`/`.done`.
- Produces: one new class, `reset-all-btn`, used only by the header's Reset-all trigger button.

There is no unit-test surface for CSS — verification is tsc/vite build, the untouched 25-test suite, and a browser screenshot pass which the CONTROLLER performs after this task (note the deferral in your report).

- [ ] **Step 1: Replace `src/index.css`**

Full new contents:

```css
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
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 2: Replace `src/App.css`**

Full new contents:

```css
* {
  box-sizing: border-box;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
}

/* ---------- header ---------- */

header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0 -1.5rem 1.25rem;
  padding: 0.85rem 1.5rem;
  background: rgba(15, 17, 23, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

header h1 {
  font-size: 1.25rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.progress {
  color: var(--text-dim);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.confirm-reset {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--red);
  background: var(--red-tint);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 999px;
  padding: 0.3rem 0.4rem 0.3rem 0.9rem;
  font-size: 0.9rem;
}

/* ---------- layout ---------- */

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

/* ---------- cards ---------- */

.video-panel,
.timing-controls,
.setup-panel,
.line-list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1rem;
}

.setup-panel h2,
.line-list h2 {
  margin: 0 0 0.6rem;
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

/* ---------- buttons ---------- */

button {
  font: inherit;
  color: var(--text);
  padding: 0.45rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

button:hover:not(:disabled) {
  background: #262b3b;
  border-color: rgba(255, 255, 255, 0.16);
}

button:active:not(:disabled) {
  transform: translateY(1px);
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.reset-all-btn {
  background: transparent;
  color: var(--text-dim);
}

.reset-all-btn:hover:not(:disabled) {
  background: var(--red-tint);
  border-color: rgba(248, 113, 113, 0.4);
  color: var(--red);
}

/* filled buttons — keep after the base hover rule so these win */

.setup-panel button {
  margin-top: 0.75rem;
  background: var(--accent);
  border-color: transparent;
  color: var(--on-accent);
  font-weight: 600;
}

.setup-panel button:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: transparent;
}

.start-btn {
  background: var(--green);
  border-color: transparent;
  color: var(--on-green);
  font-weight: 600;
}

.start-btn:hover:not(:disabled) {
  background: var(--green);
  border-color: transparent;
  filter: brightness(1.1);
}

.end-btn {
  background: var(--red);
  border-color: transparent;
  color: var(--on-red);
  font-weight: 600;
}

.end-btn:hover:not(:disabled) {
  background: var(--red);
  border-color: transparent;
  filter: brightness(1.1);
}

/* ---------- shared text ---------- */

.hint {
  color: var(--text-dim);
  font-size: 0.9rem;
}

.error {
  color: var(--red);
  margin: 0.6rem 0 0;
}

/* ---------- video panel ---------- */

.video-panel video {
  display: block;
  width: 100%;
  border-radius: 8px;
  background: #000;
}

.video-placeholder {
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: var(--radius);
  padding: 3rem 1.5rem;
  text-align: center;
}

.file-label {
  display: inline-block;
  padding: 0.55rem 1.2rem;
  border-radius: 8px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.file-label:hover {
  background: var(--accent-hover);
}

.file-label input {
  display: none;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.video-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-dim);
}

.change-video {
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-dim);
  transition: color 150ms ease;
}

.change-video:hover {
  color: var(--accent);
}

.change-video input {
  display: none;
}

/* ---------- timing controls ---------- */

.timing-controls {
  margin-top: 1rem;
}

.line-number {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
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

/* ---------- setup panel ---------- */

.setup-panel textarea {
  width: 100%;
  font: inherit;
  color: var(--text);
  padding: 0.7rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  resize: vertical;
  transition: border-color 150ms ease;
}

.setup-panel textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* ---------- line list ---------- */

.line-list ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 70vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.line-list ol::-webkit-scrollbar {
  width: 8px;
}

.line-list ol::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.line-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background 150ms ease;
}

.line-list li:hover {
  background: var(--surface-2);
}

.line-list li.active {
  border-left-color: var(--accent);
  background: var(--accent-tint);
}

.line-list li.done > .line-text {
  color: var(--green);
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
  color: var(--text);
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  transition: border-color 150ms ease;
}

.line-list input:focus {
  outline: none;
  border-color: var(--accent);
}

.overlap {
  color: var(--amber);
}

/* ---------- misc ---------- */

.privacy-note {
  color: var(--green);
  opacity: 0.8;
  font-size: 0.85rem;
  margin: 0.6rem 0 0;
}

.video-placeholder .privacy-note {
  margin-top: 1.2rem;
}

.export-mp4 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.export-error {
  color: var(--red);
  font-size: 0.85rem;
}
```

- [ ] **Step 3: Add the `reset-all-btn` class in `src/App.tsx`**

In the header JSX, the Reset-all TRIGGER button (the one that opens the confirm, currently `<button onClick={() => setConfirmingResetAll(true)}>Reset all</button>`) becomes:

```tsx
<button className="reset-all-btn" onClick={() => setConfirmingResetAll(true)}>
  Reset all
</button>
```

Do NOT touch the confirm button inside `.confirm-reset` (it keeps default styling) or anything else in the file.

- [ ] **Step 4: Typecheck and run the suite**

Run: `npm run build`
Expected: tsc and vite build succeed with no errors.

Run: `npm test`
Expected: PASS — 4 files, 25 tests (untouched).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.css src/App.tsx
git commit -m "feat: restyle app with modern dark theme"
```

---

### Controller follow-up (not a subagent task)

Browser screenshot verification per the spec: setup phase (empty + with pasted transcript) and timing phase with video loaded — checking cards, sticky frosted header, filled accent buttons, active-line indigo bar, timed-line green, confirm pill, and focus/hover states.

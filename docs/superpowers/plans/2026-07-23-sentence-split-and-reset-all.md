# Sentence Split on Paste + Reset All Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasting a transcript into the setup textarea reformats it to one sentence per line, and a header "Reset all" button clears the video, transcript, and saved state to start from scratch.

**Architecture:** A pure `splitIntoSentences` helper in `src/lib/transcript.ts` (Intl.Segmenter + abbreviation post-merge) is wired into `SetupPanel`'s textarea via an `onPaste` handler. "Reset all" lives in the `App.tsx` header, reusing the existing inline-confirm pattern and existing `clearState()`/reset logic, plus video teardown and a `key` bump to remount `SetupPanel`.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-23-sentence-split-on-paste-design.md` (Tasks 1–2). Task 3 ("Reset all") was requested directly: a button at the top that clears the app of the video and the transcript and starts over from scratch.

## Global Constraints

- No new npm dependencies.
- Sentence segmentation locale is `'en'`.
- No fallback path for missing `Intl.Segmenter` (supported in all Vite targets and in Node for tests).
- All commands run from the repo root: `/Users/jared/github_projects/timed-subtitles-web`.
- Run `npm test` (full suite) before each commit; it must pass.

---

### Task 1: `splitIntoSentences` helper

**Files:**
- Modify: `src/lib/transcript.ts`
- Test: `src/lib/transcript.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function splitIntoSentences(text: string): string` — takes arbitrary pasted text, returns the same content with exactly one trimmed sentence per line, empty lines dropped, joined with `\n`. Task 2 imports it from `../lib/transcript`.

**Behavior notes (from spec):**
- Existing line breaks are hard breaks: splitting runs within each line, so already-formatted transcripts pass through unchanged.
- ICU's segmenter wrongly splits after title abbreviations followed by a capitalized word ("Mr. Smith" → `"Mr. "` + `"Smith…"` — verified in this repo's Node). A post-merge rejoins a segment ending in Mr / Mrs / Ms / Dr / Prof / St / e.g / i.e (each followed by `.`) with the next segment. "etc.", "Jr.", "Sr." are deliberately NOT merged — they frequently end real sentences.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/transcript.test.ts` (keep the existing `parseTranscript` suite; extend the import on line 2 to `import { parseTranscript, splitIntoSentences } from './transcript';`):

```ts
describe('splitIntoSentences', () => {
  it('puts each sentence on its own line', () => {
    expect(splitIntoSentences('First sentence. Second sentence! Third?')).toBe(
      'First sentence.\nSecond sentence!\nThird?',
    );
  });

  it('keeps title abbreviations with their sentence', () => {
    expect(splitIntoSentences('Mr. Smith went home. Then Dr. Jones slept.')).toBe(
      'Mr. Smith went home.\nThen Dr. Jones slept.',
    );
  });

  it('treats existing line breaks as hard breaks', () => {
    expect(splitIntoSentences('Line one stays\nLine two. And three.')).toBe(
      'Line one stays\nLine two.\nAnd three.',
    );
  });

  it('passes already-formatted transcripts through unchanged', () => {
    expect(splitIntoSentences('First line\nSecond line')).toBe('First line\nSecond line');
  });

  it('trims sentences and drops empty lines', () => {
    expect(splitIntoSentences('  One.   \n\n  Two.  ')).toBe('One.\nTwo.');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(splitIntoSentences('   \n  ')).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/transcript.test.ts`
Expected: FAIL — the whole file fails to load because `./transcript` does not provide an export named `splitIntoSentences` (this also takes down the existing `parseTranscript` tests for this run; that is expected).

- [ ] **Step 3: Write the implementation**

Append to `src/lib/transcript.ts`:

```ts
const SENTENCE_SEGMENTER = new Intl.Segmenter('en', { granularity: 'sentence' });

// ICU breaks after title abbreviations when a capitalized word follows
// ("Mr. Smith"), so segments ending in these are rejoined with the next one.
// "etc.", "Jr.", "Sr." are excluded — they often legitimately end a sentence.
const TRAILING_ABBREVIATION = /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St)|\be\.g|\bi\.e)\.$/;

function segmentSentences(line: string): string[] {
  const merged: string[] = [];
  for (const { segment } of SENTENCE_SEGMENTER.segment(line)) {
    const prev = merged[merged.length - 1];
    if (prev !== undefined && TRAILING_ABBREVIATION.test(prev.trimEnd())) {
      merged[merged.length - 1] = prev + segment;
    } else {
      merged.push(segment);
    }
  }
  return merged.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function splitIntoSentences(text: string): string {
  return text.split(/\r?\n/).flatMap(segmentSentences).join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/transcript.test.ts`
Expected: PASS — 11 tests (5 existing + 6 new).

- [ ] **Step 5: Run the full suite and commit**

```bash
npm test
git add src/lib/transcript.ts src/lib/transcript.test.ts
git commit -m "feat: add splitIntoSentences helper for one-sentence-per-line"
```

---

### Task 2: Split sentences on paste in SetupPanel

**Files:**
- Modify: `src/components/SetupPanel.tsx`

**Interfaces:**
- Consumes: `splitIntoSentences(text: string): string` from `../lib/transcript` (Task 1).
- Produces: no new exports; `SetupPanel`'s props are unchanged.

There is no component-test infrastructure in this repo (no jsdom/@testing-library) — do not add any. Verification is typecheck + full suite + manual check in the dev server.

- [ ] **Step 1: Wire the paste handler**

Replace the full contents of `src/components/SetupPanel.tsx` with:

```tsx
import { useState, type ClipboardEvent } from 'react';
import { splitIntoSentences } from '../lib/transcript';

interface Props {
  onStartTiming: (transcript: string) => void;
}

export function SetupPanel({ onStartTiming }: Props) {
  const [text, setText] = useState('');
  const canStart = text.trim().length > 0;

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    const el = e.currentTarget;
    const split = splitIntoSentences(pasted);
    setText(text.slice(0, el.selectionStart) + split + text.slice(el.selectionEnd));
  }

  return (
    <section className="setup-panel">
      <h2>Transcript</h2>
      <p className="hint">Paste your transcript — sentences are split one per row.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
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

Notes: only the paste path reformats — typing is untouched. After a paste the caret lands at the end of the textarea (controlled-value replacement); acceptable since the primary flow is pasting a whole transcript into an empty box.

- [ ] **Step 2: Typecheck and run the suite**

Run: `npm run build`
Expected: tsc and vite build succeed with no errors.

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open the printed localhost URL, and paste this into the transcript box:

```
Hello there. This is Mr. Smith speaking! Are you ready? Let's begin.
```

Expected textarea content — four lines:

```
Hello there.
This is Mr. Smith speaking!
Are you ready?
Let's begin.
```

Also type a `.` mid-line manually and confirm typing does NOT trigger any reformatting.

- [ ] **Step 4: Commit**

```bash
git add src/components/SetupPanel.tsx
git commit -m "feat: split pasted transcript into one sentence per line"
```

---

### Task 3: "Reset all" button in the header

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: existing `clearState()` from `./lib/storage`, existing `handleResetTranscript()` in `App.tsx:117-125`.
- Produces: no new exports.

**Behavior:** A "Reset all" button always visible in the header. Clicking it shows the existing inline confirm pattern (`.confirm-reset` styling, Confirm/Cancel); confirming clears saved localStorage state, all lines/timings, the loaded video (revoking its object URL), and the setup textarea, returning to a pristine setup phase. Do NOT use `window.confirm` — follow the app's existing inline-confirm pattern (see `App.tsx:140-148`).

- [ ] **Step 1: Add state and handler**

In `src/App.tsx`, next to the existing `confirmingReset` state (line 33), add:

```tsx
const [confirmingResetAll, setConfirmingResetAll] = useState(false);
const [setupKey, setSetupKey] = useState(0);
```

Below `handleResetTranscript` (after line 125), add:

```tsx
function handleResetAll() {
  handleResetTranscript();
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  setVideoUrl(null);
  setVideoName('');
  setVideoFile(null);
  setConfirmingResetAll(false);
  setSetupKey((k) => k + 1);
}
```

(`handleResetTranscript` already calls `clearState()`, empties `lines`, resets `activeIndex`/`captureError`/`restored`, and returns to the setup phase.)

- [ ] **Step 2: Render the button in the header**

Currently `.header-actions` only renders when `phase === 'timing'` (`App.tsx:135-162`). Restructure so the div always renders, with "Reset all" first and the timing-only actions inside a fragment. Replace the `{phase === 'timing' && (...)}` header block with:

```tsx
<div className="header-actions">
  {confirmingResetAll ? (
    <span className="confirm-reset">
      Clears the video and transcript.
      <button onClick={handleResetAll}>Reset all</button>
      <button onClick={() => setConfirmingResetAll(false)}>Cancel</button>
    </span>
  ) : (
    <button onClick={() => setConfirmingResetAll(true)}>Reset all</button>
  )}
  {phase === 'timing' && (
    <>
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
      <ExportMp4Button
        videoFile={videoFile}
        allTimed={allTimed}
        getSrt={() => generateSrt(lines)}
      />
    </>
  )}
</div>
```

- [ ] **Step 3: Remount SetupPanel on reset**

In the JSX (`App.tsx:186`), pass the key so the textarea's local `text` state is discarded on reset:

```tsx
<SetupPanel key={setupKey} onStartTiming={handleStartTiming} />
```

- [ ] **Step 4: Typecheck and run the suite**

Run: `npm run build`
Expected: tsc and vite build succeed with no errors.

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, then:

1. Load a video file and paste a transcript; click "Start timing"; time at least one line.
2. Click "Reset all" → inline "Clears the video and transcript." confirm appears; click "Cancel" → nothing changes.
3. Click "Reset all" → confirm → app returns to setup phase: no video loaded, empty textarea, progress gone.
4. Reload the page → app stays in setup phase (localStorage was cleared, nothing restored).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Reset all button to clear video, transcript, and saved state"
```

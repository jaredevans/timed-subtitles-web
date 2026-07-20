# MP4 Subtitle Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-browser "Export MP4" action that muxes the timed subtitles into the user's video as an embedded `tx3g`/`mov_text` track, producing a QuickTime/VLC/IINA-playable `.mp4` — entirely client-side, no upload.

**Architecture:** A lazy-loaded single-threaded ffmpeg.wasm remuxes (`-c copy`, no re-encode) the local video plus a generated SRT into an MP4 with a default-on subtitle track. The ~30 MB core is self-hosted (copied into `public/ffmpeg/` at build time). A dedicated `ExportMp4Button` component owns all async/progress/error state; the existing "Export SRT" path is untouched.

**Tech Stack:** React 19 + TypeScript + Vite 6, `@ffmpeg/ffmpeg` + `@ffmpeg/util` + `@ffmpeg/core` (single-threaded UMD), Vitest.

## Global Constraints

- **Single-threaded core only** — `@ffmpeg/core` (NOT `@ffmpeg/core-mt`). No `SharedArrayBuffer`, no COOP/COEP headers, no nginx changes.
- **Self-hosted core** — load `ffmpeg-core.js`/`ffmpeg-core.wasm` from `import.meta.env.BASE_URL + 'ffmpeg/…'`, never a CDN. Video bytes never leave the browser.
- **ffmpeg command is exactly:** `-i <input> -i subs.srt -c copy -c:s mov_text -metadata:s:s:0 language=eng -disposition:s:0 default output.mp4`
- **Additive** — "Export SRT" behavior and code stay exactly as they are. An MP4 failure must never affect SRT export or timing state.
- **Package versions:** `@ffmpeg/ffmpeg@^0.12.15`, `@ffmpeg/util@^0.12.2`, `@ffmpeg/core@^0.12.10`. Core UMD files live at `node_modules/@ffmpeg/core/dist/umd/`.
- **Base path:** the app is built with `base: '/timed-subtitles/'`; all asset URLs must respect `import.meta.env.BASE_URL`.

---

### Task 1: Dependencies, self-hosted core copy, build wiring

**Files:**
- Modify: `package.json` (dependencies + `build` script)
- Create: `scripts/copy-ffmpeg-core.mjs`
- Modify: `.gitignore` (add `public/ffmpeg`)

**Interfaces:**
- Consumes: nothing.
- Produces: after `npm run build` (or running the script directly), `public/ffmpeg/ffmpeg-core.js` and `public/ffmpeg/ffmpeg-core.wasm` exist and are copied into `dist/ffmpeg/`. Runtime code will load them from `import.meta.env.BASE_URL + 'ffmpeg/…'`.

- [ ] **Step 1: Install the ffmpeg packages**

Run:
```bash
npm install @ffmpeg/ffmpeg@^0.12.15 @ffmpeg/util@^0.12.2 @ffmpeg/core@^0.12.10
```
Expected: packages added to `dependencies` in `package.json`; `node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm` exists.

- [ ] **Step 2: Verify the core UMD files are present**

Run:
```bash
ls -la node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm
```
Expected: both files listed (the `.wasm` is ~30 MB).

- [ ] **Step 3: Write the copy script**

Create `scripts/copy-ffmpeg-core.mjs`:
```js
// Copies the single-threaded ffmpeg.wasm core into public/ffmpeg/ so Vite
// bundles it into dist/. Keeps the ~30 MB out of git (public/ffmpeg is
// gitignored) while guaranteeing it is present in every build.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const destDir = join(root, 'public', 'ffmpeg');
const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

mkdirSync(destDir, { recursive: true });
for (const f of files) {
  const src = join(srcDir, f);
  if (!existsSync(src)) {
    console.error(`[copy-ffmpeg-core] Missing ${src}. Run \`npm install\` first.`);
    process.exit(1);
  }
  copyFileSync(src, join(destDir, f));
  console.log(`[copy-ffmpeg-core] Copied ${f}`);
}
```

- [ ] **Step 4: Run the copy script and verify output**

Run:
```bash
node scripts/copy-ffmpeg-core.mjs && ls -la public/ffmpeg/
```
Expected: two "Copied …" log lines; `public/ffmpeg/ffmpeg-core.js` and `public/ffmpeg/ffmpeg-core.wasm` present.

- [ ] **Step 5: Gitignore the copied core**

Add this line to `.gitignore`:
```
public/ffmpeg
```

- [ ] **Step 6: Wire the copy into the build script**

In `package.json`, change the `build` script from:
```json
"build": "tsc && vite build",
```
to:
```json
"build": "node scripts/copy-ffmpeg-core.mjs && tsc && vite build",
```

- [ ] **Step 7: Full build and verify the core lands in dist**

Run:
```bash
npm run build && ls -la dist/ffmpeg/
```
Expected: build succeeds; `dist/ffmpeg/ffmpeg-core.js` and `dist/ffmpeg/ffmpeg-core.wasm` present.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json scripts/copy-ffmpeg-core.mjs .gitignore
git commit -m "build: add ffmpeg.wasm deps and self-hosted core copy step"
```

---

### Task 2: Pure helpers — `buildFfmpegArgs` and `outputFileName`

**Files:**
- Create: `src/lib/mp4.ts`
- Test: `src/lib/mp4.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `buildFfmpegArgs(inputName: string, outName: string): string[]`
  - `outputFileName(videoName: string): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/mp4.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildFfmpegArgs, outputFileName } from './mp4';

describe('outputFileName', () => {
  it('strips the extension and appends -subtitled.mp4', () => {
    expect(outputFileName('talk.mov')).toBe('talk-subtitled.mp4');
    expect(outputFileName('a.b.mp4')).toBe('a.b-subtitled.mp4');
  });
  it('falls back to a default base when the name has no usable stem', () => {
    expect(outputFileName('')).toBe('video-subtitled.mp4');
    expect(outputFileName('.mp4')).toBe('video-subtitled.mp4');
  });
});

describe('buildFfmpegArgs', () => {
  it('produces a remux command with a default-on mov_text track', () => {
    expect(buildFfmpegArgs('input.mp4', 'output.mp4')).toEqual([
      '-i', 'input.mp4',
      '-i', 'subs.srt',
      '-c', 'copy',
      '-c:s', 'mov_text',
      '-metadata:s:s:0', 'language=eng',
      '-disposition:s:0', 'default',
      'output.mp4',
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/mp4.test.ts`
Expected: FAIL — cannot resolve `./mp4` (module does not exist yet).

- [ ] **Step 3: Implement the pure helpers**

Create `src/lib/mp4.ts`:
```ts
// Pure helpers for the MP4 export. Kept side-effect-free so they are unit
// testable without a browser/wasm environment.

/** Derive the download filename: strip the source extension, add a suffix. */
export function outputFileName(videoName: string): string {
  const base = videoName.replace(/\.[^./\\]+$/, '').trim();
  return (base || 'video') + '-subtitled.mp4';
}

/** ffmpeg args to remux `inputName` + `subs.srt` into `outName` with a
 *  default-on mov_text (tx3g) subtitle track. No re-encode (`-c copy`). */
export function buildFfmpegArgs(inputName: string, outName: string): string[] {
  return [
    '-i', inputName,
    '-i', 'subs.srt',
    '-c', 'copy',
    '-c:s', 'mov_text',
    '-metadata:s:s:0', 'language=eng',
    '-disposition:s:0', 'default',
    outName,
  ];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/mp4.test.ts`
Expected: PASS (5 assertions across 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mp4.ts src/lib/mp4.test.ts
git commit -m "feat: add pure ffmpeg arg + output filename helpers"
```

---

### Task 3: ffmpeg orchestration — `loadFfmpeg` and `exportMp4WithSubtitles`

**Files:**
- Modify: `src/lib/mp4.ts` (append the impure orchestration; the pure helpers from Task 2 stay unchanged)

**Interfaces:**
- Consumes: `buildFfmpegArgs`, `outputFileName` (Task 2); `FFmpeg` from `@ffmpeg/ffmpeg`; `fetchFile`, `toBlobURL` from `@ffmpeg/util` (Task 1 deps).
- Produces:
  - `type Mp4Phase = 'loading-engine' | 'muxing' | 'done'`
  - `exportMp4WithSubtitles(file: File, srt: string, onPhase?: (p: Mp4Phase) => void): Promise<{ blob: Blob; fileName: string }>`

**Note:** This task has no automated test — the mux requires a browser Worker + wasm that Vitest cannot run. Verification is a typecheck here plus the manual browser test in Task 6. Do not write a Vitest test that imports `@ffmpeg/ffmpeg`.

- [ ] **Step 1: Append the orchestration code to `src/lib/mp4.ts`**

Add to the end of `src/lib/mp4.ts`:
```ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type Mp4Phase = 'loading-engine' | 'muxing' | 'done';

let ffmpegSingleton: FFmpeg | null = null;

/** Load the single-threaded core once from self-hosted assets and cache it. */
async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  const ffmpeg = new FFmpeg();
  const base = import.meta.env.BASE_URL + 'ffmpeg';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  ffmpegSingleton = ffmpeg;
  return ffmpeg;
}

/** ffmpeg keys the input demuxer partly off the extension; preserve it. */
function inputNameFor(videoName: string): string {
  const m = videoName.match(/\.([^./\\]+)$/);
  const ext = m ? m[1].toLowerCase() : 'mp4';
  return `input.${ext}`;
}

/** Remux the local video + SRT into an MP4 with an embedded, default-on
 *  subtitle track. Runs entirely in-browser; the video never leaves. */
export async function exportMp4WithSubtitles(
  file: File,
  srt: string,
  onPhase?: (p: Mp4Phase) => void,
): Promise<{ blob: Blob; fileName: string }> {
  onPhase?.('loading-engine');
  const ffmpeg = await loadFfmpeg();

  const inputName = inputNameFor(file.name);
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.writeFile('subs.srt', new TextEncoder().encode(srt));

  onPhase?.('muxing');
  await ffmpeg.exec(buildFfmpegArgs(inputName, 'output.mp4'));

  const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
  const blob = new Blob([data], { type: 'video/mp4' });

  // Best-effort cleanup so repeat exports don't accumulate MEMFS files.
  for (const name of [inputName, 'subs.srt', 'output.mp4']) {
    try {
      await ffmpeg.deleteFile(name);
    } catch {
      /* ignore */
    }
  }

  onPhase?.('done');
  return { blob, fileName: outputFileName(file.name) };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `import.meta.env` errors, confirm `tsconfig.json` still has `"types": ["vite/client"]` — it does by default in this repo.)

- [ ] **Step 3: Run the full unit suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS, including the Task 2 `mp4.test.ts` (the new impure exports are untested but must not break existing tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/mp4.ts
git commit -m "feat: add ffmpeg.wasm mux orchestration for MP4 export"
```

---

### Task 4: Retain the selected `File` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `videoFile: File | null` in `App` state, set whenever a video is selected. Consumed by Task 5's button.

**Rationale:** The app currently discards the `File` after `URL.createObjectURL`. ffmpeg needs the raw bytes. `videoFile` follows the same lifecycle as `videoUrl`: set on selection, replaced on re-selection. It is NOT cleared by "Edit transcript" (that keeps the loaded video). After a localStorage restore it starts `null` until the user re-selects, which correctly disables MP4 export.

- [ ] **Step 1: Add the `videoFile` state**

In `src/App.tsx`, immediately after this line:
```tsx
  const [videoName, setVideoName] = useState('');
```
add:
```tsx
  const [videoFile, setVideoFile] = useState<File | null>(null);
```

- [ ] **Step 2: Store the File on selection**

In `handleFileSelected`, change:
```tsx
  function handleFileSelected(file: File) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
  }
```
to:
```tsx
  function handleFileSelected(file: File) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
    setVideoFile(file);
  }
```

- [ ] **Step 3: Typecheck (temporary unused-var is expected)**

Run: `npx tsc --noEmit`
Expected: an error that `videoFile` is declared but never read (`noUnusedLocals`). This is expected — Task 5 consumes it. Proceed; do not "fix" it by removing the state.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: retain selected video File for MP4 export"
```

---

### Task 5: `ExportMp4Button` component + header wiring

**Files:**
- Create: `src/components/ExportMp4Button.tsx`
- Modify: `src/App.tsx` (import + render in header actions)
- Modify: `src/App.css` (minimal styles for the inline error/progress)

**Interfaces:**
- Consumes: `exportMp4WithSubtitles`, `Mp4Phase` (Task 3); `videoFile` (Task 4); `generateSrt` (existing `src/lib/srt.ts`).
- Produces: `<ExportMp4Button videoFile allTimed getSrt />` rendered next to "Export SRT".

- [ ] **Step 1: Create the component**

Create `src/components/ExportMp4Button.tsx`:
```tsx
import { useState } from 'react';
import { exportMp4WithSubtitles, type Mp4Phase } from '../lib/mp4';

// Soft warning threshold: the 32-bit single-threaded wasm (~2 GB address
// space) holds input + output in MEMFS, so large files risk OOM.
const LARGE_FILE_BYTES = 600 * 1024 * 1024;

const PHASE_LABEL: Record<Mp4Phase, string> = {
  'loading-engine': 'Loading engine (~30 MB)…',
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
    ? 'Time all lines to enable export'
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
      setError(e instanceof Error ? e.message : 'MP4 export failed.');
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
```

- [ ] **Step 2: Import the component in `App.tsx`**

In `src/App.tsx`, after the existing component imports (e.g. after the `LineList` import), add:
```tsx
import { ExportMp4Button } from './components/ExportMp4Button';
```
And ensure `generateSrt` is imported (it already is: `import { generateSrt } from './lib/srt';`).

- [ ] **Step 3: Render the button next to "Export SRT"**

In `src/App.tsx`, find the "Export SRT" button:
```tsx
            <button
              disabled={!allTimed}
              onClick={handleExport}
              title={allTimed ? undefined : 'Time all lines to enable export'}
            >
              Export SRT
            </button>
```
Immediately AFTER that closing `</button>`, add:
```tsx
            <ExportMp4Button
              videoFile={videoFile}
              allTimed={allTimed}
              getSrt={() => generateSrt(lines)}
            />
```

- [ ] **Step 4: Add minimal styles**

Append to `src/App.css`:
```css
.export-mp4 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.export-error {
  color: #b00020;
  font-size: 0.85rem;
}
```

- [ ] **Step 5: Typecheck (the Task 4 unused-var error must now be gone)**

Run: `npx tsc --noEmit`
Expected: no errors (`videoFile` is now consumed).

- [ ] **Step 6: Run the unit suite**

Run: `npm test`
Expected: PASS (no regressions; UI has no unit tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/ExportMp4Button.tsx src/App.tsx src/App.css
git commit -m "feat: add Export MP4 button with progress, warning, and errors"
```

---

### Task 6: Manual browser verification + deploy

**Files:** none (verification + deploy only).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a verified, deployed feature at `https://zappy.jaredlog.com/timed-subtitles/`.

This task is **not automated** — it confirms the wasm mux actually works end-to-end in a browser and that the output plays with subtitles.

- [ ] **Step 1: Build and preview locally**

Run:
```bash
npm run build && npm run preview
```
Expected: build succeeds; preview server prints a local URL. Because the app has `base: '/timed-subtitles/'`, open the URL Vite prints **with** the `/timed-subtitles/` path (e.g. `http://localhost:4173/timed-subtitles/`).

- [ ] **Step 2: Exercise the flow**

In the browser:
1. Select a short (< 1 min) MP4 or MOV video.
2. Paste a few transcript lines, click "Start timing".
3. Time every line (Start/End for each) until "N / N lines timed".
4. Confirm "Export MP4" is now enabled. Click it.
5. Watch the button show "Loading engine (~30 MB)…" then "Muxing…".
6. Confirm an `<name>-subtitled.mp4` file downloads.

Expected: no console errors; a non-empty `.mp4` downloads. If loading the engine throws a worker-related error, pass an explicit class worker URL in `loadFfmpeg` — `classWorkerURL: new URL('@ffmpeg/ffmpeg/dist/esm/worker.js', import.meta.url).toString()` — rebuild, and re-test. (Vite normally bundles the worker automatically, so try without it first.)

- [ ] **Step 3: Verify playback with subtitles**

- Open the downloaded `.mp4` in **QuickTime Player** → subtitles should appear automatically (default disposition); confirm via View → Subtitles that an "English" track is listed.
- Open the same file in **VLC** → subtitles should appear; confirm under Subtitle → Sub Track.

Expected: both players show the timed subtitles.

- [ ] **Step 4: Verify the negative/edge states**

- Reload the page (localStorage restore): the video is not re-selected → "Export MP4" is disabled with tooltip "Re-select the video to export MP4". "Export SRT" is likewise gated by timing, unaffected otherwise.
- Before all lines are timed: "Export MP4" is disabled with tooltip "Time all lines to enable export".

Expected: disabled states and tooltips as described.

- [ ] **Step 5: Deploy**

The production site serves `dist/` directly via nginx (no reload needed). The `npm run build` in Step 1 already regenerated `dist/` (including `dist/ffmpeg/`). Confirm the core is live:
```bash
curl -sI https://zappy.jaredlog.com/timed-subtitles/ffmpeg/ffmpeg-core.wasm | grep -iE 'HTTP|content-type|content-length'
```
Expected: `HTTP/2 200`, `content-type: application/wasm` (or `application/octet-stream`), a large `content-length`.

- [ ] **Step 6: Update the README**

Add a short "Export MP4 (with subtitles)" note to `README.md` describing the new button and that QuickTime needs the embedded track (VLC/IINA also read plain SRT). Then commit:
```bash
git add README.md
git commit -m "docs: document MP4-with-subtitles export"
```

---

## Notes for the implementer

- **Do not** switch to `@ffmpeg/core-mt` or add COOP/COEP headers — single-threaded is intentional (see Global Constraints).
- **Do not** add a transcode fallback for incompatible codecs — out of scope. Surface the ffmpeg error to the user (already handled in Task 5's `catch`).
- The `-c copy` remux is near-instant; there is no meaningful percentage progress to show, which is why the UI shows discrete phases rather than a progress bar.

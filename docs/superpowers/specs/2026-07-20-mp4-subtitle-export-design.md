# Design: In-browser MP4 subtitle export (ffmpeg.wasm)

**Date:** 2026-07-20
**Status:** Approved

## Goal

Add a second export path that muxes the timed subtitles into the user's video as
an embedded `tx3g` (a.k.a. `mov_text`) subtitle track, producing a
`.mp4` the user can play in QuickTime Player, VLC, and IINA with subtitles
available (and shown by default). The work runs entirely in the browser — the
video never leaves the machine, preserving the app's existing privacy property.

The existing "Export SRT" path is unchanged and remains available.

## Why tx3g / mov_text

QuickTime Player on macOS does not load sidecar `.srt` files; it only shows
subtitle tracks embedded inside the `.mp4`/`.mov` container, in the `tx3g`
format. VLC and IINA read both sidecar SRT and the embedded track. Embedding
therefore yields a single file that works across all three players. The
`-disposition:s:0 default` flag marks the track as default so players display it
automatically rather than requiring a manual toggle.

## Decisions

- **Single-threaded ffmpeg.wasm** (`@ffmpeg/core`, UMD). No `SharedArrayBuffer`,
  so **no COOP/COEP headers** and **no nginx changes**. Because the operation is
  a remux (`-c copy`, no re-encode), the multi-threaded build buys nothing.
- **Self-hosted core.** The ~30 MB core (`ffmpeg-core.js` + `ffmpeg-core.wasm`)
  is served first-party from `dist/`, not a CDN. Fully offline-capable, no
  external origin. The core is static code and never receives video data.
- **Additive UX.** Keep "Export SRT"; add a separate "Export MP4" action. A
  failure in one never affects the other.

## Architecture

### 1. Dependencies & self-hosted core assets

Add runtime deps: `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@ffmpeg/core`.

A prebuild script `scripts/copy-ffmpeg-core.mjs` copies the UMD core files from
`node_modules/@ffmpeg/core/dist/umd/` into `public/ffmpeg/`:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`

`public/ffmpeg/` is added to `.gitignore` so the ~30 MB does not enter git, but
Vite copies `public/` verbatim into `dist/`, so the assets are present in every
build and served at `/timed-subtitles/ffmpeg/…` (respecting the configured
`base`).

`package.json` build script becomes:

```
"build": "node scripts/copy-ffmpeg-core.mjs && tsc && vite build"
```

The copy script fails loudly if the source files are missing (e.g. deps not
installed), so a broken build never silently ships without the core.

### 2. New module `src/lib/mp4.ts`

Responsibilities and interface:

- `buildFfmpegArgs(inputName: string, outName: string): string[]` — **pure**,
  unit-tested. Returns:

  ```
  ['-i', inputName, '-i', 'subs.srt',
   '-c', 'copy', '-c:s', 'mov_text',
   '-metadata:s:s:0', 'language=eng',
   '-disposition:s:0', 'default',
   outName]
  ```

- `outputFileName(videoName: string): string` — **pure**, unit-tested. Strips the
  original extension and appends `-subtitled.mp4` (e.g. `talk.mov` →
  `talk-subtitled.mp4`). The suffix avoids clobbering the original file name on
  download.

- `loadFfmpeg(): Promise<FFmpeg>` — lazy singleton. Constructs the `FFmpeg`
  instance and calls `load()` with `coreURL`/`wasmURL` built via `toBlobURL`
  from `import.meta.env.BASE_URL + 'ffmpeg/…'`. Invoked only on first MP4 export,
  so the ~30 MB download never affects initial page load.

- `exportMp4WithSubtitles(file: File, srt: string, onPhase?: (p: Phase) => void):
  Promise<Blob>` — orchestration:
  1. `onPhase('loading-engine')`, `await loadFfmpeg()`
  2. write the video (`fetchFile(file)`) to a virtual input path whose extension
     matches the source (`input.<ext>`), and `subs.srt` (UTF-8 encoded)
  3. `onPhase('muxing')`, `ffmpeg.exec(buildFfmpegArgs(...))`
  4. read `output.mp4`, return it as a `Blob` (`type: 'video/mp4'`)
  5. `onPhase('done')`

  `Phase = 'loading-engine' | 'muxing' | 'done'`.

### 3. State change in `App.tsx`

Currently the app keeps only an object URL (`videoUrl`) and `videoName`; the
`File` object is discarded after `URL.createObjectURL`. ffmpeg needs the raw
bytes, so:

- Add `videoFile: File | null` state, set in `handleFileSelected`, replaced on
  re-selection. It follows the same lifecycle as `videoUrl`. It is **not**
  cleared by "Edit transcript" (`handleResetTranscript`), which keeps the loaded
  video.
- After a localStorage restore, `videoFile` is `null` until the user re-selects
  the video (object URLs and Files do not persist across reloads). MP4 export is
  disabled in that state with an explanatory tooltip. SRT export is unaffected.

### 4. UX — `src/components/ExportMp4Button.tsx`

A dedicated component keeps `App.tsx` lean and isolates all async/progress/error
state.

- Rendered next to "Export SRT" in the header actions.
- **Enabled only when** all lines are timed **and** `videoFile` is present.
  Tooltip explains the disabled reason ("Time all lines…" / "Re-select the video
  to export MP4").
- On click: drives `exportMp4WithSubtitles`, showing phase feedback:
  - `loading-engine` → "Loading engine (~30 MB)…" (first time only; subsequent
    exports reuse the loaded singleton)
  - `muxing` → "Muxing…"
  - `done` → triggers a download of the returned Blob as
    `outputFileName(videoName)` via a temporary anchor, then resets.
- Owns a local `busy` flag (button disabled while running) and an `error`
  string surfaced inline on failure.

### 5. Guardrails

- **Memory ceiling.** The single-threaded core is 32-bit wasm (~2 GB address
  space) and MEMFS holds both input and output, roughly doubling memory. Before
  muxing, if `file.size` exceeds a soft threshold (~600 MB), show a non-blocking
  warning: "Large file — MP4 export may run out of browser memory; SRT export
  always works." The user can proceed anyway.
- **Codec compatibility.** `-c copy` performs no re-encode (fast, lossless). If
  the source stream is container-incompatible with MP4 (rare for MP4/MOV
  sources, which are almost always H.264/AAC), ffmpeg errors; the error message
  is surfaced to the user. No transcode fallback (YAGNI).

## Error handling summary

- Missing core assets at build time → prebuild script exits non-zero.
- MP4 export failure (memory, codec, exec error) → caught in
  `ExportMp4Button`, shown inline, SRT export and timing state untouched.
- MP4 export unavailable (no `videoFile`, not all timed) → button disabled with
  tooltip; no error.

## Testing

- **Unit (Vitest):** `buildFfmpegArgs` (exact arg array, including the
  disposition/metadata flags) and `outputFileName` (extension stripping, suffix,
  fallback when name is empty).
- **Manual (browser):** the actual wasm mux cannot run under Vitest (requires a
  browser Worker + wasm). Verify end-to-end in the browser: time a short clip,
  Export MP4, confirm the downloaded file plays in QuickTime Player and VLC with
  subtitles shown by default. This step is called out explicitly in the
  implementation plan; it is not automated.

## Out of scope (YAGNI)

- Re-encoding / transcoding to fix incompatible codecs.
- Multi-threaded core and the associated cross-origin isolation.
- Styling/positioning beyond what plain `mov_text` supports.
- Burning subtitles into the video pixels (hardsub).

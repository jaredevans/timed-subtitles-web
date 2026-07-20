# Timed Subtitles

A local, in-browser tool for manually timing subtitles against a video and
exporting them — either as an SRT file or as an MP4 with the subtitles embedded
as a track. No server — your video never leaves your machine; even the MP4 muxing
runs in the browser via ffmpeg.wasm.

## Usage

1. `npm install && npm run dev`, then open http://localhost:5173
2. Choose an MP4 or MOV video file.
3. Paste your transcript. Pasted text is automatically split so each sentence
   becomes its own caption (existing line breaks are kept); edit freely, then
   click **Start timing**.
4. Play the video. The current caption is shown as an on-screen caption band
   under the video. For each caption: click **Mark start** when it begins,
   **Mark end** when it finishes. The next caption loads automatically.
   Use **⟲ 3s** to rewind, or click any caption in the list to re-time it.
   Times can also be edited directly in the list.
5. When every caption is timed, click **Export SRT** — or **Export MP4** to get
   a video with the subtitles baked in as a track (see below).

Progress is saved in your browser (localStorage) — reloading keeps your
timings; just re-select the video file. Saved progress expires **30 minutes
after your last edit** (each edit restarts the clock), so transcripts don't
linger on shared machines — export before stepping away for long. **Reset
all** (top right) clears the video, transcript, and saved progress
immediately, which is the safest habit on a shared computer.

## Export MP4 (subtitles embedded)

**Export MP4** produces a copy of your video with the subtitles embedded as a
`mov_text` (tx3g) track, marked as the default track. This is the format
**QuickTime Player** on macOS needs — it does not load sidecar `.srt` files, but
it shows an embedded track (View → Subtitles). VLC and IINA read both the
embedded track and plain `.srt`.

The muxing runs entirely in your browser via ffmpeg.wasm — the video is never
uploaded. The first export downloads a ~30 MB engine (served from this site, not
a CDN); it's cached afterward. Because it's a remux (no re-encode), it's fast and
lossless. Very large files may hit browser memory limits — **Export SRT** always
works regardless.

## Development

- `npm run dev` — dev server
- `npm test` — unit tests (Vitest)
- `npm run build` — typecheck + production build

`predev`/`build` run `scripts/copy-ffmpeg-core.mjs`, which copies the
single-threaded ffmpeg core into `public/ffmpeg/` (gitignored) so it ships
self-hosted in `dist/`. It must be the **ESM** build (`@ffmpeg/core/dist/esm`):
`@ffmpeg/ffmpeg` runs its worker as a module worker and loads the core with a
dynamic `import()`, so a UMD core (no default export) fails at runtime. The
script guards against this.

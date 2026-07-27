# Timed Subtitles

A local, in-browser tool for manually timing subtitles against a video and
exporting them — as an SRT file, a VTT file, an MP4 with the subtitles
embedded as a track, or an MP4 with the subtitles burned into the picture. No
server — your video never leaves your machine; even the MP4 muxing and
burn-in encoding run in the browser via ffmpeg.wasm.

![The Timed Subtitles interface: a video playing on the left with the current
caption band beneath it, the caption list with editable start and end times on
the right, and the export buttons across the top.](timed_subtitles.png)

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
5. When every caption is timed, click **Export SRT** or **Export VTT** for a
   subtitle file, **Export Soft-subtitled MP4** to get a video with the
   subtitles embedded as a track (see below), or **Export Burn-In subtitled
   MP4** to burn the captions into the picture itself, so they show up
   everywhere — including players that strip subtitle tracks (see below).
   `.vtt` is the format used by HTML `<track>` elements.

Progress is saved in your browser (localStorage) — reloading keeps your
timings; just re-select the video file. Saved progress expires **30 minutes
after your last edit** (each edit restarts the clock), so transcripts don't
linger on shared machines — export before stepping away for long. **Reset
all** (top right) clears the video, transcript, and saved progress
immediately, which is the safest habit on a shared computer.

## Export Soft-subtitled MP4 (subtitles embedded)

**Export Soft-subtitled MP4** produces a copy of your video with the subtitles
embedded as a `mov_text` (tx3g) track, marked as the default track. This is the
format **QuickTime Player** on macOS needs — it does not load sidecar `.srt`
files, but it shows an embedded track (View → Subtitles). VLC and IINA read
both the embedded track and plain `.srt`.

The muxing runs entirely in your browser via ffmpeg.wasm — the video is never
uploaded. The first export downloads a ~30 MB engine (served from this site, not
a CDN); it's cached afterward. Because it's a remux (no re-encode), it's fast and
lossless. Very large files may hit browser memory limits — **Export SRT** and
**Export VTT** always work regardless.

## Export Burn-In subtitled MP4 (captions in the picture)

**Export Burn-In subtitled MP4** re-encodes every frame of your video with the
subtitles drawn directly into the picture, using x264 in the browser via
ffmpeg.wasm — nothing is uploaded. Unlike the soft-subtitle export, this isn't
a remux: it's a full re-encode, so it's much slower — expect minutes rather
than seconds, and keep the tab open until it finishes. Before it starts, a
confirm dialog shows the source resolution, duration, and a rough time
estimate. Because the captions are part of the picture, they can't be turned
off in the player — that's the point: they survive platforms and players that
strip subtitle tracks. Only one MP4 export (soft-subtitled or burn-in) can run
at a time; starting one disables the other button until it finishes, while
**Export SRT** and **Export VTT** stay available throughout.

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

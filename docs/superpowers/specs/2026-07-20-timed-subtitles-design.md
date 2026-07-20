# Timed Subtitles Web App — Design Spec

**Date:** 2026-07-20
**Status:** Approved

## Purpose

A client-side web app for manually timing subtitles against a video. The user
uploads an MP4/MOV video, pastes a transcript that is already split into
subtitle lines (one per line), captures each line's start and end times by
clicking buttons while the video plays, and exports a standard SRT file.

## Architecture

- Single-page app: React + Vite + TypeScript.
- Entirely client-side; no backend. The video file is loaded locally via
  `URL.createObjectURL` into a `<video>` element and never leaves the machine.
- The SRT file is generated in the browser and downloaded via a Blob link.

## Data Model

```ts
interface SubtitleLine {
  text: string;
  start: number | null; // seconds, video.currentTime
  end: number | null;
}
```

App state: `lines: SubtitleLine[]`, `activeIndex: number`, video object URL
(transient), video file name (for display and suggested SRT filename).

## User Flow

1. **Setup** — user picks an MP4/MOV file and pastes the transcript into a
   textarea. Clicking **Start timing** splits the transcript on newlines
   (trimmed, empty lines dropped) into `SubtitleLine[]`.
2. **Timing** — the video plays with native controls plus a **⟲ 3s**
   skip-back button. Below the video: the active line's text and **Start** /
   **End** buttons.
   - **Start** captures `video.currentTime` as the active line's start.
   - **End** captures it as the end, then auto-advances to the next line
     without complete times.
3. **Corrections** — a line list shows every line with its times and status
   (untimed / partial / done). Clicking a line makes it active for
   recapture. Start/end times are directly editable in the list.
4. **Export** — enabled once all lines have both times. Generates numbered
   SRT entries (`HH:MM:SS,mmm --> HH:MM:SS,mmm`) and downloads
   `<videoname>.srt`.

## Edge Handling

- **End ≤ Start:** inline warning; the end time is not saved.
- **Editing the transcript after timing began:** requires confirmation and
  fully resets all timings.
- **Overlapping lines:** allowed (SRT permits overlap) but flagged visually
  in the line list.
- **Non-video / wrong-type file:** file input restricted to
  `video/mp4,video/quicktime,.mp4,.mov`.

## Persistence

- Lines, timings, and active index auto-save to `localStorage` on change and
  restore on load.
- The video file cannot persist; after a reload the app shows a hint to
  re-select the same file.

## Components

- `App` — owns state, persistence, phase (setup vs timing).
- `SetupPanel` — file picker + transcript textarea + Start timing button.
- `VideoPanel` — video element, skip-back, active line display, Start/End
  buttons.
- `LineList` — all lines with status, selection, inline time editing,
  overlap flags.
- `lib/transcript.ts` — transcript → lines parsing (pure).
- `lib/srt.ts` — seconds → SRT timestamp formatting and SRT generation
  (pure).

## Testing

- Vitest unit tests for `lib/transcript.ts` and `lib/srt.ts` (parsing,
  timestamp formatting incl. rounding, full SRT generation, validation).
- Interactive flow (upload, capture, export) verified manually in the
  browser.

## Out of Scope (YAGNI)

- Keyboard shortcuts, playback speed control.
- Server-side anything; multi-file projects; other subtitle formats (VTT).
- Preserving timings across transcript edits.

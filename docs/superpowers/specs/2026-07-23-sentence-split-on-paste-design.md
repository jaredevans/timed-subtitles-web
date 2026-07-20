# Sentence Split on Paste — Design

**Date:** 2026-07-23
**Status:** Approved

## Purpose

When the user pastes a transcript into the setup textarea, the pasted text is
immediately reformatted so each sentence is on its own line. The user sees and
can edit the result before clicking "Start timing". Downstream behavior is
unchanged — `parseTranscript` already turns lines into subtitle entries.

## Behavior

- On paste into the transcript textarea, the pasted text is split into
  sentences and inserted at the cursor, replacing the default paste.
- Existing line breaks in the pasted text are hard breaks: they are kept, and
  sentence splitting runs *within* each line. A transcript already formatted
  one-line-per-subtitle passes through unchanged.
- Each resulting sentence is trimmed; empty lines are dropped.
- Typing normally is untouched — only the paste path reformats.
- Weird or unsplittable input falls back to the line as-is; no new error
  states. The existing "empty text disables Start timing" rule still applies.

## Components

### `splitIntoSentences(text: string): string` — `src/lib/transcript.ts`

Pure function. Splits input on `\r?\n`, runs
`Intl.Segmenter('en', { granularity: 'sentence' })` over each line, trims each
segment, drops empties, rejoins everything with `\n`.

ICU's segmenter splits after title abbreviations when followed by a
capitalized word ("Mr. Smith" → "Mr. " + "Smith…"), so a post-merge step
rejoins any segment ending in a common abbreviation (Mr, Mrs, Ms, Dr, Prof,
St, e.g, i.e) with the segment that follows. Deliberately excluded: "etc.",
"Jr.", "Sr." — those frequently end real sentences, and merging them would
wrongly glue two sentences together.

`Intl.Segmenter` plus this heuristic is chosen over a bare regex (worse on
every abbreviation) and over a library like `sbd` (needless dependency). It
is supported in all browsers Vite targets, so no fallback path is included.

Unit-tested in `src/lib/transcript.test.ts` alongside `parseTranscript`:
multi-sentence blob, abbreviations, existing newlines preserved,
already-formatted input unchanged, empty/whitespace input.

### `SetupPanel.tsx` wiring

`onPaste` handler on the textarea: `preventDefault()`, read
`clipboardData.getData('text')`, run it through `splitIntoSentences`, insert
the result at the current cursor/selection position, and update state.

## Out of Scope

- No "Split sentences" button for re-running on typed text.
- No locale selection; segmenter locale is `'en'`.

export function parseTranscript(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

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

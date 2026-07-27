import { describe, expect, it } from 'vitest';
import { parseTranscript, splitIntoSentences } from './transcript';

describe('parseTranscript', () => {
  it('splits text into lines', () => {
    expect(parseTranscript('hello\nworld')).toEqual(['hello', 'world']);
  });

  it('drops empty and whitespace-only lines', () => {
    expect(parseTranscript('one\n\n   \ntwo\n')).toEqual(['one', 'two']);
  });

  it('handles Windows line endings', () => {
    expect(parseTranscript('a\r\nb\r\n')).toEqual(['a', 'b']);
  });

  it('trims surrounding whitespace on each line', () => {
    expect(parseTranscript('  padded  \n\ttabbed\t')).toEqual(['padded', 'tabbed']);
  });

  it('returns empty array for empty input', () => {
    expect(parseTranscript('')).toEqual([]);
  });
});

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

  it('does not merge across excluded abbreviations that end a sentence', () => {
    expect(splitIntoSentences('We packed apples, oranges, etc. Then we left.')).toBe(
      'We packed apples, oranges, etc.\nThen we left.',
    );
  });
});

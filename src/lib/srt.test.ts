import { describe, expect, it } from 'vitest';
import { formatSrtTime, generateSrt } from './srt';

describe('formatSrtTime', () => {
  it('formats zero', () => {
    expect(formatSrtTime(0)).toBe('00:00:00,000');
  });

  it('rounds to the nearest millisecond', () => {
    expect(formatSrtTime(1.2345)).toBe('00:00:01,235');
  });

  it('formats minutes and seconds', () => {
    expect(formatSrtTime(75.5)).toBe('00:01:15,500');
  });

  it('formats hours', () => {
    expect(formatSrtTime(3661.007)).toBe('01:01:01,007');
  });

  it('carries millisecond rounding into the seconds place', () => {
    expect(formatSrtTime(59.9996)).toBe('00:01:00,000');
  });
});

describe('generateSrt', () => {
  it('generates numbered entries separated by blank lines', () => {
    const srt = generateSrt([
      { text: 'First line', start: 0.5, end: 2 },
      { text: 'Second line', start: 2.25, end: 4.75 },
    ]);
    expect(srt).toBe(
      '1\n00:00:00,500 --> 00:00:02,000\nFirst line\n\n' +
        '2\n00:00:02,250 --> 00:00:04,750\nSecond line\n',
    );
  });

  it('throws if a line is missing a time', () => {
    expect(() => generateSrt([{ text: 'x', start: 1, end: null }])).toThrow(/missing/i);
  });
});

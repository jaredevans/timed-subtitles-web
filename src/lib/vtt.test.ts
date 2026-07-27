import { describe, expect, it } from 'vitest';
import { formatVttTime, generateVtt } from './vtt';

describe('formatVttTime', () => {
  it('formats zero', () => {
    expect(formatVttTime(0)).toBe('00:00:00.000');
  });

  it('rounds to the nearest millisecond', () => {
    expect(formatVttTime(1.2345)).toBe('00:00:01.235');
  });

  it('formats minutes and seconds', () => {
    expect(formatVttTime(75.5)).toBe('00:01:15.500');
  });

  it('formats hours', () => {
    expect(formatVttTime(3661.007)).toBe('01:01:01.007');
  });

  it('carries millisecond rounding into the seconds place', () => {
    expect(formatVttTime(59.9996)).toBe('00:01:00.000');
  });
});

describe('generateVtt', () => {
  it('emits a WEBVTT header and numbered cues', () => {
    const vtt = generateVtt([
      { text: 'First line', start: 0.5, end: 2 },
      { text: 'Second line', start: 2.25, end: 4.75 },
    ]);
    expect(vtt).toBe(
      'WEBVTT\n\n' +
        '1\n00:00:00.500 --> 00:00:02.000\nFirst line\n\n' +
        '2\n00:00:02.250 --> 00:00:04.750\nSecond line\n',
    );
  });

  it('escapes ampersands and angle brackets in cue text', () => {
    const vtt = generateVtt([{ text: 'a & b < c > d', start: 0, end: 1 }]);
    expect(vtt).toContain('a &amp; b &lt; c &gt; d');
  });

  it('escapes ampersands before angle brackets, not after', () => {
    const vtt = generateVtt([{ text: '5 < 6', start: 0, end: 1 }]);
    expect(vtt).toContain('5 &lt; 6');
    expect(vtt).not.toContain('&amp;lt;');
  });

  it('neutralizes an arrow sequence in cue text', () => {
    const vtt = generateVtt([{ text: 'this --> that', start: 0, end: 1 }]);
    expect(vtt).toContain('this --&gt; that');
  });

  it('throws if a line is missing a time', () => {
    expect(() => generateVtt([{ text: 'x', start: 1, end: null }])).toThrow(/missing/i);
  });
});

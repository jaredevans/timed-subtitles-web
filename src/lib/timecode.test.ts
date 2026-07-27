import { describe, expect, it } from 'vitest';
import { formatTimecode } from './timecode';

describe('formatTimecode', () => {
  it('formats zero', () => {
    expect(formatTimecode(0, ',')).toBe('00:00:00,000');
  });

  it('uses the separator it is given', () => {
    expect(formatTimecode(0, '.')).toBe('00:00:00.000');
  });

  it('rounds to the nearest millisecond', () => {
    expect(formatTimecode(1.2345, '.')).toBe('00:00:01.235');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimecode(75.5, '.')).toBe('00:01:15.500');
  });

  it('formats hours', () => {
    expect(formatTimecode(3661.007, '.')).toBe('01:01:01.007');
  });

  it('carries millisecond rounding into the seconds place', () => {
    expect(formatTimecode(59.9996, '.')).toBe('00:01:00.000');
  });
});

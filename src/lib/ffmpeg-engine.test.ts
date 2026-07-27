import { describe, expect, it } from 'vitest';
import { inputNameFor } from './ffmpeg-engine';

describe('inputNameFor', () => {
  it('preserves the source extension, lowercased', () => {
    expect(inputNameFor('talk.MOV')).toBe('input.mov');
    expect(inputNameFor('clip.mp4')).toBe('input.mp4');
  });

  it('uses the last extension when the name has several dots', () => {
    expect(inputNameFor('a.b.webm')).toBe('input.webm');
  });

  it('falls back to mp4 when there is no extension', () => {
    expect(inputNameFor('recording')).toBe('input.mp4');
    expect(inputNameFor('')).toBe('input.mp4');
  });
});

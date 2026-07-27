import { describe, it, expect } from 'vitest';
import { buildFfmpegArgs, outputFileName } from './mp4';

describe('outputFileName', () => {
  it('strips the extension and appends -subtitled.mp4', () => {
    expect(outputFileName('talk.mov')).toBe('talk-subtitled.mp4');
    expect(outputFileName('a.b.mp4')).toBe('a.b-subtitled.mp4');
  });
  it('falls back to a default base when the name has no usable stem', () => {
    expect(outputFileName('')).toBe('video-subtitled.mp4');
    expect(outputFileName('.mp4')).toBe('video-subtitled.mp4');
  });
});

describe('buildFfmpegArgs', () => {
  it('produces a remux command with a default-on mov_text track', () => {
    expect(buildFfmpegArgs('input.mp4', 'output.mp4')).toEqual([
      '-i', 'input.mp4',
      '-i', 'subs.srt',
      '-c', 'copy',
      '-c:s', 'mov_text',
      '-metadata:s:s:0', 'language=eng',
      '-disposition:s:0', 'default',
      'output.mp4',
    ]);
  });
});

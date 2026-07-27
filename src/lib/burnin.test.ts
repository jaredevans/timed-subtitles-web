import { describe, expect, it } from 'vitest';
import {
  buildBurnInArgs,
  burnInFileName,
  burnInStyle,
  estimateEncodeMinutes,
  formatDuration,
} from './burnin';

describe('burnInStyle', () => {
  it('scales font size, outline, and margin to the video height', () => {
    expect(burnInStyle(1920, 1080)).toBe(
      'FontName=DejaVu Sans,FontSize=54,PrimaryColour=&H00FFFFFF,' +
        'OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,' +
        'Alignment=2,MarginV=40,PlayResX=1920,PlayResY=1080',
    );
  });

  it('scales down for smaller sources', () => {
    expect(burnInStyle(1280, 720)).toContain('FontSize=36');
    expect(burnInStyle(1280, 720)).toContain('MarginV=27');
    expect(burnInStyle(854, 480)).toContain('FontSize=24');
  });

  it('scales up for 4K', () => {
    expect(burnInStyle(3840, 2160)).toContain('FontSize=108');
    expect(burnInStyle(3840, 2160)).toContain('Outline=4');
  });

  it('never drops the outline below 1', () => {
    expect(burnInStyle(320, 240)).toContain('Outline=1');
    expect(burnInStyle(160, 100)).toContain('Outline=1');
  });

  it('uses the font family name, not a filename', () => {
    expect(burnInStyle(1920, 1080)).toContain('FontName=DejaVu Sans');
    expect(burnInStyle(1920, 1080)).not.toContain('.ttf');
  });

  it('pins PlayResX/PlayResY to the source dimensions', () => {
    // ffmpeg's SRT->ASS header hardcodes PlayResX 384 / PlayResY 288, and
    // libass scales every style value by frame_height / PlayResY. Without
    // this pin, every pixel-denominated value above is meaningless: the
    // effective on-screen size grows with resolution instead of matching it.
    expect(burnInStyle(1280, 720)).toContain('PlayResX=1280');
    expect(burnInStyle(1280, 720)).toContain('PlayResY=720');
    expect(burnInStyle(3840, 2160)).toContain('PlayResX=3840');
    expect(burnInStyle(3840, 2160)).toContain('PlayResY=2160');
  });
});

describe('buildBurnInArgs', () => {
  it('single-quotes force_style inside the filter value', () => {
    const args = buildBurnInArgs('input.mp4', 'output.mp4', 'FontSize=54,Outline=2');
    const vf = args[args.indexOf('-vf') + 1];
    expect(vf).toBe(
      "subtitles=subs.srt:fontsdir=/fonts:force_style='FontSize=54,Outline=2'",
    );
  });

  it('builds the full re-encode command', () => {
    expect(buildBurnInArgs('input.mov', 'output.mp4', 'S')).toEqual([
      '-i', 'input.mov',
      '-vf', "subtitles=subs.srt:fontsdir=/fonts:force_style='S'",
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      'output.mp4',
    ]);
  });
});

describe('burnInFileName', () => {
  it('strips the extension and appends -burned-in.mp4', () => {
    expect(burnInFileName('talk.mov')).toBe('talk-burned-in.mp4');
    expect(burnInFileName('a.b.mp4')).toBe('a.b-burned-in.mp4');
  });

  it('falls back to a default base when the name has no usable stem', () => {
    expect(burnInFileName('')).toBe('video-burned-in.mp4');
    expect(burnInFileName('.mp4')).toBe('video-burned-in.mp4');
  });
});

describe('estimateEncodeMinutes', () => {
  it('returns a range whose lower bound is below its upper bound', () => {
    const [low, high] = estimateEncodeMinutes(1920, 1080, 240);
    expect(low).toBeLessThan(high);
  });

  it('grows with duration', () => {
    const [shortLow] = estimateEncodeMinutes(1280, 720, 60);
    const [longLow] = estimateEncodeMinutes(1280, 720, 600);
    expect(longLow).toBeGreaterThan(shortLow);
  });

  it('grows with pixel count', () => {
    const [smallLow] = estimateEncodeMinutes(640, 360, 300);
    const [bigLow] = estimateEncodeMinutes(3840, 2160, 300);
    expect(bigLow).toBeGreaterThan(smallLow);
  });

  it('never estimates less than one minute', () => {
    const [low, high] = estimateEncodeMinutes(320, 240, 1);
    expect(low).toBeGreaterThanOrEqual(1);
    expect(high).toBeGreaterThan(low);
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds with a padded seconds field', () => {
    expect(formatDuration(252)).toBe('4m12s');
    expect(formatDuration(65)).toBe('1m05s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3720)).toBe('1h02m');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(44.6)).toBe('45s');
  });
});

import { describe, expect, it } from 'vitest';
import { computeAutoScrollTop, type ItemBounds } from './autoscroll';

// 40px tall items with 4px gap (44px stride).
function makeItems(count: number): ItemBounds[] {
  return Array.from({ length: count }, (_, i) => ({
    top: i * 44,
    bottom: i * 44 + 40,
  }));
}

describe('computeAutoScrollTop', () => {
  // Viewport of 352px fits 8 items (indices 0..7; item 7 bottom = 348, item 8 = [352, 392]).
  const items = makeItems(20);
  const viewport = 352;

  it('does not scroll while more than two captions remain visible below active', () => {
    for (let i = 0; i <= 4; i++) {
      expect(computeAutoScrollTop(items, i, 0, viewport)).toBeNull();
    }
  });

  it('auto-scrolls at the third-to-last visible caption to reveal the next caption', () => {
    // Visible: 0..7. Index 5 is 3rd from bottom (5, 6, 7). Next hidden caption is index 8 (bottom 392).
    expect(computeAutoScrollTop(items, 5, 0, viewport)).toBe(392 - viewport);
  });

  it('keeps advancing by one caption on each subsequent step', () => {
    // After scrolling to 40, visible items are 1..8. Index 6 is 3rd from bottom; reveals index 9 (bottom 436).
    expect(computeAutoScrollTop(items, 6, 40, viewport)).toBe(436 - viewport);
    // After scrolling to 84, visible items are 2..9. Index 7 is 3rd from bottom; reveals index 10 (bottom 480).
    expect(computeAutoScrollTop(items, 7, 84, viewport)).toBe(480 - viewport);
  });

  it('stops scrolling once the last caption is already visible', () => {
    const lastBottom = items[19].bottom; // 876
    const atBottom = lastBottom - viewport; // 524
    expect(computeAutoScrollTop(items, 17, atBottom, viewport)).toBeNull();
    expect(computeAutoScrollTop(items, 18, atBottom, viewport)).toBeNull();
    expect(computeAutoScrollTop(items, 19, atBottom, viewport)).toBeNull();
  });

  it('scrolls back up when active jumps above the current viewport', () => {
    expect(computeAutoScrollTop(items, 2, 524, viewport)).toBe(items[2].top);
  });

  it('never scrolls the active caption off the top of a short viewport', () => {
    // Viewport fits only 2 items (90px).
    expect(computeAutoScrollTop(items, 0, 0, 90)).toBeNull();
    expect(computeAutoScrollTop(items, 1, 0, 90)).toBe(items[1].top);
  });

  it('returns null for empty lists or out-of-range indices', () => {
    expect(computeAutoScrollTop([], 0, 0, viewport)).toBeNull();
    expect(computeAutoScrollTop(items, -1, 0, viewport)).toBeNull();
    expect(computeAutoScrollTop(items, 20, 0, viewport)).toBeNull();
    expect(computeAutoScrollTop(items, 5, 0, 0)).toBeNull();
  });
});

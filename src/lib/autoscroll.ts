export interface ItemBounds {
  top: number;
  bottom: number;
}

const EPSILON = 0.5;

/**
 * Computes the next `scrollTop` for the captions list so that:
 * - If the active caption is above the viewport, scroll up to reveal it.
 * - When the active caption reaches the third-to-last visible slot (so the
 *   caption `lookahead` positions ahead is below the viewport), scroll down
 *   just enough to reveal that next caption — without ever scrolling the
 *   active caption itself off the top of a short viewport.
 *
 * Returns `null` when no scroll adjustment is needed.
 */
export function computeAutoScrollTop(
  items: readonly ItemBounds[],
  activeIndex: number,
  scrollTop: number,
  clientHeight: number,
  lookahead = 3,
): number | null {
  if (items.length === 0 || clientHeight <= 0) return null;
  if (activeIndex < 0 || activeIndex >= items.length) return null;

  const active = items[activeIndex];
  const viewportBottom = scrollTop + clientHeight;

  if (active.top < scrollTop - EPSILON) {
    return Math.max(0, active.top);
  }

  const targetIndex = Math.min(activeIndex + lookahead, items.length - 1);
  const target = items[targetIndex];

  if (target.bottom > viewportBottom + EPSILON) {
    const nextScrollTop = Math.min(target.bottom - clientHeight, active.top);
    if (nextScrollTop > scrollTop + EPSILON) {
      return nextScrollTop;
    }
  }

  return null;
}

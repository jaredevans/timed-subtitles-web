import { describe, expect, it } from 'vitest';
import { getTimingShortcut, isPlayPauseShortcut, type KeyEventLike } from './shortcuts';

function keyEvent(overrides: Partial<KeyEventLike> = {}): KeyEventLike {
  return {
    key: ',',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    target: { tagName: 'BODY', isContentEditable: false },
    ...overrides,
  };
}

describe('getTimingShortcut', () => {
  it('maps "," to mark-start and "." to mark-end', () => {
    expect(getTimingShortcut(keyEvent({ key: ',' }))).toBe('mark-start');
    expect(getTimingShortcut(keyEvent({ key: '.' }))).toBe('mark-end');
  });

  it('works when focus is on the video player or a button', () => {
    expect(getTimingShortcut(keyEvent({ key: ',', target: { tagName: 'VIDEO' } }))).toBe(
      'mark-start',
    );
    expect(getTimingShortcut(keyEvent({ key: '.', target: { tagName: 'BUTTON' } }))).toBe(
      'mark-end',
    );
  });

  it('ignores events from editable elements', () => {
    expect(getTimingShortcut(keyEvent({ key: '.', target: { tagName: 'INPUT' } }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: ',', target: { tagName: 'TEXTAREA' } }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: ',', target: { tagName: 'SELECT' } }))).toBeNull();
    expect(
      getTimingShortcut(keyEvent({ key: '.', target: { tagName: 'DIV', isContentEditable: true } })),
    ).toBeNull();
  });

  it('ignores modified, repeated, and unrelated keys', () => {
    expect(getTimingShortcut(keyEvent({ key: ',', ctrlKey: true }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: ',', metaKey: true }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: '.', altKey: true }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: ',', repeat: true }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: '<' }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: '>' }))).toBeNull();
    expect(getTimingShortcut(keyEvent({ key: ' ' }))).toBeNull();
  });
});

describe('isPlayPauseShortcut', () => {
  it('matches Space on body, video, and buttons', () => {
    expect(isPlayPauseShortcut(keyEvent({ key: ' ' }))).toBe(true);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', target: { tagName: 'VIDEO' } }))).toBe(true);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', target: { tagName: 'BUTTON' } }))).toBe(true);
  });

  it('ignores Space in editable elements', () => {
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', target: { tagName: 'TEXTAREA' } }))).toBe(
      false,
    );
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', target: { tagName: 'INPUT' } }))).toBe(false);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', target: { tagName: 'SELECT' } }))).toBe(false);
    expect(
      isPlayPauseShortcut(keyEvent({ key: ' ', target: { tagName: 'DIV', isContentEditable: true } })),
    ).toBe(false);
  });

  it('ignores modified, repeated, and non-Space keys', () => {
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', shiftKey: true }))).toBe(false);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', ctrlKey: true }))).toBe(false);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', metaKey: true }))).toBe(false);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', altKey: true }))).toBe(false);
    expect(isPlayPauseShortcut(keyEvent({ key: ' ', repeat: true }))).toBe(false);
    expect(isPlayPauseShortcut(keyEvent({ key: ',' }))).toBe(false);
  });
});

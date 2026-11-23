export type TimingAction = 'mark-start' | 'mark-end';

export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey?: boolean;
  repeat: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
}

function isEditableTarget(target: KeyEventLike['target']): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function getTimingShortcut(event: KeyEventLike): TimingAction | null {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isEditableTarget(event.target)) return null;

  if (event.key === ',') return 'mark-start';
  if (event.key === '.') return 'mark-end';
  return null;
}

export function isPlayPauseShortcut(event: KeyEventLike): boolean {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }
  if (isEditableTarget(event.target)) return false;

  return event.key === ' ';
}

import { useEffect, type ChangeEvent, type RefObject } from 'react';
import { isPlayPauseShortcut } from '../lib/shortcuts';

const ACCEPT = 'video/mp4,video/quicktime,.mp4,.mov';

interface VideoInfoBarProps {
  videoName: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFileSelected: (file: File) => void;
}

export function VideoInfoBar({ videoName, videoRef, onFileSelected }: VideoInfoBarProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  function skipBack() {
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(0, video.currentTime - 3);
  }

  return (
    <section className="video-info">
      <div className="video-meta">
        <span className="video-name">{videoName}</span>
        <button onClick={skipBack}>⟲ 3s</button>
        <label className="change-video">
          Change video
          <input type="file" accept={ACCEPT} onChange={handleChange} />
        </label>
      </div>
      <p className="privacy-note">🔒 Playing locally — this video is never uploaded to a server.</p>
    </section>
  );
}

interface Props {
  videoUrl: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFileSelected: (file: File) => void;
  onSeek?: (phase: 'seeking' | 'seeked') => void;
  onTimeUpdate?: () => void;
  showReselectHint: boolean;
}

export function VideoPanel({
  videoUrl,
  videoRef,
  onFileSelected,
  onSeek,
  onTimeUpdate,
  showReselectHint,
}: Props) {
  useEffect(() => {
    if (!videoUrl) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        !isPlayPauseShortcut({
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          repeat: e.repeat,
          target,
        })
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      // Intercept in capture phase so native <video controls> and focused
      // buttons don't double-toggle or fire a click on Space.
      e.preventDefault();
      e.stopPropagation();

      if (video.paused || video.ended) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [videoUrl, videoRef]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  if (!videoUrl) {
    return (
      <section className="video-panel">
        <div className="video-placeholder">
          {showReselectHint && (
            <p className="hint">
              Restored your saved timing session — re-select the same video file to continue.
            </p>
          )}
          <label className="file-label">
            Choose MP4 or MOV video
            <input type="file" accept={ACCEPT} onChange={handleChange} />
          </label>
          <p className="privacy-note">
            🔒 Your video stays on your device — it opens locally in the browser and is never
            uploaded to any server.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="video-panel">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        onSeeking={() => onSeek?.('seeking')}
        onSeeked={() => onSeek?.('seeked')}
        onTimeUpdate={onTimeUpdate}
      />
    </section>
  );
}

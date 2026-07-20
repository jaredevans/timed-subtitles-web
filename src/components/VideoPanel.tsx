import type { ChangeEvent, RefObject } from 'react';

interface Props {
  videoUrl: string | null;
  videoName: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFileSelected: (file: File) => void;
  showReselectHint: boolean;
}

const ACCEPT = 'video/mp4,video/quicktime,.mp4,.mov';

export function VideoPanel({
  videoUrl,
  videoName,
  videoRef,
  onFileSelected,
  showReselectHint,
}: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  function skipBack() {
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(0, video.currentTime - 3);
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
      <video ref={videoRef} src={videoUrl} controls />
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

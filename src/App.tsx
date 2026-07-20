import { useEffect, useRef, useState } from 'react';
import type { SubtitleLine } from './types';
import { parseTranscript } from './lib/transcript';
import { generateSrt } from './lib/srt';
import { clearState, loadState, saveState } from './lib/storage';
import { SetupPanel } from './components/SetupPanel';
import { VideoPanel } from './components/VideoPanel';
import { TimingControls } from './components/TimingControls';
import { LineList } from './components/LineList';
import { ExportMp4Button } from './components/ExportMp4Button';
import './App.css';

type Phase = 'setup' | 'timing';

function nextUntimed(lines: SubtitleLine[], from: number): number {
  for (let i = from + 1; i < lines.length; i++) {
    if (lines[i].start === null || lines[i].end === null) return i;
  }
  for (let i = 0; i <= from; i++) {
    if (lines[i].start === null || lines[i].end === null) return i;
  }
  return from;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [lines, setLines] = useState<SubtitleLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);
  const [setupKey, setSetupKey] = useState(0);
  const [restored, setRestored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const saved = loadState();
    if (saved && saved.lines.length > 0) {
      setLines(saved.lines);
      setActiveIndex(Math.min(saved.activeIndex, saved.lines.length - 1));
      setPhase('timing');
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (phase === 'timing' && lines.length > 0) {
      saveState({ lines, activeIndex });
    }
  }, [phase, lines, activeIndex]);

  function handleFileSelected(file: File) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
    setVideoFile(file);
  }

  function handleStartTiming(text: string) {
    const parsed = parseTranscript(text);
    if (parsed.length === 0) return;
    setLines(parsed.map((t) => ({ text: t, start: null, end: null })));
    setActiveIndex(0);
    setCaptureError(null);
    setPhase('timing');
  }

  function captureStart() {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    setCaptureError(null);
    setLines((ls) =>
      ls.map((l, i) =>
        i === activeIndex ? { ...l, start: t, end: l.end !== null && l.end <= t ? null : l.end } : l,
      ),
    );
  }

  function captureEnd() {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    const line = lines[activeIndex];
    if (!line || line.start === null) return;
    if (t <= line.start) {
      setCaptureError('The end must come after the start — keep playing, then mark the end.');
      return;
    }
    setCaptureError(null);
    const updated = lines.map((l, i) => (i === activeIndex ? { ...l, end: t } : l));
    setLines(updated);
    setActiveIndex(nextUntimed(updated, activeIndex));
  }

  function handleSelectLine(index: number) {
    setActiveIndex(index);
    setCaptureError(null);
  }

  function handleEditTime(index: number, field: 'start' | 'end', value: number | null) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function handleExport() {
    const srt = generateSrt(lines);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (videoName.replace(/\.[^.]+$/, '') || 'subtitles') + '.srt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleResetTranscript() {
    clearState();
    setLines([]);
    setActiveIndex(0);
    setCaptureError(null);
    setConfirmingReset(false);
    setConfirmingResetAll(false);
    setRestored(false);
    setPhase('setup');
  }

  function handleResetAll() {
    handleResetTranscript();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoName('');
    setVideoFile(null);
    setSetupKey((k) => k + 1);
  }

  const allTimed = lines.length > 0 && lines.every((l) => l.start !== null && l.end !== null);
  const timedCount = lines.filter((l) => l.start !== null && l.end !== null).length;
  const activeLine = lines[activeIndex];

  return (
    <div className="app">
      <header>
        <h1>Timed Subtitles</h1>
        <div className="header-actions">
          {confirmingResetAll ? (
            <span className="confirm-reset">
              Clears the video and transcript.
              <button onClick={handleResetAll}>Reset all</button>
              <button onClick={() => setConfirmingResetAll(false)}>Cancel</button>
            </span>
          ) : (
            <button className="reset-all-btn" onClick={() => setConfirmingResetAll(true)}>Reset all</button>
          )}
          {phase === 'timing' && (
            <>
              <span className="progress">
                {timedCount} / {lines.length} captions timed
              </span>
              {confirmingReset ? (
                <span className="confirm-reset">
                  Resets all timings.
                  <button onClick={handleResetTranscript}>Reset</button>
                  <button onClick={() => setConfirmingReset(false)}>Cancel</button>
                </span>
              ) : (
                <button onClick={() => setConfirmingReset(true)}>Edit transcript</button>
              )}
              <button
                disabled={!allTimed}
                onClick={handleExport}
                title={allTimed ? undefined : 'Time all captions to enable export'}
              >
                Export SRT
              </button>
              <ExportMp4Button
                videoFile={videoFile}
                allTimed={allTimed}
                getSrt={() => generateSrt(lines)}
              />
            </>
          )}
        </div>
      </header>
      <main>
        <div className="left">
          <VideoPanel
            videoUrl={videoUrl}
            videoName={videoName}
            videoRef={videoRef}
            onFileSelected={handleFileSelected}
            showReselectHint={restored && !videoUrl}
          />
          {phase === 'timing' && activeLine && videoUrl && (
            <TimingControls
              line={activeLine}
              index={activeIndex}
              total={lines.length}
              error={captureError}
              onCaptureStart={captureStart}
              onCaptureEnd={captureEnd}
            />
          )}
        </div>
        <div className="right">
          {phase === 'setup' ? (
            <SetupPanel key={setupKey} onStartTiming={handleStartTiming} />
          ) : (
            <LineList
              lines={lines}
              activeIndex={activeIndex}
              onSelect={handleSelectLine}
              onEditTime={handleEditTime}
            />
          )}
        </div>
      </main>
    </div>
  );
}

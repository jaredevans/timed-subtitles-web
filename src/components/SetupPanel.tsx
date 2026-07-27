import { useState, type ClipboardEvent } from 'react';
import { splitIntoSentences } from '../lib/transcript';

interface Props {
  onStartTiming: (transcript: string) => void;
}

export function SetupPanel({ onStartTiming }: Props) {
  const [text, setText] = useState('');
  const canStart = text.trim().length > 0;

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    const el = e.currentTarget;
    const split = splitIntoSentences(pasted);
    setText(text.slice(0, el.selectionStart) + split + text.slice(el.selectionEnd));
  }

  return (
    <section className="setup-panel">
      <h2>Transcript</h2>
      <p className="hint">Paste your transcript — each sentence becomes a caption.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder={'First caption\nSecond caption\n…'}
        rows={16}
      />
      <button disabled={!canStart} onClick={() => onStartTiming(text)}>
        Start timing
      </button>
    </section>
  );
}

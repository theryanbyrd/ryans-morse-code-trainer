import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { normalizeQso } from '../data/qso';

const FIRST_PLAY_DELAY = 450;
const SLOW_WPM = 8;
const OK_DELAY = 700;

// Copy an incoming transmission by ear, then type what you heard.
export function QsoReceive({ text, onDone }: { text: string; onDone: () => void }) {
  const { settings } = useApp();
  const { play, lampOn } = useMorsePlayer();

  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const target = normalizeQso(text);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const inputEl = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => play(text), FIRST_PLAY_DELAY);
    return () => clearTimeout(t);
  }, [text, play]);

  const check = useCallback(() => {
    const guess = normalizeQso(input);
    if (!guess) return;
    setChecked(true);
    if (guess === target) {
      if (settingsRef.current.sound) playCorrect();
      window.setTimeout(onDone, OK_DELAY);
    } else if (settingsRef.current.sound) {
      playWrong();
      window.setTimeout(() => play(text, SLOW_WPM), 300);
    }
  }, [input, target, text, play, onDone]);

  const guess = normalizeQso(input);
  const right = checked && guess === target;

  return (
    <div className="qso-turn">
      <button
        className={`listen-btn${lampOn ? ' lamp-on' : ''}`}
        onClick={() => play(text)}
        aria-label="Play the transmission again"
      >
        <span className="listen-icon" aria-hidden="true">📡</span>
        <span>Copy the reply</span>
      </button>

      {checked && !right && (
        <div className="qso-reveal-line">Sent: <b>{target}</b></div>
      )}

      <form
        className="word-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          ref={inputEl}
          className="word-input qso-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase());
            setChecked(false);
          }}
          placeholder="copy here…"
          autoFocus
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label="Type what you copied"
        />
        <button type="submit" className="btn primary" disabled={!guess}>
          {right ? 'QSL!' : 'Check'}
        </button>
      </form>

      <div className="receive-controls">
        <button className="rc-btn" onClick={() => play(text)}>↻ Replay</button>
        <button className="rc-btn" onClick={() => play(text, SLOW_WPM)}>🐢 Slower</button>
        <button className="rc-btn" onClick={() => { setInput(target); setChecked(true); }}>👁 Reveal</button>
      </div>
    </div>
  );
}

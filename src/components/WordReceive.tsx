import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { playMorse } from '../lib/morsePlayer';
import type { Playback } from '../lib/morsePlayer';
import { knownLetters, pickReceiveWord } from '../lib/receive';

const CORRECT_DELAY = 900;
const FIRST_PLAY_DELAY = 400;
const SLOW_WPM = 7;

export function WordReceive() {
  const { progress, settings, answerReceive, addReceivePlayTime } = useApp();
  const pool = knownLetters(progress);

  const [word, setWord] = useState<string>(() => pickReceiveWord(pool, null) ?? '');
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [lampOn, setLampOn] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const wordRef = useRef(word);
  wordRef.current = word;
  const scoredRef = useRef(false);
  const playback = useRef<Playback | null>(null);
  const inputEl = useRef<HTMLInputElement>(null);

  const play = useCallback((text: string, wpm?: number) => {
    playback.current?.stop();
    playback.current = playMorse(text, {
      wpm: wpm ?? settingsRef.current.wpm,
      farnsworth: settingsRef.current.farnsworth,
      onFlash: settingsRef.current.visual ? setLampOn : undefined,
      haptic: settingsRef.current.visual,
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => addReceivePlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addReceivePlayTime]);

  useEffect(() => {
    if (!word) return;
    const t = setTimeout(() => play(word), FIRST_PLAY_DELAY);
    return () => clearTimeout(t);
  }, [word, play]);

  useEffect(() => () => playback.current?.stop(), []);

  const nextWord = useCallback(() => {
    scoredRef.current = false;
    setInput('');
    setChecked(false);
    setWord((prev) => pickReceiveWord(pool, prev) ?? prev);
    inputEl.current?.focus();
  }, [pool]);

  const check = useCallback(() => {
    const w = wordRef.current;
    const guess = input.trim().toLowerCase();
    if (!w || !guess) return;
    setChecked(true);
    const allRight = guess === w;

    // Reinforce correct letters once per word (positive-only, so a wrong word
    // doesn't demote you out of the word phase). Retries don't re-score.
    if (!scoredRef.current) {
      scoredRef.current = true;
      for (let i = 0; i < w.length; i++) if (guess[i] === w[i]) answerReceive(w[i], true);
    }

    if (allRight) {
      if (settingsRef.current.sound) playCorrect();
      window.setTimeout(nextWord, CORRECT_DELAY);
    } else {
      if (settingsRef.current.sound) playWrong();
      window.setTimeout(() => play(w, SLOW_WPM), 300);
    }
  }, [input, answerReceive, nextWord, play]);

  const reveal = useCallback(() => {
    // Neutral "show me" — reveals the word without changing scores.
    scoredRef.current = true;
    setInput(wordRef.current);
    setChecked(true);
  }, []);

  if (!word) return null;
  const guess = input.trim().toLowerCase();
  const allRight = checked && guess === word;

  return (
    <div className="receive">
      <div className="phase-tag">Word phase</div>
      <button
        className={`listen-btn${lampOn ? ' lamp-on' : ''}`}
        onClick={() => play(word)}
        aria-label="Play the word again"
      >
        <span className="listen-icon" aria-hidden="true">🔊</span>
        <span>Listen</span>
      </button>

      <p className="receive-prompt">Type the word you heard</p>

      {checked && (
        <div className="word-bricks">
          {word.split('').map((ch, i) => {
            const right = guess[i] === ch;
            return (
              <span key={i} className={`brick ${right ? 'done' : 'missed'}`}>
                {(right ? ch : guess[i] || '·').toUpperCase()}
              </span>
            );
          })}
        </div>
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
          className="word-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.replace(/[^a-zA-Z]/g, ''));
            setChecked(false);
          }}
          placeholder="type here…"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          aria-label="Type the word you heard"
        />
        <button type="submit" className="btn primary" disabled={!guess}>
          {allRight ? 'Nice!' : 'Check'}
        </button>
      </form>

      <div className="receive-controls">
        <button className="rc-btn" onClick={() => play(word)}>↻ Replay</button>
        <button className="rc-btn" onClick={() => play(word, SLOW_WPM)}>🐢 Slower</button>
        <button className="rc-btn" onClick={reveal}>👁 Reveal</button>
      </div>
    </div>
  );
}

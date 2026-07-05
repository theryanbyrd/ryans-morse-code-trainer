import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { knownLetters, pickSentence } from '../lib/receive';

const CORRECT_DELAY = 1100;
const FIRST_PLAY_DELAY = 450;
const SLOW_WPM = 7;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function SentenceReceive() {
  const { progress, settings, answerReceive, completeReceiveSentence, addReceivePlayTime } = useApp();
  const { play, lampOn } = useMorsePlayer();
  const pool = knownLetters(progress);

  const [sentence, setSentence] = useState<string>(() => pickSentence(pool, null) ?? '');
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sentenceRef = useRef(sentence);
  sentenceRef.current = sentence;
  const scoredRef = useRef(false);
  const inputEl = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => addReceivePlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addReceivePlayTime]);

  useEffect(() => {
    if (!sentence) return;
    const t = setTimeout(() => play(sentence), FIRST_PLAY_DELAY);
    return () => clearTimeout(t);
  }, [sentence, play]);

  const nextSentence = useCallback(() => {
    scoredRef.current = false;
    setInput('');
    setChecked(false);
    setSentence((prev) => pickSentence(pool, prev) ?? prev);
    inputEl.current?.focus();
  }, [pool]);

  const check = useCallback(() => {
    const s = sentenceRef.current;
    const guess = norm(input);
    if (!s || !guess) return;
    setChecked(true);
    const allRight = guess === s;

    if (!scoredRef.current) {
      scoredRef.current = true;
      for (let i = 0; i < s.length; i++) if (s[i] !== ' ' && guess[i] === s[i]) answerReceive(s[i], true);
    }

    if (allRight) {
      if (settingsRef.current.sound) playCorrect();
      completeReceiveSentence();
      window.setTimeout(nextSentence, CORRECT_DELAY);
    } else if (settingsRef.current.sound) {
      playWrong();
      window.setTimeout(() => play(s, SLOW_WPM), 300);
    }
  }, [input, answerReceive, completeReceiveSentence, nextSentence, play]);

  const reveal = useCallback(() => {
    scoredRef.current = true;
    setInput(sentenceRef.current);
    setChecked(true);
  }, []);

  if (!sentence) return null;
  const guess = norm(input);
  const allRight = checked && guess === sentence;

  return (
    <div className="receive">
      <button
        className={`listen-btn${lampOn ? ' lamp-on' : ''}`}
        onClick={() => play(sentence)}
        aria-label="Play the sentence again"
      >
        <span className="listen-icon" aria-hidden="true">🔊</span>
        <span>Listen</span>
      </button>

      <p className="receive-prompt">Type the phrase you heard ({sentence.split(' ').length} words)</p>

      {checked && (
        <div className="sentence-review">
          {sentence.split(' ').map((w, wi) => {
            const gWords = guess.split(' ');
            const gw = gWords[wi] ?? '';
            const right = gw === w;
            return (
              <span key={wi} className={`sr-word ${right ? 'done' : 'missed'}`}>
                {right ? w.toUpperCase() : (gw || '—').toUpperCase()}
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
            setInput(e.target.value.replace(/[^a-zA-Z ]/g, ''));
            setChecked(false);
          }}
          placeholder="type the words…"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label="Type the phrase you heard"
        />
        <button type="submit" className="btn primary" disabled={!guess}>
          {allRight ? 'Nice!' : 'Check'}
        </button>
      </form>

      <div className="receive-controls">
        <button className="rc-btn" onClick={() => play(sentence)}>↻ Replay</button>
        <button className="rc-btn" onClick={() => play(sentence, SLOW_WPM)}>🐢 Slower</button>
        <button className="rc-btn" onClick={reveal}>👁 Reveal</button>
      </div>
    </div>
  );
}

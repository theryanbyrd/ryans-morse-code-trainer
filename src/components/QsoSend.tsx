import { useCallback, useEffect, useRef, useState } from 'react';
import { patternForChar } from '../data/morse';
import { useApp } from '../state/AppContext';
import { playCorrect, playDash, playDot, playWrong, playPattern } from '../lib/audio';
import { Pattern } from './Pattern';
import { Keypad } from './Keypad';
import type { KeyAction } from './Keypad';
import { StraightKey } from './StraightKey';

const CHAR_DELAY = 160;
const WRONG_DELAY = 550;

// Key an outgoing transmission one character at a time. The exact Morse for the
// current character is shown; each keyed character is checked before you move on.
export function QsoSend({ text, onDone }: { text: string; onDone: () => void }) {
  const { settings } = useApp();
  const chars = text.split('');
  const firstIdx = chars.findIndex((c) => c !== ' ');

  const [pos, setPos] = useState(firstIdx < 0 ? chars.length : firstIdx);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>('idle');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const posRef = useRef(pos);
  posRef.current = pos;
  const inputRef = useRef(input);
  inputRef.current = input;
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  const target = pos < chars.length ? patternForChar(chars[pos]) : '';

  const advance = useCallback(() => {
    let next = posRef.current + 1;
    while (next < chars.length && chars[next] === ' ') next++;
    setInput('');
    setFeedback('idle');
    if (next >= chars.length) {
      if (settingsRef.current.sound) playCorrect();
      window.setTimeout(onDone, 350);
      setPos(chars.length);
    } else {
      setPos(next);
    }
  }, [chars, onDone]);

  const key = useCallback(
    (a: KeyAction) => {
      if (feedbackRef.current !== 'idle' || posRef.current >= chars.length) return;
      if (a === 'delete') {
        const upd = inputRef.current.slice(0, -1);
        inputRef.current = upd;
        setInput(upd);
        return;
      }
      const tgt = patternForChar(chars[posRef.current]);
      const sym = a === 'dot' ? '.' : '-';
      const upd = inputRef.current + sym;
      inputRef.current = upd;
      setInput(upd);
      // The straight/single key sounds its own held sidetone, so skip the tap tone then.
      if (settingsRef.current.sound && !settingsRef.current.straightKey && !settingsRef.current.singleKey)
        (a === 'dot' ? playDot : playDash)();
      if (upd.length >= tgt.length) {
        const correct = upd === tgt;
        setFeedback(correct ? 'ok' : 'bad');
        if (settingsRef.current.sound && !correct) playWrong();
        if (correct) {
          window.setTimeout(advance, CHAR_DELAY);
        } else {
          window.setTimeout(() => {
            inputRef.current = '';
            setInput('');
            setFeedback('idle');
          }, WRONG_DELAY);
        }
      }
    },
    [advance, chars],
  );
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // In straight/single-key mode the key (Space/Enter) is owned by StraightKey.
      if (!settingsRef.current.straightKey && !settingsRef.current.singleKey) {
        if (k === 'j' || e.key === '.') return keyRef.current('dot');
        if (k === 'k' || e.key === '-') return keyRef.current('dash');
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        keyRef.current('delete');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = pos < chars.length ? chars[pos] : '';

  return (
    <div className="qso-turn">
      <div className={`qso-msg send${feedback === 'bad' ? ' shake' : ''}`}>
        {chars.map((c, i) => {
          if (c === ' ') return <span key={i} className="qm-space" />;
          const state = i < pos ? 'done' : i === pos ? 'current' : 'up';
          return <span key={i} className={`qm-ch ${state}`}>{c}</span>;
        })}
      </div>

      <div className="qso-key-panel">
        <div className="qso-cur-char">{current === '?' ? '?' : current}</div>
        <Pattern pattern={target} size={18} className="qso-target" />
        <div className={`qso-keyed ${feedback}`}>
          {input ? <Pattern pattern={input} size={14} /> : <span className="qso-keyed-ph">key it…</span>}
        </div>
      </div>

      {settings.straightKey || settings.singleKey ? (
        <StraightKey
          onSymbol={(s) => key(s)}
          onDelete={() => key('delete')}
          wpm={settings.sendWpm}
          freq={settings.tone}
          volume={settings.volume}
        />
      ) : (
        <Keypad onAction={key} scanIndex={null} oneSwitch={false} />
      )}
      <button
        type="button"
        className="rc-btn"
        onClick={() => settingsRef.current.sound && current && playPattern(target)}
      >
        ♪ Hear this character
      </button>
    </div>
  );
}

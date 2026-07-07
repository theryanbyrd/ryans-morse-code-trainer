import { useCallback, useEffect, useRef, useState } from 'react';
import { patternForChar } from '../data/morse';
import { NUM_SYM_BY_CH, NUM_SYM_ORDER } from '../data/numsym';
import { NUM_SYM_ART } from '../data/numSymArt';
import { useApp } from '../state/AppContext';
import { hintActive, isComplete, pickNumber } from '../lib/numbers';
import { playCorrect, playDash, playDot, playNumName, playPattern, playWrong } from '../lib/audio';
import { Pattern } from './Pattern';
import { LiveDecode } from './LiveDecode';
import { Keypad } from './Keypad';
import type { KeyAction } from './Keypad';
import { StraightKey } from './StraightKey';
import { MorseTree } from './MorseTree';

const ADVANCE_DELAY = 800;
const WRONG_DELAY = 700;
const INPUT_LOCK_MS = 320;

export function NumbersDrill() {
  const { numbers, settings, answerNumber, addNumbersPlayTime, setMode } = useApp();

  const [current, setCurrent] = useState<string>(() => pickNumber(numbers, null));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const lockUntil = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;
  const currentRef = useRef(current);
  currentRef.current = current;
  const inputRef = useRef(input);
  inputRef.current = input;
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  const target = patternForChar(current);
  const def = NUM_SYM_BY_CH[current];
  const hint = hintActive(numbers, current);

  useEffect(() => {
    const t = setInterval(() => addNumbersPlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addNumbersPlayTime]);

  // On a new character: brief lock, and speak its name when the hint is active.
  useEffect(() => {
    lockUntil.current = Date.now() + INPUT_LOCK_MS;
    if (settingsRef.current.speechHints && hintActive(numbersRef.current, current)) {
      playNumName(NUM_SYM_BY_CH[current].audio);
    }
  }, [current]);

  const advance = useCallback((from: typeof numbers) => {
    const next = pickNumber(from, currentRef.current);
    inputRef.current = '';
    setInput('');
    setFeedback('idle');
    setCurrent(next);
  }, []);

  const evaluate = useCallback(
    (seq: string) => {
      const ch = currentRef.current;
      const correct = seq === patternForChar(ch);
      setFeedback(correct ? 'correct' : 'wrong');
      if (settingsRef.current.sound) (correct ? playCorrect : playWrong)();
      const next = answerNumber(ch, correct);
      if (correct) {
        window.setTimeout(() => advance(next), ADVANCE_DELAY);
      } else {
        window.setTimeout(() => {
          inputRef.current = '';
          setInput('');
          setFeedback('idle');
          if (settingsRef.current.speechHints) playNumName(NUM_SYM_BY_CH[ch].audio);
        }, WRONG_DELAY);
      }
    },
    [answerNumber, advance],
  );

  const handleAction = useCallback(
    (a: KeyAction) => {
      if (Date.now() < lockUntil.current || feedbackRef.current !== 'idle') return;
      if (a === 'delete') {
        const upd = inputRef.current.slice(0, -1);
        inputRef.current = upd;
        setInput(upd);
        return;
      }
      const sym = a === 'dot' ? '.' : '-';
      const upd = inputRef.current + sym;
      inputRef.current = upd;
      setInput(upd);
      // In single-key mode StraightKey sounds its own held sidetone, so skip the tap tone.
      if (settingsRef.current.sound && !settingsRef.current.singleKey) (a === 'dot' ? playDot : playDash)();
      if (upd.length >= patternForChar(currentRef.current).length) evaluate(upd);
    },
    [evaluate],
  );
  const actionRef = useRef(handleAction);
  actionRef.current = handleAction;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Single key owns Space/Enter (held for dit/dah) via StraightKey.
      if (settingsRef.current.singleKey) return;
      const k = e.key.toLowerCase();
      if (k === 'j' || e.key === '.') actionRef.current('dot');
      else if (k === 'k' || e.key === '-') actionRef.current('dash');
      else if (e.key === 'Backspace' || e.key === 'Delete' || k === 'i') {
        e.preventDefault();
        actionRef.current('delete');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isComplete(numbers)) {
    return (
      <div className="completion">
        <div className="confetti" aria-hidden="true">🔢 ✓</div>
        <h2>Numbers &amp; symbols mastered!</h2>
        <p>You can key all {NUM_SYM_ORDER.length} numbers and symbols. Nice work.</p>
        <div className="completion-actions">
          <button className="btn" onClick={() => setMode(null)}>Back to modes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      <div className="num-progress">
        {NUM_SYM_ORDER.map((c) => (
          <span key={c} className={`np-chip${(numbers.chars[c]?.score ?? 0) >= 2 ? ' done' : ''}${c === current ? ' current' : ''}`}>
            {c}
          </span>
        ))}
      </div>

      <div className={`letter-card ${feedback}`}>
        <div className="letter-circle">{current}</div>
        {hint && (
          <div className="mnemonic">
            <div className="mnemonic-art">{NUM_SYM_ART[current]}</div>
            <div className="mnemonic-word">{def.hint}</div>
          </div>
        )}
        {hint && <Pattern pattern={target} size={20} className="target-pattern" />}
      </div>

      <button
        type="button"
        className="play-pattern"
        onClick={() => settingsRef.current.sound && playPattern(target)}
      >
        ♪ Hear the code
      </button>

      <LiveDecode input={input} />

      {settings.morseTree && <MorseTree input={input} />}

      {settings.singleKey ? (
        <>
          <StraightKey
            onSymbol={(s) => handleAction(s === 'dot' ? 'dot' : 'dash')}
            onDelete={() => handleAction('delete')}
            wpm={settings.sendWpm}
            freq={settings.tone}
            volume={settings.volume}
          />
          <p className="key-hint one-switch-hint">
            <b>Single key:</b> short press = dit, longer press = dah. Use the button, your switch, or <b>Space</b>.
          </p>
        </>
      ) : (
        <Keypad onAction={handleAction} scanIndex={null} oneSwitch={false} />
      )}
    </div>
  );
}

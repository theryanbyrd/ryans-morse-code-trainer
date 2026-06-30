import { useCallback, useEffect, useRef, useState } from 'react';
import { MORSE } from '../data/morse';
import { useApp } from '../state/AppContext';
import { isCourseComplete, pickNext } from '../lib/session';
import type { Pick } from '../lib/session';
import {
  playCorrect,
  playDash,
  playDot,
  playPattern,
  playWrong,
  speak,
  speakLetterHint,
} from '../lib/audio';
import { LetterCard } from './LetterCard';
import { LiveDecode } from './LiveDecode';
import { Conveyor } from './Conveyor';
import { Keypad, SCAN_ORDER } from './Keypad';
import type { KeyAction } from './Keypad';
import { Completion } from './Completion';

const ADVANCE_DELAY = 850;
const WRONG_DELAY = 700;
const INPUT_LOCK_MS = 350; // brief debounce after a new letter loads

export function Game({ onOpenStats }: { onOpenStats: () => void }) {
  const { progress, settings, recordAnswer, addPlayTime } = useApp();

  const [current, setCurrent] = useState<Pick | null>(() => pickNext(progress, null));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [scanIndex, setScanIndex] = useState<number | null>(null);

  const lockUntil = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const currentRef = useRef(current);
  currentRef.current = current;
  const inputRef = useRef(input);
  inputRef.current = input;
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;
  const scanIndexRef = useRef(scanIndex);
  scanIndexRef.current = scanIndex;

  // Track time spent playing.
  useEffect(() => {
    const t = setInterval(() => addPlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addPlayTime]);

  // Speak the hint when a new letter appears.
  useEffect(() => {
    if (current && settingsRef.current.speechHints) speakLetterHint(current.letter);
    lockUntil.current = Date.now() + INPUT_LOCK_MS;
  }, [current]);

  const advance = useCallback((fromProgress: typeof progress, avoid: string | null) => {
    const next = pickNext(fromProgress, avoid);
    inputRef.current = '';
    setInput('');
    setFeedback('idle');
    setCurrent(next);
  }, []);

  // Auto-evaluate: as soon as the entered pattern reaches the target's length,
  // we judge it — no separate "enter" step, just like the original.
  const evaluate = useCallback(
    (seq: string) => {
      const cur = currentRef.current;
      if (!cur) return;
      const correct = seq === MORSE[cur.letter];
      setFeedback(correct ? 'correct' : 'wrong');

      if (correct) {
        if (settingsRef.current.speechHints) speak('Correct!');
        else if (settingsRef.current.sound) playCorrect();
      } else if (settingsRef.current.sound) {
        playWrong();
      }

      const nextProgress = recordAnswer(cur.letter, correct);

      if (correct) {
        window.setTimeout(() => advance(nextProgress, cur.letter), ADVANCE_DELAY);
      } else {
        // Stay on the same letter; clear, replay the hint, and let them retry.
        window.setTimeout(() => {
          inputRef.current = '';
          setInput('');
          setFeedback('idle');
          if (settingsRef.current.speechHints) speakLetterHint(cur.letter);
        }, WRONG_DELAY);
      }
    },
    [advance, recordAnswer],
  );

  const handleAction = useCallback(
    (a: KeyAction) => {
      if (Date.now() < lockUntil.current) return;
      if (feedbackRef.current !== 'idle') return;
      const cur = currentRef.current;
      if (!cur) return;

      if (a === 'delete') {
        const next = inputRef.current.slice(0, -1);
        inputRef.current = next;
        setInput(next);
        return;
      }

      if (a === 'dot' || a === 'dash') {
        const sym = a === 'dot' ? '.' : '-';
        const next = inputRef.current + sym;
        inputRef.current = next;
        setInput(next);
        if (settingsRef.current.sound) (a === 'dot' ? playDot : playDash)();
        // Reached the target length → judge it immediately.
        if (next.length >= MORSE[cur.letter].length) evaluate(next);
      }
    },
    [evaluate],
  );
  const handleActionRef = useRef(handleAction);
  handleActionRef.current = handleAction;

  // One-switch scanning: cycle the highlight; a single activation selects it.
  useEffect(() => {
    if (!settings.oneSwitch || !current) {
      setScanIndex(null);
      return;
    }
    setScanIndex(0);
    const t = setInterval(() => {
      if (feedbackRef.current !== 'idle') return;
      setScanIndex((i) => ((i ?? -1) + 1) % SCAN_ORDER.length);
    }, settings.scanIntervalMs);
    return () => clearInterval(t);
  }, [settings.oneSwitch, settings.scanIntervalMs, current]);

  const selectScanned = useCallback(() => {
    const i = scanIndexRef.current;
    if (i === null) return;
    handleActionRef.current(SCAN_ORDER[i]);
  }, []);

  // Keyboard input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsRef.current.oneSwitch) {
        // Any switch press (Space/Enter) selects the highlighted option.
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          selectScanned();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'j' || e.key === '.') handleActionRef.current('dot');
      else if (k === 'k' || e.key === '-') handleActionRef.current('dash');
      else if (e.key === 'Backspace' || e.key === 'Delete' || k === 'i') {
        e.preventDefault();
        handleActionRef.current('delete');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectScanned]);

  if (!current) {
    if (isCourseComplete(progress)) return <Completion onOpenStats={onOpenStats} />;
    // Safety net — shouldn't happen, but re-pick if we somehow have no letter.
    return null;
  }

  return (
    <div className="game">
      <Conveyor progress={progress} current={current.letter} />

      <LetterCard
        letter={current.letter}
        isReview={current.isReview}
        settings={settings}
        feedback={feedback}
      />

      <button
        type="button"
        className="play-pattern"
        onClick={() => settingsRef.current.sound && playPattern(MORSE[current.letter])}
      >
        ♪ Hear the code
      </button>

      <LiveDecode input={input} />

      <Keypad onAction={handleAction} scanIndex={scanIndex} oneSwitch={settings.oneSwitch} />

      {settings.oneSwitch && (
        <button type="button" className="switch-button" onClick={selectScanned}>
          SWITCH — select highlighted
        </button>
      )}
    </div>
  );
}

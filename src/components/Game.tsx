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
  speakLetterHint,
} from '../lib/audio';
import { LetterCard } from './LetterCard';
import { LiveDecode } from './LiveDecode';
import { Conveyor } from './Conveyor';
import { Keypad, SCAN_ORDER } from './Keypad';
import type { KeyAction } from './Keypad';
import { Completion } from './Completion';

const ADVANCE_DELAY = 700;
const WRONG_DELAY = 650;
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
    setInput('');
    setFeedback('idle');
    setCurrent(next);
  }, []);

  const doCommit = useCallback(() => {
    const cur = currentRef.current;
    const seq = inputRef.current;
    if (!cur || seq === '' || feedbackRef.current !== 'idle') return;

    const correct = seq === MORSE[cur.letter];
    setFeedback(correct ? 'correct' : 'wrong');
    if (settingsRef.current.sound) (correct ? playCorrect : playWrong)();

    const nextProgress = recordAnswer(cur.letter, correct);

    if (correct) {
      window.setTimeout(() => advance(nextProgress, cur.letter), ADVANCE_DELAY);
    } else {
      // Stay on the same letter; replay the hint and let them retry.
      window.setTimeout(() => {
        setInput('');
        setFeedback('idle');
        if (settingsRef.current.speechHints) speakLetterHint(cur.letter);
      }, WRONG_DELAY);
    }
  }, [advance, recordAnswer]);

  const handleAction = useCallback(
    (a: KeyAction) => {
      if (Date.now() < lockUntil.current) return;
      if (feedbackRef.current !== 'idle') return;
      switch (a) {
        case 'dot':
          setInput((i) => i + '.');
          if (settingsRef.current.sound) playDot();
          break;
        case 'dash':
          setInput((i) => i + '-');
          if (settingsRef.current.sound) playDash();
          break;
        case 'delete':
          setInput((i) => i.slice(0, -1));
          break;
        case 'commit':
          doCommit();
          break;
      }
    },
    [doCommit],
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
      else if (e.key === ' ') {
        e.preventDefault();
        handleActionRef.current('commit');
      } else if (e.key === 'Backspace' || e.key === 'Delete' || k === 'i') {
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

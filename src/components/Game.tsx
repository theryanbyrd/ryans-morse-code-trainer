import { useCallback, useEffect, useRef, useState } from 'react';
import { MORSE } from '../data/morse';
import { useApp } from '../state/AppContext';
import { hintActive, isCourseComplete, pickWord } from '../lib/session';
import {
  playCorrect,
  playDash,
  playDot,
  playLetterHint,
  playPattern,
  playWrong,
} from '../lib/audio';
import { WordCard } from './WordCard';
import { LiveDecode } from './LiveDecode';
import { Keypad, SCAN_ORDER } from './Keypad';
import type { KeyAction } from './Keypad';
import { Completion } from './Completion';
import { MorseTree } from './MorseTree';

const WORD_DELAY = 850; // pause after finishing a word
const LETTER_DELAY = 480; // pause between letters (lets "Correct!" be heard)
const WRONG_DELAY = 700;
const INPUT_LOCK_MS = 320; // brief debounce after a new letter/word loads

export function Game({ onOpenStats }: { onOpenStats: () => void }) {
  const { progress, settings, answerLetter, addPlayTime } = useApp();

  const [word, setWord] = useState<string>(() => pickWord(progress, null));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [scanIndex, setScanIndex] = useState<number | null>(null);

  const lockUntil = useRef(0);
  const wordCleanRef = useRef(true); // did the current word have no mistakes so far?

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const wordRef = useRef(word);
  wordRef.current = word;
  const indexRef = useRef(index);
  indexRef.current = index;
  const inputRef = useRef(input);
  inputRef.current = input;
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;
  const scanIndexRef = useRef(scanIndex);
  scanIndexRef.current = scanIndex;

  const letter = word[index];

  // Track time spent playing.
  useEffect(() => {
    const t = setInterval(() => addPlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addPlayTime]);

  // On each new letter: brief input lock, and play the hint if it's active.
  useEffect(() => {
    lockUntil.current = Date.now() + INPUT_LOCK_MS;
    const l = wordRef.current[indexRef.current];
    if (l && settingsRef.current.speechHints && hintActive(progressRef.current, l)) {
      playLetterHint(l);
    }
  }, [word, index]);

  const goToWord = useCallback((fromProgress: typeof progress) => {
    wordCleanRef.current = true;
    inputRef.current = '';
    setInput('');
    setFeedback('idle');
    setIndex(0);
    setWord(pickWord(fromProgress, wordRef.current));
  }, []);

  const nextLetter = useCallback(() => {
    inputRef.current = '';
    setInput('');
    setFeedback('idle');
    setIndex((i) => i + 1);
  }, []);

  // Judge the entered pattern against the current letter.
  const evaluate = useCallback(
    (seq: string) => {
      const w = wordRef.current;
      const i = indexRef.current;
      const l = w[i];
      if (!l) return;

      const correct = seq === MORSE[l];
      const wordEnd = correct && i === w.length - 1;
      setFeedback(correct ? 'correct' : 'wrong');

      if (correct) {
        // The original's recorded "correct" clip, after every correct letter.
        if (settingsRef.current.sound) playCorrect();
      } else if (settingsRef.current.sound) {
        playWrong();
      }

      const next = answerLetter(l, correct, wordEnd, wordCleanRef.current);

      if (correct) {
        if (wordEnd) window.setTimeout(() => goToWord(next), WORD_DELAY);
        else window.setTimeout(nextLetter, LETTER_DELAY);
      } else {
        wordCleanRef.current = false;
        window.setTimeout(() => {
          inputRef.current = '';
          setInput('');
          setFeedback('idle');
          if (settingsRef.current.speechHints) playLetterHint(l);
        }, WRONG_DELAY);
      }
    },
    [answerLetter, goToWord, nextLetter],
  );

  const handleAction = useCallback(
    (a: KeyAction) => {
      if (Date.now() < lockUntil.current) return;
      if (feedbackRef.current !== 'idle') return;
      const l = wordRef.current[indexRef.current];
      if (!l) return;

      if (a === 'delete') {
        const upd = inputRef.current.slice(0, -1);
        inputRef.current = upd;
        setInput(upd);
        return;
      }

      if (a === 'dot' || a === 'dash') {
        const sym = a === 'dot' ? '.' : '-';
        const upd = inputRef.current + sym;
        inputRef.current = upd;
        setInput(upd);
        if (settingsRef.current.sound) (a === 'dot' ? playDot : playDash)();
        if (upd.length >= MORSE[l].length) evaluate(upd);
      }
    },
    [evaluate],
  );
  const handleActionRef = useRef(handleAction);
  handleActionRef.current = handleAction;

  // One-switch scanning: cycle the highlight; a single activation selects it.
  useEffect(() => {
    if (!settings.oneSwitch) {
      setScanIndex(null);
      return;
    }
    setScanIndex(0);
    const t = setInterval(() => {
      if (feedbackRef.current !== 'idle') return;
      setScanIndex((i) => ((i ?? -1) + 1) % SCAN_ORDER.length);
    }, settings.scanIntervalMs);
    return () => clearInterval(t);
  }, [settings.oneSwitch, settings.scanIntervalMs]);

  const selectScanned = useCallback(() => {
    const i = scanIndexRef.current;
    if (i === null) return;
    handleActionRef.current(SCAN_ORDER[i]);
  }, []);

  // Keyboard input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsRef.current.oneSwitch) {
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

  if (isCourseComplete(progress)) return <Completion onOpenStats={onOpenStats} />;

  return (
    <div className="game">
      <WordCard
        word={word}
        index={index}
        hint={hintActive(progress, letter)}
        settings={settings}
        feedback={feedback}
      />

      <button
        type="button"
        className="play-pattern"
        onClick={() => settingsRef.current.sound && playPattern(MORSE[letter])}
      >
        ♪ Hear the code
      </button>

      <LiveDecode input={input} />

      {settings.morseTree && <MorseTree input={input} />}

      <Keypad onAction={handleAction} scanIndex={scanIndex} oneSwitch={settings.oneSwitch} />

      {settings.oneSwitch && (
        <button type="button" className="switch-button" onClick={selectScanned}>
          SWITCH — select highlighted
        </button>
      )}
    </div>
  );
}

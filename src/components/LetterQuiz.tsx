import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import {
  isRecall,
  knownLetters,
  makeChoices,
  pickReceiveWord,
  recallOptions,
} from '../lib/receive';

const CORRECT_DELAY = 620;
const WRONG_DELAY = 1500;
const FIRST_PLAY_DELAY = 350;
const SLOW_WPM = 7;

// Decode a word one letter at a time: hear A, pick A; hear T, pick T; … to
// spell the word — the receive mirror of the Send word trainer.
export function LetterQuiz() {
  const { progress, receive, settings, answerReceive, addReceivePlayTime } = useApp();
  const { play, lampOn } = useMorsePlayer();

  const pool = knownLetters(progress);
  const optionsFor = useCallback(
    (letter: string, r = receive) => (isRecall(r, letter) ? recallOptions(letter, pool) : makeChoices(letter, pool)),
    [pool, receive],
  );

  const [word, setWord] = useState<string>(() => pickReceiveWord(pool, null) ?? pool[0] ?? 'e');
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>(() => optionsFor(word[0]));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [picked, setPicked] = useState<string | null>(null);
  const [scanIndex, setScanIndex] = useState<number | null>(null);

  const wordRef = useRef(word);
  wordRef.current = word;
  const indexRef = useRef(index);
  indexRef.current = index;
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;
  const receiveRef = useRef(receive);
  receiveRef.current = receive;
  const poolRef = useRef(pool);
  poolRef.current = pool;
  const choicesRef = useRef(choices);
  choicesRef.current = choices;
  const scanIndexRef = useRef(scanIndex);
  scanIndexRef.current = scanIndex;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const letter = word[index];

  useEffect(() => {
    const t = setInterval(() => addReceivePlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addReceivePlayTime]);

  // Play the current letter each time it changes.
  // Play the current letter whenever the POSITION changes — keyed on word+index,
  // not the letter value, so a repeated consecutive letter (e.g. the E's in
  // "tee", or landing back on the same letter after a wrong→right) still plays.
  useEffect(() => {
    const l = word[index];
    if (!l) return;
    const t = setTimeout(() => play(l), FIRST_PLAY_DELAY);
    return () => clearTimeout(t);
  }, [word, index, play]);

  const advance = useCallback(() => {
    const w = wordRef.current;
    const i = indexRef.current;
    setPicked(null);
    setFeedback('idle');
    setScanIndex(null);
    if (i + 1 >= w.length) {
      // Word fully spelled — on to the next word (mastery is tracked per letter).
      const next = pickReceiveWord(poolRef.current, w) ?? poolRef.current[0] ?? 'e';
      setWord(next);
      setIndex(0);
      setChoices(optionsFor(next[0], receiveRef.current));
    } else {
      setIndex(i + 1);
      setChoices(optionsFor(w[i + 1], receiveRef.current));
    }
  }, [optionsFor]);

  const choose = useCallback(
    (pick: string) => {
      if (feedbackRef.current !== 'idle') return;
      const t = wordRef.current[indexRef.current];
      if (!t) return;
      const correct = pick === t;
      setPicked(pick);
      setFeedback(correct ? 'correct' : 'wrong');
      if (settingsRef.current.sound) (correct ? playCorrect : playWrong)();
      answerReceive(t, correct);
      if (correct) {
        window.setTimeout(advance, CORRECT_DELAY);
      } else {
        // Reveal + replay slower, then retry the SAME letter (so the word gets spelled).
        window.setTimeout(() => play(t, SLOW_WPM), 300);
        window.setTimeout(() => {
          setPicked(null);
          setFeedback('idle');
        }, WRONG_DELAY);
      }
    },
    [answerReceive, advance, play],
  );
  const chooseRef = useRef(choose);
  chooseRef.current = choose;

  // One-switch scanning over the tiles + a final replay option.
  useEffect(() => {
    if (!settings.oneSwitch || !letter) {
      setScanIndex(null);
      return;
    }
    setScanIndex(0);
    const id = setInterval(() => {
      if (feedbackRef.current !== 'idle') return;
      setScanIndex((i) => ((i ?? -1) + 1) % (choicesRef.current.length + 1));
    }, settings.scanIntervalMs);
    return () => clearInterval(id);
  }, [settings.oneSwitch, settings.scanIntervalMs, letter, choices.length]);

  const selectScanned = useCallback(() => {
    const i = scanIndexRef.current;
    if (i === null) return;
    const cs = choicesRef.current;
    if (i < cs.length) chooseRef.current(cs[i]);
    else play(wordRef.current[indexRef.current]);
  }, [play]);

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
      if (k.length === 1 && choicesRef.current.includes(k)) chooseRef.current(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectScanned]);

  if (!letter) return null;
  const recall = isRecall(receive, letter);
  const optionCount = choices.length + 1;

  return (
    <div className="receive">
      <div className="word-bricks">
        {word.split('').map((ch, i) => {
          const state = i < index ? 'done' : i === index ? 'current' : 'upcoming';
          return (
            <span key={i} className={`brick ${state}`}>
              {i < index ? ch.toUpperCase() : ''}
            </span>
          );
        })}
      </div>

      <button
        className={`listen-btn${lampOn ? ' lamp-on' : ''}`}
        onClick={() => play(letter)}
        aria-label="Play the letter again"
      >
        <span className="listen-icon" aria-hidden="true">🔊</span>
        <span>Listen</span>
      </button>

      <p className="receive-prompt">
        {recall ? 'Type or tap the letter you heard' : 'Which letter did you hear?'}
      </p>

      <div className={`choices${recall ? ' recall' : ` choices-${choices.length}`}`}>
        {choices.map((l, i) => {
          let cls = 'choice';
          if (feedback !== 'idle') {
            if (l === letter) cls += ' correct';
            else if (l === picked) cls += ' wrong';
            else cls += ' dim';
          }
          if (scanIndex === i) cls += ' scanning';
          return (
            <button key={l} className={cls} onClick={() => choose(l)} disabled={feedback !== 'idle'}>
              {l.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="receive-controls">
        <button className={`rc-btn${scanIndex === optionCount - 1 ? ' scanning' : ''}`} onClick={() => play(letter)}>
          ↻ Replay
        </button>
        <button className="rc-btn" onClick={() => play(letter, SLOW_WPM)}>🐢 Slower</button>
      </div>

      {settings.oneSwitch && (
        <button type="button" className="switch-button" onClick={selectScanned}>
          SWITCH — select highlighted
        </button>
      )}
    </div>
  );
}

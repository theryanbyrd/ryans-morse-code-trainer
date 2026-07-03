import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { playMorse } from '../lib/morsePlayer';
import type { Playback } from '../lib/morsePlayer';
import {
  isReceiveComplete,
  isRecall,
  knownLetters,
  makeChoices,
  pickReceiveLetter,
  pickReceiveWord,
  recallOptions,
} from '../lib/receive';
import { ReceiveComplete } from './ReceiveComplete';
import { WordReceive } from './WordReceive';

const CORRECT_DELAY = 750;
const WRONG_DELAY = 1600;
const FIRST_PLAY_DELAY = 350;
const SLOW_WPM = 7;

export function ReceiveGame() {
  const { progress, receive, settings, answerReceive, addReceivePlayTime, setMode } = useApp();

  const pool = knownLetters(progress);

  const optionsFor = useCallback(
    (letter: string, r = receive) => (isRecall(r, letter) ? recallOptions(letter, pool) : makeChoices(letter, pool)),
    [pool, receive],
  );

  const [target, setTarget] = useState<string | null>(() => pickReceiveLetter(receive, pool, null));
  const [choices, setChoices] = useState<string[]>(() => (target ? optionsFor(target) : []));
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [picked, setPicked] = useState<string | null>(null);
  const [lampOn, setLampOn] = useState(false);
  const [scanIndex, setScanIndex] = useState<number | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const targetRef = useRef(target);
  targetRef.current = target;
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
  const playback = useRef<Playback | null>(null);

  const play = useCallback((letter: string, wpm?: number) => {
    playback.current?.stop();
    playback.current = playMorse(letter, {
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
    if (!target) return;
    const t = setTimeout(() => play(target), FIRST_PLAY_DELAY);
    return () => clearTimeout(t);
  }, [target, play]);

  const nextItem = useCallback(() => {
    const nextTarget = pickReceiveLetter(receiveRef.current, poolRef.current, targetRef.current);
    setPicked(null);
    setFeedback('idle');
    setScanIndex(null);
    setTarget(nextTarget);
    setChoices(nextTarget ? optionsFor(nextTarget, receiveRef.current) : []);
  }, [optionsFor]);

  const choose = useCallback(
    (letter: string) => {
      if (feedbackRef.current !== 'idle') return;
      const t = targetRef.current;
      if (!t) return;
      const correct = letter === t;
      setPicked(letter);
      setFeedback(correct ? 'correct' : 'wrong');
      if (settingsRef.current.sound) (correct ? playCorrect : playWrong)();
      answerReceive(t, correct);
      if (correct) {
        window.setTimeout(nextItem, CORRECT_DELAY);
      } else {
        window.setTimeout(() => play(t, SLOW_WPM), 300);
        window.setTimeout(nextItem, WRONG_DELAY);
      }
    },
    [answerReceive, nextItem, play],
  );
  const chooseRef = useRef(choose);
  chooseRef.current = choose;

  // One-switch scanning over the choice tiles + a final "replay" option.
  const optionCount = choices.length + 1; // last index = replay
  useEffect(() => {
    if (!settings.oneSwitch || !target) {
      setScanIndex(null);
      return;
    }
    setScanIndex(0);
    const id = setInterval(() => {
      if (feedbackRef.current !== 'idle') return;
      setScanIndex((i) => ((i ?? -1) + 1) % (choicesRef.current.length + 1));
    }, settings.scanIntervalMs);
    return () => clearInterval(id);
  }, [settings.oneSwitch, settings.scanIntervalMs, target, choices.length]);

  const selectScanned = useCallback(() => {
    const i = scanIndexRef.current;
    if (i === null) return;
    const cs = choicesRef.current;
    if (i < cs.length) chooseRef.current(cs[i]);
    else if (targetRef.current) play(targetRef.current);
  }, [play]);

  // Keyboard: one-switch → space/enter selects; otherwise a letter key picks it.
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

  useEffect(() => () => playback.current?.stop(), []);

  // Once every known letter is mastered by ear, move on to the word phase
  // (which falls back to a completion screen if no words are possible yet).
  if (isReceiveComplete(receive, pool)) {
    if (pickReceiveWord(pool, null)) return <WordReceive />;
    return <ReceiveComplete pool={pool} onSwitch={() => setMode(null)} />;
  }
  if (!target) return null;

  const recall = isRecall(receive, target);

  return (
    <div className="receive">
      <button
        className={`listen-btn${lampOn ? ' lamp-on' : ''}`}
        onClick={() => play(target)}
        aria-label="Play the code again"
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
            if (l === target) cls += ' correct';
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
        <button
          className={`rc-btn${scanIndex === optionCount - 1 ? ' scanning' : ''}`}
          onClick={() => play(target)}
        >
          ↻ Replay
        </button>
        <button className="rc-btn" onClick={() => play(target, SLOW_WPM)}>🐢 Slower</button>
      </div>

      {settings.oneSwitch && (
        <button type="button" className="switch-button" onClick={selectScanned}>
          SWITCH — select highlighted
        </button>
      )}
    </div>
  );
}

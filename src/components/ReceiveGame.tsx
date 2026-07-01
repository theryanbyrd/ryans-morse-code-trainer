import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { playMorse } from '../lib/morsePlayer';
import type { Playback } from '../lib/morsePlayer';
import {
  isReceiveComplete,
  knownLetters,
  makeChoices,
  pickReceiveLetter,
} from '../lib/receive';
import { ReceiveComplete } from './ReceiveComplete';

const CORRECT_DELAY = 750;
const WRONG_DELAY = 1600;
const FIRST_PLAY_DELAY = 350;
const SLOW_WPM = 7;

export function ReceiveGame() {
  const { progress, receive, settings, answerReceive, addReceivePlayTime, setMode } = useApp();

  const pool = knownLetters(progress);
  const [target, setTarget] = useState<string | null>(() => pickReceiveLetter(receive, pool, null));
  const [choices, setChoices] = useState<string[]>(() =>
    target ? makeChoices(target, pool) : [],
  );
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [picked, setPicked] = useState<string | null>(null);

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
  const playback = useRef<Playback | null>(null);

  const play = useCallback((letter: string, wpm?: number) => {
    playback.current?.stop();
    playback.current = playMorse(letter, {
      wpm: wpm ?? settingsRef.current.wpm,
      farnsworth: settingsRef.current.farnsworth,
    });
  }, []);

  // Track time spent listening.
  useEffect(() => {
    const t = setInterval(() => addReceivePlayTime(1000), 1000);
    return () => clearInterval(t);
  }, [addReceivePlayTime]);

  // Auto-play each new target shortly after it appears.
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => play(target), FIRST_PLAY_DELAY);
    return () => clearTimeout(t);
  }, [target, play]);

  const nextItem = useCallback(() => {
    const nextTarget = pickReceiveLetter(receiveRef.current, poolRef.current, targetRef.current);
    setPicked(null);
    setFeedback('idle');
    setTarget(nextTarget);
    setChoices(nextTarget ? makeChoices(nextTarget, poolRef.current) : []);
  }, []);

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
        // Reveal the answer by replaying it, then move on.
        window.setTimeout(() => play(t, SLOW_WPM), 300);
        window.setTimeout(nextItem, WRONG_DELAY);
      }
    },
    [answerReceive, nextItem, play],
  );

  // Keyboard: press a letter key that's on offer to select it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k.length === 1 && choices.includes(k)) choose(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, choose]);

  useEffect(() => () => playback.current?.stop(), []);

  if (isReceiveComplete(receive, pool)) {
    return <ReceiveComplete pool={pool} onSwitch={() => setMode(null)} />;
  }
  if (!target) return null;

  return (
    <div className="receive">
      <button className="listen-btn" onClick={() => play(target)} aria-label="Play the code again">
        <span className="listen-icon" aria-hidden="true">🔊</span>
        <span>Listen</span>
      </button>

      <p className="receive-prompt">Which letter did you hear?</p>

      <div className={`choices choices-${choices.length}`}>
        {choices.map((l) => {
          let cls = 'choice';
          if (feedback !== 'idle') {
            if (l === target) cls += ' correct';
            else if (l === picked) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={l} className={cls} onClick={() => choose(l)} disabled={feedback !== 'idle'}>
              {l.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="receive-controls">
        <button className="rc-btn" onClick={() => play(target)}>↻ Replay</button>
        <button className="rc-btn" onClick={() => play(target, SLOW_WPM)}>🐢 Slower</button>
      </div>
    </div>
  );
}

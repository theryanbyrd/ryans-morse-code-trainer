import { useApp } from '../state/AppContext';
import type { Mode } from '../state/AppContext';
import { learnedCount } from '../lib/session';
import {
  knownLetters,
  receiveUnlocked,
  receiveMasteredCount,
  MIN_LETTERS_TO_RECEIVE,
} from '../lib/receive';
import { masteredCount } from '../lib/numbers';
import { NUM_SYM_ORDER } from '../data/numsym';
import { KOCH_LESSONS } from '../data/koch';
import { unlockAudio } from '../lib/audio';
import { unlockMorse } from '../lib/morsePlayer';

export function ModeSelect() {
  const { progress, receive, numbers, koch, lastMode, setMode } = useApp();

  const learned = learnedCount(progress);
  const numsMastered = masteredCount(numbers);
  const pool = knownLetters(progress);
  const canReceive = receiveUnlocked(progress);
  const heardMastered = receiveMasteredCount(receive, pool);

  const choose = (m: Mode) => {
    if (m === 'send' || m === 'numbers') unlockAudio();
    else if (m === 'qso') {
      unlockAudio();
      unlockMorse();
    } else unlockMorse();
    setMode(m);
  };

  const lockNote = `Learn ${MIN_LETTERS_TO_RECEIVE} letters first`;

  return (
    <div className="mode-select">
      <h1 className="mode-title">Choose a mode</h1>
      <div className="mode-cards">
        <button
          className={`mode-card${lastMode === 'send' ? ' recommended' : ''}`}
          onClick={() => choose('send')}
        >
          <span className="mode-emoji" aria-hidden="true">✍️</span>
          <span className="mode-name">Learn</span>
          <span className="mode-desc">Learn the code — tap each letter</span>
          <span className="mode-meta">{learned}/26 letters learned</span>
        </button>

        <button
          className={`mode-card${lastMode === 'numbers' ? ' recommended' : ''}`}
          onClick={() => choose('numbers')}
        >
          <span className="mode-emoji" aria-hidden="true">🔢</span>
          <span className="mode-name">Numbers &amp; symbols</span>
          <span className="mode-desc">Learn to send 0–9 and punctuation</span>
          <span className="mode-meta">{numsMastered}/{NUM_SYM_ORDER.length} mastered</span>
        </button>

        <button
          className={`mode-card${lastMode === 'koch' ? ' recommended' : ''}`}
          onClick={() => choose('koch')}
        >
          <span className="mode-badge tool">Method</span>
          <span className="mode-emoji" aria-hidden="true">🎧</span>
          <span className="mode-name">Koch course</span>
          <span className="mode-desc">The classic method — copy at real speed</span>
          <span className="mode-meta">Lesson {koch.lesson} / {KOCH_LESSONS}</span>
        </button>

        <button
          className={`mode-card${lastMode === 'receive-letters' ? ' recommended' : ''}${canReceive ? '' : ' locked'}`}
          onClick={() => canReceive && choose('receive-letters')}
          disabled={!canReceive}
        >
          <span className="mode-emoji" aria-hidden="true">👂</span>
          <span className="mode-name">Hear letters</span>
          <span className="mode-desc">Decode words one letter at a time</span>
          {canReceive ? (
            <span className="mode-meta">{heardMastered}/{pool.length} letters mastered by ear</span>
          ) : (
            <span className="mode-meta lock">{lockNote}</span>
          )}
        </button>

        <button
          className={`mode-card${lastMode === 'receive-words' ? ' recommended' : ''}${canReceive ? '' : ' locked'}`}
          onClick={() => canReceive && choose('receive-words')}
          disabled={!canReceive}
        >
          <span className="mode-emoji" aria-hidden="true">📻</span>
          <span className="mode-name">Hear words</span>
          <span className="mode-desc">Copy whole words &amp; phrases by ear</span>
          {canReceive ? (
            <span className="mode-meta">{receive.wordsCompleted} words copied</span>
          ) : (
            <span className="mode-meta lock">{lockNote}</span>
          )}
        </button>

        <button
          className={`mode-card${lastMode === 'qso' ? ' recommended' : ''}${canReceive ? '' : ' locked'}`}
          onClick={() => canReceive && choose('qso')}
          disabled={!canReceive}
        >
          <span className="mode-badge">Advanced</span>
          <span className="mode-emoji" aria-hidden="true">📡</span>
          <span className="mode-name">On the air</span>
          <span className="mode-desc">Work a real CW contact — send &amp; copy a QSO</span>
          {canReceive ? (
            <span className="mode-meta">20 ham radio scenarios</span>
          ) : (
            <span className="mode-meta lock">{lockNote}</span>
          )}
        </button>

        <button
          className={`mode-card${lastMode === 'translator' ? ' recommended' : ''}`}
          onClick={() => choose('translator')}
        >
          <span className="mode-badge tool">Tool</span>
          <span className="mode-emoji" aria-hidden="true">🔤</span>
          <span className="mode-name">Translator</span>
          <span className="mode-desc">Text ↔ Morse — play it or flash it</span>
          <span className="mode-meta">Encode &amp; decode any message</span>
        </button>
      </div>
    </div>
  );
}

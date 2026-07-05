import { useApp } from '../state/AppContext';
import type { Mode } from '../state/AppContext';
import { learnedCount } from '../lib/session';
import {
  knownLetters,
  receiveUnlocked,
  receiveMasteredCount,
  MIN_LETTERS_TO_RECEIVE,
} from '../lib/receive';
import { unlockAudio } from '../lib/audio';
import { unlockMorse } from '../lib/morsePlayer';

export function ModeSelect() {
  const { progress, receive, lastMode, setMode } = useApp();

  const learned = learnedCount(progress);
  const pool = knownLetters(progress);
  const canReceive = receiveUnlocked(progress);
  const heardMastered = receiveMasteredCount(receive, pool);

  const choose = (m: Mode) => {
    if (m === 'send') unlockAudio();
    else unlockMorse();
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
      </div>
    </div>
  );
}

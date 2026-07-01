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
    // Both are user gestures — unlock the relevant audio path here.
    if (m === 'send') unlockAudio();
    else unlockMorse();
    setMode(m);
  };

  return (
    <div className="mode-select">
      <h1 className="mode-title">Choose a mode</h1>
      <div className="mode-cards">
        <button
          className={`mode-card${lastMode === 'send' ? ' recommended' : ''}`}
          onClick={() => choose('send')}
        >
          <span className="mode-emoji" aria-hidden="true">✍️</span>
          <span className="mode-name">Send</span>
          <span className="mode-desc">Tap the code for each letter</span>
          <span className="mode-meta">{learned}/26 letters learned</span>
        </button>

        <button
          className={`mode-card${lastMode === 'receive' ? ' recommended' : ''}${canReceive ? '' : ' locked'}`}
          onClick={() => canReceive && choose('receive')}
          disabled={!canReceive}
        >
          <span className="mode-emoji" aria-hidden="true">👂</span>
          <span className="mode-name">Receive</span>
          <span className="mode-desc">Hear the code and name the letter</span>
          {canReceive ? (
            <span className="mode-meta">{heardMastered}/{pool.length} letters mastered by ear</span>
          ) : (
            <span className="mode-meta lock">
              Learn {MIN_LETTERS_TO_RECEIVE} letters in Send to unlock
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

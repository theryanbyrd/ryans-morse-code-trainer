import { ALPHABET, MORSE } from '../data/morse';
import { Pattern } from './Pattern';
import { CloseIcon } from './Icons';

// A–Z reference board so learners can see the whole code map.
export function MorseBoard({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal board" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Morse board">
        <header className="modal-head">
          <h2>Morse Board</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close board">
            <CloseIcon />
          </button>
        </header>
        <div className="board-grid">
          {ALPHABET.map((l) => (
            <div key={l} className="board-cell">
              <span className="board-letter">{l.toUpperCase()}</span>
              <Pattern pattern={MORSE[l]} size={9} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { ALPHABET } from '../data/morse';
import type { Progress } from '../lib/storage';

// Persistent A–Z strip; learned letters are highlighted.
export function AlphabetBar({ progress, current }: { progress: Progress; current: string | null }) {
  return (
    <div className="alphabet-bar" role="img" aria-label="Alphabet progress">
      {ALPHABET.map((l) => {
        const learned = progress.letters[l]?.learned;
        const isCurrent = l === current;
        return (
          <span
            key={l}
            className={`ab-letter${learned ? ' learned' : ''}${isCurrent ? ' current' : ''}`}
          >
            {l.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}

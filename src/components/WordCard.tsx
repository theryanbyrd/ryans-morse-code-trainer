import { MORSE } from '../data/morse';
import { Pattern } from './Pattern';
import type { Settings } from '../lib/storage';

// Shows the current practice word as a row of letter bricks (done / current /
// upcoming), with the active letter enlarged. The mnemonic picture and target
// pattern appear only while the hint is active for that letter.
export function WordCard({
  word,
  index,
  hint,
  settings,
  feedback,
}: {
  word: string;
  index: number;
  hint: boolean;
  settings: Settings;
  feedback: 'idle' | 'correct' | 'wrong';
}) {
  const letter = word[index];

  return (
    <div className={`letter-card ${feedback}`}>
      <div className="word-bricks">
        {word.split('').map((ch, i) => {
          const state = i < index ? 'done' : i === index ? 'current' : 'upcoming';
          return (
            <span key={i} className={`brick ${state}`}>
              {ch.toUpperCase()}
            </span>
          );
        })}
      </div>

      <div className="letter-circle">{letter.toUpperCase()}</div>

      {hint && settings.visualHints && (
        <div className="mnemonic">
          {/* Not decorative: this picture is the memory hook. We cannot caption
              the artwork itself (the mnemonic words exist only in the images and
              the sounds-alike audio), but naming its purpose beats hiding it. */}
          <img
            className="mnemonic-img"
            src={`/assets/images/final/${letter.toUpperCase()}.png`}
            alt={`Memory picture for the letter ${letter.toUpperCase()}`}
          />
        </div>
      )}

      {hint && <Pattern pattern={MORSE[letter]} size={20} className="target-pattern" />}
    </div>
  );
}

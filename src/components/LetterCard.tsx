import { MORSE } from '../data/morse';
import { MNEMONICS } from '../data/mnemonics';
import { Pattern } from './Pattern';
import type { Settings } from '../lib/storage';

// The big card showing the letter to learn: the letter, its mnemonic picture
// (when Visual Hints are on) and its target dot/dash pattern.
export function LetterCard({
  letter,
  isReview,
  settings,
  feedback,
}: {
  letter: string;
  isReview: boolean;
  settings: Settings;
  feedback: 'idle' | 'correct' | 'wrong';
}) {
  const mnemonic = MNEMONICS[letter];
  return (
    <div className={`letter-card ${feedback}`}>
      {isReview && <div className="review-tag">Review</div>}
      <div className="letter-circle">{letter.toUpperCase()}</div>

      {settings.visualHints && mnemonic && (
        <div className="mnemonic">
          <div className="mnemonic-art">{mnemonic.icon}</div>
          <div className="mnemonic-word">{mnemonic.word}</div>
        </div>
      )}

      <Pattern pattern={MORSE[letter]} size={20} className="target-pattern" />
    </div>
  );
}

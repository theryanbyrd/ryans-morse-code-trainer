import { decode, isPrefixOfAnyLetter } from '../data/morse';
import { Pattern } from './Pattern';

// Shows the dots/dashes entered so far and the letter they currently spell.
export function LiveDecode({ input }: { input: string }) {
  const letter = decode(input);
  const valid = isPrefixOfAnyLetter(input);

  let preview = '';
  if (input === '') preview = '';
  else if (letter) preview = letter.toUpperCase();
  else preview = '?';

  return (
    <div className="live-decode">
      <div className="ld-input">
        {input === '' ? (
          <span className="ld-placeholder">Tap dot / dash…</span>
        ) : (
          <Pattern pattern={input} size={16} />
        )}
      </div>
      <div className={`ld-preview${preview === '?' || !valid ? ' unknown' : ''}`}>
        {preview || '·'}
      </div>
    </div>
  );
}

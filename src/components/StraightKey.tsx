import { useCallback, useEffect, useRef, useState } from 'react';
import { keyDown, keyUp } from '../lib/morsePlayer';

// A real straight-key feel: hold ONE key. A short press is a dit, a longer hold
// is a dah — the threshold sits between them, scaled to your send speed. A live
// sidetone sounds the whole time the key is down.
export function StraightKey({
  onSymbol,
  onDelete,
  wpm,
}: {
  onSymbol: (sym: 'dot' | 'dash') => void;
  onDelete: () => void;
  wpm: number;
}) {
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  const startRef = useRef(0);
  const wpmRef = useRef(wpm);
  wpmRef.current = wpm;

  const press = useCallback(() => {
    if (heldRef.current) return;
    heldRef.current = true;
    setHeld(true);
    startRef.current = performance.now();
    keyDown();
  }, []);

  const release = useCallback(() => {
    if (!heldRef.current) return;
    heldRef.current = false;
    setHeld(false);
    keyUp();
    const dur = performance.now() - startRef.current;
    const unit = 1200 / (wpmRef.current || 13); // ms per dit
    onSymbol(dur >= 2 * unit ? 'dash' : 'dot'); // dit ~1u, dah ~3u → split at 2u
  }, [onSymbol]);

  // Keyboard: hold Space/Enter as the key.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        press();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        release();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      keyUp();
    };
  }, [press, release]);

  return (
    <div className="straight-key-wrap">
      <button
        type="button"
        className={`straight-key${held ? ' down' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          press();
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        aria-label="Straight key — tap for dit, hold for dah"
      >
        <span className="sk-glyph">⌇</span>
        <span className="sk-hint">tap = dit · hold = dah</span>
      </button>
      <button type="button" className="key" onClick={onDelete} aria-label="Delete">
        <span className="key-text">⌫ Delete</span>
      </button>
    </div>
  );
}

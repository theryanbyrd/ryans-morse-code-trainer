import { useEffect } from 'react';
import { unlockAudio } from '../lib/audio';

// "Press any button" is keyboard language, and the iPhone build has no
// keyboard: the whole screen is the button. Coarse pointer means touch.
function isTouchPrimary(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function StartScreen({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const begin = () => {
      unlockAudio();
      onStart();
    };
    const onKey = () => begin();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <button
      className="start-screen"
      onClick={() => {
        unlockAudio();
        onStart();
      }}
    >
      <div className="start-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h1 className="start-title brand">Ditdah</h1>
      <p className="start-tagline">Morse code, one dit at a time</p>
      <p className="start-prompt">
        {isTouchPrimary() ? 'Tap anywhere to start.' : 'Press any button to Start.'}
      </p>
    </button>
  );
}

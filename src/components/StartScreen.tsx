import { useEffect } from 'react';
import { unlockAudio } from '../lib/audio';

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
      <p className="start-prompt">Press any button to Start.</p>
    </button>
  );
}

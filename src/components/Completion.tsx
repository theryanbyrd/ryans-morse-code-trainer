import { useEffect } from 'react';
import { speak } from '../lib/audio';
import { useApp } from '../state/AppContext';

export function Completion({ onOpenStats }: { onOpenStats: () => void }) {
  const { settings, resetProgress } = useApp();

  useEffect(() => {
    if (settings.speechHints) speak('Congratulations! You learned the whole alphabet.');
  }, [settings.speechHints]);

  return (
    <div className="completion">
      <div className="confetti" aria-hidden="true">🎉</div>
      <h2>You did it!</h2>
      <p>You've learned all 26 letters in Morse code. Tania Finlayson would be proud.</p>
      <div className="completion-actions">
        <button className="btn primary" onClick={onOpenStats}>
          View statistics
        </button>
        <button className="btn" onClick={resetProgress}>
          Practise again
        </button>
      </div>
    </div>
  );
}

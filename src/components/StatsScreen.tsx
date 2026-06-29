import { TEACHING_ORDER, MORSE } from '../data/morse';
import { useApp } from '../state/AppContext';
import { learnedCount } from '../lib/session';
import { Pattern } from './Pattern';
import { CloseIcon } from './Icons';

export function StatsScreen({ onClose }: { onClose: () => void }) {
  const { progress } = useApp();
  const played = progress.totalAnswered > 0;
  const learned = learnedCount(progress);
  const totalCorrect = TEACHING_ORDER.reduce((s, l) => s + progress.letters[l].correct, 0);
  const totalAttempts = TEACHING_ORDER.reduce((s, l) => s + progress.letters[l].attempts, 0);
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const minutes = Math.floor(progress.playMs / 60000);
  const seconds = Math.floor((progress.playMs % 60000) / 1000);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stats" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Statistics">
        <header className="modal-head">
          <h2>Your Learning Statistics</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close statistics">
            <CloseIcon />
          </button>
        </header>

        {!played ? (
          <p className="empty-state">No detailed statistics available yet. Start playing to generate statistics.</p>
        ) : (
          <>
            <div className="stat-cards">
              <div className="stat-card"><span className="big">{learned}/26</span><span>Letters learned</span></div>
              <div className="stat-card"><span className="big">{accuracy}%</span><span>Accuracy</span></div>
              <div className="stat-card"><span className="big">{progress.totalAnswered}</span><span>Answers</span></div>
              <div className="stat-card"><span className="big">{minutes}m {seconds}s</span><span>Time played</span></div>
            </div>

            <div className="per-letter">
              {TEACHING_ORDER.map((l) => {
                const s = progress.letters[l];
                const acc = s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0;
                return (
                  <div key={l} className={`pl-row${s.learned ? ' learned' : ''}`}>
                    <span className="pl-letter">{l.toUpperCase()}</span>
                    <Pattern pattern={MORSE[l]} size={10} className="pl-pattern" />
                    <div className="pl-bar">
                      <div className="pl-fill" style={{ width: `${acc}%` }} />
                    </div>
                    <span className="pl-meta">
                      {s.attempts ? `${s.correct}/${s.attempts}` : '—'}
                    </span>
                    {s.learned && <span className="pl-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useApp } from '../state/AppContext';
import {
  BADGES,
  knownLetters,
  levelFromXp,
  receiveMasteredCount,
  WORDS_TO_UNLOCK_SENTENCES,
} from '../lib/receive';
import { CloseIcon } from './Icons';

export function BadgesModal({ onClose }: { onClose: () => void }) {
  const { progress, receive } = useApp();
  const pool = knownLetters(progress);
  const level = levelFromXp(receive.xp);
  const heard = receiveMasteredCount(receive, pool);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal badges" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Badges & levels">
        <header className="modal-head">
          <h2>Level {level} · Badges</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <div className="badge-summary">
          <div className="bs-item"><span className="big">{receive.xp}</span><span>XP</span></div>
          <div className="bs-item"><span className="big">{receive.bestStreak}</span><span>Best streak</span></div>
          <div className="bs-item"><span className="big">{heard}/{pool.length || 0}</span><span>Letters by ear</span></div>
          <div className="bs-item"><span className="big">{receive.wordsCompleted}</span><span>Words</span></div>
        </div>

        <div className="badge-grid">
          {BADGES.map((b) => {
            const earned = receive.badges.includes(b.id);
            return (
              <div key={b.id} className={`badge${earned ? ' earned' : ''}`}>
                <span className="badge-icon" aria-hidden="true">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.desc}</span>
              </div>
            );
          })}
        </div>

        <p className="badge-foot">
          Master all your letters by ear to unlock words, then {WORDS_TO_UNLOCK_SENTENCES} words to
          unlock sentences. Leveling up nudges the speed a little faster each time.
        </p>
      </div>
    </div>
  );
}

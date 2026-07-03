import { TEACHING_ORDER, MORSE } from '../data/morse';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';
import { learnedCount, LEARNED_THRESHOLD } from '../lib/session';
import { knownLetters, receiveMasteredCount, RECEIVE_MASTERED } from '../lib/receive';
import { Pattern } from './Pattern';
import { CloseIcon } from './Icons';

function acc(correct: number, attempts: number): number {
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

export function StatsScreen({ onClose }: { onClose: () => void }) {
  const { progress, receive } = useApp();
  const { enabled, user } = useAuth();

  const played = progress.totalAnswered > 0 || receive.totalAnswered > 0;

  const sendLearned = learnedCount(progress);
  const pool = knownLetters(progress);
  const heardMastered = receiveMasteredCount(receive, pool);

  const sTot = TEACHING_ORDER.reduce(
    (s, l) => ({ c: s.c + progress.letters[l].correct, a: s.a + progress.letters[l].attempts }),
    { c: 0, a: 0 },
  );
  const rTot = TEACHING_ORDER.reduce(
    (s, l) => ({ c: s.c + receive.letters[l].correct, a: s.a + receive.letters[l].attempts }),
    { c: 0, a: 0 },
  );

  const totalMs = progress.playMs + receive.playMs;
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stats" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Statistics">
        <header className="modal-head">
          <h2>Your Learning Statistics</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close statistics">
            <CloseIcon />
          </button>
        </header>

        {enabled && (
          <p className="sync-line">
            {user ? `☁ Synced as ${user.email}` : '☁ Sign in to sync this history across devices'}
          </p>
        )}

        {!played ? (
          <p className="empty-state">No detailed statistics available yet. Start playing to generate statistics.</p>
        ) : (
          <>
            <div className="stat-cards">
              <div className="stat-card">
                <span className="big">{sendLearned}/26</span>
                <span>Send — learned</span>
              </div>
              <div className="stat-card">
                <span className="big">{heardMastered}/{pool.length || 0}</span>
                <span>Receive — by ear</span>
              </div>
              <div className="stat-card">
                <span className="big">{acc(sTot.c, sTot.a)}%</span>
                <span>Send accuracy</span>
              </div>
              <div className="stat-card">
                <span className="big">{acc(rTot.c, rTot.a)}%</span>
                <span>Receive accuracy</span>
              </div>
              <div className="stat-card">
                <span className="big">{progress.totalAnswered + receive.totalAnswered}</span>
                <span>Total answers</span>
              </div>
              <div className="stat-card">
                <span className="big">{minutes}m {seconds}s</span>
                <span>Time played</span>
              </div>
            </div>

            <div className="per-letter-head">
              <span className="pl-letter" />
              <span className="plh-pattern" />
              <span className="plh-label">Send</span>
              <span className="plh-label">Receive</span>
            </div>
            <div className="per-letter">
              {TEACHING_ORDER.map((l) => {
                const s = progress.letters[l];
                const r = receive.letters[l];
                const sMastered = s.score >= LEARNED_THRESHOLD;
                const rMastered = r.score >= RECEIVE_MASTERED;
                return (
                  <div key={l} className={`pl-row${sMastered ? ' learned' : ''}`}>
                    <span className="pl-letter">{l.toUpperCase()}</span>
                    <Pattern pattern={MORSE[l]} size={9} className="pl-pattern" />
                    <div className="pl-bar send">
                      <div className="pl-fill" style={{ width: `${acc(s.correct, s.attempts)}%` }} />
                    </div>
                    <div className="pl-bar recv">
                      <div className="pl-fill r" style={{ width: `${acc(r.correct, r.attempts)}%` }} />
                    </div>
                    <span className="pl-marks">
                      {sMastered ? '✓' : '·'}
                      {rMastered ? '👂' : ''}
                    </span>
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

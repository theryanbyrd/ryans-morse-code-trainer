import { useApp } from '../state/AppContext';
import { levelFromXp, levelProgress, xpIntoLevel, XP_PER_LEVEL_TOTAL, BADGES } from '../lib/receive';
import type { ReceivePhase } from '../lib/receive';

const PHASE_LABEL: Record<ReceivePhase, string> = {
  letters: 'Letters',
  words: 'Words',
  sentences: 'Sentences',
};

export function ReceiveHud({ phase, onOpenBadges }: { phase: ReceivePhase; onOpenBadges: () => void }) {
  const { receive, settings } = useApp();
  const level = levelFromXp(receive.xp);

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-level">
          <span className="hud-lvl-badge">Lv {level}</span>
          <span className="hud-phase">{PHASE_LABEL[phase]} · {settings.wpm} WPM</span>
        </div>
        <div className="hud-right">
          {receive.streak >= 2 && <span className="hud-streak">🔥 {receive.streak}</span>}
          <button className="hud-trophy" onClick={onOpenBadges} aria-label="Badges">
            🏅 {receive.badges.length}/{BADGES.length}
          </button>
        </div>
      </div>
      <div className="hud-xp" title={`${xpIntoLevel(receive.xp)}/${XP_PER_LEVEL_TOTAL} XP`}>
        <div className="hud-xp-fill" style={{ width: `${Math.round(levelProgress(receive.xp) * 100)}%` }} />
      </div>
    </div>
  );
}

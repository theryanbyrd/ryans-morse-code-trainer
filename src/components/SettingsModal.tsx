import { useApp } from '../state/AppContext';
import type { Settings } from '../lib/storage';
import { CloseIcon } from './Icons';

type ToggleKey =
  | 'sound'
  | 'speechHints'
  | 'visualHints'
  | 'morseBoard'
  | 'oneSwitch'
  | 'farnsworth'
  | 'visual'
  | 'straightKey'
  | 'qsoFreeform'
  | 'trackingConsent';

const TOGGLES: { key: ToggleKey; label: string; help: string }[] = [
  { key: 'sound', label: 'Sound', help: 'Dot/dash tones and correct/wrong cues' },
  { key: 'speechHints', label: 'Speech Hints', help: 'Speak each letter and its picture word' },
  { key: 'visualHints', label: 'Visual Hints', help: 'Show the mnemonic picture for each letter' },
  { key: 'morseBoard', label: 'Morse Board', help: 'Show the A–Z reference board button' },
  { key: 'oneSwitch', label: 'One-Switch Mode', help: 'Operate everything from a single switch' },
  { key: 'farnsworth', label: 'Beginner spacing', help: 'Extra space between letters when receiving' },
  { key: 'visual', label: 'Flash & vibrate', help: 'Blink and buzz in time with the code (Receive)' },
  { key: 'straightKey', label: 'Straight-key mode', help: 'On the air: one key — tap = dit, hold = dah' },
  { key: 'qsoFreeform', label: 'Freeform QSOs', help: 'Add randomly-generated contacts to On the air' },
  { key: 'trackingConsent', label: 'Tracking Consent', help: 'Share anonymous learning analytics' },
];

export function SettingsModal({
  onClose,
  onShowStats,
  onGetCode,
  onLoadCode,
}: {
  onClose: () => void;
  onShowStats: () => void;
  onGetCode: () => void;
  onLoadCode: () => void;
}) {
  const { settings, setSetting, resetProgress } = useApp();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <header className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <CloseIcon />
          </button>
        </header>

        <div className="toggle-list">
          {TOGGLES.map((t) => (
            <label key={t.key} className="toggle-row">
              <span className="toggle-text">
                <span className="toggle-label">{t.label}</span>
                <span className="toggle-help">{t.help}</span>
              </span>
              <input
                type="checkbox"
                className="switch"
                checked={settings[t.key as keyof Settings] as boolean}
                onChange={(e) => setSetting(t.key, e.target.checked)}
              />
            </label>
          ))}

          {settings.oneSwitch && (
            <label className="toggle-row slider-row">
              <span className="toggle-text">
                <span className="toggle-label">Scan speed</span>
                <span className="toggle-help">{(settings.scanIntervalMs / 1000).toFixed(1)}s per option</span>
              </span>
              <input
                type="range"
                min={600}
                max={2500}
                step={100}
                value={settings.scanIntervalMs}
                onChange={(e) => setSetting('scanIntervalMs', Number(e.target.value))}
              />
            </label>
          )}

          <label className="toggle-row slider-row">
            <span className="toggle-text">
              <span className="toggle-label">Receive speed</span>
              <span className="toggle-help">{settings.wpm} WPM (how fast the code plays)</span>
            </span>
            <input
              type="range"
              min={5}
              max={25}
              step={1}
              value={settings.wpm}
              onChange={(e) => setSetting('wpm', Number(e.target.value))}
            />
          </label>

          {settings.straightKey && (
            <label className="toggle-row slider-row">
              <span className="toggle-text">
                <span className="toggle-label">Send speed</span>
                <span className="toggle-help">{settings.sendWpm} WPM (straight-key dit/dah timing)</span>
              </span>
              <input
                type="range"
                min={8}
                max={25}
                step={1}
                value={settings.sendWpm}
                onChange={(e) => setSetting('sendWpm', Number(e.target.value))}
              />
            </label>
          )}
        </div>

        <div className="action-grid">
          <button className="btn" onClick={onShowStats}>View Statistics</button>
          <button className="btn" onClick={onGetCode}>Get Code</button>
          <button className="btn" onClick={onLoadCode}>Load From Code</button>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('Reset all progress and statistics? This cannot be undone.')) {
                resetProgress();
                onClose();
              }
            }}
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}

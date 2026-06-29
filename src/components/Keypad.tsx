import { DotIcon, DashIcon } from './Icons';

export type KeyAction = 'dot' | 'dash' | 'commit' | 'delete';

// Scanning order for one-switch mode.
export const SCAN_ORDER: KeyAction[] = ['dot', 'dash', 'commit', 'delete'];

const LABELS: Record<KeyAction, string> = {
  dot: 'Dot',
  dash: 'Dash',
  commit: 'Enter',
  delete: 'Delete',
};

export function Keypad({
  onAction,
  scanIndex,
  oneSwitch,
}: {
  onAction: (a: KeyAction) => void;
  scanIndex: number | null;
  oneSwitch: boolean;
}) {
  const tile = (a: KeyAction, content: React.ReactNode, extra = '') => {
    const scanning = scanIndex !== null && SCAN_ORDER[scanIndex] === a;
    return (
      <button
        type="button"
        className={`key key-${a} ${extra}${scanning ? ' scanning' : ''}`}
        onClick={() => onAction(a)}
        aria-label={LABELS[a]}
      >
        {content}
      </button>
    );
  };

  return (
    <div className={`keypad${oneSwitch ? ' one-switch' : ''}`}>
      <div className="key-row main">
        {tile('dot', <span className="key-glyph"><DotIcon /></span>, 'big')}
        {tile('dash', <span className="key-glyph"><DashIcon /></span>, 'big')}
      </div>
      <div className="key-row secondary">
        {tile('delete', <span className="key-text">⌫ Delete</span>)}
        {tile('commit', <span className="key-text">↵ Enter</span>)}
      </div>
      {!oneSwitch && (
        <p className="key-hint">
          Keyboard: <b>J</b> or <b>.</b> = dot · <b>K</b> or <b>-</b> = dash · <b>Space</b> = enter ·{' '}
          <b>⌫</b> = delete
        </p>
      )}
    </div>
  );
}

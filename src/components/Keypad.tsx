import { DotIcon, DashIcon } from './Icons';

export type KeyAction = 'dot' | 'dash' | 'delete';

// Scanning order for one-switch mode. There's no "enter" — answers are judged
// automatically once the pattern is the right length.
export const SCAN_ORDER: KeyAction[] = ['dot', 'dash', 'delete'];

const LABELS: Record<KeyAction, string> = {
  dot: 'Dot',
  dash: 'Dash',
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
      </div>
      {!oneSwitch && (
        <p className="key-hint">
          Keyboard: <b>J</b> or <b>.</b> = dot · <b>K</b> or <b>-</b> = dash · <b>⌫</b> = delete.
          Answers check themselves once the code is complete.
        </p>
      )}
    </div>
  );
}

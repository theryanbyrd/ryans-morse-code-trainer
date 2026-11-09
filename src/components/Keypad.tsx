import { DotIcon, DashIcon } from './Icons';

/** Coarse pointer means touch, so keyboard instructions do not apply. */
function isTouchPrimary(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export type KeyAction = 'dot' | 'dash' | 'delete';

// Scanning order for one-switch mode. There's no "enter", answers are judged
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
      {oneSwitch ? (
        <p className="key-hint one-switch-hint">
          <b>One-switch:</b> the highlight moves on its own, press your switch, the{' '}
          <b>SWITCH</b> button below, or <b>Space</b> when it lands on the option you want.
        </p>
      ) : (
        <p className="key-hint">
          {/* The keyboard half is meaningless on a phone, and on the iPhone build
              there is no keyboard at all. Touch users get only the part that is
              true for them. */}
          {!isTouchPrimary() && (
            <>
              Keyboard: <b>J</b> or <b>.</b> = dot, <b>K</b> or <b>-</b> = dash, <b>⌫</b> = delete.{' '}
            </>
          )}
          Answers check themselves once the code is complete.
        </p>
      )}
    </div>
  );
}

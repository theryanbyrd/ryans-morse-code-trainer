import { TEACHING_ORDER } from '../data/morse';
import type { Progress } from '../lib/storage';

// Learned letters sit to the left (cream), upcoming to the right (blue),
// the active letter centred — a conveyor that slides as you progress.
export function Conveyor({ progress, current }: { progress: Progress; current: string | null }) {
  const idx = current ? TEACHING_ORDER.indexOf(current) : 0;
  const CELL = 64; // px per letter, matches CSS
  const offset = -idx * CELL;

  return (
    <div className="conveyor" aria-hidden="true">
      <div className="conveyor-track" style={{ transform: `translateX(${offset}px)` }}>
        {TEACHING_ORDER.map((l) => {
          const learned = progress.letters[l]?.learned;
          const isCurrent = l === current;
          let cls = 'conv-letter';
          if (isCurrent) cls += ' current';
          else if (learned) cls += ' learned';
          else cls += ' upcoming';
          return (
            <span key={l} className={cls}>
              {l.toUpperCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

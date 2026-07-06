import { PATTERN_TO_CHAR_FULL } from '../data/morse';

// The classic Morse binary tree: a dot branches left, a dash branches right.
// Built once at module load; the component just re-highlights the current path.

type TreeNode = { pattern: string; nx: number; depth: number; char: string; lastSym: string };

const MAX_DEPTH = 5;

function xFor(pattern: string): number {
  let x = 0.5;
  let step = 0.25;
  for (const s of pattern) {
    x += s === '-' ? step : -step;
    step /= 2;
  }
  return x;
}

const NODES: TreeNode[] = [];
(function build(pattern: string) {
  NODES.push({
    pattern,
    nx: xFor(pattern),
    depth: pattern.length,
    char: (PATTERN_TO_CHAR_FULL[pattern] ?? '').toUpperCase(),
    lastSym: pattern.slice(-1),
  });
  if (pattern.length >= MAX_DEPTH) return;
  build(pattern + '.');
  build(pattern + '-');
})('');

const VBW = 640;
const rowY = (d: number) => 24 + d * 40;
const R = [13, 12, 11, 10, 9, 8];

export function MorseTree({ input }: { input: string }) {
  const valid = input.length <= MAX_DEPTH;
  const onPath = (p: string) => valid && input !== '' && input.startsWith(p);
  const isCurrent = (p: string) => valid && p !== '' && p === input;

  return (
    <div className="morse-tree" aria-hidden="true">
      <svg viewBox={`0 0 ${VBW} 236`} width="100%" height="100%">
        {/* edges */}
        {NODES.filter((n) => n.depth >= 1).map((n) => {
          const parent = n.pattern.slice(0, -1);
          const px = xFor(parent) * VBW;
          const py = rowY(n.depth - 1);
          const cx = n.nx * VBW;
          const cy = rowY(n.depth);
          const lit = onPath(n.pattern);
          return (
            <line
              key={`e${n.pattern}`}
              x1={px}
              y1={py}
              x2={cx}
              y2={cy}
              stroke={lit ? 'var(--amber)' : 'rgba(255,255,255,0.16)'}
              strokeWidth={lit ? 2.5 : 1}
              strokeDasharray={n.lastSym === '-' ? '5 4' : '1.5 4'}
            />
          );
        })}
        {/* nodes */}
        {NODES.map((n) => {
          const cx = n.nx * VBW;
          const cy = rowY(n.depth);
          const cur = isCurrent(n.pattern);
          const lit = onPath(n.pattern) || n.pattern === '';
          const r = R[n.depth];
          let fill = 'rgba(255,255,255,0.06)';
          let stroke = 'rgba(255,255,255,0.22)';
          if (n.pattern === '') {
            fill = 'var(--amber)';
            stroke = 'var(--amber)';
          } else if (cur) {
            fill = 'var(--red)';
            stroke = 'var(--red)';
          } else if (lit) {
            fill = 'rgba(255,176,32,0.28)';
            stroke = 'var(--amber)';
          }
          return (
            <g key={`n${n.pattern || 'start'}`}>
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={cur || lit ? 2 : 1} />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={n.depth >= 4 ? 10 : 12}
                fontWeight="800"
                fill={
                  n.pattern === ''
                    ? '#2a1c3f'
                    : cur
                      ? '#fff'
                      : lit
                        ? 'var(--amber-soft)'
                        : 'rgba(255,255,255,0.5)'
                }
              >
                {n.pattern === '' ? '•' : n.char}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

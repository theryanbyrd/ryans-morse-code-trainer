// Hand-drawn SVG mnemonics for digits and punctuation — number-shape memory
// aids for the digits (1 = candle, 2 = swan, 8 = snowman…) and bold glyphs for
// the symbols. All draw in currentColor.
import type { ReactElement } from 'react';

const svg = (children: ReactElement) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
    {children}
  </svg>
);

export const NUM_SYM_ART: Record<string, ReactElement> = {
  // 1 — a candle (the flame + tall body echo the "1")
  '1': svg(
    <g fill="currentColor">
      <path d="M60 20 q10 10 0 20 q-10-10 0-20z" />
      <rect x="53" y="42" width="14" height="52" rx="3" />
      <rect x="44" y="94" width="32" height="8" rx="4" />
    </g>,
  ),
  // 2 — a swan
  '2': svg(
    <g fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round">
      <path d="M40 92 q52 6 40-34 q-6-22-24-14 q-14 6-6 20" />
      <path d="M34 92 h56" strokeWidth="7" />
      <circle cx="56" cy="34" r="3" fill="currentColor" />
    </g>,
  ),
  // 3 — a heart
  '3': svg(
    <path fill="currentColor" d="M60 94 C22 68 26 34 48 34 c9 0 12 7 12 7 s3-7 12-7 c22 0 26 34 -12 60z" />,
  ),
  // 4 — a sailboat
  '4': svg(
    <g fill="currentColor">
      <path d="M62 18 L62 70 L30 70z" />
      <path d="M68 30 L68 70 L92 70z" />
      <path d="M20 78 h80 l-14 20 H34z" />
    </g>,
  ),
  // 5 — a hand (five fingers)
  '5': svg(
    <g fill="currentColor">
      <rect x="40" y="52" width="40" height="42" rx="12" />
      <rect x="44" y="24" width="7" height="34" rx="3.5" />
      <rect x="55" y="18" width="7" height="40" rx="3.5" />
      <rect x="66" y="22" width="7" height="36" rx="3.5" />
      <rect x="77" y="30" width="7" height="30" rx="3.5" />
      <rect x="30" y="54" width="16" height="7" rx="3.5" transform="rotate(-40 38 57)" />
    </g>,
  ),
  // 6 — cherries
  '6': svg(
    <g fill="currentColor">
      <circle cx="42" cy="82" r="15" />
      <circle cx="76" cy="86" r="15" />
      <path d="M42 68 q6-34 34-40" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M76 72 q0-24 0-44" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M74 26 q14-6 22 2 q-14 6-22-2z" />
    </g>,
  ),
  // 7 — a flag on a pole
  '7': svg(
    <g fill="currentColor">
      <rect x="36" y="20" width="7" height="78" rx="3" />
      <path d="M43 24 L92 34 L43 52z" />
    </g>,
  ),
  // 8 — a snowman
  '8': svg(
    <g fill="currentColor">
      <circle cx="60" cy="40" r="20" />
      <circle cx="60" cy="82" r="26" />
      <g fill="#fff">
        <circle cx="54" cy="38" r="3" />
        <circle cx="66" cy="38" r="3" />
        <circle cx="60" cy="74" r="3" />
        <circle cx="60" cy="88" r="3" />
      </g>
    </g>,
  ),
  // 9 — a balloon
  '9': svg(
    <g fill="currentColor">
      <ellipse cx="58" cy="46" rx="30" ry="34" />
      <path d="M58 80 l4 8 -8 0z" />
      <path d="M58 88 q10 14 -2 26" fill="none" stroke="currentColor" strokeWidth="4" />
    </g>,
  ),
  // 0 — a donut / ring (an "O" for zero)
  '0': svg(
    <g fill="currentColor">
      <path d="M60 22 a38 38 0 1 0 0.1 0z M60 44 a16 16 0 1 1 -0.1 0z" fillRule="evenodd" />
    </g>,
  ),
  // Symbols — bold glyphs
  '.': svg(<circle cx="60" cy="72" r="16" fill="currentColor" />),
  ',': svg(
    <path fill="currentColor" d="M52 58 a16 16 0 1 1 26 12 q-2 20 -22 30 q10-14 8-24 a16 16 0 0 1 -12-18z" />,
  ),
  '?': svg(
    <g fill="currentColor">
      <path d="M40 44 q0-26 24-26 q22 0 22 22 q0 16-18 22 q-6 2-6 10 v4 h-14 v-6 q0-16 16-22 q8-3 8-10 q0-8-8-8 q-10 0-10 12z" />
      <circle cx="55" cy="98" r="9" />
    </g>,
  ),
  '/': svg(<rect x="52" y="16" width="16" height="88" rx="8" transform="rotate(22 60 60)" fill="currentColor" />),
  '=': svg(
    <g fill="currentColor">
      <rect x="24" y="46" width="72" height="14" rx="7" />
      <rect x="24" y="66" width="72" height="14" rx="7" />
    </g>,
  ),
  '+': svg(
    <g fill="currentColor">
      <rect x="52" y="26" width="16" height="68" rx="6" />
      <rect x="26" y="52" width="68" height="16" rx="6" />
    </g>,
  ),
};

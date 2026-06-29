// Hand-drawn SVG mnemonics for each letter — our own flat-silhouette recreations
// of the original Morse Learn artwork. Each picture's rhythm hints at the code,
// just like the original (E = a single spider for ".", T = a tall tower for "-",
// V = the four notes of Beethoven's 5th for "...-", and so on).
//
// Every icon draws in `currentColor`, so the parent controls the colour.
import type { ReactElement } from 'react';

type Mnemonic = {
  /** Short "sounds-alike" / picture word spoken and shown as the hint. */
  word: string;
  /** The illustration. */
  icon: ReactElement;
};

const svg = (children: ReactElement) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
    {children}
  </svg>
);

export const MNEMONICS: Record<string, Mnemonic> = {
  // A ".-" — an archer: nock (dot) then the long arrow shaft (dash).
  a: {
    word: 'Archer',
    icon: svg(
      <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
        <path d="M40 20 Q72 60 40 100" />
        <line x1="40" y1="20" x2="40" y2="100" strokeWidth="3" />
        <line x1="30" y1="60" x2="100" y2="60" />
        <polyline points="86,50 100,60 86,70" fill="currentColor" />
        <circle cx="30" cy="60" r="5" fill="currentColor" stroke="none" />
      </g>,
    ),
  },
  // B "-..." — a long, low dachshund: the long body (dash) and short legs (dots).
  b: {
    word: 'Dachshund',
    icon: svg(
      <g fill="currentColor">
        <rect x="22" y="50" width="66" height="20" rx="10" />
        <circle cx="92" cy="48" r="13" />
        <rect x="98" y="40" width="8" height="16" rx="4" />
        <rect x="30" y="68" width="6" height="20" rx="3" />
        <rect x="46" y="68" width="6" height="20" rx="3" />
        <rect x="62" y="68" width="6" height="20" rx="3" />
        <rect x="78" y="68" width="6" height="20" rx="3" />
        <rect x="14" y="46" width="14" height="6" rx="3" />
      </g>,
    ),
  },
  // C "-.-." — dancers mid-routine.
  c: {
    word: 'Dancer',
    icon: svg(
      <g fill="currentColor">
        <circle cx="60" cy="26" r="11" />
        <path d="M57 36 h6 l10 26 -6 4 -7-16 v34 h-6 V50 l-7 16 -6-4z" />
        <path d="M48 44 L28 34 l-3 7 23 12z" />
        <path d="M72 44 L92 34 l3 7 -23 12z" />
      </g>,
    ),
  },
  // D "-.." — a sitting puppy.
  d: {
    word: 'Puppy',
    icon: svg(
      <g fill="currentColor">
        <ellipse cx="54" cy="78" rx="30" ry="16" />
        <circle cx="82" cy="58" r="18" />
        <path d="M68 44 q-8 -16 4 -20 q2 14 8 18z" />
        <rect x="90" y="74" width="10" height="16" rx="5" />
        <circle cx="89" cy="56" r="3" fill="#fff" />
        <path d="M24 70 q-12 4 -6 16 q8 -2 10 -10z" />
      </g>,
    ),
  },
  // E "." — one little spider.
  e: {
    word: 'Spider',
    icon: svg(
      <g stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round">
        <line x1="60" y1="40" x2="30" y2="40" />
        <line x1="60" y1="48" x2="26" y2="56" />
        <line x1="60" y1="56" x2="28" y2="74" />
        <line x1="60" y1="64" x2="34" y2="90" />
        <line x1="60" y1="40" x2="90" y2="40" />
        <line x1="60" y1="48" x2="94" y2="56" />
        <line x1="60" y1="56" x2="92" y2="74" />
        <line x1="60" y1="64" x2="86" y2="90" />
        <circle cx="60" cy="56" r="16" fill="currentColor" stroke="none" />
        <circle cx="60" cy="38" r="8" fill="currentColor" stroke="none" />
      </g>,
    ),
  },
  // F "..-." — a fan of flyers / cards.
  f: {
    word: 'Flyers',
    icon: svg(
      <g fill="currentColor">
        <g transform="rotate(-14 60 60)">
          <rect x="26" y="30" width="40" height="58" rx="5" opacity="0.55" />
        </g>
        <g transform="rotate(0 60 60)">
          <rect x="40" y="28" width="40" height="60" rx="5" opacity="0.75" />
        </g>
        <g transform="rotate(14 60 60)">
          <rect x="54" y="30" width="40" height="58" rx="5" />
          <g fill="#fff">
            <rect x="60" y="40" width="28" height="4" rx="2" />
            <rect x="60" y="50" width="28" height="4" rx="2" />
            <rect x="60" y="60" width="20" height="4" rx="2" />
          </g>
        </g>
      </g>,
    ),
  },
  // G "--." — a gala: champagne glass + bow tie.
  g: {
    word: 'Gala',
    icon: svg(
      <g fill="currentColor">
        <path d="M40 30 h32 l-12 26 v24 h10 v6 H42 v-6 h10 V56z" />
        <path d="M42 32 q18 14 36 0" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M78 84 l16-8 v16z M110 84 l-16-8 v16z" />
        <circle cx="94" cy="84" r="6" />
      </g>,
    ),
  },
  // H "...." — a frog mid-hop (four dots = four hops).
  h: {
    word: 'Frog',
    icon: svg(
      <g fill="currentColor">
        <ellipse cx="60" cy="64" rx="30" ry="22" />
        <circle cx="46" cy="44" r="10" />
        <circle cx="74" cy="44" r="10" />
        <circle cx="46" cy="42" r="4" fill="#fff" />
        <circle cx="74" cy="42" r="4" fill="#fff" />
        <path d="M30 78 q-12 2 -16 12 q10 2 18-4z" />
        <path d="M90 78 q12 2 16 12 q-10 2 -18-4z" />
        <path d="M44 84 q16 8 32 0" fill="none" stroke="#fff" strokeWidth="3" />
      </g>,
    ),
  },
  // I ".." — two watchful eyes.
  i: {
    word: 'Eyes',
    icon: svg(
      <g fill="currentColor">
        <ellipse cx="42" cy="60" rx="20" ry="14" fill="none" stroke="currentColor" strokeWidth="5" />
        <ellipse cx="78" cy="60" rx="20" ry="14" fill="none" stroke="currentColor" strokeWidth="5" />
        <circle cx="42" cy="60" r="7" />
        <circle cx="78" cy="60" r="7" />
      </g>,
    ),
  },
  // J ".---" — a jumper for joy (small lift, then a big leap).
  j: {
    word: 'Jump',
    icon: svg(
      <g fill="currentColor">
        <circle cx="60" cy="28" r="12" />
        <path d="M56 40 h8 v22 l14 18 -6 5 -12-15 -12 15 -6-5 14-18z" />
        <path d="M58 46 L34 30 l-4 7 26 17z" />
        <path d="M62 46 L86 30 l4 7 -26 17z" />
      </g>,
    ),
  },
  // K "-.-" — a kangaroo.
  k: {
    word: 'Kangaroo',
    icon: svg(
      <g fill="currentColor">
        <path d="M58 40 q6-16 16-16 q-2 10 2 16 q8 6 8 22 q0 18-14 26 l8 18 h-10 l-8-16 h-12 l-6 14 h-9 l6-20 q-6-8-6-18 q0-14 12-20z" />
        <path d="M70 96 q18 4 30 18 l-6 4 q-14-12-28-14z" />
        <circle cx="64" cy="34" r="3" fill="#fff" />
      </g>,
    ),
  },
  // L ".-.." — a ladybug.
  l: {
    word: 'Ladybug',
    icon: svg(
      <g fill="currentColor">
        <ellipse cx="60" cy="64" rx="32" ry="26" />
        <circle cx="60" cy="40" r="12" />
        <line x1="60" y1="40" x2="60" y2="90" stroke="#fff" strokeWidth="3" />
        <g fill="#fff">
          <circle cx="46" cy="56" r="5" />
          <circle cx="74" cy="56" r="5" />
          <circle cx="44" cy="74" r="5" />
          <circle cx="76" cy="74" r="5" />
        </g>
        <line x1="54" y1="30" x2="48" y2="20" stroke="currentColor" strokeWidth="3" />
        <line x1="66" y1="30" x2="72" y2="20" stroke="currentColor" strokeWidth="3" />
      </g>,
    ),
  },
  // M "--" — a heart (two long beats, like a heartbeat).
  m: {
    word: 'Heart',
    icon: svg(
      <path
        fill="currentColor"
        d="M60 92 C20 64 24 32 46 32 c10 0 14 8 14 8 s4-8 14-8 c22 0 26 32 -14 60z"
      />,
    ),
  },
  // N "-." — a boat / tug.
  n: {
    word: 'Boat',
    icon: svg(
      <g fill="currentColor">
        <path d="M20 64 h80 l-12 22 H32z" />
        <rect x="48" y="40" width="26" height="24" rx="2" />
        <rect x="78" y="34" width="8" height="30" />
        <path d="M14 74 q14 8 28 0 q14-8 28 0 q14 8 28 0 v6 q-14 8-28 0 q-14-8-28 0 q-14 8-28 0z" opacity="0.6" />
      </g>,
    ),
  },
  // O "---" — "OMG!" (three long letters = three dashes).
  o: {
    word: 'OMG!',
    icon: svg(
      <text
        x="60"
        y="74"
        textAnchor="middle"
        fontFamily="Poppins, Arial, sans-serif"
        fontWeight="800"
        fontSize="40"
        fill="currentColor"
      >
        OMG
      </text>,
    ),
  },
  // P ".--." — a steaming pile of poo.
  p: {
    word: 'Poo',
    icon: svg(
      <g fill="currentColor">
        <path d="M30 92 h60 q4-14-10-16 q6-12-8-16 q4-12-12-12 q-16 0-12 12 q-14 4-8 16 q-14 2-10 16z" />
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7">
          <path d="M46 36 q-6-8 0-16" />
          <path d="M74 36 q6-8 0-16" />
        </g>
        <g fill="#fff">
          <circle cx="50" cy="70" r="4" />
          <circle cx="70" cy="70" r="4" />
        </g>
      </g>,
    ),
  },
  // Q "--.-" — a queen's crown.
  q: {
    word: 'Queen',
    icon: svg(
      <g fill="currentColor">
        <path d="M28 80 L24 40 l20 16 16-28 16 28 20-16 -4 40z" />
        <rect x="28" y="80" width="64" height="10" rx="2" />
        <g fill="#fff">
          <circle cx="24" cy="40" r="4" />
          <circle cx="96" cy="40" r="4" />
          <circle cx="60" cy="28" r="4" />
        </g>
      </g>,
    ),
  },
  // R ".-." — a rabbit.
  r: {
    word: 'Rabbit',
    icon: svg(
      <g fill="currentColor">
        <ellipse cx="58" cy="74" rx="26" ry="20" />
        <circle cx="80" cy="58" r="15" />
        <path d="M74 44 q-6-22 2-24 q6 12 6 22z" />
        <path d="M86 44 q6-22 -2-24 q-6 12-6 22z" />
        <ellipse cx="34" cy="80" rx="10" ry="7" />
        <circle cx="86" cy="56" r="3" fill="#fff" />
      </g>,
    ),
  },
  // S "..." — a snake.
  s: {
    word: 'Snake',
    icon: svg(
      <g fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round">
        <path d="M34 92 q40 0 26-26 q-14-26 26-26" />
        <circle cx="86" cy="40" r="4" fill="currentColor" />
        <line x1="92" y1="40" x2="104" y2="40" strokeWidth="3" />
      </g>,
    ),
  },
  // T "-" — a tall tower (one long dash).
  t: {
    word: 'Tower',
    icon: svg(
      <g fill="currentColor">
        <path d="M52 90 L56 44 h8 l4 46z" />
        <path d="M50 44 h20 v6 H50z" />
        <rect x="58" y="22" width="4" height="22" />
        <path d="M46 90 h28 v6 H46z" />
        <path d="M55 32 h10 v4 H55z" />
      </g>,
    ),
  },
  // U "..-" — an umbrella.
  u: {
    word: 'Umbrella',
    icon: svg(
      <g fill="currentColor">
        <path d="M22 64 q38-44 76 0 q-20-12-38-12 q-18 0-38 12z" />
        <rect x="58" y="60" width="4" height="30" />
        <path d="M62 88 q0 10 12 8" fill="none" stroke="currentColor" strokeWidth="4" />
      </g>,
    ),
  },
  // V "...-" — the opening notes of Beethoven's 5th: dot-dot-dot-daaash.
  v: {
    word: 'Beethoven',
    icon: svg(
      <g fill="currentColor">
        <line x1="40" y1="84" x2="40" y2="40" stroke="currentColor" strokeWidth="5" />
        <line x1="62" y1="84" x2="62" y2="40" stroke="currentColor" strokeWidth="5" />
        <line x1="84" y1="78" x2="84" y2="34" stroke="currentColor" strokeWidth="5" />
        <path d="M38 36 L86 30 v10 L38 46z" />
        <ellipse cx="36" cy="84" rx="9" ry="7" />
        <ellipse cx="58" cy="84" rx="9" ry="7" />
        <ellipse cx="80" cy="78" rx="9" ry="7" />
      </g>,
    ),
  },
  // W ".--" — a whale.
  w: {
    word: 'Whale',
    icon: svg(
      <g fill="currentColor">
        <path d="M18 68 q24-26 52-18 q22 6 32-6 q-2 18-18 24 q4 10 16 10 q-16 10-30 2 q-30 12-54-6z" />
        <circle cx="34" cy="60" r="3" fill="#fff" />
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M40 40 q-4-12 0-20" />
          <path d="M48 40 q4-12 0-20" />
        </g>
      </g>,
    ),
  },
  // X "-..-" — a treasure map; X marks the spot.
  x: {
    word: 'Treasure',
    icon: svg(
      <g fill="currentColor">
        <path d="M22 30 l76 6 -4 54 -76-6z" opacity="0.85" />
        <g stroke="#fff" strokeWidth="5" strokeLinecap="round">
          <line x1="66" y1="52" x2="84" y2="74" />
          <line x1="84" y1="52" x2="66" y2="74" />
        </g>
        <g fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round">
          <path d="M34 48 q10 18 34 16" />
        </g>
        <circle cx="34" cy="48" r="4" fill="#fff" />
      </g>,
    ),
  },
  // Y "-.--" — too cool: shades on.
  y: {
    word: 'Cool',
    icon: svg(
      <g fill="currentColor">
        <circle cx="60" cy="60" r="36" />
        <g fill="#fff">
          <rect x="34" y="50" width="22" height="14" rx="4" />
          <rect x="64" y="50" width="22" height="14" rx="4" />
          <rect x="54" y="54" width="12" height="4" />
        </g>
        <path d="M46 76 q14 12 28 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>,
    ),
  },
  // Z "--.." — a zebra.
  z: {
    word: 'Zebra',
    icon: svg(
      <g fill="currentColor">
        <path d="M30 50 q4-18 18-18 q6 0 8 6 l10 2 q22 0 26 22 q2 14-6 22 v18 h-8 v-16 q-8 4-18 4 v12 h-8 v-12 q-10-2-16-10 v22 h-8 V64 q-4-8-2-14z" />
        <g stroke="#fff" strokeWidth="3">
          <line x1="54" y1="44" x2="50" y2="58" />
          <line x1="64" y1="46" x2="60" y2="62" />
          <line x1="74" y1="50" x2="70" y2="66" />
        </g>
        <circle cx="44" cy="44" r="2.5" fill="#fff" />
      </g>,
    ),
  },
};

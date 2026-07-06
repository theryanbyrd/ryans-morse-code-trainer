// Cave of Echoes — a Morse cave-crawl. Move by keying a direction; fight monsters
// by keying their weak rune (send) and copying their attacks by ear (receive).
// Content is a small hand-authored graph of rooms + monsters, easy to extend.

export type Dir = 'N' | 'E' | 'S' | 'W';

export type Exit = {
  dir: Dir;
  to: string;
  /** A sealed exit: key the code word to pass. */
  locked?: { code: string; clue: string };
};

export type Room = {
  id: string;
  title: string;
  art: string; // emoji scene banner
  narration: string;
  exits: Exit[];
  monster?: MonsterId;
  loot?: { name: string; heal?: number };
  boss?: boolean;
};

export type MonsterId = 'sprite' | 'wraith' | 'static';

export type Monster = {
  id: MonsterId;
  name: string;
  art: string;
  hp: number;
  /** Keyed to land a strike (send). */
  weakness: string;
  /** Played by ear; copy one to parry (receive). */
  attacks: string[];
  boss?: boolean;
  /** Boss only: a longer incantation you must copy to banish it. */
  incantation?: string;
};

export const MAX_HP = 5;
export const START_ROOM = 'entrance';

export const DIR_NAME: Record<Dir, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };
export const DIR_ARROW: Record<Dir, string> = { N: '↑', E: '→', S: '↓', W: '←' };

export const MONSTERS: Record<MonsterId, Monster> = {
  sprite: {
    id: 'sprite',
    name: 'Dit Sprite',
    art: '⚡',
    hp: 2,
    weakness: 'SOS',
    attacks: ['E', 'T', 'A'],
  },
  wraith: {
    id: 'wraith',
    name: 'Signal Wraith',
    art: '👻',
    hp: 3,
    weakness: 'CQ',
    attacks: ['DE', 'OM', '73'],
  },
  static: {
    id: 'static',
    name: 'The Static',
    art: '🌀',
    hp: 3,
    weakness: 'QRZ',
    attacks: ['QRM', 'NIL', 'OM'],
    boss: true,
    incantation: 'SILENCE',
  },
};

export const ROOMS: Record<string, Room> = {
  entrance: {
    id: 'entrance',
    title: 'Mouth of the Cave',
    art: '🕳️',
    narration:
      'Cold air breathes up from the dark. Somewhere far below, a signal pulses — dit, dah, dit. You step in.',
    exits: [{ dir: 'N', to: 'hall' }],
  },
  hall: {
    id: 'hall',
    title: 'Whispering Hall',
    art: '🦇',
    narration: 'Shapes flit through the black. A Dit Sprite crackles to life, barring the way.',
    monster: 'sprite',
    exits: [{ dir: 'N', to: 'junction' }],
  },
  junction: {
    id: 'junction',
    title: 'Signal Junction',
    art: '🔀',
    narration: 'The tunnel forks. Faint echoes ring from the east; a cold draft slides down from the north.',
    exits: [
      { dir: 'E', to: 'cache' },
      { dir: 'N', to: 'gorge' },
    ],
  },
  cache: {
    id: 'cache',
    title: 'Echo Cache',
    art: '💎',
    narration: 'A hollow lined with humming crystals. You pocket a Signal Charm — warmth spreads through you.',
    loot: { name: 'Signal Charm', heal: 2 },
    exits: [{ dir: 'W', to: 'junction' }],
  },
  gorge: {
    id: 'gorge',
    title: 'Static Gorge',
    art: '👻',
    narration: 'A Signal Wraith boils up out of the chasm, its voice a smear of noise.',
    monster: 'wraith',
    exits: [{ dir: 'N', to: 'gate' }],
  },
  gate: {
    id: 'gate',
    title: 'The Runed Gate',
    art: '🚪',
    narration: 'An iron gate seals the lair. Glowing runes crawl across it, spelling a single word.',
    exits: [{ dir: 'N', to: 'lair', locked: { code: 'OPEN', clue: 'The runes spell: OPEN' } }],
  },
  lair: {
    id: 'lair',
    title: "The Static's Lair",
    art: '🌀',
    narration:
      'The Static coils in the dark — the beast that swallowed the mountain’s signals. Time to silence it for good.',
    monster: 'static',
    boss: true,
    exits: [],
  },
};

/** How many rooms deep — for a simple progress readout. */
export const ROOM_COUNT = Object.keys(ROOMS).length;

// Morse code data + decoding helpers for Ryan's Morse Code Trainer.
// Dot = "." Dash = "-". We only teach the 26 letters (A–Z).

export const MORSE: Record<string, string> = {
  a: '.-',
  b: '-...',
  c: '-.-.',
  d: '-..',
  e: '.',
  f: '..-.',
  g: '--.',
  h: '....',
  i: '..',
  j: '.---',
  k: '-.-',
  l: '.-..',
  m: '--',
  n: '-.',
  o: '---',
  p: '.--.',
  q: '--.-',
  r: '.-.',
  s: '...',
  t: '-',
  u: '..-',
  v: '...-',
  w: '.--',
  x: '-..-',
  y: '-.--',
  z: '--..',
};

// Reverse lookup: pattern -> letter.
export const PATTERN_TO_LETTER: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([letter, pattern]) => [pattern, letter]),
);

// Digits + the punctuation/prosigns used on the air (for the QSO simulator).
export const MORSE_EXTRA: Record<string, string> = {
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '/': '-..-.', // portable / callsign slash
  '?': '..--..',
  '.': '.-.-.-',
  ',': '--..--',
  '=': '-...-', // BT — the "break" separator ham ops send between thoughts
  '+': '.-.-.', // AR — end of message
};

/** Full character set: letters + digits + punctuation/prosigns. */
export const MORSE_FULL: Record<string, string> = { ...MORSE, ...MORSE_EXTRA };

/** Morse pattern for any supported character ('' if unsupported). */
export function patternForChar(ch: string): string {
  return MORSE_FULL[ch.toLowerCase()] ?? '';
}

// Teaching order taken from the original Morse Learn config: simplest /
// most-frequent signals first, not strict alphabetical order.
export const TEACHING_ORDER = [
  'e', 't', 'a', 'i', 'm', 's', 'o', 'h', 'n', 'c', 'r', 'd', 'u',
  'k', 'l', 'f', 'b', 'p', 'g', 'j', 'v', 'q', 'w', 'x', 'y', 'z',
];

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Decode an in-progress dot/dash string to a letter, or '' if no exact match. */
export function decode(sequence: string): string {
  return PATTERN_TO_LETTER[sequence] ?? '';
}

/** Does this sequence still have a chance of completing into a valid letter? */
export function isPrefixOfAnyLetter(sequence: string): boolean {
  if (sequence === '') return true;
  return Object.values(MORSE).some((p) => p.startsWith(sequence));
}

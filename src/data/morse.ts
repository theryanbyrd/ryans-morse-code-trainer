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

/** Reverse: dot/dash pattern -> character (letters, digits, punctuation). */
export const PATTERN_TO_CHAR_FULL: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_FULL).map(([ch, pattern]) => [pattern, ch]),
);

/** Convert alphanumeric text to Morse (chars space-separated, words " / "). */
export function textToMorse(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split('')
        .map((ch) => MORSE_FULL[ch.toLowerCase()] ?? '')
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
    .join(' / ');
}

/** Convert Morse (dots/dashes, spaces between chars, "/" between words) to text. */
export function morseToText(morse: string): string {
  return morse
    .trim()
    .split(/\s*\/\s*|\s{3,}/) // word boundary: "/" or 3+ spaces
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((tok) => PATTERN_TO_CHAR_FULL[tok] ?? '')
        .join(''),
    )
    .join(' ')
    .toUpperCase();
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

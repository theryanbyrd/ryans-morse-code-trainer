import { describe, it, expect } from 'vitest';
import {
  MORSE,
  MORSE_FULL,
  PATTERN_TO_LETTER,
  PATTERN_TO_CHAR_FULL,
  TEACHING_ORDER,
  ALPHABET,
  patternForChar,
  textToMorse,
  morseToText,
  decode,
  isPrefixOfAnyLetter,
} from './morse';

describe('MORSE table integrity', () => {
  it('covers all 26 letters', () => {
    for (const l of ALPHABET) expect(MORSE[l], `missing ${l}`).toBeTruthy();
  });

  it('matches the ITU standard for every letter', () => {
    // The whole app is wrong if these are wrong, so they are spelled out in full
    // rather than derived from the table under test.
    const ITU: Record<string, string> = {
      a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.',
      h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.',
      o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-',
      v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
    };
    expect(MORSE).toMatchObject(ITU);
  });

  it('uses only dots and dashes', () => {
    for (const [ch, pat] of Object.entries(MORSE_FULL)) {
      expect(pat, `${ch} has a bad symbol`).toMatch(/^[.-]+$/);
    }
  });

  it('assigns every character a unique pattern', () => {
    const patterns = Object.values(MORSE_FULL);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('builds reverse lookups that round-trip', () => {
    for (const [ch, pat] of Object.entries(MORSE)) expect(PATTERN_TO_LETTER[pat]).toBe(ch);
    for (const [ch, pat] of Object.entries(MORSE_FULL)) expect(PATTERN_TO_CHAR_FULL[pat]).toBe(ch);
  });

  it('includes digits 0-9 in the extended table', () => {
    for (const d of '0123456789') expect(MORSE_FULL[d], `missing digit ${d}`).toBeTruthy();
  });
});

describe('TEACHING_ORDER', () => {
  it('is a permutation of the alphabet with no repeats', () => {
    expect(TEACHING_ORDER).toHaveLength(26);
    expect(new Set(TEACHING_ORDER).size).toBe(26);
    expect([...TEACHING_ORDER].sort()).toEqual([...ALPHABET].sort());
  });

  it('starts with the simplest signals (e, t, a)', () => {
    expect(TEACHING_ORDER.slice(0, 3)).toEqual(['e', 't', 'a']);
  });
});

describe('patternForChar', () => {
  it('is case-insensitive', () => {
    expect(patternForChar('A')).toBe('.-');
    expect(patternForChar('a')).toBe('.-');
  });

  it('returns empty string for unsupported characters', () => {
    expect(patternForChar('~')).toBe('');
  });
});

describe('textToMorse / morseToText', () => {
  it('encodes a word', () => {
    expect(textToMorse('SOS')).toBe('... --- ...');
  });

  it('separates words with a slash', () => {
    expect(textToMorse('HI HI')).toBe('.... .. / .... ..');
  });

  it('decodes back to uppercase text', () => {
    expect(morseToText('... --- ...')).toBe('SOS');
    expect(morseToText('.... .. / .... ..')).toBe('HI HI');
  });

  it('round-trips text through Morse and back', () => {
    for (const phrase of ['HELLO WORLD', 'CQ CQ DE K7RB', 'SOS', 'ABC 123']) {
      expect(morseToText(textToMorse(phrase))).toBe(phrase);
    }
  });

  it('ignores unsupported characters when encoding', () => {
    expect(textToMorse('A~B')).toBe('.- -...');
  });
});

describe('decode', () => {
  it('decodes exact letter patterns', () => {
    expect(decode('.-')).toBe('a');
    expect(decode('-')).toBe('t');
  });

  it('returns empty string when the sequence is not a letter', () => {
    expect(decode('.-.-.-.-')).toBe('');
    expect(decode('')).toBe('');
  });
});

describe('isPrefixOfAnyLetter', () => {
  it('accepts a sequence that can still become a letter', () => {
    // '.' -> e, but also the start of a, i, s, ...
    expect(isPrefixOfAnyLetter('.')).toBe(true);
    expect(isPrefixOfAnyLetter('...')).toBe(true);
  });

  it('rejects a sequence no letter can complete', () => {
    expect(isPrefixOfAnyLetter('........')).toBe(false);
  });
});

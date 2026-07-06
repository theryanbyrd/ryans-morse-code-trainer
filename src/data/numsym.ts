// Numbers & symbols drill: the character set, spoken-name audio keys, and the
// order they're taught. Morse patterns come from MORSE_FULL.
import { patternForChar } from './morse';

export type NumSymDef = {
  ch: string; // the character
  name: string; // display / spoken label
  audio: string; // filename under /assets/sounds/numsym/
  hint: string; // one-word memory hook shown under the picture
};

const RAW: Omit<NumSymDef, 'pattern'>[] = [
  { ch: '1', name: '1', audio: '1', hint: 'Candle' },
  { ch: '2', name: '2', audio: '2', hint: 'Swan' },
  { ch: '3', name: '3', audio: '3', hint: 'Heart' },
  { ch: '4', name: '4', audio: '4', hint: 'Sailboat' },
  { ch: '5', name: '5', audio: '5', hint: 'Hand' },
  { ch: '6', name: '6', audio: '6', hint: 'Cherries' },
  { ch: '7', name: '7', audio: '7', hint: 'Flag' },
  { ch: '8', name: '8', audio: '8', hint: 'Snowman' },
  { ch: '9', name: '9', audio: '9', hint: 'Balloon' },
  { ch: '0', name: '0', audio: '0', hint: 'Donut' },
  { ch: '.', name: 'Period', audio: 'period', hint: 'Full stop' },
  { ch: ',', name: 'Comma', audio: 'comma', hint: 'Comma' },
  { ch: '?', name: 'Question', audio: 'question', hint: 'Question mark' },
  { ch: '/', name: 'Slash', audio: 'slash', hint: 'Slash' },
  { ch: '=', name: 'Equals (BT)', audio: 'equals', hint: 'Break / separator' },
  { ch: '+', name: 'Plus (AR)', audio: 'plus', hint: 'End of message' },
];

export const NUM_SYM: NumSymDef[] = RAW;

/** Just the characters, in teaching order. */
export const NUM_SYM_ORDER: string[] = RAW.map((r) => r.ch);

export const NUM_SYM_BY_CH: Record<string, NumSymDef> = Object.fromEntries(RAW.map((r) => [r.ch, r]));

export function numSymPattern(ch: string): string {
  return patternForChar(ch);
}

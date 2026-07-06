// Logic for the Numbers & symbols drill: pick the next character, apply an
// answer, and track mastery. Per-character (no words), with an adaptive hint.
import { NUM_SYM_ORDER } from '../data/numsym';
import type { NumbersProgress } from './storage';

export const NUM_MASTERED = 2; // correct answers to "master" a character

function score(n: NumbersProgress, ch: string): number {
  return n.chars[ch]?.score ?? 0;
}

export function masteredCount(n: NumbersProgress): number {
  return NUM_SYM_ORDER.filter((c) => score(n, c) >= NUM_MASTERED).length;
}

export function isComplete(n: NumbersProgress): boolean {
  return NUM_SYM_ORDER.every((c) => score(n, c) >= NUM_MASTERED);
}

export function hintActive(n: NumbersProgress, ch: string): boolean {
  return !(n.chars[ch]?.hideHint ?? false);
}

/** Pick the next character to drill — least-mastered first, avoiding a repeat. */
export function pickNumber(n: NumbersProgress, avoid: string | null): string {
  const min = Math.min(...NUM_SYM_ORDER.map((c) => score(n, c)));
  let pool = NUM_SYM_ORDER.filter((c) => score(n, c) === min);
  const notAvoid = pool.filter((c) => c !== avoid);
  if (notAvoid.length) pool = notAvoid;
  return pool[Math.floor(Math.random() * pool.length)];
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function applyNumberAnswer(n: NumbersProgress, ch: string, correct: boolean): NumbersProgress {
  const chars = { ...n.chars };
  const prev = chars[ch] ?? { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  chars[ch] = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    score: clamp(prev.score + (correct ? 1 : -1), 0, NUM_MASTERED + 2),
    hideHint: correct,
  };
  return { ...n, chars, totalAnswered: n.totalAnswered + 1 };
}

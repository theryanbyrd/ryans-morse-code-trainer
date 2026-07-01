// Receive-mode logic: which letters can be tested (gated on Send-learned
// letters), which one to play next, and how to build the multiple-choice
// options (favouring confusable letters so the practice is meaningful).

import { MORSE, TEACHING_ORDER } from '../data/morse';
import { LEARNED_THRESHOLD } from './session';
import type { Progress, ReceiveProgress } from './storage';

export const RECEIVE_MASTERED = 3; // receive-score at which a letter is "mastered to hear"
export const RECEIVE_SCORE_MAX = RECEIVE_MASTERED + 2;
export const MIN_LETTERS_TO_RECEIVE = 3;
const MAX_CHOICES = 4;

function rScore(r: ReceiveProgress, l: string): number {
  return r.letters[l]?.score ?? 0;
}

/** Letters the learner has learned to SEND — the pool Receive draws from. */
export function knownLetters(send: Progress): string[] {
  return TEACHING_ORDER.filter((l) => (send.letters[l]?.score ?? 0) >= LEARNED_THRESHOLD);
}

export function receiveUnlocked(send: Progress): boolean {
  return knownLetters(send).length >= MIN_LETTERS_TO_RECEIVE;
}

export function receiveMasteredCount(r: ReceiveProgress, pool: string[]): number {
  return pool.filter((l) => rScore(r, l) >= RECEIVE_MASTERED).length;
}

export function isReceiveComplete(r: ReceiveProgress, pool: string[]): boolean {
  return pool.length > 0 && pool.every((l) => rScore(r, l) >= RECEIVE_MASTERED);
}

/** Pick the next letter to play — least-mastered first, avoiding a repeat. */
export function pickReceiveLetter(r: ReceiveProgress, pool: string[], avoid: string | null): string | null {
  if (pool.length === 0) return null;
  const min = Math.min(...pool.map((l) => rScore(r, l)));
  let candidates = pool.filter((l) => rScore(r, l) === min);
  if (candidates.length > 1 && avoid) candidates = candidates.filter((l) => l !== avoid) || candidates;
  if (candidates.length === 0) candidates = pool.filter((l) => l !== avoid);
  if (candidates.length === 0) candidates = pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Levenshtein distance between two dot/dash patterns (smaller = more alike). */
function patternDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the multiple-choice options: the correct letter plus distractors drawn
 * from the pool, preferring letters whose Morse pattern is easy to confuse with
 * the correct one. Returned in random order.
 */
export function makeChoices(correct: string, pool: string[]): string[] {
  const others = pool.filter((l) => l !== correct);
  const n = Math.min(MAX_CHOICES, others.length + 1);
  if (n <= 1) return [correct];

  // Rank distractors by confusability (nearest pattern first), with a little
  // randomness so it's not identical every time.
  const ranked = shuffle(others).sort(
    (a, b) => patternDistance(MORSE[correct], MORSE[a]) - patternDistance(MORSE[correct], MORSE[b]),
  );
  const distractors = ranked.slice(0, n - 1);
  return shuffle([correct, ...distractors]);
}

/** Number of choice tiles for a given pool size. */
export function choiceCount(pool: string[]): number {
  return Math.min(MAX_CHOICES, Math.max(2, pool.length));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Apply a receive answer, updating the per-letter receive stats + score. */
export function applyReceiveAnswer(r: ReceiveProgress, letter: string, correct: boolean): ReceiveProgress {
  const letters = { ...r.letters };
  const prev = letters[letter] ?? { attempts: 0, correct: 0, wrong: 0, score: 0 };
  letters[letter] = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    score: clamp(prev.score + (correct ? 1 : -1), 0, RECEIVE_SCORE_MAX),
  };
  return { ...r, letters, totalAnswered: r.totalAnswered + 1 };
}

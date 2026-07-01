// Word-based learning loop, mirroring the original Morse Learn pacing.
//
// - Letters are introduced a few at a time (starting with e, t, a). A new letter
//   is added only after a run of clean words (CONSECUTIVE_CORRECT).
// - We show real words spelled only from the letters currently "in play",
//   prioritising the newest letter so it gets drilled.
// - Each letter carries a score (+1 correct, -1 wrong). The mnemonic hint shows
//   only while the score is below HINT_THRESHOLD, so getting a letter right
//   hides its hint next time, and getting it wrong brings the hint back.

import { TEACHING_ORDER, MORSE } from '../data/morse';
import { WORDS } from '../data/words';
import type { Progress } from './storage';

export const LEARNED_THRESHOLD = 2; // score at which a letter counts as "learned"
export const CONSECUTIVE_CORRECT = 3; // clean words needed to introduce a new letter
export const SCORE_MAX = LEARNED_THRESHOLD + 2;

function score(p: Progress, letter: string): number {
  return p.letters[letter]?.score ?? 0;
}

export function lettersInPlayList(p: Progress): string[] {
  return TEACHING_ORDER.slice(0, p.lettersInPlay);
}

export function learnedLetters(p: Progress): string[] {
  return TEACHING_ORDER.filter((l) => score(p, l) >= LEARNED_THRESHOLD);
}

export function learnedCount(p: Progress): number {
  return learnedLetters(p).length;
}

/** The most recently introduced letter — the one we're actively teaching. */
export function newestLetter(p: Progress): string {
  return TEACHING_ORDER[Math.min(p.lettersInPlay, TEACHING_ORDER.length) - 1];
}

export function isCourseComplete(p: Progress): boolean {
  return p.lettersInPlay >= TEACHING_ORDER.length && TEACHING_ORDER.every((l) => score(p, l) >= LEARNED_THRESHOLD);
}

/**
 * Should the mnemonic hint be shown for this letter right now? It follows the
 * last outcome: shown until first correct, hidden after a correct answer, and
 * shown again the moment you get it wrong.
 */
export function hintActive(p: Progress, letter: string): boolean {
  return !(p.letters[letter]?.hideHint ?? false);
}

/** Choose the next practice word: only in-play letters, favouring the newest. */
export function pickWord(p: Progress, avoid: string | null): string {
  const inPlay = new Set(lettersInPlayList(p));
  const newest = newestLetter(p);

  const candidates = WORDS.filter((w) => [...w].every((c) => inPlay.has(c)));
  if (candidates.length === 0) return newest; // extreme fallback

  // Prefer words that drill the newest letter (unless it's already learned).
  const drillNewest = score(p, newest) < LEARNED_THRESHOLD;
  const pools = [
    drillNewest ? candidates.filter((w) => w !== avoid && w.includes(newest)) : [],
    candidates.filter((w) => w !== avoid),
    candidates,
  ];
  const pool = pools.find((arr) => arr.length > 0) as string[];
  return pool[Math.floor(Math.random() * pool.length)];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Apply a single letter answer: update its score and per-letter stats. */
export function applyLetterAnswer(p: Progress, letter: string, correct: boolean): Progress {
  const letters = { ...p.letters };
  const prev = letters[letter] ?? { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  letters[letter] = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    score: clamp(prev.score + (correct ? 1 : -1), 0, SCORE_MAX),
    hideHint: correct, // hide after a correct answer, show again after a wrong one
  };
  return { ...p, letters, totalAnswered: p.totalAnswered + 1 };
}

/**
 * Apply end-of-word bookkeeping: track the streak of clean words and, once it
 * reaches CONSECUTIVE_CORRECT, introduce the next letter.
 */
export function applyWordEnd(p: Progress, clean: boolean): Progress {
  let consecutiveCorrect = clean ? p.consecutiveCorrect + 1 : 0;
  let lettersInPlay = p.lettersInPlay;
  if (consecutiveCorrect >= CONSECUTIVE_CORRECT && lettersInPlay < TEACHING_ORDER.length) {
    lettersInPlay += 1;
    consecutiveCorrect = 0;
  }
  return { ...p, consecutiveCorrect, lettersInPlay };
}

/** Convenience: the target Morse pattern for a letter. */
export function patternFor(letter: string): string {
  return MORSE[letter] ?? '';
}

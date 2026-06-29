// Pure helpers driving the learning loop: which letter to show next, and how an
// answer updates progress. Letters are introduced in TEACHING_ORDER, become
// "learned" after LEARNED_THRESHOLD correct answers, and previously-learned
// letters are mixed back in for spaced review.

import { TEACHING_ORDER } from '../data/morse';
import type { Progress } from './storage';

// A letter is marked learned after one correct answer; previously-learned
// letters are then mixed back in for spaced review (see pickNext).
export const LEARNED_THRESHOLD = 1;
const REVIEW_EVERY = 4; // every 4th question reviews an already-learned letter

export function introducedLetters(p: Progress): string[] {
  return TEACHING_ORDER.slice(0, p.introduced);
}

export function learnedLetters(p: Progress): string[] {
  return TEACHING_ORDER.filter((l) => p.letters[l]?.learned);
}

export function learnedCount(p: Progress): number {
  return learnedLetters(p).length;
}

export function isCourseComplete(p: Progress): boolean {
  return TEACHING_ORDER.every((l) => p.letters[l]?.learned);
}

/** The active letter the learner is currently working to master, or null. */
export function activeLetter(p: Progress): string | null {
  return introducedLetters(p).find((l) => !p.letters[l].learned) ?? null;
}

export type Pick = { letter: string; isReview: boolean };

/**
 * Decide which letter to present next. Returns null only when the whole course
 * is complete. `avoid` is the previously shown letter (we try not to repeat).
 */
export function pickNext(p: Progress, avoid: string | null): Pick | null {
  if (isCourseComplete(p)) return null;

  const active = activeLetter(p);
  const learned = learnedLetters(p);

  const wantReview =
    learned.length > 0 && p.totalAnswered > 0 && p.totalAnswered % REVIEW_EVERY === REVIEW_EVERY - 1;

  if (wantReview) {
    const pool = learned.filter((l) => l !== avoid);
    const choice = (pool.length ? pool : learned)[
      Math.floor(Math.random() * (pool.length ? pool.length : learned.length))
    ];
    return { letter: choice, isReview: true };
  }

  if (active) return { letter: active, isReview: false };

  // Everything introduced so far is learned — the reducer will introduce the
  // next letter; report it here so the UI can show it immediately.
  if (p.introduced < TEACHING_ORDER.length) {
    return { letter: TEACHING_ORDER[p.introduced], isReview: false };
  }
  return null;
}

/** Apply an answer to progress, returning a new Progress object. */
export function applyAnswer(p: Progress, letter: string, correct: boolean): Progress {
  const letters = { ...p.letters };
  const prev = letters[letter] ?? { attempts: 0, correct: 0, wrong: 0, streak: 0, learned: false };
  const justLearned = !prev.learned && correct && prev.correct + 1 >= LEARNED_THRESHOLD;
  letters[letter] = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    streak: correct ? prev.streak + 1 : 0,
    learned: prev.learned || justLearned,
  };

  let introduced = p.introduced;
  // If the active letter was just learned and more remain, introduce the next.
  const nextActive = introducedLetters({ ...p, letters }).find((l) => !letters[l].learned);
  if (!nextActive && introduced < TEACHING_ORDER.length) introduced += 1;

  return {
    letters,
    introduced,
    totalAnswered: p.totalAnswered + 1,
    playMs: p.playMs,
  };
}

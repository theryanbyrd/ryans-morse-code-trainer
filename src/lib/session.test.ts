import { describe, it, expect } from 'vitest';
import {
  LEARNED_THRESHOLD,
  CONSECUTIVE_CORRECT,
  SCORE_MAX,
  learnedCount,
  learnedLetters,
  lettersInPlayList,
  newestLetter,
  isCourseComplete,
  hintActive,
  pickWord,
  applyLetterAnswer,
  applyWordEnd,
  patternFor,
} from './session';
import { freshProgress } from './storage';
import { TEACHING_ORDER } from '../data/morse';
import type { Progress } from './storage';

/** Answer a letter correctly `n` times. */
function correctTimes(p: Progress, letter: string, n: number): Progress {
  let out = p;
  for (let i = 0; i < n; i++) out = applyLetterAnswer(out, letter, true);
  return out;
}

describe('applyLetterAnswer', () => {
  it('increments score and stats on a correct answer', () => {
    const p = applyLetterAnswer(freshProgress(), 'e', true);
    expect(p.letters.e).toMatchObject({ attempts: 1, correct: 1, wrong: 0, score: 1 });
    expect(p.totalAnswered).toBe(1);
  });

  it('decrements score and counts a miss on a wrong answer', () => {
    let p = correctTimes(freshProgress(), 'e', 2);
    p = applyLetterAnswer(p, 'e', false);
    expect(p.letters.e).toMatchObject({ attempts: 3, correct: 2, wrong: 1, score: 1 });
  });

  it('never drives a score below zero', () => {
    let p = freshProgress();
    for (let i = 0; i < 5; i++) p = applyLetterAnswer(p, 'e', false);
    expect(p.letters.e.score).toBe(0);
  });

  it('caps the score at SCORE_MAX', () => {
    const p = correctTimes(freshProgress(), 'e', 20);
    expect(p.letters.e.score).toBe(SCORE_MAX);
  });

  it('hides the hint after a correct answer and shows it again after a wrong one', () => {
    let p = applyLetterAnswer(freshProgress(), 'e', true);
    expect(hintActive(p, 'e')).toBe(false);
    p = applyLetterAnswer(p, 'e', false);
    expect(hintActive(p, 'e')).toBe(true);
  });

  it('shows the hint for a letter never attempted', () => {
    expect(hintActive(freshProgress(), 'q')).toBe(true);
  });

  it('does not mutate the progress it is given', () => {
    const p = freshProgress();
    const before = JSON.stringify(p);
    applyLetterAnswer(p, 'e', true);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe('learned letters', () => {
  it('counts a letter as learned only at LEARNED_THRESHOLD', () => {
    let p = correctTimes(freshProgress(), 'e', LEARNED_THRESHOLD - 1);
    expect(learnedCount(p)).toBe(0);
    p = applyLetterAnswer(p, 'e', true);
    expect(learnedCount(p)).toBe(1);
    expect(learnedLetters(p)).toEqual(['e']);
  });

  it('drops a letter back out of learned when the score falls', () => {
    let p = correctTimes(freshProgress(), 'e', LEARNED_THRESHOLD);
    expect(learnedCount(p)).toBe(1);
    p = applyLetterAnswer(p, 'e', false);
    expect(learnedCount(p)).toBe(0);
  });
});

describe('applyWordEnd', () => {
  it('introduces a new letter after CONSECUTIVE_CORRECT clean words', () => {
    let p = freshProgress();
    const start = p.lettersInPlay;
    for (let i = 0; i < CONSECUTIVE_CORRECT; i++) p = applyWordEnd(p, true);
    expect(p.lettersInPlay).toBe(start + 1);
    expect(p.consecutiveCorrect).toBe(0); // streak resets after promotion
  });

  it('does not introduce a letter early', () => {
    let p = freshProgress();
    const start = p.lettersInPlay;
    for (let i = 0; i < CONSECUTIVE_CORRECT - 1; i++) p = applyWordEnd(p, true);
    expect(p.lettersInPlay).toBe(start);
  });

  it('resets the streak on a word with a mistake', () => {
    let p = applyWordEnd(freshProgress(), true);
    p = applyWordEnd(p, false);
    expect(p.consecutiveCorrect).toBe(0);
  });

  it('stops adding letters once the whole alphabet is in play', () => {
    let p = { ...freshProgress(), lettersInPlay: TEACHING_ORDER.length };
    for (let i = 0; i < CONSECUTIVE_CORRECT * 2; i++) p = applyWordEnd(p, true);
    expect(p.lettersInPlay).toBe(TEACHING_ORDER.length);
  });
});

describe('lettersInPlayList / newestLetter', () => {
  it('follows the teaching order', () => {
    const p = { ...freshProgress(), lettersInPlay: 4 };
    expect(lettersInPlayList(p)).toEqual(TEACHING_ORDER.slice(0, 4));
  });

  it('reports the most recently introduced letter', () => {
    const p = { ...freshProgress(), lettersInPlay: 4 };
    expect(newestLetter(p)).toBe(TEACHING_ORDER[3]);
  });

  it('stays in bounds when every letter is in play', () => {
    const p = { ...freshProgress(), lettersInPlay: TEACHING_ORDER.length };
    expect(newestLetter(p)).toBe(TEACHING_ORDER[TEACHING_ORDER.length - 1]);
  });
});

describe('pickWord', () => {
  it('only uses letters that are currently in play', () => {
    const p = freshProgress();
    const inPlay = new Set(lettersInPlayList(p));
    for (let i = 0; i < 50; i++) {
      for (const c of pickWord(p, null)) {
        expect(inPlay.has(c), `"${c}" is not in play yet`).toBe(true);
      }
    }
  });

  it('avoids repeating the previous word when another is available', () => {
    const p = { ...freshProgress(), lettersInPlay: 8 };
    const first = pickWord(p, null);
    for (let i = 0; i < 30; i++) expect(pickWord(p, first)).not.toBe(first);
  });

  it('drills the newest letter while it is still unlearned', () => {
    const p = { ...freshProgress(), lettersInPlay: 6 };
    const newest = newestLetter(p);
    // Every pick should include the newest letter when words exist for it.
    const picks = Array.from({ length: 20 }, () => pickWord(p, null));
    expect(picks.every((w) => w.includes(newest))).toBe(true);
  });
});

describe('isCourseComplete', () => {
  it('is false for a fresh learner', () => {
    expect(isCourseComplete(freshProgress())).toBe(false);
  });

  it('is false when every letter is in play but not yet learned', () => {
    const p = { ...freshProgress(), lettersInPlay: TEACHING_ORDER.length };
    expect(isCourseComplete(p)).toBe(false);
  });

  it('is true once every letter is in play and learned', () => {
    let p: Progress = { ...freshProgress(), lettersInPlay: TEACHING_ORDER.length };
    for (const l of TEACHING_ORDER) p = correctTimes(p, l, LEARNED_THRESHOLD);
    expect(isCourseComplete(p)).toBe(true);
  });
});

describe('patternFor', () => {
  it('returns the Morse pattern for a letter', () => {
    expect(patternFor('e')).toBe('.');
    expect(patternFor('t')).toBe('-');
  });

  it('returns empty string for an unknown character', () => {
    expect(patternFor('!')).toBe('');
  });
});

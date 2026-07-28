import { describe, it, expect } from 'vitest';
import {
  NUM_MASTERED,
  masteredCount,
  isComplete,
  hintActive,
  pickNumber,
  applyNumberAnswer,
} from './numbers';
import { freshNumbersProgress } from './storage';
import { NUM_SYM_ORDER, NUM_SYM_BY_CH, numSymPattern } from '../data/numsym';
import { MORSE_FULL } from '../data/morse';
import type { NumbersProgress } from './storage';

function masterAll(): NumbersProgress {
  let n = freshNumbersProgress();
  for (const c of NUM_SYM_ORDER) for (let i = 0; i < NUM_MASTERED; i++) n = applyNumberAnswer(n, c, true);
  return n;
}

describe('numsym data', () => {
  it('has no duplicate characters', () => {
    expect(new Set(NUM_SYM_ORDER).size).toBe(NUM_SYM_ORDER.length);
  });

  it('covers all ten digits', () => {
    for (const d of '0123456789') expect(NUM_SYM_ORDER).toContain(d);
  });

  it('gives every character a definition and a real Morse pattern', () => {
    for (const c of NUM_SYM_ORDER) {
      expect(NUM_SYM_BY_CH[c], `no definition for ${c}`).toBeTruthy();
      expect(numSymPattern(c)).toBe(MORSE_FULL[c]);
      expect(numSymPattern(c)).toMatch(/^[.-]+$/);
    }
  });
});

describe('applyNumberAnswer', () => {
  it('records a correct answer', () => {
    const n = applyNumberAnswer(freshNumbersProgress(), '5', true);
    expect(n.chars['5']).toMatchObject({ attempts: 1, correct: 1, wrong: 0, score: 1 });
    expect(n.totalAnswered).toBe(1);
  });

  it('records a wrong answer and never goes below zero', () => {
    let n = freshNumbersProgress();
    for (let i = 0; i < 4; i++) n = applyNumberAnswer(n, '5', false);
    expect(n.chars['5'].score).toBe(0);
    expect(n.chars['5'].wrong).toBe(4);
  });

  it('caps the score', () => {
    let n = freshNumbersProgress();
    for (let i = 0; i < 20; i++) n = applyNumberAnswer(n, '5', true);
    expect(n.chars['5'].score).toBe(NUM_MASTERED + 2);
  });

  it('toggles the hint with the last outcome', () => {
    let n = applyNumberAnswer(freshNumbersProgress(), '5', true);
    expect(hintActive(n, '5')).toBe(false);
    n = applyNumberAnswer(n, '5', false);
    expect(hintActive(n, '5')).toBe(true);
  });

  it('shows the hint for an untouched character', () => {
    expect(hintActive(freshNumbersProgress(), '9')).toBe(true);
  });

  it('does not mutate its input', () => {
    const n = freshNumbersProgress();
    const before = JSON.stringify(n);
    applyNumberAnswer(n, '5', true);
    expect(JSON.stringify(n)).toBe(before);
  });
});

describe('mastery', () => {
  it('counts nothing as mastered at the start', () => {
    expect(masteredCount(freshNumbersProgress())).toBe(0);
    expect(isComplete(freshNumbersProgress())).toBe(false);
  });

  it('counts a character mastered only at NUM_MASTERED', () => {
    let n = freshNumbersProgress();
    for (let i = 0; i < NUM_MASTERED - 1; i++) n = applyNumberAnswer(n, '5', true);
    expect(masteredCount(n)).toBe(0);
    n = applyNumberAnswer(n, '5', true);
    expect(masteredCount(n)).toBe(1);
  });

  it('is complete only once every character is mastered', () => {
    const n = masterAll();
    expect(masteredCount(n)).toBe(NUM_SYM_ORDER.length);
    expect(isComplete(n)).toBe(true);
  });

  it('is not complete when one character is missed', () => {
    let n = masterAll();
    n = applyNumberAnswer(n, NUM_SYM_ORDER[0], false);
    n = applyNumberAnswer(n, NUM_SYM_ORDER[0], false);
    n = applyNumberAnswer(n, NUM_SYM_ORDER[0], false);
    expect(isComplete(n)).toBe(false);
  });
});

describe('pickNumber', () => {
  it('always returns a character from the drill set', () => {
    const n = freshNumbersProgress();
    for (let i = 0; i < 50; i++) expect(NUM_SYM_ORDER).toContain(pickNumber(n, null));
  });

  it('avoids repeating the previous character', () => {
    const n = freshNumbersProgress();
    for (let i = 0; i < 30; i++) expect(pickNumber(n, '5')).not.toBe('5');
  });

  it('drills the least-practised characters first', () => {
    // Master everything except one; that one should always come up next.
    let n = freshNumbersProgress();
    const laggard = NUM_SYM_ORDER[3];
    for (const c of NUM_SYM_ORDER) {
      if (c === laggard) continue;
      n = applyNumberAnswer(n, c, true);
    }
    for (let i = 0; i < 20; i++) expect(pickNumber(n, null)).toBe(laggard);
  });

  it('still returns a character when the avoided one is the only laggard', () => {
    let n = freshNumbersProgress();
    const laggard = NUM_SYM_ORDER[0];
    for (const c of NUM_SYM_ORDER) {
      if (c === laggard) continue;
      n = applyNumberAnswer(n, c, true);
    }
    expect(NUM_SYM_ORDER).toContain(pickNumber(n, laggard));
  });
});

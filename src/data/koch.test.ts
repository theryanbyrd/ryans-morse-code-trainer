import { describe, it, expect } from 'vitest';
import {
  KOCH_ORDER,
  KOCH_LESSONS,
  KOCH_PASS,
  lessonChars,
  newChar,
  makeGroups,
  scoreCopy,
} from './koch';
import { MORSE_FULL } from './morse';

describe('KOCH_ORDER', () => {
  it('starts with the classic K and M', () => {
    expect(KOCH_ORDER.slice(0, 2)).toEqual(['k', 'm']);
  });

  it('has no duplicates', () => {
    expect(new Set(KOCH_ORDER).size).toBe(KOCH_ORDER.length);
  });

  it('only contains characters the player can actually be sent', () => {
    for (const c of KOCH_ORDER) expect(MORSE_FULL[c], `${c} has no Morse pattern`).toBeTruthy();
  });

  it('defines one lesson per newly introduced character', () => {
    expect(KOCH_LESSONS).toBe(KOCH_ORDER.length - 1);
  });
});

describe('lessonChars / newChar', () => {
  it('gives two characters at lesson 1', () => {
    expect(lessonChars(1)).toEqual(['k', 'm']);
  });

  it('adds exactly one character per lesson', () => {
    for (let l = 1; l < KOCH_LESSONS; l++) {
      expect(lessonChars(l + 1).length).toBe(lessonChars(l).length + 1);
    }
  });

  it('reports the character introduced by the lesson', () => {
    expect(newChar(1)).toBe('m');
    expect(lessonChars(2)).toContain(newChar(2));
    expect(lessonChars(1)).not.toContain(newChar(2));
  });

  it('covers the whole order by the final lesson', () => {
    expect(lessonChars(KOCH_LESSONS)).toEqual(KOCH_ORDER);
  });
});

describe('makeGroups', () => {
  it('produces the requested shape', () => {
    const groups = makeGroups(3, 20, 5).split(' ');
    expect(groups).toHaveLength(20);
    for (const g of groups) expect(g).toHaveLength(5);
  });

  it('only draws from characters unlocked at that lesson', () => {
    const allowed = new Set(lessonChars(4));
    const text = makeGroups(4, 40, 5).replace(/\s/g, '');
    for (const c of text) expect(allowed.has(c), `"${c}" is not unlocked at lesson 4`).toBe(true);
  });

  it('honours custom group and size counts', () => {
    const groups = makeGroups(2, 3, 4).split(' ');
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(4);
  });
});

describe('scoreCopy', () => {
  it('scores a perfect copy as 100%', () => {
    const r = scoreCopy('km km', 'km km');
    expect(r.pct).toBe(100);
    expect(r.correct).toBe(4);
    expect(r.total).toBe(4);
  });

  it('scores an empty copy as 0%', () => {
    expect(scoreCopy('kmkm', '').pct).toBe(0);
  });

  it('ignores spacing differences on both sides', () => {
    expect(scoreCopy('km km', 'kmkm').pct).toBe(100);
    expect(scoreCopy('kmkm', 'km  km').pct).toBe(100);
  });

  it('is case-insensitive', () => {
    expect(scoreCopy('km', 'KM').pct).toBe(100);
  });

  it('compares by position, so a dropped character misaligns the rest', () => {
    // Real behaviour worth pinning: copy is positional, not fuzzy-matched.
    const r = scoreCopy('kmr', 'mr');
    expect(r.correct).toBe(0);
    expect(r.pct).toBe(0);
  });

  it('reports per-character sent and correct counts', () => {
    const r = scoreCopy('kkm', 'kxm');
    expect(r.per.k).toEqual({ sent: 2, ok: 1 });
    expect(r.per.m).toEqual({ sent: 1, ok: 1 });
  });

  it('ignores extra characters typed past the end', () => {
    const r = scoreCopy('km', 'kmxxxx');
    expect(r.correct).toBe(2);
    expect(r.total).toBe(2);
    expect(r.pct).toBe(100);
  });

  it('rounds the percentage', () => {
    expect(scoreCopy('kmr', 'kmx').pct).toBe(67);
  });

  it('handles an empty target without dividing by zero', () => {
    expect(scoreCopy('', 'abc').pct).toBe(0);
  });

  it('sets the pass mark within a sane range', () => {
    expect(KOCH_PASS).toBeGreaterThan(50);
    expect(KOCH_PASS).toBeLessThanOrEqual(100);
  });
});

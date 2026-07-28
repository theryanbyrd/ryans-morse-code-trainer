import { describe, it, expect } from 'vitest';
import {
  RECEIVE_MASTERED,
  RECEIVE_SCORE_MAX,
  PROMOTE_TO_RECALL,
  MIN_LETTERS_TO_RECEIVE,
  LETTER_XP,
  WORD_XP,
  SENTENCE_XP,
  WORDS_TO_UNLOCK_SENTENCES,
  BADGES,
  knownLetters,
  receiveUnlocked,
  receiveMasteredCount,
  makeChoices,
  choiceCount,
  isRecall,
  levelFromXp,
  levelProgress,
  applyReceiveAnswer,
  applyWordComplete,
  applySentenceComplete,
  allLettersMastered,
  receivePhase,
  earnedBadges,
} from './receive';
import { freshProgress, freshReceiveProgress } from './storage';
import { applyLetterAnswer } from './session';
import type { ReceiveProgress } from './storage';

const POOL = ['e', 't', 'a'];

function masterPool(pool: string[], score = RECEIVE_MASTERED): ReceiveProgress {
  let r = freshReceiveProgress();
  for (const l of pool) for (let i = 0; i < score; i++) r = applyReceiveAnswer(r, l, true);
  return r;
}

describe('unlock gating', () => {
  it('stays locked until enough letters are learned in Send', () => {
    let send = freshProgress();
    expect(receiveUnlocked(send)).toBe(false);

    for (const l of ['e', 't', 'a']) {
      send = applyLetterAnswer(send, l, true);
      send = applyLetterAnswer(send, l, true);
    }
    expect(knownLetters(send).length).toBeGreaterThanOrEqual(MIN_LETTERS_TO_RECEIVE);
    expect(receiveUnlocked(send)).toBe(true);
  });

  it('only counts letters at or above the learned threshold', () => {
    const send = applyLetterAnswer(freshProgress(), 'e', true); // score 1, not learned
    expect(knownLetters(send)).toEqual([]);
  });
});

describe('applyReceiveAnswer', () => {
  it('awards XP and extends the streak on a correct answer', () => {
    const r = applyReceiveAnswer(freshReceiveProgress(), 'e', true);
    expect(r.xp).toBe(LETTER_XP);
    expect(r.streak).toBe(1);
    expect(r.bestStreak).toBe(1);
    expect(r.totalAnswered).toBe(1);
  });

  it('awards no XP and resets the streak on a wrong answer', () => {
    let r = applyReceiveAnswer(freshReceiveProgress(), 'e', true);
    r = applyReceiveAnswer(r, 'e', false);
    expect(r.xp).toBe(LETTER_XP);
    expect(r.streak).toBe(0);
  });

  it('remembers the best streak after it breaks', () => {
    let r = freshReceiveProgress();
    for (let i = 0; i < 4; i++) r = applyReceiveAnswer(r, 'e', true);
    r = applyReceiveAnswer(r, 'e', false);
    expect(r.bestStreak).toBe(4);
    expect(r.streak).toBe(0);
  });

  it('clamps the per-letter score between 0 and the max', () => {
    let r = freshReceiveProgress();
    for (let i = 0; i < 20; i++) r = applyReceiveAnswer(r, 'e', true);
    expect(r.letters.e.score).toBe(RECEIVE_SCORE_MAX);
    for (let i = 0; i < 20; i++) r = applyReceiveAnswer(r, 'e', false);
    expect(r.letters.e.score).toBe(0);
  });

  it('does not mutate its input', () => {
    const r = freshReceiveProgress();
    const before = JSON.stringify(r);
    applyReceiveAnswer(r, 'e', true);
    expect(JSON.stringify(r)).toBe(before);
  });
});

describe('word and sentence completion', () => {
  it('awards word XP', () => {
    expect(applyWordComplete(freshReceiveProgress()).xp).toBe(WORD_XP);
    expect(applyWordComplete(freshReceiveProgress()).wordsCompleted).toBe(1);
  });

  it('awards sentence XP', () => {
    expect(applySentenceComplete(freshReceiveProgress()).xp).toBe(SENTENCE_XP);
    expect(applySentenceComplete(freshReceiveProgress()).sentencesCompleted).toBe(1);
  });

  it('values a sentence above a word above a letter', () => {
    expect(SENTENCE_XP).toBeGreaterThan(WORD_XP);
    expect(WORD_XP).toBeGreaterThan(LETTER_XP);
  });
});

describe('levels', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('never goes backwards as XP grows', () => {
    let last = 0;
    for (let xp = 0; xp <= 1000; xp += 17) {
      const lvl = levelFromXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(last);
      last = lvl;
    }
  });

  it('reports progress through the current level as a 0..1 fraction', () => {
    for (const xp of [0, 45, 99, 100, 250]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('resets the progress bar when a level is reached', () => {
    expect(levelProgress(0)).toBe(0);
    const atLevelUp = levelProgress(100);
    expect(atLevelUp).toBeLessThan(levelProgress(99));
    expect(levelFromXp(100)).toBeGreaterThan(levelFromXp(99));
  });
});

describe('choices', () => {
  it('always includes the correct answer', () => {
    for (let i = 0; i < 30; i++) expect(makeChoices('e', POOL)).toContain('e');
  });

  it('never repeats an option', () => {
    for (let i = 0; i < 30; i++) {
      const c = makeChoices('e', POOL);
      expect(new Set(c).size).toBe(c.length);
    }
  });

  it('only offers letters from the pool', () => {
    const pool = ['e', 't', 'a', 'i', 'm'];
    for (let i = 0; i < 30; i++) {
      for (const c of makeChoices('e', pool)) expect(pool).toContain(c);
    }
  });

  it('copes with a single-letter pool', () => {
    expect(makeChoices('e', ['e'])).toEqual(['e']);
  });

  it('keeps the option count within bounds', () => {
    expect(choiceCount(['e'])).toBeGreaterThanOrEqual(2);
    expect(choiceCount(Array.from({ length: 26 }, (_, i) => String(i)))).toBeLessThanOrEqual(6);
  });
});

describe('recall promotion', () => {
  it('starts as multiple choice', () => {
    expect(isRecall(freshReceiveProgress(), 'e')).toBe(false);
  });

  it('promotes to recall at the threshold', () => {
    let r = freshReceiveProgress();
    for (let i = 0; i < PROMOTE_TO_RECALL; i++) r = applyReceiveAnswer(r, 'e', true);
    expect(isRecall(r, 'e')).toBe(true);
  });
});

describe('mastery and phases', () => {
  it('counts a letter as mastered only at RECEIVE_MASTERED', () => {
    const almost = masterPool(POOL, RECEIVE_MASTERED - 1);
    expect(receiveMasteredCount(almost, POOL)).toBe(0);
    expect(allLettersMastered(almost, POOL)).toBe(false);

    const done = masterPool(POOL);
    expect(receiveMasteredCount(done, POOL)).toBe(POOL.length);
    expect(allLettersMastered(done, POOL)).toBe(true);
  });

  it('walks letters to words to sentences', () => {
    expect(receivePhase(freshReceiveProgress(), POOL)).toBe('letters');

    let r = masterPool(POOL);
    expect(receivePhase(r, POOL)).toBe('words');

    for (let i = 0; i < WORDS_TO_UNLOCK_SENTENCES; i++) r = applyWordComplete(r);
    expect(receivePhase(r, POOL)).toBe('sentences');
  });

  it('does not unlock sentences one word early', () => {
    let r = masterPool(POOL);
    for (let i = 0; i < WORDS_TO_UNLOCK_SENTENCES - 1; i++) r = applyWordComplete(r);
    expect(receivePhase(r, POOL)).toBe('words');
  });
});

describe('badges', () => {
  it('defines a unique id and label for each badge', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BADGES) expect(b.name ?? b.id).toBeTruthy();
  });

  it('only ever awards ids that exist in BADGES', () => {
    const known = new Set(BADGES.map((b) => b.id));
    let r = masterPool(POOL);
    for (let i = 0; i < 12; i++) r = applyWordComplete(r);
    r = applySentenceComplete(r);
    for (const id of earnedBadges(r, POOL, 25)) expect(known.has(id), `unknown badge ${id}`).toBe(true);
  });

  it('awards nothing before the first answer', () => {
    expect(earnedBadges(freshReceiveProgress(), POOL, 12)).toEqual([]);
  });

  it('awards the first-signal badge on the first answer', () => {
    const r = applyReceiveAnswer(freshReceiveProgress(), 'e', true);
    expect(earnedBadges(r, POOL, 12)).toContain('first_signal');
  });

  it('awards sharp ears once the pool is mastered', () => {
    expect(earnedBadges(masterPool(POOL), POOL, 12)).toContain('sharp_ears');
  });

  it('awards the speed badge on the faster of current and best WPM', () => {
    const r = applyReceiveAnswer(freshReceiveProgress(), 'e', true);
    expect(earnedBadges(r, POOL, 20)).toContain('speed_demon');
    expect(earnedBadges({ ...r, topWpm: 20 }, POOL, 8)).toContain('speed_demon');
    expect(earnedBadges(r, POOL, 8)).not.toContain('speed_demon');
  });

  it('grows monotonically as the learner progresses', () => {
    const early = applyReceiveAnswer(freshReceiveProgress(), 'e', true);
    let later = masterPool(POOL);
    for (let i = 0; i < 12; i++) later = applyWordComplete(later);
    const earlySet = earnedBadges(early, POOL, 12);
    const laterSet = earnedBadges(later, POOL, 12);
    for (const id of earlySet) expect(laterSet).toContain(id);
  });
});

import { describe, it, expect } from 'vitest';
import { mergeSaveState } from './cloud';
import {
  DEFAULT_SETTINGS,
  freshProgress,
  freshReceiveProgress,
  freshNumbersProgress,
  freshKochProgress,
} from './storage';
import type { SaveState } from './storage';

function fresh(): SaveState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    progress: freshProgress(),
    receive: freshReceiveProgress(),
    numbers: freshNumbersProgress(),
    koch: freshKochProgress(),
  };
}

describe('mergeSaveState', () => {
  // The bug this guards against: adding a new progress slice to SaveState but
  // forgetting to merge it here silently wipes that slice the moment a guest
  // signs in. Mechanical, so a future slice can't be forgotten.
  it('merges every slice of SaveState', () => {
    const local = fresh();
    const remote = fresh();
    const merged = mergeSaveState(local, remote);
    for (const key of Object.keys(local) as (keyof SaveState)[]) {
      expect(merged[key], `slice "${key}" missing from merge result`).toBeDefined();
    }
    expect(Object.keys(merged).sort()).toEqual(Object.keys(local).sort());
  });

  it('keeps the higher score per letter, from either side', () => {
    const local = fresh();
    const remote = fresh();
    local.progress.letters.e = { attempts: 5, correct: 4, wrong: 1, score: 3, hideHint: true };
    remote.progress.letters.e = { attempts: 2, correct: 1, wrong: 1, score: 1, hideHint: false };
    remote.progress.letters.t = { attempts: 9, correct: 9, wrong: 0, score: 4, hideHint: true };

    const merged = mergeSaveState(local, remote);
    expect(merged.progress.letters.e.score).toBe(3); // local wins
    expect(merged.progress.letters.t.score).toBe(4); // remote-only survives
  });

  it('never loses progress made on only one side', () => {
    const local = fresh();
    const remote = fresh();
    local.progress.letters.a = { attempts: 1, correct: 1, wrong: 0, score: 1, hideHint: true };
    remote.progress.letters.z = { attempts: 4, correct: 4, wrong: 0, score: 3, hideHint: true };

    const merged = mergeSaveState(local, remote);
    expect(merged.progress.letters.a.score).toBe(1);
    expect(merged.progress.letters.z.score).toBe(3);
  });

  it('keeps a letter present in only one side of the map', () => {
    const local = fresh();
    const remote = fresh();
    // A character outside the standard alphabet map, e.g. from a newer build.
    local.progress.letters['1'] = { attempts: 2, correct: 2, wrong: 0, score: 2, hideHint: true };

    const merged = mergeSaveState(local, remote);
    expect(merged.progress.letters['1']?.score).toBe(2);
  });

  it('takes the max of cumulative counters (never regresses progress)', () => {
    const local = fresh();
    const remote = fresh();
    local.progress.lettersInPlay = 7;
    local.progress.totalAnswered = 200;
    remote.progress.lettersInPlay = 3;
    remote.progress.totalAnswered = 500;

    const merged = mergeSaveState(local, remote);
    expect(merged.progress.lettersInPlay).toBe(7);
    expect(merged.progress.totalAnswered).toBe(500);
  });

  it('unions receive badges instead of replacing them', () => {
    const local = fresh();
    const remote = fresh();
    local.receive.badges = ['first_signal', 'word_caught'];
    remote.receive.badges = ['first_signal', 'hot_streak'];

    const merged = mergeSaveState(local, remote);
    expect(merged.receive.badges.sort()).toEqual(['first_signal', 'hot_streak', 'word_caught']);
  });

  it('keeps the highest XP and best streak', () => {
    const local = fresh();
    const remote = fresh();
    local.receive.xp = 450;
    local.receive.bestStreak = 12;
    remote.receive.xp = 120;
    remote.receive.bestStreak = 30;

    const merged = mergeSaveState(local, remote);
    expect(merged.receive.xp).toBe(450);
    expect(merged.receive.bestStreak).toBe(30);
  });

  it('keeps the furthest Koch lesson and the best score per lesson', () => {
    const local = fresh();
    const remote = fresh();
    local.koch = { lesson: 5, best: { 1: 100, 2: 92 } };
    remote.koch = { lesson: 3, best: { 2: 96, 3: 90 } };

    const merged = mergeSaveState(local, remote);
    expect(merged.koch.lesson).toBe(5);
    expect(merged.koch.best).toEqual({ 1: 100, 2: 96, 3: 90 });
  });

  it('merges the numbers drill', () => {
    const local = fresh();
    const remote = fresh();
    local.numbers.chars['5'] = { attempts: 3, correct: 3, wrong: 0, score: 2, hideHint: true };
    remote.numbers.chars['7'] = { attempts: 1, correct: 0, wrong: 1, score: 0, hideHint: false };

    const merged = mergeSaveState(local, remote);
    expect(merged.numbers.chars['5'].score).toBe(2);
    expect(merged.numbers.chars['7']).toBeDefined();
  });

  it('prefers cloud settings but falls back to local for missing keys', () => {
    const local = fresh();
    const remote = fresh();
    local.settings.wpm = 25;
    local.settings.tone = 700;
    remote.settings = { ...remote.settings, wpm: 15 };

    const merged = mergeSaveState(local, remote);
    expect(merged.settings.wpm).toBe(15); // cloud is canonical
    expect(merged.settings.tone).toBe(remote.settings.tone);
  });

  it('is commutative for score-based fields', () => {
    const a = fresh();
    const b = fresh();
    a.progress.letters.e = { attempts: 5, correct: 4, wrong: 1, score: 3, hideHint: true };
    b.progress.letters.e = { attempts: 2, correct: 2, wrong: 0, score: 1, hideHint: false };

    expect(mergeSaveState(a, b).progress.letters.e.score)
      .toBe(mergeSaveState(b, a).progress.letters.e.score);
  });

  it('does not mutate its inputs', () => {
    const local = fresh();
    const remote = fresh();
    local.progress.letters.e = { attempts: 1, correct: 1, wrong: 0, score: 1, hideHint: true };
    const localBefore = JSON.stringify(local);
    const remoteBefore = JSON.stringify(remote);

    mergeSaveState(local, remote);
    expect(JSON.stringify(local)).toBe(localBefore);
    expect(JSON.stringify(remote)).toBe(remoteBefore);
  });

  it('survives a cloud row saved before newer slices existed', () => {
    // Real scenario: an account last synced before numbers/koch shipped.
    const local = fresh();
    local.koch = { lesson: 4, best: { 1: 95 } };
    local.numbers.chars['3'] = { attempts: 2, correct: 2, wrong: 0, score: 2, hideHint: true };

    const legacyRemote = {
      settings: { ...DEFAULT_SETTINGS },
      progress: freshProgress(),
      receive: freshReceiveProgress(),
    } as unknown as SaveState;

    const merged = mergeSaveState(local, legacyRemote);
    expect(merged.koch.lesson).toBe(4);
    expect(merged.numbers.chars['3'].score).toBe(2);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  START_LETTERS,
  freshProgress,
  load,
  save,
  encodeProgress,
  decodeProgress,
} from './storage';
import { TEACHING_ORDER } from '../data/morse';

// Tiny in-memory localStorage so load/save (and the settings migration they run)
// can be exercised without pulling in a DOM environment.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

const KEY = 'rmct.v1';

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe('freshProgress', () => {
  it('starts with the intended number of letters in play', () => {
    expect(freshProgress().lettersInPlay).toBe(START_LETTERS);
  });

  it('starts with a clean slate', () => {
    const p = freshProgress();
    expect(p.totalAnswered).toBe(0);
    expect(p.consecutiveCorrect).toBe(0);
    expect(p.playMs).toBe(0);
  });

  it('seeds every letter of the teaching order at zero', () => {
    const p = freshProgress();
    for (const l of TEACHING_ORDER) {
      expect(p.letters[l], `missing ${l}`).toBeDefined();
      expect(p.letters[l].score).toBe(0);
    }
  });

  it('returns an independent object each call', () => {
    const a = freshProgress();
    const b = freshProgress();
    a.letters.e.score = 4;
    expect(b.letters.e.score).toBe(0);
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('keeps effective speed at or below character speed (Farnsworth invariant)', () => {
    expect(DEFAULT_SETTINGS.effWpm).toBeLessThanOrEqual(DEFAULT_SETTINGS.wpm);
  });

  it('defaults the accessibility and advanced options to off', () => {
    expect(DEFAULT_SETTINGS.oneSwitch).toBe(false);
    expect(DEFAULT_SETTINGS.singleKey).toBe(false);
    expect(DEFAULT_SETTINGS.gazeInput).toBe(false);
    expect(DEFAULT_SETTINGS.straightKey).toBe(false);
    expect(DEFAULT_SETTINGS.trackingConsent).toBe(false);
  });

  it('uses an audible tone and non-zero volume', () => {
    expect(DEFAULT_SETTINGS.tone).toBeGreaterThan(100);
    expect(DEFAULT_SETTINGS.volume).toBeGreaterThan(0);
  });
});

describe('encodeProgress / decodeProgress', () => {
  it('round-trips progress through a share code', () => {
    const p = freshProgress();
    p.letters.e = { attempts: 4, correct: 3, wrong: 1, score: 2, hideHint: true };
    p.lettersInPlay = 6;
    p.totalAnswered = 42;

    const decoded = decodeProgress(encodeProgress(p));
    expect(decoded).not.toBeNull();
    expect(decoded!.letters.e.score).toBe(2);
    expect(decoded!.lettersInPlay).toBe(6);
    expect(decoded!.totalAnswered).toBe(42);
  });

  it('returns null for a code that is not valid base64', () => {
    expect(decodeProgress('not a real code!!')).toBeNull();
  });

  it('returns null for base64 that is not progress', () => {
    expect(decodeProgress(btoa('{"hello":"world"}'))).toBeNull();
  });

  it('returns null for valid JSON without a letters map', () => {
    expect(decodeProgress(btoa(JSON.stringify({ lettersInPlay: 3 })))).toBeNull();
  });

  it('tolerates surrounding whitespace from copy/paste', () => {
    const code = encodeProgress(freshProgress());
    expect(decodeProgress(`  ${code}\n`)).not.toBeNull();
  });
});

describe('load / save', () => {
  it('returns defaults when nothing is stored', () => {
    const s = load();
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
    expect(s.progress.lettersInPlay).toBe(START_LETTERS);
  });

  it('round-trips a saved state', () => {
    const state = load();
    state.settings.wpm = 22;
    state.progress.totalAnswered = 7;
    save(state);

    const reloaded = load();
    expect(reloaded.settings.wpm).toBe(22);
    expect(reloaded.progress.totalAnswered).toBe(7);
  });

  it('falls back to defaults when storage is corrupt', () => {
    localStorage.setItem(KEY, '{ not json');
    expect(load().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('fills in settings added after the save was written', () => {
    localStorage.setItem(KEY, JSON.stringify({ settings: { wpm: 20, effWpm: 10 } }));
    const s = load();
    expect(s.settings.wpm).toBe(20);
    expect(s.settings.singleKey).toBe(DEFAULT_SETTINGS.singleKey);
    expect(s.settings.tone).toBe(DEFAULT_SETTINGS.tone);
  });

  it('migrates the retired farnsworth flag to an effective speed', () => {
    // Old saves had `farnsworth: true` and no effWpm; beginners must keep their
    // wide spacing rather than jumping to full speed.
    localStorage.setItem(KEY, JSON.stringify({ settings: { wpm: 18, farnsworth: true } }));
    const s = load();
    expect(s.settings.effWpm).toBeLessThanOrEqual(7);
    expect(s.settings.effWpm).toBeLessThan(s.settings.wpm);
  });

  it('migrates farnsworth:false to full speed', () => {
    localStorage.setItem(KEY, JSON.stringify({ settings: { wpm: 18, farnsworth: false } }));
    expect(load().settings.effWpm).toBe(18);
  });

  it('leaves an explicit effWpm alone', () => {
    localStorage.setItem(KEY, JSON.stringify({ settings: { wpm: 20, effWpm: 13 } }));
    expect(load().settings.effWpm).toBe(13);
  });

  it('hydrates every progress slice even when the save predates them', () => {
    localStorage.setItem(KEY, JSON.stringify({ settings: {}, progress: freshProgress() }));
    const s = load();
    expect(s.receive).toBeDefined();
    expect(s.numbers).toBeDefined();
    expect(s.koch).toBeDefined();
    expect(s.koch.lesson).toBeGreaterThanOrEqual(1);
  });
});

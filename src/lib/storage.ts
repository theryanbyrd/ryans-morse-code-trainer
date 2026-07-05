// LocalStorage-backed persistence for settings, progress and stats.
// No account required — progress lives on the device and can be exported as a code.

import { TEACHING_ORDER } from '../data/morse';

const KEY = 'rmct.v1';

export type Settings = {
  sound: boolean;
  speechHints: boolean;
  visualHints: boolean;
  morseBoard: boolean;
  oneSwitch: boolean;
  trackingConsent: boolean;
  scanIntervalMs: number; // one-switch dwell time
  // Receive mode: character speed (WPM) and Farnsworth (extra-spaced) timing.
  wpm: number;
  farnsworth: boolean;
  // Receive: mirror the audio with an on-screen flash + device vibration.
  visual: boolean;
};

export type LetterStat = {
  attempts: number;
  correct: number;
  wrong: number;
  // Cumulative mastery score (+1 correct, -1 wrong) — drives "learned" status.
  score: number;
  // The mnemonic hint follows the LAST outcome: hidden after a correct answer,
  // shown again after a wrong one (and shown the very first time).
  hideHint: boolean;
};

export type Progress = {
  letters: Record<string, LetterStat>;
  lettersInPlay: number; // how many letters from TEACHING_ORDER are currently in play
  consecutiveCorrect: number; // consecutive clean words (drives new-letter introduction)
  totalAnswered: number;
  playMs: number;
};

// Receive (listening) mode keeps its own per-letter mastery, independent of Send.
export type ReceiveLetterStat = {
  attempts: number;
  correct: number;
  wrong: number;
  score: number;
};

export type ReceiveProgress = {
  letters: Record<string, ReceiveLetterStat>;
  totalAnswered: number;
  playMs: number;
  // Gamification
  xp: number;
  streak: number;
  bestStreak: number;
  wordsCompleted: number;
  sentencesCompleted: number;
  topWpm: number; // fastest speed the learner has practised at
  badges: string[]; // earned badge ids
};

export const START_LETTERS = 3;

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  speechHints: true,
  visualHints: true,
  morseBoard: true,
  oneSwitch: false,
  trackingConsent: false,
  scanIntervalMs: 1200,
  wpm: 12,
  farnsworth: true,
  visual: false,
};

export function freshProgress(): Progress {
  const letters: Record<string, LetterStat> = {};
  for (const l of TEACHING_ORDER) {
    letters[l] = { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  }
  return { letters, lettersInPlay: START_LETTERS, consecutiveCorrect: 0, totalAnswered: 0, playMs: 0 };
}

export function freshReceiveProgress(): ReceiveProgress {
  const letters: Record<string, ReceiveLetterStat> = {};
  for (const l of TEACHING_ORDER) {
    letters[l] = { attempts: 0, correct: 0, wrong: 0, score: 0 };
  }
  return {
    letters,
    totalAnswered: 0,
    playMs: 0,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    wordsCompleted: 0,
    sentencesCompleted: 0,
    topWpm: 0,
    badges: [],
  };
}

export function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveState>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        progress: hydrateProgress(parsed.progress),
        receive: hydrateReceive(parsed.receive),
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { settings: { ...DEFAULT_SETTINGS }, progress: freshProgress(), receive: freshReceiveProgress() };
}

export type SaveState = {
  settings: Settings;
  progress: Progress;
  receive: ReceiveProgress;
};

function hydrateReceive(r?: Partial<ReceiveProgress>): ReceiveProgress {
  const base = freshReceiveProgress();
  if (!r) return base;
  return {
    letters: { ...base.letters, ...(r.letters ?? {}) },
    totalAnswered: r.totalAnswered ?? 0,
    playMs: r.playMs ?? 0,
    xp: r.xp ?? 0,
    streak: r.streak ?? 0,
    bestStreak: r.bestStreak ?? 0,
    wordsCompleted: r.wordsCompleted ?? 0,
    sentencesCompleted: r.sentencesCompleted ?? 0,
    topWpm: r.topWpm ?? 0,
    badges: r.badges ?? [],
  };
}

function hydrateProgress(p?: Partial<Progress>): Progress {
  const base = freshProgress();
  if (!p) return base;
  return {
    letters: { ...base.letters, ...(p.letters ?? {}) },
    lettersInPlay: Math.max(START_LETTERS, p.lettersInPlay ?? base.lettersInPlay),
    consecutiveCorrect: p.consecutiveCorrect ?? 0,
    totalAnswered: p.totalAnswered ?? 0,
    playMs: p.playMs ?? 0,
  };
}

export function save(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

// ----- Portable progress codes -----------------------------------------------
// "Get Code" / "Load From Code" encode just the progress as a base64 string.

export function encodeProgress(progress: Progress): string {
  const json = JSON.stringify(progress);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeProgress(code: string): Progress | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const parsed = JSON.parse(json) as Partial<Progress>;
    if (!parsed || typeof parsed !== 'object' || !parsed.letters) return null;
    return hydrateProgress(parsed);
  } catch {
    return null;
  }
}

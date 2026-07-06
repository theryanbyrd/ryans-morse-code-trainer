// LocalStorage-backed persistence for settings, progress and stats.
// No account required — progress lives on the device and can be exported as a code.

import { TEACHING_ORDER } from '../data/morse';
import { NUM_SYM_ORDER } from '../data/numsym';

const KEY = 'rmct.v1';

export type Settings = {
  sound: boolean;
  speechHints: boolean;
  visualHints: boolean;
  morseBoard: boolean;
  oneSwitch: boolean;
  trackingConsent: boolean;
  scanIntervalMs: number; // one-switch dwell time
  // Receive/playback timing & tone. wpm = character speed; effWpm = effective
  // (Farnsworth) speed ≤ wpm that stretches the gaps; tone = sidetone Hz.
  wpm: number;
  effWpm: number;
  tone: number;
  volume: number;
  // Receive: mirror the audio with an on-screen flash + device vibration.
  visual: boolean;
  // Advanced (default off): straight-key keying + send speed, and freeform QSOs.
  straightKey: boolean;
  sendWpm: number;
  qsoFreeform: boolean;
  // Show the dot/dash binary tree lighting up while you key (Learn).
  morseTree: boolean;
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

// Numbers & symbols drill — same per-character shape as letters.
export type NumbersProgress = {
  chars: Record<string, LetterStat>;
  totalAnswered: number;
  playMs: number;
};

// Koch-method receive course: current unlocked lesson + best score per lesson.
export type KochProgress = {
  lesson: number; // highest unlocked lesson (1-based)
  best: Record<string, number>; // lesson number -> best % copy
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
  wpm: 18,
  effWpm: 12,
  tone: 640,
  volume: 0.2,
  visual: false,
  straightKey: false,
  sendWpm: 13,
  qsoFreeform: false,
  morseTree: false,
};

// Carry the old boolean `farnsworth` + `wpm` into the new char/effective model.
function migrateSettings(s: Settings, raw?: Partial<Settings> & { farnsworth?: boolean }): Settings {
  if (raw && raw.effWpm === undefined) {
    s = { ...s, effWpm: raw.farnsworth ? Math.min(s.wpm, 7) : s.wpm };
  }
  return s;
}

export function freshProgress(): Progress {
  const letters: Record<string, LetterStat> = {};
  for (const l of TEACHING_ORDER) {
    letters[l] = { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  }
  return { letters, lettersInPlay: START_LETTERS, consecutiveCorrect: 0, totalAnswered: 0, playMs: 0 };
}

export function freshKochProgress(): KochProgress {
  return { lesson: 1, best: {} };
}

export function freshNumbersProgress(): NumbersProgress {
  const chars: Record<string, LetterStat> = {};
  for (const c of NUM_SYM_ORDER) chars[c] = { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  return { chars, totalAnswered: 0, playMs: 0 };
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
        settings: migrateSettings({ ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) }, parsed.settings),
        progress: hydrateProgress(parsed.progress),
        receive: hydrateReceive(parsed.receive),
        numbers: hydrateNumbers(parsed.numbers),
        koch: hydrateKoch(parsed.koch),
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return {
    settings: { ...DEFAULT_SETTINGS },
    progress: freshProgress(),
    receive: freshReceiveProgress(),
    numbers: freshNumbersProgress(),
    koch: freshKochProgress(),
  };
}

export type SaveState = {
  settings: Settings;
  progress: Progress;
  receive: ReceiveProgress;
  numbers: NumbersProgress;
  koch: KochProgress;
};

function hydrateKoch(k?: Partial<KochProgress>): KochProgress {
  return { lesson: Math.max(1, k?.lesson ?? 1), best: k?.best ?? {} };
}

function hydrateNumbers(n?: Partial<NumbersProgress>): NumbersProgress {
  const base = freshNumbersProgress();
  if (!n) return base;
  return {
    chars: { ...base.chars, ...(n.chars ?? {}) },
    totalAnswered: n.totalAnswered ?? 0,
    playMs: n.playMs ?? 0,
  };
}

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

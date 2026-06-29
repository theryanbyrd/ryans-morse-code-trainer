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
};

export type LetterStat = {
  attempts: number;
  correct: number;
  wrong: number;
  streak: number;
  learned: boolean;
};

export type Progress = {
  letters: Record<string, LetterStat>;
  introduced: number; // how many letters from TEACHING_ORDER have been introduced
  totalAnswered: number;
  playMs: number;
};

export type SaveState = {
  settings: Settings;
  progress: Progress;
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  speechHints: true,
  visualHints: true,
  morseBoard: true,
  oneSwitch: false,
  trackingConsent: false,
  scanIntervalMs: 1200,
};

export function freshProgress(): Progress {
  const letters: Record<string, LetterStat> = {};
  for (const l of TEACHING_ORDER) {
    letters[l] = { attempts: 0, correct: 0, wrong: 0, streak: 0, learned: false };
  }
  return { letters, introduced: 1, totalAnswered: 0, playMs: 0 };
}

export function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveState>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        progress: hydrateProgress(parsed.progress),
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { settings: { ...DEFAULT_SETTINGS }, progress: freshProgress() };
}

function hydrateProgress(p?: Partial<Progress>): Progress {
  const base = freshProgress();
  if (!p) return base;
  return {
    letters: { ...base.letters, ...(p.letters ?? {}) },
    introduced: p.introduced ?? base.introduced,
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

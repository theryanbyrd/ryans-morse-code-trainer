import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  decodeProgress,
  freshProgress,
  load,
  save,
} from '../lib/storage';
import type { Progress, Settings } from '../lib/storage';
import {
  applyLetterAnswer,
  applyWordEnd,
  isCourseComplete,
  LEARNED_THRESHOLD,
} from '../lib/session';
import { track } from '../lib/analytics';

const ONBOARDED_KEY = 'rmct.onboarded';

type Ctx = {
  settings: Settings;
  progress: Progress;
  started: boolean;
  onboarded: boolean;
  /** Bumped on reset/load so the game can remount with a fresh letter. */
  progressVersion: number;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  start: () => void;
  finishOnboarding: () => void;
  /**
   * Record a single letter answer. `wordEnd` marks the last letter of a word
   * (only reached on a correct answer); `wordClean` says the whole word was
   * answered without a mistake, which drives new-letter introduction.
   * Returns the updated progress so the caller can pick the next word.
   */
  answerLetter: (letter: string, correct: boolean, wordEnd: boolean, wordClean: boolean) => Progress;
  addPlayTime: (ms: number) => void;
  resetProgress: () => void;
  loadFromCode: (code: string) => boolean;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => load(), []);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [started, setStarted] = useState(false);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDED_KEY) === '1');
  const [progressVersion, setProgressVersion] = useState(0);

  // Persist whenever settings or progress change.
  const settingsRef = useRef(settings);
  const progressRef = useRef(progress);
  settingsRef.current = settings;
  progressRef.current = progress;
  useEffect(() => {
    save({ settings, progress });
  }, [settings, progress]);

  const setSetting = useCallback<Ctx['setSetting']>((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const start = useCallback(() => {
    setStarted(true);
    track({ type: 'session_start' }, settingsRef.current.trackingConsent);
  }, []);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setOnboarded(true);
  }, []);

  const answerLetter = useCallback<Ctx['answerLetter']>((letter, correct, wordEnd, wordClean) => {
    const before = progressRef.current;
    const wasLearned = (before.letters[letter]?.score ?? 0) >= LEARNED_THRESHOLD;
    let next = applyLetterAnswer(before, letter, correct);
    if (correct && wordEnd) next = applyWordEnd(next, wordClean);
    setProgress(next);

    const consent = settingsRef.current.trackingConsent;
    track({ type: 'answer', letter, correct }, consent);
    const nowLearned = (next.letters[letter]?.score ?? 0) >= LEARNED_THRESHOLD;
    if (!wasLearned && nowLearned) {
      track({ type: 'letter_learned', letter }, consent);
    }
    if (!isCourseComplete(before) && isCourseComplete(next)) {
      track({ type: 'course_complete' }, consent);
    }
    return next;
  }, []);

  const addPlayTime = useCallback((ms: number) => {
    setProgress((p) => ({ ...p, playMs: p.playMs + ms }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(freshProgress());
    setProgressVersion((v) => v + 1);
  }, []);

  const loadFromCode = useCallback((code: string) => {
    const decoded = decodeProgress(code);
    if (!decoded) return false;
    setProgress(decoded);
    setProgressVersion((v) => v + 1);
    return true;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      progress,
      started,
      onboarded,
      progressVersion,
      setSetting,
      start,
      finishOnboarding,
      answerLetter,
      addPlayTime,
      resetProgress,
      loadFromCode,
    }),
    [settings, progress, started, onboarded, progressVersion, setSetting, start, finishOnboarding, answerLetter, addPlayTime, resetProgress, loadFromCode],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DEFAULT_SETTINGS, LEARNED_THRESHOLD };

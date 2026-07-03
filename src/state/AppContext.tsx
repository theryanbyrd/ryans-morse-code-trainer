import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  decodeProgress,
  freshProgress,
  freshReceiveProgress,
  load,
  save,
} from '../lib/storage';
import type { Progress, ReceiveProgress, Settings } from '../lib/storage';
import {
  applyLetterAnswer,
  applyWordEnd,
  isCourseComplete,
  LEARNED_THRESHOLD,
} from '../lib/session';
import { applyReceiveAnswer } from '../lib/receive';
import { track } from '../lib/analytics';
import { useAuth } from './AuthContext';
import { loadRemote, mergeSaveState, saveRemote } from '../lib/cloud';

const ONBOARDED_KEY = 'rmct.onboarded';
const MODE_KEY = 'rmct.mode';

export type Mode = 'send' | 'receive';

type Ctx = {
  settings: Settings;
  progress: Progress;
  receive: ReceiveProgress;
  started: boolean;
  onboarded: boolean;
  /** Bumped on reset/load so the game can remount with a fresh letter. */
  progressVersion: number;
  /** Current mode, or null when the mode-select screen should show. */
  mode: Mode | null;
  /** The last mode the learner chose (for highlighting the mode-select). */
  lastMode: Mode | null;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  start: () => void;
  finishOnboarding: () => void;
  setMode: (mode: Mode | null) => void;
  answerLetter: (letter: string, correct: boolean, wordEnd: boolean, wordClean: boolean) => Progress;
  answerReceive: (letter: string, correct: boolean) => ReceiveProgress;
  addPlayTime: (ms: number) => void;
  addReceivePlayTime: (ms: number) => void;
  resetProgress: () => void;
  loadFromCode: (code: string) => boolean;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => load(), []);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [receive, setReceive] = useState<ReceiveProgress>(initial.receive);
  const [started, setStarted] = useState(false);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDED_KEY) === '1');
  const [progressVersion, setProgressVersion] = useState(0);
  const [mode, setModeState] = useState<Mode | null>(null);
  const [lastMode, setLastMode] = useState<Mode | null>(() => {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'send' || m === 'receive' ? m : null;
  });

  const settingsRef = useRef(settings);
  const progressRef = useRef(progress);
  const receiveRef = useRef(receive);
  settingsRef.current = settings;
  progressRef.current = progress;
  receiveRef.current = receive;

  useEffect(() => {
    save({ settings, progress, receive });
  }, [settings, progress, receive]);

  // ----- Cloud sync (only active when Supabase is configured + signed in) -----
  const { user } = useAuth();
  const syncReadyForUser = useRef<string | null>(null);
  const pendingUser = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (!uid) {
      syncReadyForUser.current = null;
      pendingUser.current = null;
      return;
    }
    if (syncReadyForUser.current === uid || pendingUser.current === uid) return;
    pendingUser.current = uid;
    void (async () => {
      const local = { settings: settingsRef.current, progress: progressRef.current, receive: receiveRef.current };
      const remote = await loadRemote(uid);
      const merged = remote ? mergeSaveState(local, remote) : local;
      setSettings(merged.settings);
      setProgress(merged.progress);
      setReceive(merged.receive);
      setProgressVersion((v) => v + 1);
      await saveRemote(uid, merged);
      syncReadyForUser.current = uid;
      pendingUser.current = null;
    })();
  }, [user]);

  // Debounced upload whenever state changes after the initial merge.
  useEffect(() => {
    const uid = user?.id;
    if (!uid || syncReadyForUser.current !== uid) return;
    const t = setTimeout(() => void saveRemote(uid, { settings, progress, receive }), 800);
    return () => clearTimeout(t);
  }, [settings, progress, receive, user]);

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

  const setMode = useCallback<Ctx['setMode']>((m) => {
    setModeState(m);
    if (m) {
      localStorage.setItem(MODE_KEY, m);
      setLastMode(m);
    }
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
    if (!wasLearned && nowLearned) track({ type: 'letter_learned', letter }, consent);
    if (!isCourseComplete(before) && isCourseComplete(next)) track({ type: 'course_complete' }, consent);
    return next;
  }, []);

  const answerReceive = useCallback<Ctx['answerReceive']>((letter, correct) => {
    const next = applyReceiveAnswer(receiveRef.current, letter, correct);
    setReceive(next);
    track({ type: 'answer', letter, correct }, settingsRef.current.trackingConsent);
    return next;
  }, []);

  const addPlayTime = useCallback((ms: number) => {
    setProgress((p) => ({ ...p, playMs: p.playMs + ms }));
  }, []);

  const addReceivePlayTime = useCallback((ms: number) => {
    setReceive((r) => ({ ...r, playMs: r.playMs + ms }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(freshProgress());
    setReceive(freshReceiveProgress());
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
      receive,
      started,
      onboarded,
      progressVersion,
      mode,
      lastMode,
      setSetting,
      start,
      finishOnboarding,
      setMode,
      answerLetter,
      answerReceive,
      addPlayTime,
      addReceivePlayTime,
      resetProgress,
      loadFromCode,
    }),
    [settings, progress, receive, started, onboarded, progressVersion, mode, lastMode, setSetting, start, finishOnboarding, setMode, answerLetter, answerReceive, addPlayTime, addReceivePlayTime, resetProgress, loadFromCode],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DEFAULT_SETTINGS, LEARNED_THRESHOLD };

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  decodeProgress,
  freshProgress,
  freshKochProgress,
  freshNumbersProgress,
  freshReceiveProgress,
  load,
  save,
} from '../lib/storage';
import type { KochProgress, NumbersProgress, Progress, ReceiveProgress, Settings } from '../lib/storage';
import { applyNumberAnswer } from '../lib/numbers';
import { KOCH_LESSONS, KOCH_PASS } from '../data/koch';
import {
  applyLetterAnswer,
  applyWordEnd,
  isCourseComplete,
  LEARNED_THRESHOLD,
} from '../lib/session';
import {
  applyReceiveAnswer,
  applySentenceComplete,
  applyWordComplete,
  BADGES,
  earnedBadges,
  knownLetters,
  levelFromXp,
} from '../lib/receive';
import type { ReceiveProgress as RP } from '../lib/storage';
import { track } from '../lib/analytics';

export type ReceiveToast = { id: number; kind: 'level' | 'badge'; icon: string; title: string; subtitle: string };
import { useAuth } from './AuthContext';
import { loadRemote, mergeSaveState, saveRemote } from '../lib/cloud';

const ONBOARDED_KEY = 'rmct.onboarded';
const MODE_KEY = 'rmct.mode';

export type Mode = 'send' | 'receive-letters' | 'receive-words' | 'qso' | 'translator' | 'numbers' | 'koch';

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
  numbers: NumbersProgress;
  answerNumber: (ch: string, correct: boolean) => NumbersProgress;
  addNumbersPlayTime: (ms: number) => void;
  koch: KochProgress;
  recordKoch: (lesson: number, pct: number) => void;
  completeReceiveWord: () => void;
  completeReceiveSentence: () => void;
  receiveToasts: ReceiveToast[];
  dismissToast: (id: number) => void;
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
  const [numbers, setNumbers] = useState<NumbersProgress>(initial.numbers);
  const [koch, setKoch] = useState<KochProgress>(initial.koch);
  const [started, setStarted] = useState(false);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDED_KEY) === '1');
  const [progressVersion, setProgressVersion] = useState(0);
  const [mode, setModeState] = useState<Mode | null>(null);
  const [lastMode, setLastMode] = useState<Mode | null>(() => {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'send' ||
      m === 'receive-letters' ||
      m === 'receive-words' ||
      m === 'qso' ||
      m === 'translator' ||
      m === 'numbers' ||
      m === 'koch'
      ? m
      : null;
  });

  const settingsRef = useRef(settings);
  const progressRef = useRef(progress);
  const receiveRef = useRef(receive);
  const numbersRef = useRef(numbers);
  const kochRef = useRef(koch);
  settingsRef.current = settings;
  progressRef.current = progress;
  receiveRef.current = receive;
  numbersRef.current = numbers;
  kochRef.current = koch;

  useEffect(() => {
    save({ settings, progress, receive, numbers, koch });
  }, [settings, progress, receive, numbers, koch]);

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
      const local = {
        settings: settingsRef.current,
        progress: progressRef.current,
        receive: receiveRef.current,
        numbers: numbersRef.current,
        koch: kochRef.current,
      };
      const remote = await loadRemote(uid);
      const merged = remote ? mergeSaveState(local, remote) : local;
      setSettings(merged.settings);
      setProgress(merged.progress);
      setReceive(merged.receive);
      setNumbers(merged.numbers);
      setKoch(merged.koch);
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
    const t = setTimeout(() => void saveRemote(uid, { settings, progress, receive, numbers, koch }), 800);
    return () => clearTimeout(t);
  }, [settings, progress, receive, numbers, koch, user]);

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

  const [receiveToasts, setReceiveToasts] = useState<ReceiveToast[]>([]);
  const toastId = useRef(0);
  const dismissToast = useCallback((id: number) => {
    setReceiveToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  // Commit a receive update: award XP-driven levels (which nudge the speed up),
  // detect newly-earned badges, and queue celebration toasts.
  const commitReceive = useCallback((nextBase: RP): RP => {
    const prev = receiveRef.current;
    const pool = knownLetters(progressRef.current);
    const wpm = settingsRef.current.wpm;
    let next: RP = { ...nextBase, topWpm: Math.max(nextBase.topWpm, wpm) };

    const earned = earnedBadges(next, pool, wpm);
    const fresh = earned.filter((b) => !next.badges.includes(b));
    if (fresh.length) next = { ...next, badges: [...next.badges, ...fresh] };
    setReceive(next);

    const toasts: ReceiveToast[] = [];
    const prevLevel = levelFromXp(prev.xp);
    const newLevel = levelFromXp(next.xp);
    if (newLevel > prevLevel) {
      setSettings((s) => ({ ...s, wpm: Math.min(20, s.wpm + 1) }));
      toasts.push({ id: ++toastId.current, kind: 'level', icon: '⬆️', title: `Level ${newLevel}!`, subtitle: 'Speed +1 WPM' });
    }
    for (const id of fresh) {
      const b = BADGES.find((x) => x.id === id);
      if (b) toasts.push({ id: ++toastId.current, kind: 'badge', icon: b.icon, title: b.name, subtitle: b.desc });
    }
    if (toasts.length) setReceiveToasts((ts) => [...ts, ...toasts]);
    return next;
  }, []);

  const answerReceive = useCallback<Ctx['answerReceive']>((letter, correct) => {
    track({ type: 'answer', letter, correct }, settingsRef.current.trackingConsent);
    return commitReceive(applyReceiveAnswer(receiveRef.current, letter, correct));
  }, [commitReceive]);

  const completeReceiveWord = useCallback(() => {
    commitReceive(applyWordComplete(receiveRef.current));
  }, [commitReceive]);

  const completeReceiveSentence = useCallback(() => {
    commitReceive(applySentenceComplete(receiveRef.current));
  }, [commitReceive]);

  const addPlayTime = useCallback((ms: number) => {
    setProgress((p) => ({ ...p, playMs: p.playMs + ms }));
  }, []);

  const addReceivePlayTime = useCallback((ms: number) => {
    setReceive((r) => ({ ...r, playMs: r.playMs + ms }));
  }, []);

  const answerNumber = useCallback<Ctx['answerNumber']>((ch, correct) => {
    const next = applyNumberAnswer(numbersRef.current, ch, correct);
    setNumbers(next);
    track({ type: 'answer', letter: ch, correct }, settingsRef.current.trackingConsent);
    return next;
  }, []);

  const addNumbersPlayTime = useCallback((ms: number) => {
    setNumbers((n) => ({ ...n, playMs: n.playMs + ms }));
  }, []);

  const recordKoch = useCallback<Ctx['recordKoch']>((lesson, pct) => {
    setKoch((k) => {
      const key = String(lesson);
      const best = { ...k.best, [key]: Math.max(k.best[key] ?? 0, pct) };
      const lessonNum =
        pct >= KOCH_PASS && lesson === k.lesson && lesson < KOCH_LESSONS ? k.lesson + 1 : k.lesson;
      return { lesson: lessonNum, best };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(freshProgress());
    setReceive(freshReceiveProgress());
    setNumbers(freshNumbersProgress());
    setKoch(freshKochProgress());
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
      numbers,
      answerNumber,
      addNumbersPlayTime,
      koch,
      recordKoch,
      completeReceiveWord,
      completeReceiveSentence,
      receiveToasts,
      dismissToast,
      addPlayTime,
      addReceivePlayTime,
      resetProgress,
      loadFromCode,
    }),
    [settings, progress, receive, numbers, koch, started, onboarded, progressVersion, mode, lastMode, receiveToasts, setSetting, start, finishOnboarding, setMode, answerLetter, answerReceive, answerNumber, addNumbersPlayTime, recordKoch, completeReceiveWord, completeReceiveSentence, dismissToast, addPlayTime, addReceivePlayTime, resetProgress, loadFromCode],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DEFAULT_SETTINGS, LEARNED_THRESHOLD };

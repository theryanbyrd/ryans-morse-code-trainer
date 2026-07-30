// Cloud persistence for signed-in users: the whole SaveState lives as a single
// JSONB row per user in the `user_state` table. On sign-in we merge the local
// (guest) state with the cloud state so nothing is lost, then keep the cloud in
// sync as the learner plays.
import { supabase } from './supabase';
import { freshCaveProgress } from './storage';
import type { CaveProgress, KochProgress, LetterStat, NumbersProgress, Progress, ReceiveLetterStat, ReceiveProgress, SaveState, Settings } from './storage';

const TABLE = 'user_state';

export async function loadRemote(userId: string): Promise<SaveState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('state').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return (data.state as SaveState) ?? null;
}

export async function saveRemote(userId: string, state: SaveState): Promise<void> {
  if (!supabase) return;
  await supabase.from(TABLE).upsert(
    { user_id: userId, state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

function mergeLetter(a?: LetterStat, b?: LetterStat): LetterStat {
  const x = a ?? { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  const y = b ?? { attempts: 0, correct: 0, wrong: 0, score: 0, hideHint: false };
  // Take the more-advanced record (higher score wins; keep its hint state).
  const lead = y.score > x.score ? y : x;
  return {
    attempts: Math.max(x.attempts, y.attempts),
    correct: Math.max(x.correct, y.correct),
    wrong: Math.max(x.wrong, y.wrong),
    score: Math.max(x.score, y.score),
    hideHint: lead.hideHint,
  };
}

function mergeReceiveLetter(a?: ReceiveLetterStat, b?: ReceiveLetterStat): ReceiveLetterStat {
  const x = a ?? { attempts: 0, correct: 0, wrong: 0, score: 0 };
  const y = b ?? { attempts: 0, correct: 0, wrong: 0, score: 0 };
  return {
    attempts: Math.max(x.attempts, y.attempts),
    correct: Math.max(x.correct, y.correct),
    wrong: Math.max(x.wrong, y.wrong),
    score: Math.max(x.score, y.score),
  };
}

function mergeProgress(a: Progress, b: Progress): Progress {
  const keys = new Set([...Object.keys(a.letters), ...Object.keys(b.letters)]);
  const letters: Record<string, LetterStat> = {};
  for (const k of keys) letters[k] = mergeLetter(a.letters[k], b.letters[k]);
  return {
    letters,
    lettersInPlay: Math.max(a.lettersInPlay, b.lettersInPlay),
    consecutiveCorrect: Math.max(a.consecutiveCorrect, b.consecutiveCorrect),
    totalAnswered: Math.max(a.totalAnswered, b.totalAnswered),
    playMs: Math.max(a.playMs, b.playMs),
  };
}

function mergeReceive(a: ReceiveProgress, b: ReceiveProgress): ReceiveProgress {
  const keys = new Set([...Object.keys(a.letters), ...Object.keys(b.letters)]);
  const letters: Record<string, ReceiveLetterStat> = {};
  for (const k of keys) letters[k] = mergeReceiveLetter(a.letters[k], b.letters[k]);
  return {
    letters,
    totalAnswered: Math.max(a.totalAnswered, b.totalAnswered),
    playMs: Math.max(a.playMs, b.playMs),
    xp: Math.max(a.xp, b.xp),
    streak: Math.max(a.streak, b.streak),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    wordsCompleted: Math.max(a.wordsCompleted, b.wordsCompleted),
    sentencesCompleted: Math.max(a.sentencesCompleted, b.sentencesCompleted),
    topWpm: Math.max(a.topWpm, b.topWpm),
    badges: [...new Set([...(a.badges ?? []), ...(b.badges ?? [])])],
  };
}

/**
 * Merge a local (guest) SaveState with the one from the cloud. Progress and
 * receive stats take the higher score per letter; settings prefer the cloud
 * (the account is canonical) but fall back to local when the cloud has none.
 */
function mergeNumbers(a: NumbersProgress, b: NumbersProgress): NumbersProgress {
  const keys = new Set([...Object.keys(a?.chars ?? {}), ...Object.keys(b?.chars ?? {})]);
  const chars: Record<string, LetterStat> = {};
  for (const k of keys) chars[k] = mergeLetter(a?.chars?.[k], b?.chars?.[k]);
  return {
    chars,
    totalAnswered: Math.max(a?.totalAnswered ?? 0, b?.totalAnswered ?? 0),
    playMs: Math.max(a?.playMs ?? 0, b?.playMs ?? 0),
  };
}

function mergeKoch(a: KochProgress, b: KochProgress): KochProgress {
  const best: Record<string, number> = { ...(a?.best ?? {}) };
  for (const [k, v] of Object.entries(b?.best ?? {})) best[k] = Math.max(best[k] ?? 0, v);
  return { lesson: Math.max(a?.lesson ?? 1, b?.lesson ?? 1), best };
}

const union = (a?: string[], b?: string[]) => [...new Set([...(a ?? []), ...(b ?? [])])];

/**
 * Merge two cave crawls. Anything earned is kept from both sides: cleared rooms,
 * opened doors and loot are unioned, and beating the boss anywhere counts.
 * `room` is a position rather than a score, so the side that has got further
 * (more rooms cleared, then more doors opened) decides where you stand; ties
 * keep the local one so the device you are on does not jump underneath you.
 */
function mergeCave(a?: CaveProgress, b?: CaveProgress): CaveProgress {
  const x = a ?? freshCaveProgress();
  const y = b ?? freshCaveProgress();
  const ahead =
    y.cleared.length !== x.cleared.length
      ? y.cleared.length > x.cleared.length
      : y.unlocked.length > x.unlocked.length;
  const lead = ahead ? y : x;
  return {
    room: lead.room,
    hp: Math.max(x.hp, y.hp),
    cleared: union(x.cleared, y.cleared),
    unlocked: union(x.unlocked, y.unlocked),
    inventory: union(x.inventory, y.inventory),
    completed: Boolean(x.completed || y.completed),
  };
}

export function mergeSaveState(local: SaveState, remote: SaveState): SaveState {
  const settings: Settings = { ...local.settings, ...(remote.settings ?? {}) };
  return {
    settings,
    progress: mergeProgress(local.progress, remote.progress),
    receive: mergeReceive(local.receive, remote.receive),
    numbers: mergeNumbers(local.numbers, remote.numbers),
    koch: mergeKoch(local.koch, remote.koch),
    cave: mergeCave(local.cave, remote.cave),
  };
}

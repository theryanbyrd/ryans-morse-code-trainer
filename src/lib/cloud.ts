// Cloud persistence for signed-in users: the whole SaveState lives as a single
// JSONB row per user in the `user_state` table. On sign-in we merge the local
// (guest) state with the cloud state so nothing is lost, then keep the cloud in
// sync as the learner plays.
import { supabase } from './supabase';
import type { LetterStat, Progress, ReceiveLetterStat, ReceiveProgress, SaveState, Settings } from './storage';

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
  };
}

/**
 * Merge a local (guest) SaveState with the one from the cloud. Progress and
 * receive stats take the higher score per letter; settings prefer the cloud
 * (the account is canonical) but fall back to local when the cloud has none.
 */
export function mergeSaveState(local: SaveState, remote: SaveState): SaveState {
  const settings: Settings = { ...local.settings, ...(remote.settings ?? {}) };
  return {
    settings,
    progress: mergeProgress(local.progress, remote.progress),
    receive: mergeReceive(local.receive, remote.receive),
  };
}

// Receive-mode logic: which letters can be tested (gated on Send-learned
// letters), which one to play next, and how to build the multiple-choice
// options (favouring confusable letters so the practice is meaningful).

import { MORSE, TEACHING_ORDER } from '../data/morse';
import { WORDS } from '../data/words';
import { LEARNED_THRESHOLD } from './session';
import type { Progress, ReceiveProgress } from './storage';

export const RECEIVE_MASTERED = 3; // receive-score at which a letter is "mastered to hear"
export const PROMOTE_TO_RECALL = 2; // at/above this, drop the multiple-choice narrowing (recall)
export const RECEIVE_SCORE_MAX = RECEIVE_MASTERED + 2;
export const MIN_LETTERS_TO_RECEIVE = 3;
const MAX_CHOICES = 4;

function rScore(r: ReceiveProgress, l: string): number {
  return r.letters[l]?.score ?? 0;
}

/** Letters the learner has learned to SEND — the pool Receive draws from. */
export function knownLetters(send: Progress): string[] {
  return TEACHING_ORDER.filter((l) => (send.letters[l]?.score ?? 0) >= LEARNED_THRESHOLD);
}

export function receiveUnlocked(send: Progress): boolean {
  return knownLetters(send).length >= MIN_LETTERS_TO_RECEIVE;
}

export function receiveMasteredCount(r: ReceiveProgress, pool: string[]): number {
  return pool.filter((l) => rScore(r, l) >= RECEIVE_MASTERED).length;
}

export function isReceiveComplete(r: ReceiveProgress, pool: string[]): boolean {
  return pool.length > 0 && pool.every((l) => rScore(r, l) >= RECEIVE_MASTERED);
}

/** Pick the next letter to play — least-mastered first, avoiding a repeat. */
export function pickReceiveLetter(r: ReceiveProgress, pool: string[], avoid: string | null): string | null {
  if (pool.length === 0) return null;
  const min = Math.min(...pool.map((l) => rScore(r, l)));
  let candidates = pool.filter((l) => rScore(r, l) === min);
  if (candidates.length > 1 && avoid) candidates = candidates.filter((l) => l !== avoid) || candidates;
  if (candidates.length === 0) candidates = pool.filter((l) => l !== avoid);
  if (candidates.length === 0) candidates = pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Levenshtein distance between two dot/dash patterns (smaller = more alike). */
function patternDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the multiple-choice options: the correct letter plus distractors drawn
 * from the pool, preferring letters whose Morse pattern is easy to confuse with
 * the correct one. Returned in random order.
 */
export function makeChoices(correct: string, pool: string[]): string[] {
  const others = pool.filter((l) => l !== correct);
  const n = Math.min(MAX_CHOICES, others.length + 1);
  if (n <= 1) return [correct];

  // Rank distractors by confusability (nearest pattern first), with a little
  // randomness so it's not identical every time.
  const ranked = shuffle(others).sort(
    (a, b) => patternDistance(MORSE[correct], MORSE[a]) - patternDistance(MORSE[correct], MORSE[b]),
  );
  const distractors = ranked.slice(0, n - 1);
  return shuffle([correct, ...distractors]);
}

/** Number of choice tiles for a given pool size. */
export function choiceCount(pool: string[]): number {
  return Math.min(MAX_CHOICES, Math.max(2, pool.length));
}

/** Has this letter graduated from recognition (narrowed choices) to recall? */
export function isRecall(r: ReceiveProgress, letter: string): boolean {
  return rScore(r, letter) >= PROMOTE_TO_RECALL;
}

/** Recall options: ALL the learner's known letters, shuffled (no narrowing). */
export function recallOptions(correct: string, pool: string[]): string[] {
  return shuffle(pool.includes(correct) ? pool : [correct, ...pool]);
}

/** Pick a word for the receive word-phase: only in-pool letters, length >= 2. */
export function pickReceiveWord(pool: string[], avoid: string | null): string | null {
  const set = new Set(pool);
  const candidates = WORDS.filter((w) => w.length >= 2 && [...w].every((c) => set.has(c)));
  if (candidates.length === 0) return null;
  const notAvoid = candidates.filter((w) => w !== avoid);
  const list = notAvoid.length ? notAvoid : candidates;
  return list[Math.floor(Math.random() * list.length)];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ----- XP + levels -----------------------------------------------------------

export const LETTER_XP = 3;
export const WORD_XP = 12;
export const SENTENCE_XP = 30;
const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function levelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}
export function xpIntoLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}
export const XP_PER_LEVEL_TOTAL = XP_PER_LEVEL;

/** Apply a single letter answer: per-letter score + XP + streak. */
export function applyReceiveAnswer(r: ReceiveProgress, letter: string, correct: boolean): ReceiveProgress {
  const letters = { ...r.letters };
  const prev = letters[letter] ?? { attempts: 0, correct: 0, wrong: 0, score: 0 };
  letters[letter] = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    score: clamp(prev.score + (correct ? 1 : -1), 0, RECEIVE_SCORE_MAX),
  };
  const streak = correct ? r.streak + 1 : 0;
  return {
    ...r,
    letters,
    totalAnswered: r.totalAnswered + 1,
    xp: r.xp + (correct ? LETTER_XP : 0),
    streak,
    bestStreak: Math.max(r.bestStreak, streak),
  };
}

/** A fully-decoded word: bonus XP + counter. */
export function applyWordComplete(r: ReceiveProgress): ReceiveProgress {
  return { ...r, wordsCompleted: r.wordsCompleted + 1, xp: r.xp + WORD_XP };
}

/** A fully-decoded sentence: bonus XP + counter. */
export function applySentenceComplete(r: ReceiveProgress): ReceiveProgress {
  return { ...r, sentencesCompleted: r.sentencesCompleted + 1, xp: r.xp + SENTENCE_XP };
}

// ----- Phase progression -----------------------------------------------------

export const WORDS_TO_UNLOCK_SENTENCES = 10;
export type ReceivePhase = 'letters' | 'words' | 'sentences';

export function allLettersMastered(r: ReceiveProgress, pool: string[]): boolean {
  return pool.length > 0 && pool.every((l) => rScore(r, l) >= RECEIVE_MASTERED);
}

/**
 * Which phase the learner is in:
 *  - 'letters'   until every known letter is mastered by ear,
 *  - 'words'     until they've decoded WORDS_TO_UNLOCK_SENTENCES whole words,
 *  - 'sentences' after that.
 */
export function receivePhase(r: ReceiveProgress, pool: string[]): ReceivePhase {
  if (!allLettersMastered(r, pool)) return 'letters';
  if (r.wordsCompleted < WORDS_TO_UNLOCK_SENTENCES) return 'words';
  return 'sentences';
}

/** Build a short "sentence" from 2–3 learned words (spaces = word gaps). */
export function pickSentence(pool: string[], avoid: string | null): string | null {
  const n = 2 + Math.floor(Math.random() * 2); // 2 or 3 words
  const words: string[] = [];
  let last: string | null = null;
  for (let i = 0; i < n; i++) {
    const w = pickReceiveWord(pool, last);
    if (!w) break;
    words.push(w);
    last = w;
  }
  if (words.length < 2) return null;
  const sentence = words.join(' ');
  return sentence === avoid ? pickSentence(pool, null) : sentence;
}

// ----- Badges ----------------------------------------------------------------

export type Badge = { id: string; icon: string; name: string; desc: string };

export const BADGES: Badge[] = [
  { id: 'first_signal', icon: '🎧', name: 'First Signal', desc: 'Decode your first letter by ear' },
  { id: 'sharp_ears', icon: '🔤', name: 'Sharp Ears', desc: 'Master every letter you know by ear' },
  { id: 'word_caught', icon: '📖', name: 'Word Caught', desc: 'Decode your first whole word' },
  { id: 'word_master', icon: '📚', name: 'Word Master', desc: `Decode ${WORDS_TO_UNLOCK_SENTENCES} whole words` },
  { id: 'sentence_solver', icon: '📝', name: 'Sentence Solver', desc: 'Decode your first sentence' },
  { id: 'hot_streak', icon: '🔥', name: 'Hot Streak', desc: 'Get 10 in a row' },
  { id: 'speed_demon', icon: '⚡', name: 'Speed Demon', desc: 'Copy at 18 WPM or faster' },
  { id: 'level_5', icon: '⭐', name: 'Rising Star', desc: 'Reach level 5' },
];

/** Which badge ids are earned given current progress. */
export function earnedBadges(r: ReceiveProgress, pool: string[], wpm: number): string[] {
  const out: string[] = [];
  if (r.totalAnswered >= 1) out.push('first_signal');
  if (allLettersMastered(r, pool)) out.push('sharp_ears');
  if (r.wordsCompleted >= 1) out.push('word_caught');
  if (r.wordsCompleted >= WORDS_TO_UNLOCK_SENTENCES) out.push('word_master');
  if (r.sentencesCompleted >= 1) out.push('sentence_solver');
  if (r.bestStreak >= 10) out.push('hot_streak');
  if (Math.max(wpm, r.topWpm) >= 18) out.push('speed_demon');
  if (levelFromXp(r.xp) >= 5) out.push('level_5');
  return out;
}

// Koch-method course data. Characters are introduced one per lesson in the
// classic Koch order; each lesson is random 5-character groups drawn from all
// characters learned so far, sent at full character speed (Farnsworth spacing
// via the effective-speed setting).

export const KOCH_ORDER = [
  'k', 'm', 'r', 's', 'u', 'a', 'p', 't', 'l', 'o', 'w', 'i', '.', 'n', 'j', 'e',
  'f', '0', 'y', ',', 'v', 'g', '5', '/', 'q', '9', 'z', 'h', '3', '8', 'b', '?',
  '4', '2', '7', 'c', '1', 'd', '6', 'x',
];

export const KOCH_LESSONS = KOCH_ORDER.length - 1; // lesson 1 = first 2 chars

export const KOCH_PASS = 90; // % copy needed to unlock the next lesson

/** All characters available at a given lesson (lesson 1 → first 2). */
export function lessonChars(lesson: number): string[] {
  return KOCH_ORDER.slice(0, lesson + 1);
}

/** The character newly introduced at this lesson. */
export function newChar(lesson: number): string {
  return KOCH_ORDER[lesson];
}

/** A random practice run: `groups` groups of `size` characters. */
export function makeGroups(lesson: number, groups = 20, size = 5): string {
  const chars = lessonChars(lesson);
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    let grp = '';
    for (let i = 0; i < size; i++) grp += chars[Math.floor(Math.random() * chars.length)];
    out.push(grp);
  }
  return out.join(' ');
}

export type CopyScore = {
  pct: number;
  correct: number;
  total: number;
  per: Record<string, { sent: number; ok: number }>;
};

/** Score a copy attempt, character-by-character (spaces ignored). */
export function scoreCopy(sent: string, typed: string): CopyScore {
  const s = sent.replace(/\s+/g, '').toLowerCase();
  const t = typed.replace(/\s+/g, '').toLowerCase();
  const per: Record<string, { sent: number; ok: number }> = {};
  let correct = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    per[c] = per[c] ?? { sent: 0, ok: 0 };
    per[c].sent++;
    if (t[i] === c) {
      correct++;
      per[c].ok++;
    }
  }
  return { pct: s.length ? Math.round((correct / s.length) * 100) : 0, correct, total: s.length, per };
}

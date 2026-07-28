import { describe, it, expect } from 'vitest';
import { MY_CALL, QSO_SCENARIOS, generateQso, normalizeQso } from './qso';
import { MORSE_FULL } from './morse';

describe('normalizeQso', () => {
  it('uppercases and collapses whitespace', () => {
    expect(normalizeQso('  cq   cq de k7rb ')).toBe('CQ CQ DE K7RB');
  });

  it('turns the BT break into a space so learners need not type it', () => {
    expect(normalizeQso('TU = 73')).toBe('TU 73');
  });

  it('turns a slash into a space', () => {
    expect(normalizeQso('W1ABC/P')).toBe('W1ABC P');
  });

  it('drops punctuation the learner should not have to key', () => {
    expect(normalizeQso('HW? K')).toBe('HW K');
  });

  it('is idempotent', () => {
    const once = normalizeQso('K7RB DE W1ABC = UR RST 599 = HW? K');
    expect(normalizeQso(once)).toBe(once);
  });

  it('treats equivalent spellings of the same transmission as equal', () => {
    expect(normalizeQso('TU = 73 SK')).toBe(normalizeQso('tu 73 sk'));
  });

  it('returns an empty string for punctuation-only input', () => {
    expect(normalizeQso(' = ? ')).toBe('');
  });
});

describe('QSO_SCENARIOS', () => {
  it('ships the advertised 20 scenarios', () => {
    expect(QSO_SCENARIOS).toHaveLength(20);
  });

  it('gives every scenario a unique id', () => {
    const ids = QSO_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every scenario a title, tag and turns', () => {
    for (const s of QSO_SCENARIOS) {
      expect(s.title, `${s.id} has no title`).toBeTruthy();
      expect(s.tag, `${s.id} has no tag`).toBeTruthy();
      expect(s.turns.length, `${s.id} has no turns`).toBeGreaterThan(0);
    }
  });

  it('uses only send and receive directions', () => {
    for (const s of QSO_SCENARIOS) {
      for (const t of s.turns) expect(['s', 'r']).toContain(t.d);
    }
  });

  it('has at least one turn in each direction per scenario', () => {
    for (const s of QSO_SCENARIOS) {
      expect(s.turns.some((t) => t.d === 's'), `${s.id} never sends`).toBe(true);
      expect(s.turns.some((t) => t.d === 'r'), `${s.id} never receives`).toBe(true);
    }
  });

  it('only uses characters that can actually be keyed in Morse', () => {
    for (const s of QSO_SCENARIOS) {
      for (const t of s.turns) {
        for (const ch of t.t.toLowerCase()) {
          if (ch === ' ') continue;
          expect(MORSE_FULL[ch], `"${ch}" in ${s.id} has no Morse pattern`).toBeTruthy();
        }
      }
    }
  });

  it('never sends an empty transmission', () => {
    for (const s of QSO_SCENARIOS) {
      for (const t of s.turns) expect(normalizeQso(t.t).length, `empty turn in ${s.id}`).toBeGreaterThan(0);
    }
  });
});

describe('generateQso', () => {
  it('produces a playable scenario', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateQso();
      expect(q.turns.length).toBeGreaterThan(0);
      expect(q.turns.some((t) => t.d === 's')).toBe(true);
      expect(q.turns.some((t) => t.d === 'r')).toBe(true);
    }
  });

  it('always involves the operator callsign', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateQso();
      expect(q.turns.some((t) => t.t.includes(MY_CALL))).toBe(true);
    }
  });

  it('only uses keyable characters', () => {
    for (let i = 0; i < 20; i++) {
      for (const t of generateQso().turns) {
        for (const ch of t.t.toLowerCase()) {
          if (ch === ' ') continue;
          expect(MORSE_FULL[ch], `"${ch}" has no Morse pattern`).toBeTruthy();
        }
      }
    }
  });

  it('tags freeform contacts so they are distinguishable', () => {
    expect(generateQso().tag).toBe('Freeform');
  });
});

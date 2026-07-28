import { describe, it, expect } from 'vitest';
import { ROOMS, MONSTERS, START_ROOM, MAX_HP, DIR_NAME, DIR_ARROW, ROOM_COUNT } from './cave';
import { MORSE_FULL, patternForChar } from './morse';
import type { Dir } from './cave';

const DIRS: Dir[] = ['N', 'E', 'S', 'W'];

describe('cave map integrity', () => {
  it('starts in a room that exists', () => {
    expect(ROOMS[START_ROOM]).toBeDefined();
  });

  it('keeps each room id consistent with its key', () => {
    for (const [key, room] of Object.entries(ROOMS)) expect(room.id).toBe(key);
  });

  it('reports the real room count', () => {
    expect(ROOM_COUNT).toBe(Object.keys(ROOMS).length);
  });

  it('never points an exit at a room that does not exist', () => {
    for (const room of Object.values(ROOMS)) {
      for (const exit of room.exits) {
        expect(ROOMS[exit.to], `${room.id} exits ${exit.dir} to missing room "${exit.to}"`).toBeDefined();
      }
    }
  });

  it('uses only the four compass directions', () => {
    for (const room of Object.values(ROOMS)) {
      for (const exit of room.exits) expect(DIRS).toContain(exit.dir);
    }
  });

  it('never has two exits in the same direction from one room', () => {
    for (const room of Object.values(ROOMS)) {
      const dirs = room.exits.map((e) => e.dir);
      expect(new Set(dirs).size, `${room.id} has duplicate exit directions`).toBe(dirs.length);
    }
  });

  it('gives every room a title and narration', () => {
    for (const room of Object.values(ROOMS)) {
      expect(room.title, `${room.id} has no title`).toBeTruthy();
      expect(room.narration, `${room.id} has no narration`).toBeTruthy();
    }
  });

  it('can reach every room from the start', () => {
    // A room nobody can walk to is dead content.
    const seen = new Set<string>([START_ROOM]);
    const queue = [START_ROOM];
    while (queue.length) {
      const room = ROOMS[queue.shift()!];
      for (const exit of room.exits) {
        if (!seen.has(exit.to)) {
          seen.add(exit.to);
          queue.push(exit.to);
        }
      }
    }
    for (const id of Object.keys(ROOMS)) expect(seen.has(id), `"${id}" is unreachable`).toBe(true);
  });

  it('places exactly one boss, at the end of the crawl', () => {
    const bosses = Object.values(ROOMS).filter((r) => r.boss);
    expect(bosses).toHaveLength(1);
    expect(bosses[0].exits).toHaveLength(0);
  });
});

describe('locked doors', () => {
  it('gives every locked exit a code the player can key', () => {
    for (const room of Object.values(ROOMS)) {
      for (const exit of room.exits) {
        if (!exit.locked) continue;
        expect(exit.locked.code.length, `${room.id} lock has an empty code`).toBeGreaterThan(0);
        for (const ch of exit.locked.code.toLowerCase()) {
          expect(MORSE_FULL[ch], `lock code character "${ch}" is not keyable`).toBeTruthy();
        }
      }
    }
  });

  it('gives every locked exit a clue that reveals the code', () => {
    for (const room of Object.values(ROOMS)) {
      for (const exit of room.exits) {
        if (!exit.locked) continue;
        expect(exit.locked.clue).toContain(exit.locked.code);
      }
    }
  });
});

describe('monsters', () => {
  it('only references monsters that exist', () => {
    for (const room of Object.values(ROOMS)) {
      if (!room.monster) continue;
      expect(MONSTERS[room.monster], `${room.id} references unknown monster`).toBeDefined();
    }
  });

  it('keeps each monster id consistent with its key', () => {
    for (const [key, m] of Object.entries(MONSTERS)) expect(m.id).toBe(key);
  });

  it('gives every monster positive HP and a name', () => {
    for (const m of Object.values(MONSTERS)) {
      expect(m.hp, `${m.id} has no HP`).toBeGreaterThan(0);
      expect(m.name, `${m.id} has no name`).toBeTruthy();
    }
  });

  it('gives every monster a keyable weakness', () => {
    for (const m of Object.values(MONSTERS)) {
      expect(m.weakness.length, `${m.id} has an empty weakness`).toBeGreaterThan(0);
      for (const ch of m.weakness.toLowerCase()) {
        expect(patternForChar(ch), `${m.id} weakness "${ch}" is not keyable`).toBeTruthy();
      }
    }
  });

  it('gives every monster at least one attack the player can hear and copy', () => {
    for (const m of Object.values(MONSTERS)) {
      expect(m.attacks.length, `${m.id} has no attacks`).toBeGreaterThan(0);
      for (const attack of m.attacks) {
        expect(attack.length).toBeGreaterThan(0);
        for (const ch of attack.toLowerCase()) {
          if (ch === ' ') continue;
          expect(MORSE_FULL[ch], `${m.id} attack "${ch}" is not keyable`).toBeTruthy();
        }
      }
    }
  });

  it('gives the boss a banishing incantation', () => {
    const boss = Object.values(MONSTERS).find((m) => m.boss);
    expect(boss, 'no boss monster defined').toBeDefined();
    expect(boss!.incantation, 'boss has no incantation').toBeTruthy();
    for (const ch of boss!.incantation!.toLowerCase()) {
      if (ch === ' ') continue;
      expect(MORSE_FULL[ch], `incantation "${ch}" is not keyable`).toBeTruthy();
    }
  });

  it('marks the boss monster as the one in the boss room', () => {
    const bossRoom = Object.values(ROOMS).find((r) => r.boss)!;
    expect(MONSTERS[bossRoom.monster!].boss).toBe(true);
  });
});

describe('cave constants', () => {
  it('starts the player with survivable HP', () => {
    expect(MAX_HP).toBeGreaterThan(1);
  });

  it('labels every direction for the UI', () => {
    for (const d of DIRS) {
      expect(DIR_NAME[d], `no name for ${d}`).toBeTruthy();
      expect(DIR_ARROW[d], `no arrow for ${d}`).toBeTruthy();
    }
  });
});

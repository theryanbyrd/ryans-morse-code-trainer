import { useEffect, useState } from 'react';
import {
  ROOMS, MONSTERS, MAX_HP, START_ROOM, DIR_NAME, DIR_ARROW, ROOM_COUNT,
} from '../data/cave';
import type { Dir, Exit } from '../data/cave';
import { useApp } from '../state/AppContext';
import { decode, patternForChar } from '../data/morse';
import { playWrong } from '../lib/audio';
import { Keypad } from './Keypad';
import type { KeyAction } from './Keypad';
import { StraightKey } from './StraightKey';
import { Pattern } from './Pattern';
import { QsoSend } from './QsoSend';
import { CaveDuel } from './CaveDuel';

const SAVE_KEY = 'rmct.cave';

type Save = {
  room: string;
  hp: number;
  cleared: string[]; // room ids whose monster is defeated
  unlocked: string[]; // exit keys opened (roomId>dir)
  inventory: string[];
  completed: boolean;
};

function load(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { room: START_ROOM, hp: MAX_HP, cleared: [], unlocked: [], inventory: [], completed: false };
}

type Phase = 'explore' | 'fight' | 'door' | 'lose' | 'win';

export function CaveQuest() {
  const { setMode, settings } = useApp();
  const [save, setSave] = useState<Save>(load);
  const [phase, setPhase] = useState<Phase>('explore');
  const [navInput, setNavInput] = useState('');
  const [navShake, setNavShake] = useState(false);
  const [pendingExit, setPendingExit] = useState<Exit | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const room = ROOMS[save.room];
  const hasMonster = !!room.monster && !save.cleared.includes(room.id);

  // persist
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }, [save]);

  // entering a room with a live monster → fight; grab loot once
  useEffect(() => {
    if (phase !== 'explore') return;
    if (hasMonster) {
      setPhase('fight');
    } else if (room.loot && !save.inventory.includes(room.loot.name)) {
      const heal = room.loot.heal ?? 0;
      setSave((s) => ({
        ...s,
        inventory: [...s.inventory, room.loot!.name],
        hp: Math.min(MAX_HP, s.hp + heal),
      }));
      setToast(`Found ${room.loot.name}${heal ? ` (+${heal} HP)` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.room, phase]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const exitFor = (dir: Dir) => room.exits.find((e) => e.dir === dir);

  const move = (exit: Exit) => {
    setNavInput('');
    setSave((s) => ({ ...s, room: exit.to }));
    setPhase('explore');
  };

  const tryGo = () => {
    const ch = decode(navInput).toUpperCase();
    setNavInput('');
    const exit = ch ? exitFor(ch as Dir) : undefined;
    if (!exit) {
      setNavShake(true);
      playWrong();
      setTimeout(() => setNavShake(false), 400);
      return;
    }
    const key = `${room.id}>${exit.dir}`;
    if (exit.locked && !save.unlocked.includes(key)) {
      setPendingExit(exit);
      setPhase('door');
      return;
    }
    move(exit);
  };

  const onKey = (a: KeyAction) => {
    if (a === 'delete') return setNavInput((s) => s.slice(0, -1));
    setNavInput((s) => s + (a === 'dot' ? '.' : '-'));
  };

  // ---- combat outcome ----
  const onDuelResult = (win: boolean, remainingHp: number) => {
    if (win) {
      const isBoss = room.boss;
      setSave((s) => ({ ...s, cleared: [...s.cleared, room.id], hp: Math.max(1, remainingHp) }));
      if (isBoss) setPhase('win');
      else { setToast('The way is clear.'); setPhase('explore'); }
    } else {
      setSave((s) => ({ ...s, room: START_ROOM, hp: MAX_HP }));
      setPhase('lose');
    }
  };

  const restart = () => {
    // Functional update so a preceding setSave(completed:true) is preserved.
    setSave((s) => ({ room: START_ROOM, hp: MAX_HP, cleared: [], unlocked: [], inventory: [], completed: s.completed }));
    setPhase('explore');
  };

  // ================= render =================
  if (phase === 'win') {
    return (
      <div className="cave-end">
        <div className="cave-end-art">🏆</div>
        <h2>The cave falls silent</h2>
        <p>You silenced The Static. The mountain’s signals are free — and your fist is sharp.</p>
        <div className="completion-actions">
          <button className="btn primary" onClick={() => { setSave((s) => ({ ...s, completed: true })); restart(); }}>New expedition</button>
          <button className="btn" onClick={() => setMode(null)}>Menu</button>
        </div>
      </div>
    );
  }

  if (phase === 'lose') {
    return (
      <div className="cave-end">
        <div className="cave-end-art">💀</div>
        <h2>The dark takes you</h2>
        <p>Your signal fades to noise… but the echoes carry you back to the mouth of the cave.</p>
        <div className="completion-actions">
          <button className="btn primary" onClick={() => setPhase('explore')}>Rise again</button>
          <button className="btn" onClick={() => setMode(null)}>Menu</button>
        </div>
      </div>
    );
  }

  if (phase === 'fight' && room.monster) {
    return (
      <div className="cave">
        <SceneHeader room={room} hp={save.hp} inventory={save.inventory} cleared={save.cleared.length} hideHp />
        <CaveDuel monster={MONSTERS[room.monster]} hp={save.hp} onResult={onDuelResult} />
      </div>
    );
  }

  if (phase === 'door' && pendingExit?.locked) {
    return (
      <div className="cave">
        <SceneHeader room={room} hp={save.hp} inventory={save.inventory} cleared={save.cleared.length} />
        <div className="duel-cue">🔐 {pendingExit.locked.clue}</div>
        <QsoSend
          key="door"
          text={pendingExit.locked.code}
          onDone={() => {
            const key = `${room.id}>${pendingExit.dir}`;
            setSave((s) => ({ ...s, unlocked: [...s.unlocked, key] }));
            setToast('The gate grinds open.');
            move(pendingExit);
          }}
        />
        <button className="rc-btn" onClick={() => setPhase('explore')}>← Back away</button>
      </div>
    );
  }

  // explore
  const decoded = decode(navInput);
  return (
    <div className="cave">
      <SceneHeader room={room} hp={save.hp} inventory={save.inventory} cleared={save.cleared.length} />
      <p className="cave-narration">{room.narration}</p>
      {toast && <div className="cave-toast">{toast}</div>}

      {room.exits.length === 0 ? (
        <div className="cave-deadend">A dead end. Nothing stirs.</div>
      ) : (
        <div className="cave-nav">
          <div className="cave-exits">
            {room.exits.map((e) => (
              <div key={e.dir} className="cave-exit">
                <span className="ce-arrow">{DIR_ARROW[e.dir]}</span>
                <span className="ce-dir">{DIR_NAME[e.dir]}</span>
                <Pattern pattern={patternForChar(e.dir)} size={12} />
                {e.locked && !save.unlocked.includes(`${room.id}>${e.dir}`) && <span className="ce-lock">🔒</span>}
              </div>
            ))}
          </div>

          <div className="cave-keyhint">
            {settings.singleKey ? 'Key a direction (short = dit, long = dah), then GO' : 'Key a direction, then GO'}
          </div>
          <div className={`cave-keyed${navShake ? ' shake' : ''}`}>
            {navInput ? <Pattern pattern={navInput} size={16} /> : <span className="qso-keyed-ph">key it…</span>}
            <span className="cave-decoded">{decoded ? decoded.toUpperCase() : '·'}</span>
          </div>
          {settings.singleKey ? (
            <StraightKey
              onSymbol={(s) => onKey(s === 'dot' ? 'dot' : 'dash')}
              onDelete={() => onKey('delete')}
              wpm={settings.sendWpm}
              freq={settings.tone}
              volume={settings.volume}
            />
          ) : (
            <Keypad onAction={onKey} scanIndex={null} oneSwitch={false} />
          )}
          <button className="btn primary cave-go" onClick={tryGo} disabled={!navInput}>GO ▸</button>
        </div>
      )}
    </div>
  );
}

function SceneHeader({
  room, hp, inventory, cleared, hideHp,
}: { room: { title: string; art: string }; hp: number; inventory: string[]; cleared: number; hideHp?: boolean }) {
  return (
    <div className="cave-scene">
      <div className="cave-art">{room.art}</div>
      <div className="cave-scene-info">
        <h2 className="cave-title">{room.title}</h2>
        <div className="cave-status">
          {!hideHp && <span className="cave-hp">{'❤️'.repeat(Math.max(0, hp))}{'🤍'.repeat(Math.max(0, MAX_HP - hp))}</span>}
          <span className="cave-depth">{cleared}/{ROOM_COUNT - 1} cleared</span>
        </div>
        {inventory.length > 0 && (
          <div className="cave-inv">{inventory.map((i) => <span key={i} className="inv-chip">🔹 {i}</span>)}</div>
        )}
      </div>
    </div>
  );
}

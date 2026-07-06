import { useEffect, useRef, useState } from 'react';
import type { Monster } from '../data/cave';
import { useApp } from '../state/AppContext';
import { playCorrect, playWrong } from '../lib/audio';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { QsoSend } from './QsoSend';
import { QsoReceive } from './QsoReceive';

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, '');
const hearts = (filled: number, total: number) => '❤️'.repeat(filled) + '🤍'.repeat(Math.max(0, total - filled));

type Phase = 'strike' | 'defend' | 'banish';

// A Morse duel: STRIKE by keying the monster's weak rune, then DEFEND by copying
// the rune it hurls back. A boss adds a final incantation to banish it.
export function CaveDuel({
  monster,
  hp,
  onResult,
}: {
  monster: Monster;
  hp: number;
  onResult: (win: boolean, remainingHp: number) => void;
}) {
  const { settings } = useApp();
  const { play } = useMorsePlayer();

  const [monHp, setMonHp] = useState(monster.hp);
  const [playerHp, setPlayerHp] = useState(hp);
  const [phase, setPhase] = useState<Phase>('strike');
  const [round, setRound] = useState(0); // remounts sub-challenges
  const [attack, setAttack] = useState(monster.attacks[0]);
  const [copy, setCopy] = useState('');
  const [defendResult, setDefendResult] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [log, setLog] = useState<string[]>([`A ${monster.name} appears!`]);

  const pickIdx = useRef(0);
  const push = (line: string) => setLog((l) => [...l.slice(-4), line]);

  // Play the incoming rune when a defend round begins.
  useEffect(() => {
    if (phase !== 'defend') return;
    const t = setTimeout(() => play(attack), 450);
    return () => clearTimeout(t);
  }, [phase, attack, round, play]);

  const onStrike = () => {
    const left = monHp - 1;
    setMonHp(left);
    if (left <= 0) {
      if (monster.boss && monster.incantation) {
        push('It reels! Speak the banishing rune…');
        setPhase('banish');
      } else {
        if (settings.sound) playCorrect();
        push(`The ${monster.name} shatters into echoes!`);
        setTimeout(() => onResult(true, playerHp), 700);
      }
      return;
    }
    push('A clean hit!');
    // next attack
    pickIdx.current = (pickIdx.current + 1) % monster.attacks.length;
    setAttack(monster.attacks[pickIdx.current]);
    setCopy('');
    setDefendResult('idle');
    setRound((r) => r + 1);
    setPhase('defend');
  };

  const submitCopy = () => {
    if (!norm(copy)) return;
    if (norm(copy) === norm(attack)) {
      setDefendResult('ok');
      if (settings.sound) playCorrect();
      push('You parry the blow!');
      setTimeout(() => {
        setCopy('');
        setDefendResult('idle');
        setRound((r) => r + 1);
        setPhase('strike');
      }, 650);
    } else {
      setDefendResult('bad');
      if (settings.sound) playWrong();
      const left = playerHp - 1;
      setPlayerHp(left);
      push(`The blow lands — it was “${attack}”. (−1)`);
      if (left <= 0) {
        setTimeout(() => onResult(false, 0), 800);
        return;
      }
      setTimeout(() => {
        setCopy('');
        setDefendResult('idle');
        setRound((r) => r + 1);
        setPhase('strike');
      }, 900);
    }
  };

  return (
    <div className="cave-duel">
      <div className="duel-foes">
        <div className="foe monster">
          <span className="foe-art">{monster.art}</span>
          <span className="foe-name">{monster.name}</span>
          <span className="foe-hp">{hearts(Math.max(0, monHp), monster.hp)}</span>
        </div>
        <div className="foe you">
          <span className="foe-art">🧝</span>
          <span className="foe-name">You</span>
          <span className="foe-hp">{hearts(Math.max(0, playerHp), hp)}</span>
        </div>
      </div>

      <div className="cave-log duel-log">
        {log.map((l, i) => (
          <div key={i} className={i === log.length - 1 ? 'log-now' : ''}>{l}</div>
        ))}
      </div>

      {phase === 'strike' && (
        <div className="duel-phase">
          <div className="duel-cue strike-cue">⚔️ Strike its weak rune — key <b>{monster.weakness}</b></div>
          <QsoSend key={`strike-${round}`} text={monster.weakness} onDone={onStrike} />
        </div>
      )}

      {phase === 'defend' && (
        <div className={`duel-phase${defendResult === 'bad' ? ' shake' : ''}`}>
          <div className="duel-cue defend-cue">🛡️ It strikes! Copy the rune to parry.</div>
          <button className="listen-btn" onClick={() => play(attack)}>
            <span className="listen-icon" aria-hidden="true">🔊</span>
            <span>Hear the blow</span>
          </button>
          {defendResult === 'bad' && <div className="qso-reveal-line">It was: <b>{attack}</b></div>}
          <form
            className="word-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              submitCopy();
            }}
          >
            <input
              className="word-input qso-input"
              value={copy}
              onChange={(e) => {
                setCopy(e.target.value.toUpperCase());
                setDefendResult('idle');
              }}
              placeholder="copy here…"
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label="Type what you copied"
            />
            <button type="submit" className="btn primary" disabled={!norm(copy)}>Parry</button>
          </form>
          <div className="receive-controls">
            <button type="button" className="rc-btn" onClick={() => play(attack)}>↻ Replay</button>
            <button type="button" className="rc-btn" onClick={() => play(attack, 8)}>🐢 Slower</button>
          </div>
        </div>
      )}

      {phase === 'banish' && monster.incantation && (
        <div className="duel-phase">
          <div className="duel-cue banish-cue">✨ Banish it — copy the final incantation!</div>
          <QsoReceive
            key={`banish-${round}`}
            text={monster.incantation}
            onDone={() => {
              push(`The ${monster.name} dissolves into silence.`);
              setTimeout(() => onResult(true, playerHp), 600);
            }}
          />
        </div>
      )}
    </div>
  );
}

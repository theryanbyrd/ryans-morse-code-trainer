import { useCallback, useEffect, useRef, useState } from 'react';
import { PATTERN_TO_CHAR_FULL, TEACHING_ORDER } from '../data/morse';
import { playCorrect, playDash, playDot, playWrong } from '../lib/audio';
import { useApp } from '../state/AppContext';
import { DotIcon, DashIcon } from './Icons';

// Signal Squadron — a Morse "ZType": invaders drift down wearing a character.
// Key that character's code and FIRE to shoot it. Clear the wave, don't let one
// reach the bottom. Reinforces sending under gentle time pressure.

const W = 360;
const H = 560;
const SHIP_Y = 512;
const BOTTOM = 496; // an enemy past this costs a life

const POOL = [...TEACHING_ORDER, '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const waveChars = (wave: number) => POOL.slice(0, Math.min(POOL.length, 6 + (wave - 1) * 2));

const COLORS = ['#ff5b6a', '#ff9f43', '#ffd166', '#9d7bff', '#16c79a'];

const HI_KEY = 'rmct.squadronHigh';

type Enemy = { id: number; x: number; y: number; vy: number; ch: string; color: string; targeted: boolean };
type Laser = { x: number; y: number; tx: number; ty: number; id: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Star = { x: number; y: number; z: number };

type Game = {
  enemies: Enemy[];
  lasers: Laser[];
  particles: Particle[];
  stars: Star[];
  wave: number;
  lives: number;
  score: number;
  combo: number;
  spawnLeft: number;
  spawnTimer: number;
  shipX: number;
  input: string;
  status: 'ready' | 'playing' | 'over';
  nextId: number;
  last: number;
};

function fresh(): Game {
  const stars: Star[] = [];
  for (let i = 0; i < 60; i++) stars.push({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1) });
  return {
    enemies: [], lasers: [], particles: [], stars,
    wave: 1, lives: 3, score: 0, combo: 0,
    spawnLeft: 7, spawnTimer: 600, shipX: W / 2, input: '', status: 'ready', nextId: 1, last: 0,
  };
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function SignalSquadron() {
  const { setMode } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<Game>(fresh());
  const raf = useRef(0);

  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [input, setInput] = useState('');
  const [high, setHigh] = useState(() => Number(localStorage.getItem(HI_KEY) || 0));

  const spawn = () => {
    const st = g.current;
    const chars = waveChars(st.wave);
    st.enemies.push({
      id: st.nextId++,
      x: rand(28, W - 28),
      y: -18,
      vy: 0.024 + st.wave * 0.005,
      ch: chars[Math.floor(Math.random() * chars.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      targeted: false,
    });
  };

  const fire = useCallback(() => {
    const st = g.current;
    if (st.status !== 'playing') return;
    const ch = PATTERN_TO_CHAR_FULL[st.input];
    st.input = '';
    setInput('');
    if (!ch) {
      st.combo = 0;
      return;
    }
    // nearest matching (lowest on screen), not already blowing up
    let target: Enemy | null = null;
    for (const e of st.enemies) {
      if (e.ch === ch.toLowerCase() && !e.targeted && (!target || e.y > target.y)) target = e;
    }
    if (!target) {
      st.combo = 0;
      playWrong();
      return;
    }
    target.targeted = true;
    st.lasers.push({ x: st.shipX, y: SHIP_Y, tx: target.x, ty: target.y, id: target.id });
    playCorrect();
  }, []);

  const key = useCallback((sym: '.' | '-') => {
    const st = g.current;
    if (st.status !== 'playing') return;
    st.input += sym;
    setInput(st.input);
    (sym === '.' ? playDot : playDash)();
  }, []);

  const del = useCallback(() => {
    const st = g.current;
    st.input = st.input.slice(0, -1);
    setInput(st.input);
  }, []);

  const startGame = useCallback(() => {
    g.current = fresh();
    g.current.status = 'playing';
    setStatus('playing');
    setScore(0);
    setLives(3);
    setWave(1);
    setInput('');
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'j' || e.key === '.') key('.');
      else if (k === 'k' || e.key === '-') key('-');
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        fire();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        del();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, fire, del]);

  // game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (t: number) => {
      const st = g.current;
      const dt = st.last ? Math.min(t - st.last, 50) : 16;
      st.last = t;
      if (st.status === 'playing') update(st, dt);
      draw(ctx, st);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (st: Game, dt: number) => {
    // stars
    for (const s of st.stars) {
      s.y += dt * 0.02 * s.z;
      if (s.y > H) { s.y = 0; s.x = rand(0, W); }
    }
    // spawn
    if (st.spawnLeft > 0) {
      st.spawnTimer -= dt;
      if (st.spawnTimer <= 0) {
        spawn();
        st.spawnLeft--;
        st.spawnTimer = Math.max(500, 1500 - st.wave * 80);
      }
    }
    // enemies
    for (const e of st.enemies) e.y += e.vy * dt;
    for (let i = st.enemies.length - 1; i >= 0; i--) {
      if (st.enemies[i].y >= BOTTOM) {
        st.enemies.splice(i, 1);
        st.lives--;
        setLives(st.lives);
        boom(st, W / 2, SHIP_Y, '#ff5b6a');
        playWrong();
        if (st.lives <= 0) {
          st.status = 'over';
          setStatus('over');
          if (st.score > Number(localStorage.getItem(HI_KEY) || 0)) {
            localStorage.setItem(HI_KEY, String(st.score));
            setHigh(st.score);
          }
        }
      }
    }
    // lasers
    for (let i = st.lasers.length - 1; i >= 0; i--) {
      const l = st.lasers[i];
      const target = st.enemies.find((e) => e.id === l.id);
      if (!target) { st.lasers.splice(i, 1); continue; }
      l.tx = target.x; l.ty = target.y;
      const dx = l.tx - l.x, dy = l.ty - l.y;
      const d = Math.hypot(dx, dy);
      const step = dt * 1.1;
      if (d <= step) {
        // hit
        boom(st, target.x, target.y, target.color);
        st.enemies = st.enemies.filter((e) => e.id !== target.id);
        st.lasers.splice(i, 1);
        st.combo++;
        st.score += 10 + Math.min(st.combo, 10) * 2;
        setScore(st.score);
      } else {
        l.x += (dx / d) * step;
        l.y += (dy / d) * step;
      }
    }
    // particles
    for (let i = st.particles.length - 1; i >= 0; i--) {
      const p = st.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) st.particles.splice(i, 1);
    }
    // wave clear
    if (st.spawnLeft === 0 && st.enemies.length === 0 && st.lasers.length === 0) {
      st.wave++;
      setWave(st.wave);
      st.spawnLeft = 7 + st.wave * 2;
      st.spawnTimer = 400;
    }
    // expose for debugging in dev only
    if (import.meta.env.DEV) (window as unknown as { __sq?: Game }).__sq = st;
  };

  const boom = (st: Game, x: number, y: number, color: string) => {
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(0.03, 0.16);
      st.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(200, 500), color });
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, st: Game) => {
    ctx.clearRect(0, 0, W, H);
    // stars
    for (const s of st.stars) {
      ctx.globalAlpha = s.z * 0.8;
      ctx.fillStyle = '#cdd3ff';
      ctx.fillRect(s.x, s.y, s.z * 2, s.z * 2);
    }
    ctx.globalAlpha = 1;
    // bottom danger line
    ctx.strokeStyle = 'rgba(255,91,106,0.35)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(0, BOTTOM); ctx.lineTo(W, BOTTOM); ctx.stroke();
    ctx.setLineDash([]);
    // enemies
    for (const e of st.enemies) drawEnemy(ctx, e);
    // lasers
    for (const l of st.lasers) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(st.shipX, SHIP_Y); ctx.lineTo(l.x, l.y); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // particles
    for (const p of st.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 500);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    // ship
    ctx.fillStyle = '#8ea2ff';
    ctx.beginPath();
    ctx.moveTo(st.shipX, SHIP_Y - 14);
    ctx.lineTo(st.shipX - 12, SHIP_Y + 8);
    ctx.lineTo(st.shipX + 12, SHIP_Y + 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(st.shipX - 3, SHIP_Y - 2, 6, 8);
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    // blocky invader body
    roundRect(ctx, e.x - 15, e.y - 10, 30, 20, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - 8, e.y - 3, 4, 4);
    ctx.fillRect(e.x + 4, e.y - 3, 4, 4);
    // character label
    ctx.fillStyle = '#0e1030';
    ctx.font = 'bold 15px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.ch.toUpperCase(), e.x, e.y + 24);
  };

  const preview = input ? PATTERN_TO_CHAR_FULL[input]?.toUpperCase() ?? '?' : '';

  return (
    <div className="squadron">
      <div className="sq-hud">
        <span className="sq-score">{score}</span>
        <span className="sq-wave">Wave {wave}</span>
        <span className="sq-lives">{'❤️'.repeat(Math.max(0, lives))}</span>
      </div>

      <div className="sq-stage">
        <canvas ref={canvasRef} width={W} height={H} className="sq-canvas" />
        {status === 'ready' && (
          <div className="sq-overlay">
            <h2>Signal Squadron</h2>
            <p>Invaders drop wearing a letter. Key its Morse and <b>FIRE</b> to blast it. Don't let one reach the line!</p>
            <button className="btn primary" onClick={startGame}>▶ Launch</button>
          </div>
        )}
        {status === 'over' && (
          <div className="sq-overlay">
            <h2>Game over</h2>
            <p>Score <b>{score}</b> · Best <b>{high}</b></p>
            <div className="completion-actions">
              <button className="btn primary" onClick={startGame}>Play again</button>
              <button className="btn" onClick={() => setMode(null)}>Menu</button>
            </div>
          </div>
        )}
      </div>

      <div className="sq-decode">
        <span className="sq-input">{input || '—'}</span>
        <span className="sq-preview">{preview}</span>
      </div>

      <div className="sq-keys">
        <button className="key big" onClick={() => key('.')} aria-label="Dot"><span className="key-glyph"><DotIcon /></span></button>
        <button className="key big" onClick={() => key('-')} aria-label="Dash"><span className="key-glyph"><DashIcon /></span></button>
        <button className="key sq-fire" onClick={fire} aria-label="Fire">🔥 FIRE</button>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}

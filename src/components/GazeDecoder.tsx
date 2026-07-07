import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebGazer } from 'webgazer';
import { PATTERN_TO_CHAR_FULL } from '../data/morse';
import { useApp } from '../state/AppContext';
import { playDot, playDash } from '../lib/audio';
import { Pattern } from './Pattern';

// Gaze decoder — key Morse with your eyes. Look LEFT for a dit, RIGHT for a dah;
// rest in the middle to let a character land, rest longer for a space.
//
// Eye tracking is WebGazer.js (lazy-loaded, webcam, all on-device — no video ever
// leaves the browser). Because it needs a real camera + calibration, the tuning
// (dwell time, zone width) is exposed live and will want adjusting per person.

type Phase = 'intro' | 'loading' | 'calibrate' | 'decode' | 'error';
type Zone = 'dit' | 'dah' | 'rest';

const CALIB_POINTS = [
  [10, 12], [50, 12], [90, 12],
  [10, 50], [50, 50], [90, 50],
  [10, 88], [50, 88], [90, 88],
]; // % of viewport
const CLICKS_PER_POINT = 5;

// A tiny moving average tames WebGazer's jitter before we bucket into zones.
class Smoother {
  buf: number[] = [];
  n: number;
  constructor(n = 6) { this.n = n; }
  push(x: number) { this.buf.push(x); if (this.buf.length > this.n) this.buf.shift(); return this.value(); }
  value() { return this.buf.length ? this.buf.reduce((a, b) => a + b, 0) / this.buf.length : null; }
  reset() { this.buf = []; }
}

export function GazeDecoder() {
  const { setMode } = useApp();

  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState('');
  const [clicks, setClicks] = useState<number[]>(Array(CALIB_POINTS.length).fill(0));

  // live decode display
  const [zone, setZone] = useState<Zone>('rest');
  const [buffer, setBuffer] = useState('');
  const [text, setText] = useState('');
  const [dwellPct, setDwellPct] = useState(0);

  // tuning
  const [dwellMs, setDwellMs] = useState(500);
  const [zoneGap, setZoneGap] = useState(0.15); // half-width of the neutral center band
  const [mirror, setMirror] = useState(false);

  const wgRef = useRef<WebGazer | null>(null);
  const gazeX = useRef<number | null>(null);
  const smoother = useRef(new Smoother());
  const rafRef = useRef(0);

  // dwell/commit machine (kept in a ref so the rAF loop is cheap)
  const m = useRef({ zone: 'rest' as Zone, enteredAt: 0, emitted: false, buffer: '', restStart: 0, committedAt: 0, spaced: true });
  const tuning = useRef({ dwellMs, zoneGap, mirror });
  tuning.current = { dwellMs, zoneGap, mirror };

  const commitMs = () => Math.max(900, dwellMs * 1.8);
  const wordMs = () => commitMs() * 2;

  const zoneOf = (x: number): Zone => {
    const w = window.innerWidth || 1;
    const f = x / w;
    const { zoneGap: g, mirror: mir } = tuning.current;
    const left = f < 0.5 - g;
    const right = f > 0.5 + g;
    if (left) return mir ? 'dah' : 'dit';
    if (right) return mir ? 'dit' : 'dah';
    return 'rest';
  };

  const appendChar = useCallback((ch: string) => {
    setText((t) => (t + ch).slice(-80));
  }, []);

  // the decode loop — reads gazeX (from WebGazer or the dev simulator) and runs
  // the dwell→emit→commit state machine.
  const startLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const loop = (t: number) => {
      const x = gazeX.current;
      const st = m.current;
      if (x != null) {
        const z = zoneOf(x);
        if (z !== st.zone) { st.zone = z; st.enteredAt = t; st.emitted = false; setZone(z); }
        if (z === 'dit' || z === 'dah') {
          st.restStart = 0;
          const held = t - st.enteredAt;
          setDwellPct(Math.min(1, Math.round((held / tuning.current.dwellMs) * 12) / 12));
          if (!st.emitted && held >= tuning.current.dwellMs) {
            st.buffer += z === 'dit' ? '.' : '-';
            st.emitted = true;
            st.committedAt = 0;
            st.spaced = false;
            setBuffer(st.buffer);
            (z === 'dit' ? playDot : playDash)();
          }
        } else {
          // resting in the neutral band
          if (dwellPctRef.current !== 0) setDwellPct(0);
          if (st.buffer) {
            if (!st.restStart) st.restStart = t;
            else if (t - st.restStart >= commitMsRef.current) {
              const ch = PATTERN_TO_CHAR_FULL[st.buffer]?.toUpperCase() ?? '□';
              appendChar(ch);
              st.buffer = '';
              st.restStart = 0;
              st.committedAt = t;
              st.spaced = false;
              setBuffer('');
            }
          } else if (st.committedAt && !st.spaced && t - st.committedAt >= wordMsRef.current) {
            appendChar(' ');
            st.spaced = true;
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [appendChar]);

  // refs the loop reads without re-creating itself
  const dwellPctRef = useRef(0); dwellPctRef.current = dwellPct;
  const commitMsRef = useRef(commitMs()); commitMsRef.current = commitMs();
  const wordMsRef = useRef(wordMs()); wordMsRef.current = wordMs();

  // ---- WebGazer lifecycle ----
  const begin = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      const mod = await import('webgazer');
      const wg = mod.default;
      wgRef.current = wg;
      wg.saveDataAcrossSessions(false); // privacy: don't persist the model
      wg.setRegression('ridge');
      wg.setGazeListener((data) => {
        if (data) gazeX.current = smoother.current.push(data.x);
      });
      await wg.begin();
      wg.showVideoPreview(true);
      wg.showPredictionPoints(true);
      wg.showFaceOverlay(true);
      wg.showFaceFeedbackBox(true);
      wg.applyKalmanFilter(true);
      setClicks(Array(CALIB_POINTS.length).fill(0));
      setPhase('calibrate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the camera.');
      setPhase('error');
    }
  }, []);

  const enterDecode = useCallback(() => {
    const wg = wgRef.current;
    if (wg) {
      wg.showVideoPreview(false);
      wg.showPredictionPoints(false);
      wg.showFaceOverlay(false);
      wg.showFaceFeedbackBox(false);
    }
    m.current = { zone: 'rest', enteredAt: 0, emitted: false, buffer: '', restStart: 0, committedAt: 0, spaced: true };
    setBuffer(''); setZone('rest'); setDwellPct(0);
    setPhase('decode');
    startLoop();
  }, [startLoop]);

  const clickPoint = (i: number) => {
    setClicks((c) => {
      const next = [...c];
      next[i] = Math.min(CLICKS_PER_POINT, next[i] + 1);
      return next;
    });
  };

  const recalibrate = () => {
    cancelAnimationFrame(rafRef.current);
    const wg = wgRef.current;
    if (wg) {
      wg.showVideoPreview(true);
      wg.showPredictionPoints(true);
      wg.showFaceOverlay(true);
      wg.showFaceFeedbackBox(true);
    }
    setClicks(Array(CALIB_POINTS.length).fill(0));
    setPhase('calibrate');
  };

  const leave = () => setMode(null);

  // teardown: release the camera + stop the loop no matter how we exit
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { wgRef.current?.clearGazeListener(); wgRef.current?.end(); } catch { /* ignore */ }
    };
  }, []);

  const calibDone = clicks.every((c) => c >= CLICKS_PER_POINT);

  // dev-only: drive the decode machine without a camera to verify the logic
  const simulate = useCallback(() => {
    gazeX.current = null;
    smoother.current.reset();
    m.current = { zone: 'rest', enteredAt: 0, emitted: false, buffer: '', restStart: 0, committedAt: 0, spaced: true };
    setBuffer(''); setZone('rest'); setText(''); setDwellPct(0);
    setPhase('decode');
    startLoop();
    (window as unknown as { __gaze?: (x: number | null) => void }).__gaze = (x) => { gazeX.current = x; };
  }, [startLoop]);

  // ================= render =================
  if (phase === 'intro' || phase === 'loading' || phase === 'error') {
    return (
      <div className="gaze-intro">
        <div className="gaze-eye">👁️</div>
        <h2>Gaze input</h2>
        <p className="gaze-lead">Key Morse with your eyes. Look <b className="dit-word">left for a dit</b>, <b className="dah-word">right for a dah</b>, and rest in the middle to finish a letter.</p>
        <div className="gaze-privacy">
          🔒 Uses your webcam for eye tracking. Everything runs <b>on your device</b> — no video is recorded or ever leaves this browser. The camera is released when you leave.
        </div>
        {phase === 'error' && (
          <div className="gaze-error">Couldn’t start the camera: {error}. Check camera permissions and lighting, then try again.</div>
        )}
        <button className="btn primary gaze-start" onClick={begin} disabled={phase === 'loading'}>
          {phase === 'loading' ? 'Starting camera…' : '📷 Enable camera & calibrate'}
        </button>
        {import.meta.env.DEV && (
          <button className="rc-btn" onClick={simulate}>▶ Simulate without camera (dev)</button>
        )}
        <button className="rc-btn" onClick={leave}>← Back to menu</button>
      </div>
    );
  }

  if (phase === 'calibrate') {
    return (
      <div className="gaze-calibrate">
        <div className="gaze-calib-hint">
          <b>Calibrate:</b> look at each dot and click it {CLICKS_PER_POINT}× until it turns green. Keep your head still.
        </div>
        {CALIB_POINTS.map(([x, y], i) => {
          const done = clicks[i] >= CLICKS_PER_POINT;
          return (
            <button
              key={i}
              className={`gaze-dot${done ? ' done' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, opacity: 0.35 + 0.65 * (clicks[i] / CLICKS_PER_POINT) }}
              onClick={() => clickPoint(i)}
              aria-label={`Calibration point ${i + 1}`}
            >
              {done ? '✓' : CLICKS_PER_POINT - clicks[i]}
            </button>
          );
        })}
        <div className="gaze-calib-actions">
          <button className="btn primary" onClick={enterDecode} disabled={!calibDone}>
            {calibDone ? 'Start keying →' : 'Click every dot to continue'}
          </button>
          <button className="rc-btn" onClick={leave}>← Exit</button>
        </div>
      </div>
    );
  }

  // decode
  const preview = buffer ? (PATTERN_TO_CHAR_FULL[buffer]?.toUpperCase() ?? '□') : '';
  return (
    <div className="gaze-decode">
      <div className="gaze-split">
        <div className={`gaze-zone dit${zone === 'dit' ? ' active' : ''}`}>
          <span className="gaze-zone-label">DIT</span>
          <span className="gaze-zone-sub">look left</span>
          {zone === 'dit' && <span className="dwell-ring" style={{ ['--pct' as string]: dwellPct }} />}
        </div>
        <div className={`gaze-zone rest${zone === 'rest' ? ' active' : ''}`}>
          <span className="gaze-rest-hint">rest here<br />to finish a letter</span>
        </div>
        <div className={`gaze-zone dah${zone === 'dah' ? ' active' : ''}`}>
          <span className="gaze-zone-label">DAH</span>
          <span className="gaze-zone-sub">look right</span>
          {zone === 'dah' && <span className="dwell-ring" style={{ ['--pct' as string]: dwellPct }} />}
        </div>
      </div>

      <div className="gaze-readout">
        <div className="gaze-buffer">
          {buffer ? <Pattern pattern={buffer} size={16} /> : <span className="qso-keyed-ph">…</span>}
          {preview && <span className="gaze-preview">{preview}</span>}
        </div>
        <div className="gaze-text">{text || <span className="gaze-text-ph">decoded text appears here…</span>}</div>
      </div>

      <div className="gaze-controls">
        <label className="gaze-slider">Dwell {dwellMs}ms
          <input type="range" min={300} max={900} step={50} value={dwellMs} onChange={(e) => setDwellMs(+e.target.value)} />
        </label>
        <label className="gaze-slider">Center width {Math.round(zoneGap * 200)}%
          <input type="range" min={0.05} max={0.3} step={0.01} value={zoneGap} onChange={(e) => setZoneGap(+e.target.value)} />
        </label>
        <label className="gaze-check">
          <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Mirror
        </label>
      </div>
      <div className="gaze-buttons">
        <button className="rc-btn" onClick={() => { m.current.buffer = ''; setBuffer(''); }}>⌫ Clear letter</button>
        <button className="rc-btn" onClick={() => setText('')}>Clear text</button>
        <button className="rc-btn" onClick={recalibrate}>🎯 Recalibrate</button>
        <button className="rc-btn" onClick={leave}>✕ Done</button>
      </div>
    </div>
  );
}

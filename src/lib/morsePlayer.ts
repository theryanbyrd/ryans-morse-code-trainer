// Web Audio Morse player for Receive mode. Unlike Send (which plays fixed
// dot/dash recordings), receiving needs adjustable speed, so we synthesize a
// clean sidetone with correct Morse unit timing:
//   dit = 1 unit, dah = 3 units, intra-character gap = 1, inter-character = 3,
//   word gap = 7. Farnsworth stretches the GAPS (not the elements) so beginners
//   hear crisp characters with extra breathing room.

import { MORSE_FULL as MORSE } from '../data/morse';

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Unlock/resume the audio context from a user gesture (call on mode entry). */
export function unlockMorse(): void {
  audioCtx();
}

// ----- Straight-key sidetone (held while the key is down) --------------------
let sidetoneOsc: OscillatorNode | null = null;
let sidetoneGain: GainNode | null = null;

/** Start the continuous sidetone (key pressed). */
export function keyDown(freq = 640, volume = 0.22): void {
  const ac = audioCtx();
  if (!ac) return;
  keyUp();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.006);
  osc.connect(g).connect(ac.destination);
  osc.start();
  sidetoneOsc = osc;
  sidetoneGain = g;
}

/** Stop the sidetone (key released). */
export function keyUp(): void {
  if (!sidetoneOsc) return;
  const ac = audioCtx();
  try {
    if (ac && sidetoneGain) {
      sidetoneGain.gain.setValueAtTime(sidetoneGain.gain.value, ac.currentTime);
      sidetoneGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.008);
    }
    sidetoneOsc.stop(ac ? ac.currentTime + 0.02 : 0);
  } catch {
    /* already stopped */
  }
  sidetoneOsc = null;
  sidetoneGain = null;
}

export type PlayOptions = {
  wpm: number; // character speed
  farnsworth: boolean; // stretch inter-char / word gaps for beginners
  freq?: number; // sidetone frequency
  volume?: number;
  onFlash?: (on: boolean) => void; // drive an on-screen lamp in sync
  haptic?: boolean; // vibrate the device in time with the tones
};

export type Playback = { stop: () => void; durationMs: number };

/**
 * Play text (letters a–z and spaces) as Morse. Returns a handle whose stop()
 * cancels any not-yet-finished tones.
 */
export function playMorse(text: string, opts: PlayOptions): Playback {
  const ac = audioCtx();
  const freq = opts.freq ?? 640;
  const volume = opts.volume ?? 0.22;

  // Element timing runs at the character WPM; gaps run at the (slower)
  // Farnsworth WPM when enabled so characters stay crisp but spaced out.
  const unit = 1.2 / opts.wpm; // seconds per dit at character speed
  const effWpm = opts.farnsworth ? Math.min(opts.wpm, 7) : opts.wpm;
  const gapUnit = 1.2 / effWpm;

  if (!ac) return { stop: () => {}, durationMs: 0 };

  const oscillators: OscillatorNode[] = [];
  const timers: number[] = [];
  const vibe: number[] = []; // [on, off, on, off, …] for navigator.vibrate
  const start = ac.currentTime + 0.06;
  let t = start;

  const scheduleFlash = (onSec: number, durSec: number) => {
    if (!opts.onFlash) return;
    const onMs = (onSec - start) * 1000;
    timers.push(window.setTimeout(() => opts.onFlash?.(true), Math.max(0, onMs)));
    timers.push(window.setTimeout(() => opts.onFlash?.(false), Math.max(0, onMs + durSec * 1000)));
  };

  const beep = (durationSec: number) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const ramp = 0.006;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + ramp);
    g.gain.setValueAtTime(volume, t + durationSec - ramp);
    g.gain.linearRampToValueAtTime(0, t + durationSec);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + durationSec + 0.01);
    oscillators.push(osc);
    scheduleFlash(t, durationSec);
  };

  const chars = text.toLowerCase().split('');
  chars.forEach((ch, ci) => {
    if (ch === ' ') {
      t += 7 * gapUnit;
      if (vibe.length) vibe.push(Math.round(7 * gapUnit * 1000));
      return;
    }
    const pattern = MORSE[ch];
    if (!pattern) return;
    for (let i = 0; i < pattern.length; i++) {
      const dur = pattern[i] === '-' ? 3 * unit : unit;
      beep(dur);
      vibe.push(Math.round(dur * 1000));
      t += dur;
      if (i < pattern.length - 1) {
        t += unit; // intra-character gap
        vibe.push(Math.round(unit * 1000));
      }
    }
    if (ci < chars.length - 1) {
      t += 3 * gapUnit; // inter-character gap
      vibe.push(Math.round(3 * gapUnit * 1000));
    }
  });

  if (opts.haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(vibe);
    } catch {
      /* ignore */
    }
  }

  const durationMs = Math.max(0, (t - start) * 1000);
  return {
    stop: () => {
      for (const o of oscillators) {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      }
      for (const id of timers) clearTimeout(id);
      opts.onFlash?.(false);
      if (opts.haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(0);
        } catch {
          /* ignore */
        }
      }
    },
    durationMs,
  };
}

// Web Audio Morse player for Receive mode. Unlike Send (which plays fixed
// dot/dash recordings), receiving needs adjustable speed, so we synthesize a
// clean sidetone with correct Morse unit timing:
//   dit = 1 unit, dah = 3 units, intra-character gap = 1, inter-character = 3,
//   word gap = 7. Farnsworth stretches the GAPS (not the elements) so beginners
//   hear crisp characters with extra breathing room.

import { MORSE } from '../data/morse';

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

export type PlayOptions = {
  wpm: number; // character speed
  farnsworth: boolean; // stretch inter-char / word gaps for beginners
  freq?: number; // sidetone frequency
  volume?: number;
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
  let t = ac.currentTime + 0.06;

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
  };

  const chars = text.toLowerCase().split('');
  chars.forEach((ch, ci) => {
    if (ch === ' ') {
      t += 7 * gapUnit;
      return;
    }
    const pattern = MORSE[ch];
    if (!pattern) return;
    for (let i = 0; i < pattern.length; i++) {
      beep(pattern[i] === '-' ? 3 * unit : unit);
      t += pattern[i] === '-' ? 3 * unit : unit;
      if (i < pattern.length - 1) t += unit; // intra-character gap
    }
    if (ci < chars.length - 1) t += 3 * gapUnit; // inter-character gap
  });

  const durationMs = Math.max(0, (t - ac.currentTime) * 1000);
  return {
    stop: () => {
      for (const o of oscillators) {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      }
    },
    durationMs,
  };
}

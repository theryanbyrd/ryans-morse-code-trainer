// Audio: Morse dot/dash tones, correct/wrong cues, and spoken hints.
// Built on the Web Audio API + SpeechSynthesis — no audio files needed.

import { MNEMONICS } from '../data/mnemonics';

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

/** Call once on first user gesture so audio is allowed to play. */
export function unlockAudio(): void {
  audioCtx();
}

function tone(freq: number, durationMs: number, when = 0, type: OscillatorType = 'sine', gain = 0.18) {
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Soft attack/release to avoid clicks.
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.setValueAtTime(gain, t0 + durationMs / 1000 - 0.02);
  g.gain.linearRampToValueAtTime(0, t0 + durationMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

const DOT_MS = 90;
const DASH_MS = 240;
const FREQ = 620;

export function playDot(): void {
  tone(FREQ, DOT_MS);
}

export function playDash(): void {
  tone(FREQ, DASH_MS);
}

/** Play a full dot/dash pattern (e.g. for a hint), with correct spacing. */
export function playPattern(pattern: string): void {
  let when = 0;
  for (const ch of pattern) {
    const dur = ch === '-' ? DASH_MS : DOT_MS;
    tone(FREQ, dur, when);
    when += dur / 1000 + DOT_MS / 1000; // inter-element gap
  }
}

export function playCorrect(): void {
  tone(660, 110, 0);
  tone(880, 160, 0.1);
}

export function playWrong(): void {
  tone(220, 200, 0, 'square', 0.12);
  tone(160, 240, 0.06, 'square', 0.12);
}

// ----- Speech ----------------------------------------------------------------

let voicesReady = false;
function ensureVoices() {
  if (voicesReady || typeof speechSynthesis === 'undefined') return;
  speechSynthesis.getVoices();
  voicesReady = true;
}

export function cancelSpeech(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export function speak(text: string, rate = 1): void {
  if (typeof speechSynthesis === 'undefined') return;
  ensureVoices();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1;
  speechSynthesis.speak(u);
}

/** Spoken hint for a letter: the letter name plus its picture word. */
export function speakLetterHint(letter: string): void {
  const word = MNEMONICS[letter]?.word ?? '';
  speak(`${letter.toUpperCase()}. ${word}`);
}

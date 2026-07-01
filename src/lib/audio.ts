// Audio, using the original Morse Learn mp3 assets under /assets/sounds.
// Dot/dash beeps, spoken correct/wrong feedback, and the "sounds-alike" mnemonic
// clips all come from the original recordings. A tiny bit of SpeechSynthesis is
// kept only for the completion message, which has no recorded asset.

const BASE = '/assets/sounds';

// One cached <audio> per URL; we clone it per play so sounds can overlap.
const cache = new Map<string, HTMLAudioElement>();

function base(url: string): HTMLAudioElement {
  let a = cache.get(url);
  if (!a) {
    a = new Audio(url);
    a.preload = 'auto';
    cache.set(url, a);
  }
  return a;
}

function play(url: string, volume = 1): HTMLAudioElement | null {
  try {
    const a = base(url).cloneNode(true) as HTMLAudioElement;
    a.volume = volume;
    a.currentTime = 0;
    void a.play().catch(() => {});
    return a;
  } catch {
    return null;
  }
}

const url = {
  dot: `${BASE}/dot.mp3`,
  dash: `${BASE}/dash.mp3`,
  correct: `${BASE}/correct.mp3`,
  wrong: `${BASE}/wrong.mp3`,
  letter: (l: string) => `${BASE}/${l.toLowerCase()}.mp3`,
  soundalike: (l: string) => `${BASE}/soundalikes-mw/${l.toLowerCase()}.mp3`,
};

/** Warm up the common clips on the first user gesture so playback is snappy. */
export function unlockAudio(): void {
  [url.dot, url.dash, url.correct, url.wrong].forEach((u) => base(u).load());
}

export function playDot(): void {
  play(url.dot);
}

export function playDash(): void {
  play(url.dash);
}

export function playCorrect(): void {
  play(url.correct);
}

export function playWrong(): void {
  play(url.wrong);
}

/** Play a full dot/dash pattern (for the "Hear the code" button). */
export function playPattern(pattern: string): void {
  let when = 0;
  for (const ch of pattern) {
    const isDash = ch === '-';
    window.setTimeout(() => play(isDash ? url.dash : url.dot), when);
    when += (isDash ? 620 : 230) + 90;
  }
}

// ----- Spoken hints (the recorded "sounds-alike" mnemonics) -------------------

let hintAudio: HTMLAudioElement | null = null;

export function cancelSpeech(): void {
  if (hintAudio) {
    try {
      hintAudio.pause();
    } catch {
      /* ignore */
    }
    hintAudio = null;
  }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Play the recorded "sounds-alike" mnemonic clip for a letter. */
export function playLetterHint(letter: string): void {
  cancelSpeech();
  hintAudio = play(url.soundalike(letter));
}

/** Spoken letter name (e.g. "S"). */
export function playLetterName(letter: string): void {
  play(url.letter(letter));
}

// ----- SpeechSynthesis fallback (completion message only) --------------------

export function speak(text: string, rate = 1): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  speechSynthesis.speak(u);
}

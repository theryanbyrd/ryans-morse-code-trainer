// Audio, using the original Morse Learn mp3 assets under /assets/sounds.
//
// iOS Safari only lets audio start from a user gesture, and cloned <audio>
// elements are NOT unlocked by that gesture. So we keep ONE reusable element
// per sound, "prime" the core ones during the first tap (play → pause), and
// replay by rewinding the same element. A little SpeechSynthesis is kept only
// for the completion message, which has no recorded asset.

const BASE = '/assets/sounds';

const cache = new Map<string, HTMLAudioElement>();

function el(url: string): HTMLAudioElement {
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
    const a = el(url);
    a.volume = volume;
    try {
      a.currentTime = 0;
    } catch {
      /* not yet seekable — fine */
    }
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

const CORE = [url.dot, url.dash, url.correct, url.wrong];

let unlocked = false;

/** Prime the core clips inside the first user gesture so iOS will play them. */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  for (const u of CORE) {
    const a = el(u);
    a.muted = true;
    a
      .play()
      .then(() => {
        a.pause();
        try {
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
        a.muted = false;
      })
      .catch(() => {
        a.muted = false;
      });
  }
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

/** Spoken name for a number/symbol drill character (audio key, e.g. "question"). */
export function playNumName(audioKey: string): void {
  cancelSpeech();
  hintAudio = play(`${BASE}/numsym/${audioKey}.mp3`);
}

// ----- SpeechSynthesis fallback (completion message only) --------------------

export function speak(text: string, rate = 1): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  speechSynthesis.speak(u);
}

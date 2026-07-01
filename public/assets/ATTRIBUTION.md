# Original Morse Learn assets

The image and audio files in this folder are copied from the open-source
**Morse Learn** project by **Ace Centre**, which is itself based on the original
trainer by **Tania Finlayson**, **Use All Five**, and the **Google Creative Lab**.

- Source: https://github.com/AceCentre/morse-learn
- Licence: Apache License 2.0
- "Sounds-alike" audio (`sounds/soundalikes-mw/`) created by voice artist
  **Matthew Wade**. A second voice set is in `sounds/soundalikes-ww/`.

## Local modifications

- `sounds/soundalikes-mw/o.mp3` was replaced with our own clip saying
  **"Oh my gosh"** (macOS `say`, Daniel voice) instead of the original
  "Oh my god", to keep the mnemonic family-friendly. The original clip remains
  in git history and in the unused `sounds/soundalikes-mw/o 2.mp3` /
  `sounds/soundalikes-ww/o.mp3` variants.

## Contents

- `images/final/A.png … Z.png` — the original per-letter mnemonic illustrations.
- `images/{badge,close}.svg`, `images/{favicon,logos-new,meta,nohint}.png` — UI / share images.
- `sounds/a.mp3 … z.mp3` — spoken letter names.
- `sounds/{correct,wrong}.mp3` — feedback cues.
- `sounds/{dot,dash,period}.mp3` — Morse element sounds.
- `sounds/soundalikes-mw/`, `sounds/soundalikes-ww/` — spoken "sounds-alike" mnemonics (two voices).

These are archived here for reference and potential use. The app currently ships
its own original SVG mnemonics and Web Audio / speech-synthesis sounds; these
files are not wired into the UI yet.

Not copied from the original repo: the `images/raw/` and `images/original-assets/`
design-source folders, the intro video, and the keyboard-course images.

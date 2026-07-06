import { useCallback, useRef, useState } from 'react';
import { morseToText, textToMorse } from '../data/morse';
import { unlockMorse, playMorse } from '../lib/morsePlayer';
import { useApp } from '../state/AppContext';
import type { Playback } from '../lib/morsePlayer';

// A handy Text ↔ Morse translator. Type text to get Morse (or type dots/dashes
// to decode), then play it as audio or as a flashing light.
export function Translator() {
  const { settings } = useApp();
  const [text, setText] = useState('');
  const [morse, setMorse] = useState('');
  const [lampOn, setLampOn] = useState(false);
  const [copied, setCopied] = useState<'text' | 'morse' | null>(null);
  const playback = useRef<Playback | null>(null);

  const onText = (v: string) => {
    setText(v);
    setMorse(textToMorse(v));
  };
  const onMorse = (v: string) => {
    setMorse(v);
    setText(morseToText(v));
  };

  const play = useCallback(
    (visual: boolean) => {
      unlockMorse();
      playback.current?.stop();
      const t = text.trim() || morseToText(morse);
      if (!t) return;
      playback.current = playMorse(t, {
        wpm: settings.wpm,
        effWpm: settings.effWpm,
        freq: settings.tone,
        volume: settings.volume,
        onFlash: visual ? setLampOn : undefined,
        haptic: visual && settings.visual,
      });
    },
    [text, morse, settings.wpm, settings.effWpm, settings.tone, settings.volume, settings.visual],
  );

  const copy = async (which: 'text' | 'morse') => {
    try {
      await navigator.clipboard.writeText(which === 'text' ? text : morse);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard blocked */
    }
  };

  const clear = () => {
    playback.current?.stop();
    setText('');
    setMorse('');
  };

  return (
    <div className="translator">
      <h1 className="mode-title">Translator</h1>

      <div className={`flash-lamp${lampOn ? ' on' : ''}`} aria-hidden="true" />

      <div className="tr-panel">
        <div className="tr-head">
          <span>Text</span>
          <button className="tr-mini" onClick={() => copy('text')}>{copied === 'text' ? 'Copied!' : 'Copy'}</button>
        </div>
        <textarea
          className="tr-area"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Type text — letters, numbers, ? ! . , /"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>

      <div className="tr-panel">
        <div className="tr-head">
          <span>Morse</span>
          <button className="tr-mini" onClick={() => copy('morse')}>{copied === 'morse' ? 'Copied!' : 'Copy'}</button>
        </div>
        <textarea
          className="tr-area morse"
          value={morse}
          onChange={(e) => onMorse(e.target.value)}
          placeholder="… or type dots & dashes:  .... .. / - .... . .-. ."
          spellCheck={false}
        />
      </div>

      <div className="tr-actions">
        <button className="btn primary" onClick={() => play(false)} disabled={!text.trim()}>▶ Play</button>
        <button className="btn" onClick={() => play(true)} disabled={!text.trim()}>💡 Flash</button>
        <button className="btn" onClick={clear}>Clear</button>
      </div>
      <p className="tr-hint">Separate letters with a space and words with “/”. Playback speed follows your Receive setting ({settings.wpm} WPM).</p>
    </div>
  );
}

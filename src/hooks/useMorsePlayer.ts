import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { playMorse } from '../lib/morsePlayer';
import type { Playback } from '../lib/morsePlayer';

/** Shared Web-Audio Morse playback for the Receive phases, with a synced lamp. */
export function useMorsePlayer() {
  const { settings } = useApp();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [lampOn, setLampOn] = useState(false);
  const playback = useRef<Playback | null>(null);

  const play = useCallback((text: string, wpm?: number) => {
    playback.current?.stop();
    const s = settingsRef.current;
    playback.current = playMorse(text, {
      wpm: wpm ?? s.wpm,
      // An explicit slow-replay speed plays uniformly (no Farnsworth stretch).
      effWpm: wpm != null ? wpm : s.effWpm,
      freq: s.tone,
      volume: s.volume,
      onFlash: s.visual ? setLampOn : undefined,
      haptic: s.visual,
    });
  }, []);

  const stop = useCallback(() => playback.current?.stop(), []);

  useEffect(() => () => playback.current?.stop(), []);

  return { play, stop, lampOn };
}

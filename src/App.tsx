import { useEffect, useState } from 'react';
import { useApp } from './state/AppContext';
import { newestLetter } from './lib/session';
import { StartScreen } from './components/StartScreen';
import { Onboarding } from './components/Onboarding';
import { Game } from './components/Game';
import { ModeSelect } from './components/ModeSelect';
import { ReceiveGame } from './components/ReceiveGame';
import { AlphabetBar } from './components/AlphabetBar';
import { SettingsModal } from './components/SettingsModal';
import { StatsScreen } from './components/StatsScreen';
import { AboutScreen } from './components/AboutScreen';
import { GetCodeModal, LoadCodeModal } from './components/CodeModals';
import { MorseBoard } from './components/MorseBoard';
import { GearIcon, HelpIcon } from './components/Icons';

type Overlay = 'none' | 'settings' | 'stats' | 'about' | 'getcode' | 'loadcode' | 'board';

export default function App() {
  const { started, onboarded, mode, settings, progress, progressVersion, start, finishOnboarding, setMode } =
    useApp();
  const [overlay, setOverlay] = useState<Overlay>('none');

  // #about route opens the About screen, per the original.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === '#about') setOverlay('about');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const closeOverlay = () => {
    setOverlay('none');
    if (window.location.hash === '#about') history.replaceState(null, '', window.location.pathname);
  };

  const openAbout = () => {
    window.location.hash = '#about';
    setOverlay('about');
  };

  const inSend = started && onboarded && mode === 'send';
  const inReceive = started && onboarded && mode === 'receive';

  return (
    <div className="app">
      <div className="chrome">
        <div className="chrome-left">
          <button className="icon-btn chrome-btn" onClick={() => setOverlay('settings')} aria-label="Settings">
            <GearIcon />
          </button>
          {mode && (
            <button className="board-btn" onClick={() => setMode(null)} aria-label="Switch mode">
              ⇄ {mode === 'send' ? 'Send' : 'Receive'}
            </button>
          )}
          {settings.morseBoard && inSend && (
            <button className="board-btn" onClick={() => setOverlay('board')}>
              Morse board
            </button>
          )}
        </div>
        <button className="icon-btn chrome-btn" onClick={openAbout} aria-label="About">
          <HelpIcon />
        </button>
      </div>

      {inSend && <AlphabetBar progress={progress} current={newestLetter(progress)} />}

      <main className="stage">
        {!started ? (
          <StartScreen onStart={start} />
        ) : !onboarded ? (
          <Onboarding onDone={finishOnboarding} />
        ) : !mode ? (
          <ModeSelect />
        ) : inReceive ? (
          <ReceiveGame />
        ) : (
          <Game key={progressVersion} onOpenStats={() => setOverlay('stats')} />
        )}
      </main>

      {overlay === 'settings' && (
        <SettingsModal
          onClose={closeOverlay}
          onShowStats={() => setOverlay('stats')}
          onGetCode={() => setOverlay('getcode')}
          onLoadCode={() => setOverlay('loadcode')}
        />
      )}
      {overlay === 'stats' && <StatsScreen onClose={closeOverlay} />}
      {overlay === 'about' && <AboutScreen onClose={closeOverlay} />}
      {overlay === 'getcode' && <GetCodeModal onClose={closeOverlay} />}
      {overlay === 'loadcode' && <LoadCodeModal onClose={closeOverlay} />}
      {overlay === 'board' && <MorseBoard onClose={closeOverlay} />}
    </div>
  );
}

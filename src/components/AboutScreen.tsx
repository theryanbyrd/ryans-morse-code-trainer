import { CloseIcon } from './Icons';

export function AboutScreen({
  onClose,
  onShowAttributions,
}: {
  onClose: () => void;
  onShowAttributions: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal about" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="About">
        <header className="modal-head">
          <h2>About</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close about">
            <CloseIcon />
          </button>
        </header>

        <p>
          <b>Ditdah</b> makes learning Morse code more fun by pairing every letter with a memorable
          picture and sound. Recall the code and tap it in with the on-screen buttons, your keyboard,
          or the input device of your choice — then send and copy real contacts on the air.
        </p>
        <p>
          It's built for everyone — including audio-first learners and people who drive everything
          from a single switch.
        </p>
        <p className="byline">
          Made by <b>Ryan Byrd</b>, built with AI. Want to build things like this yourself?{' '}
          <a href="https://codingwithaibook.com/" target="_blank" rel="noreferrer">
            Coding with AI
          </a>{' '}
          shows you how.
        </p>
        <p className="credits">
          A personal remake inspired by <b>Morse Learn</b> from Ace Centre, itself built on the
          original trainer by <b>Tania Finlayson</b>, <b>Use All Five</b>, and the{' '}
          <b>Google Creative Lab</b>. Learn more at{' '}
          <a href="https://g.co/morse" target="_blank" rel="noreferrer">g.co/morse</a>.
        </p>
        <p className="credits small">
          Original Morse Learn:{' '}
          <a href="https://morse-learn.acecentre.net/" target="_blank" rel="noreferrer">
            morse-learn.acecentre.net
          </a>{' '}
          · Apache 2.0
        </p>
        <button className="btn" onClick={onShowAttributions} style={{ width: '100%', marginTop: 8 }}>
          Attributions &amp; license →
        </button>
      </div>
    </div>
  );
}

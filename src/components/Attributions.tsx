import { CloseIcon } from './Icons';

const THIS_REPO = 'https://github.com/theryanbyrd/ryans-morse-code-trainer';
const ORIGINAL_REPO = 'https://github.com/AceCentre/morse-learn';

export function Attributions({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal about" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Attributions and license">
        <header className="modal-head">
          <h2>Attributions &amp; License</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <h3 className="attr-h">This project</h3>
        <p>
          <a href={THIS_REPO} target="_blank" rel="noreferrer">
            github.com/theryanbyrd/ryans-morse-code-trainer
          </a>
        </p>
        <p>
          Open source under the <b>Apache License 2.0</b> — you're welcome to fork it, learn from it,
          and build on it. The app code, the hand-drawn SVG mnemonics, and the receive /
          gamification features are original to this project.
        </p>

        <h3 className="attr-h">Built on Morse Learn</h3>
        <p>
          <a href={ORIGINAL_REPO} target="_blank" rel="noreferrer">
            github.com/AceCentre/morse-learn
          </a>{' '}
          by <b>Ace Centre</b> (Apache 2.0), itself based on the original trainer by{' '}
          <b>Tania Finlayson</b>, <b>Use All Five</b>, and the <b>Google Creative Lab</b>. Learn more
          at <a href="https://g.co/morse" target="_blank" rel="noreferrer">g.co/morse</a>.
        </p>

        <h3 className="attr-h">Bundled assets</h3>
        <p className="credits">
          The mnemonic images and audio under <code>public/assets/</code> are from Morse Learn
          (Apache 2.0). The “sounds-alike” audio was created by voice artist <b>Matthew Wade</b>. See{' '}
          <a href={`${THIS_REPO}/blob/main/public/assets/ATTRIBUTION.md`} target="_blank" rel="noreferrer">
            ATTRIBUTION.md
          </a>{' '}
          for the full list and local changes.
        </p>

        <p className="credits small">
          Full text:{' '}
          <a href={`${THIS_REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">Apache License 2.0</a>{' '}
          ·{' '}
          <a href={`${THIS_REPO}/blob/main/NOTICE`} target="_blank" rel="noreferrer">NOTICE</a>
        </p>
      </div>
    </div>
  );
}

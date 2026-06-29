import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { encodeProgress } from '../lib/storage';
import { learnedCount } from '../lib/session';
import { CloseIcon } from './Icons';

export function GetCodeModal({ onClose }: { onClose: () => void }) {
  const { progress } = useApp();
  const code = encodeProgress(progress);
  const [copied, setCopied] = useState(false);
  const empty = learnedCount(progress) === 0 && progress.totalAnswered === 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the textarea is selectable as a fallback */
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'morse-progress.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal code" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Get code">
        <header className="modal-head">
          <h2>Get Code</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <p>Save this code or move it to another device. Paste it into “Load From Code” to restore your progress.</p>
        {empty && <p className="note">You haven't learned anything yet — this code represents a fresh start.</p>}
        <textarea className="code-box" readOnly value={code} onFocus={(e) => e.target.select()} />
        <div className="action-grid two">
          <button className="btn primary" onClick={copy}>{copied ? 'Copied!' : 'Copy code'}</button>
          <button className="btn" onClick={download}>Download file</button>
        </div>
      </div>
    </div>
  );
}

export function LoadCodeModal({ onClose }: { onClose: () => void }) {
  const { loadFromCode } = useApp();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!value.trim()) return;
    if (!window.confirm('Loading a code will overwrite your current progress on this device. Continue?')) return;
    const ok = loadFromCode(value);
    if (ok) onClose();
    else setError("That code didn't look right. Check you copied all of it.");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal code" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Load from code">
        <header className="modal-head">
          <h2>Load From Code</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <p>Paste a code you exported earlier. This replaces the progress saved on this device.</p>
        <textarea
          className="code-box"
          placeholder="Paste your code here…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
        {error && <p className="error-text">{error}</p>}
        <div className="action-grid two">
          <button className="btn primary" onClick={submit} disabled={!value.trim()}>Load progress</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

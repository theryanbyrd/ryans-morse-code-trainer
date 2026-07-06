import { useMemo, useState } from 'react';
import { CW_GUIDE } from '../data/cwGuide';
import { CloseIcon } from './Icons';

export function CwGuide({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CW_GUIDE;
    return CW_GUIDE.map((g) => ({
      ...g,
      entries: g.entries.filter(
        (e) => e.term.toLowerCase().includes(needle) || e.meaning.toLowerCase().includes(needle),
      ),
    })).filter((g) => g.entries.length > 0);
  }, [q]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cw-guide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="CW shorthand guide">
        <header className="modal-head">
          <h2>CW shorthand</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        <input
          className="cw-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — e.g. QSL, 73, weather…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search shorthand"
        />

        {groups.length === 0 ? (
          <p className="empty-state">No matches. Try another term.</p>
        ) : (
          groups.map((g) => (
            <section key={g.title} className="cw-group">
              <h3 className="cw-h">{g.title}</h3>
              <dl className="cw-list">
                {g.entries.map((e) => (
                  <div className="cw-row" key={e.term}>
                    <dt className="cw-term">{e.term}</dt>
                    <dd className="cw-mean">{e.meaning}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { QSO_SCENARIOS, normalizeQso } from '../data/qso';
import type { QsoScenario } from '../data/qso';
import { QsoSend } from './QsoSend';
import { QsoReceive } from './QsoReceive';

export function Qso() {
  const [scenario, setScenario] = useState<QsoScenario | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);

  if (!scenario) {
    return (
      <div className="qso-list">
        <h1 className="mode-title">On the air</h1>
        <p className="qso-intro">Pick a scenario and work a full CW contact — send each transmission, then copy the reply.</p>
        <div className="qso-cards">
          {QSO_SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="qso-card"
              onClick={() => {
                setScenario(s);
                setTurnIndex(0);
              }}
            >
              <span className="qso-card-tag">{s.tag}</span>
              <span className="qso-card-title">{s.title}</span>
              <span className="qso-card-meta">{s.turns.length} overs</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const done = turnIndex >= scenario.turns.length;
  const turn = scenario.turns[turnIndex];

  return (
    <div className="qso-play">
      <div className="qso-head">
        <button className="qso-back" onClick={() => setScenario(null)}>‹ Scenarios</button>
        <span className="qso-head-title">{scenario.title}</span>
        <span className="qso-head-prog">{Math.min(turnIndex, scenario.turns.length)}/{scenario.turns.length}</span>
      </div>

      <Log scenario={scenario} upto={turnIndex} />

      {done ? (
        <div className="qso-complete">
          <div className="confetti" aria-hidden="true">📻 ✓</div>
          <h2>QSO complete!</h2>
          <p>Nice contact. 73 &amp; hope to work you again.</p>
          <div className="completion-actions">
            <button className="btn primary" onClick={() => setTurnIndex(0)}>Run it again</button>
            <button className="btn" onClick={() => setScenario(null)}>Scenarios</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`qso-cue ${turn.d === 's' ? 'tx' : 'rx'}`}>
            {turn.d === 's' ? 'TX — key this transmission' : 'RX — copy the reply'}
          </div>
          {turn.d === 's' ? (
            <QsoSend key={turnIndex} text={turn.t} onDone={() => setTurnIndex((i) => i + 1)} />
          ) : (
            <QsoReceive key={turnIndex} text={turn.t} onDone={() => setTurnIndex((i) => i + 1)} />
          )}
        </>
      )}
    </div>
  );
}

function Log({ scenario, upto }: { scenario: QsoScenario; upto: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [upto]);

  if (upto === 0) return <div className="qso-log empty" ref={ref}>— log is empty — start sending —</div>;

  return (
    <div className="qso-log" ref={ref}>
      {scenario.turns.slice(0, upto).map((t, i) => (
        <div key={i} className={`log-line ${t.d === 's' ? 'tx' : 'rx'}`}>
          <span className="log-dir">{t.d === 's' ? 'TX' : 'RX'}</span>
          <span className="log-text">{normalizeQso(t.t)}</span>
        </div>
      ))}
    </div>
  );
}

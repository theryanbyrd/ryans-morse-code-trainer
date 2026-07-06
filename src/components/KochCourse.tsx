import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import {
  KOCH_LESSONS,
  KOCH_PASS,
  lessonChars,
  makeGroups,
  newChar,
  scoreCopy,
} from '../data/koch';
import type { CopyScore } from '../data/koch';

const SLOW_WPM = 10;

export function KochCourse() {
  const { koch, recordKoch, settings } = useApp();
  const { play, lampOn } = useMorsePlayer();

  const [lesson, setLesson] = useState<number | null>(null);
  const [phase, setPhase] = useState<'ready' | 'listen' | 'result'>('ready');
  const [sent, setSent] = useState('');
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<CopyScore | null>(null);
  const inputEl = useRef<HTMLTextAreaElement>(null);

  const start = useCallback(() => {
    const s = makeGroups(lesson ?? 1);
    setSent(s);
    setTyped('');
    setResult(null);
    setPhase('listen');
    play(s);
    setTimeout(() => inputEl.current?.focus(), 50);
  }, [lesson, play]);

  const check = useCallback(() => {
    const score = scoreCopy(sent, typed);
    setResult(score);
    setPhase('result');
    if (lesson != null) recordKoch(lesson, score.pct);
  }, [sent, typed, lesson, recordKoch]);

  useEffect(() => {
    setPhase('ready');
    setResult(null);
    setTyped('');
  }, [lesson]);

  // ----- Lesson picker -----
  if (lesson == null) {
    return (
      <div className="koch">
        <h1 className="mode-title">Koch course</h1>
        <p className="koch-intro">
          The proven method: real speed from day one, one new character per lesson. Copy the groups,
          type what you hear — {KOCH_PASS}% unlocks the next.
        </p>
        <div className="koch-grid">
          {Array.from({ length: KOCH_LESSONS }, (_, i) => i + 1).map((n) => {
            const unlocked = n <= koch.lesson;
            const best = koch.best[String(n)];
            return (
              <button
                key={n}
                className={`koch-cell${unlocked ? '' : ' locked'}${n === koch.lesson ? ' active' : ''}`}
                disabled={!unlocked}
                onClick={() => setLesson(n)}
              >
                <span className="kc-n">{n}</span>
                <span className="kc-ch">+{newChar(n).toUpperCase()}</span>
                {best != null && <span className="kc-best">{best}%</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const chars = lessonChars(lesson);
  const passed = result != null && result.pct >= KOCH_PASS;
  const unlockedNext = koch.lesson > lesson;

  return (
    <div className="koch koch-play">
      <div className="qso-head">
        <button className="qso-back" onClick={() => setLesson(null)}>‹ Lessons</button>
        <span className="qso-head-title">Lesson {lesson} · {settings.wpm}/{settings.effWpm} WPM</span>
        <span className="qso-head-prog">+{newChar(lesson).toUpperCase()}</span>
      </div>

      <div className="koch-chars">
        {chars.map((c) => (
          <span key={c} className={`kchip${c === newChar(lesson) ? ' new' : ''}`}>{c.toUpperCase()}</span>
        ))}
      </div>

      {phase === 'ready' && (
        <div className="koch-panel">
          <p>Ready to copy Lesson {lesson}? You'll hear 20 groups. Type what you hear.</p>
          <button className="btn primary" onClick={start}>▶ Start copying</button>
        </div>
      )}

      {phase !== 'ready' && (
        <>
          <button
            className={`listen-btn${lampOn ? ' lamp-on' : ''}`}
            onClick={() => play(sent)}
            aria-label="Replay"
          >
            <span className="listen-icon" aria-hidden="true">🎧</span>
            <span>{phase === 'result' ? 'Replay' : 'Copying…'}</span>
          </button>

          <textarea
            ref={inputEl}
            className="word-input koch-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="type the characters you hear…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={phase === 'result'}
          />

          <div className="receive-controls">
            <button className="rc-btn" onClick={() => play(sent)}>↻ Replay</button>
            <button className="rc-btn" onClick={() => play(sent, SLOW_WPM)}>🐢 Slower</button>
            {phase === 'listen' && (
              <button className="btn primary" onClick={check} disabled={!typed.trim()}>Check</button>
            )}
          </div>
        </>
      )}

      {phase === 'result' && result && (
        <div className="koch-result">
          <div className={`koch-score${passed ? ' pass' : ''}`}>{result.pct}%</div>
          <p>{passed ? '✓ Passed — next lesson unlocked!' : `Need ${KOCH_PASS}% to advance. Keep at it!`}</p>
          <div className="koch-sent">Sent: <code>{sent}</code></div>
          <div className="koch-per">
            {Object.entries(result.per)
              .filter(([, v]) => v.ok < v.sent)
              .map(([c, v]) => (
                <span key={c} className="kper">{c.toUpperCase()} {Math.round((v.ok / v.sent) * 100)}%</span>
              ))}
          </div>
          <div className="completion-actions">
            <button className="btn primary" onClick={start}>Try again</button>
            {unlockedNext && (
              <button className="btn" onClick={() => setLesson(lesson + 1)}>Next lesson →</button>
            )}
            <button className="btn" onClick={() => setLesson(null)}>Lessons</button>
          </div>
        </div>
      )}
    </div>
  );
}

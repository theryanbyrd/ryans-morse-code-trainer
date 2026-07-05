import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { WORDS_TO_UNLOCK_SENTENCES } from '../lib/receive';
import type { ReceivePhase } from '../lib/receive';
import { ReceiveHud } from './ReceiveHud';
import { LetterQuiz } from './LetterQuiz';
import { WordReceive } from './WordReceive';
import { SentenceReceive } from './SentenceReceive';
import { BadgesModal } from './BadgesModal';

export function Receive({ section }: { section: 'letters' | 'words' }) {
  const { receive, receiveToasts, dismissToast } = useApp();
  const [showBadges, setShowBadges] = useState(false);

  // The "Hear words" section grows into sentences once enough words are copied.
  const phase: ReceivePhase =
    section === 'letters'
      ? 'letters'
      : receive.wordsCompleted < WORDS_TO_UNLOCK_SENTENCES
        ? 'words'
        : 'sentences';

  return (
    <div className="receive-wrap">
      <ReceiveHud phase={phase} onOpenBadges={() => setShowBadges(true)} />

      {phase === 'letters' ? (
        <LetterQuiz key="letters" />
      ) : phase === 'words' ? (
        <WordReceive key="words" />
      ) : (
        <SentenceReceive key="sentences" />
      )}

      <div className="toast-stack">
        {receiveToasts.map((t) => (
          <Toast key={t.id} icon={t.icon} title={t.title} subtitle={t.subtitle} onDone={() => dismissToast(t.id)} />
        ))}
      </div>

      {showBadges && <BadgesModal onClose={() => setShowBadges(false)} />}
    </div>
  );
}

function Toast({
  icon,
  title,
  subtitle,
  onDone,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="toast" role="status">
      <span className="toast-icon" aria-hidden="true">{icon}</span>
      <span className="toast-text">
        <span className="toast-title">{title}</span>
        <span className="toast-sub">{subtitle}</span>
      </span>
    </div>
  );
}

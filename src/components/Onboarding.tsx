import { useEffect, useState } from 'react';
import { DotIcon, DashIcon } from './Icons';
import { MNEMONICS } from '../data/mnemonics';
import { Pattern } from './Pattern';

const SLIDES = [
  {
    title: 'Your Morse keyboard has two buttons',
    body: 'One for a dot, one for a dash. Every letter is just a little rhythm of dots and dashes.',
    art: (
      <div className="ob-keys">
        <span className="ob-key"><DotIcon /></span>
        <span className="ob-key"><DashIcon /></span>
      </div>
    ),
  },
  {
    title: 'Pictures help you memorise each letter',
    body: 'A is an archer — the dot is the nock, the dash is the long arrow. Picture it and the code sticks.',
    art: (
      <div className="ob-letter">
        <div className="ob-mnemonic">{MNEMONICS.a.icon}</div>
        <Pattern pattern=".-" size={20} />
      </div>
    ),
  },
  {
    title: 'Track your progress through the whole alphabet',
    body: 'Letters you learn slide to the left. The bar up top fills in as you master all 26.',
    art: (
      <div className="ob-progress">
        {'etaim'.split('').map((l, i) => (
          <span key={l} className={i < 3 ? 'ob-chip done' : 'ob-chip'}>
            {l.toUpperCase()}
          </span>
        ))}
      </div>
    ),
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);

  // Auto-advance, but let the user move at their own pace too.
  useEffect(() => {
    const t = setTimeout(() => {
      if (i < SLIDES.length - 1) setI(i + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [i]);

  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className="onboarding">
      <button className="skip-btn" onClick={onDone}>
        Skip
      </button>
      <div className="ob-art">{slide.art}</div>
      <h2 className="ob-title">{slide.title}</h2>
      <p className="ob-body">{slide.body}</p>
      <div className="ob-dots">
        {SLIDES.map((_, idx) => (
          <span key={idx} className={idx === i ? 'on' : ''} />
        ))}
      </div>
      <button className="ob-next" onClick={() => (last ? onDone() : setI(i + 1))}>
        {last ? "Let's go" : 'Next'}
      </button>
    </div>
  );
}

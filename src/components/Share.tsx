import { useState } from 'react';
import {
  ShareNetwork, XLogo, FacebookLogo, WhatsappLogo, RedditLogo,
  EnvelopeSimple, LinkSimple, Check,
} from '@phosphor-icons/react';
import { track } from '../lib/analytics';
import { useApp } from '../state/AppContext';

const SITE = 'https://ditdah.me';
const BLURB = 'Learn Morse code, one dit at a time. Free, and weirdly fun.';

type Target = {
  id: string;
  label: string;
  href: string;
  Icon: typeof XLogo;
  tint: string;
};

const enc = encodeURIComponent;

const TARGETS: Target[] = [
  {
    id: 'x',
    label: 'X',
    href: `https://twitter.com/intent/tweet?text=${enc(BLURB)}&url=${enc(SITE)}`,
    Icon: XLogo,
    tint: '#1d1d1f',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${enc(SITE)}`,
    Icon: FacebookLogo,
    tint: '#1877f2',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: `https://api.whatsapp.com/send?text=${enc(`${BLURB} ${SITE}`)}`,
    Icon: WhatsappLogo,
    tint: '#25d366',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    href: `https://www.reddit.com/submit?url=${enc(SITE)}&title=${enc('Ditdah: learn Morse code, one dit at a time')}`,
    Icon: RedditLogo,
    tint: '#ff4500',
  },
  {
    id: 'email',
    label: 'Email',
    href: `mailto:?subject=${enc('Ditdah: learn Morse code')}&body=${enc(`${BLURB}\n\n${SITE}`)}`,
    Icon: EnvelopeSimple,
    tint: '#6b6b7b',
  },
];

/** Share Ditdah with a friend. Uses the native sheet where the device has one. */
export function Share({ compact = false }: { compact?: boolean }) {
  const { settings } = useApp();
  const [copied, setCopied] = useState(false);

  const note = (to: string) => track({ type: 'share', target: to }, settings.trackingConsent);

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'Ditdah', text: BLURB, url: SITE });
      note('native');
    } catch {
      /* the user dismissed the sheet */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE);
      setCopied(true);
      note('copy');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; the links above still work */
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <section className={`share${compact ? ' compact' : ''}`} aria-labelledby="share-title">
      <h2 className="share-title" id="share-title">
        <ShareNetwork size={18} weight="bold" aria-hidden="true" /> Know someone who would like this?
      </h2>
      <p className="share-sub">Send them Ditdah. It is free and needs no account.</p>

      <div className="share-row">
        {TARGETS.map(({ id, label, href, Icon, tint }) => (
          <a
            key={id}
            className="share-btn"
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => note(id)}
            aria-label={`Share on ${label}`}
            style={{ ['--tint' as string]: tint }}
          >
            <Icon size={22} weight="fill" aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}

        <button className="share-btn copy" onClick={copy} aria-label="Copy link to Ditdah">
          {copied ? <Check size={22} weight="bold" aria-hidden="true" /> : <LinkSimple size={22} weight="bold" aria-hidden="true" />}
          <span>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>

      {canNativeShare && (
        <button className="btn primary share-native" onClick={() => void nativeShare()}>
          <ShareNetwork size={18} weight="bold" aria-hidden="true" /> Share
        </button>
      )}
    </section>
  );
}

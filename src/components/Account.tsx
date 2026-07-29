import { useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { CloseIcon } from './Icons';

export function AccountButton() {
  const { enabled, googleEnabled, user, signInWithEmail, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Dormant until Supabase is configured, keeps the guest UI unchanged.
  if (!enabled) return null;

  const initial = (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      <button
        className={user ? 'icon-btn chrome-btn avatar' : 'account-chip'}
        onClick={() => setOpen(true)}
        aria-label={user ? 'Account' : 'Sign in'}
      >
        {user ? initial : 'Sign in'}
      </button>
      {open && (
        <AccountModal
          onClose={() => setOpen(false)}
          user={user}
          googleEnabled={googleEnabled}
          signInWithEmail={signInWithEmail}
          signInWithGoogle={signInWithGoogle}
          signOut={signOut}
        />
      )}
    </>
  );
}

/** Google's official four-colour mark. Required, unmodified, on their button. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

type Props = {
  onClose: () => void;
  user: ReturnType<typeof useAuth>['user'];
  googleEnabled: boolean;
  signInWithEmail: ReturnType<typeof useAuth>['signInWithEmail'];
  signInWithGoogle: ReturnType<typeof useAuth>['signInWithGoogle'];
  signOut: ReturnType<typeof useAuth>['signOut'];
};

function AccountModal({ onClose, user, googleEnabled, signInWithEmail, signInWithGoogle, signOut }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const sendLink = async () => {
    if (!email.trim()) return;
    setStatus('sending');
    const res = await signInWithEmail(email.trim());
    if (res.ok) setStatus('sent');
    else {
      setStatus('error');
      setError(res.error ?? 'Something went wrong.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal account" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Account">
        <header className="modal-head">
          <h2>{user ? 'Account' : 'Save your progress'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        {user ? (
          <>
            <p>
              Signed in as <b>{user.email}</b>. Your progress syncs across devices automatically.
            </p>
            <p className="note">
              Letters learned, Koch lessons, numbers, badges and streaks are all kept on your account.
            </p>
            <div className="action-grid two">
              <button className="btn danger" onClick={async () => { await signOut(); onClose(); }}>
                Sign out
              </button>
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <p>Sign in to save your history and sync it across your devices. Optional, you can keep playing as a guest.</p>
            {status === 'sent' ? (
              <p className="note">Check your email for a sign-in link.</p>
            ) : (
              <>
                {googleEnabled && (
                  <>
                    {/* Google requires their own mark and wording on this button. */}
                    <button className="google-btn" onClick={() => void signInWithGoogle()}>
                      <GoogleMark />
                      <span>Sign in with Google</span>
                    </button>
                    <div className="or-rule"><span>or</span></div>
                  </>
                )}
                <input
                  className="word-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                />
                {status === 'error' && <p className="error-text">{error}</p>}
                <div className="action-grid one">
                  <button className="btn primary" onClick={sendLink} disabled={status === 'sending' || !email.trim()}>
                    {status === 'sending' ? 'Sending…' : 'Email me a link'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

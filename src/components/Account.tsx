import { useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { CloseIcon } from './Icons';

export function AccountButton() {
  const { enabled, googleEnabled, user, signInWithEmail, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Dormant until Supabase is configured — keeps the guest UI unchanged.
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
            <div className="action-grid two">
              <button className="btn danger" onClick={async () => { await signOut(); onClose(); }}>
                Sign out
              </button>
              <button className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <p>Sign in to save your history and sync it across your devices. Optional — you can keep playing as a guest.</p>
            {status === 'sent' ? (
              <p className="note">Check your email for a sign-in link.</p>
            ) : (
              <>
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
                <div className={`action-grid ${googleEnabled ? 'two' : 'one'}`}>
                  <button className="btn primary" onClick={sendLink} disabled={status === 'sending' || !email.trim()}>
                    {status === 'sending' ? 'Sending…' : 'Email me a link'}
                  </button>
                  {googleEnabled && (
                    <button className="btn" onClick={() => void signInWithGoogle()}>Continue with Google</button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

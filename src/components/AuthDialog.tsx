import { useState } from 'react';
import { useAuth } from '../auth';
import { Field, Icon, Modal } from './ui';

export const AuthDialog = ({ onClose, start = 'signin' }: { onClose: () => void; start?: 'signin' | 'signup' }) => {
  const { signIn, signUp, signInWithGoogle, mode } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>(start);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (tab === 'signup' && name.trim().length < 2) return setError('Tell us what to call you.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('That email address does not look right.');
    if (password.length < 6) return setError('Use at least 6 characters for the password.');
    setBusy(true);
    try {
      if (tab === 'signup') await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={tab === 'signup' ? 'Create your Law Den account' : 'Sign in to Law Den'} onClose={onClose}>
      <div className="tabs" style={{ marginTop: 10 }}>
        <button role="tab" aria-selected={tab === 'signin'} onClick={() => { setTab('signin'); setError(''); }} data-testid="tab-signin">Sign in</button>
        <button role="tab" aria-selected={tab === 'signup'} onClick={() => { setTab('signup'); setError(''); }} data-testid="tab-signup">Create account</button>
      </div>

      <p className="muted small" style={{ marginBottom: 14 }}>
        {tab === 'signup'
          ? 'An account lets you save lawyers, track enquiries and leave a review after a matter closes.'
          : 'Welcome back. Sign in to reach your saved lawyers and enquiries.'}
      </p>

      <form onSubmit={submit} className="stack gap-12" noValidate>
        {tab === 'signup' && (
          <Field label="Your name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} data-testid="auth-name" autoComplete="name" id="auth-name" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="auth-email" autoComplete="email" id="auth-email" />
        </Field>
        <Field label="Password" hint={tab === 'signup' ? 'At least 6 characters.' : undefined}>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="auth-password" id="auth-password"
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
          />
        </Field>

        {error && (
          <div className="callout warn" data-testid="auth-error">
            <Icon.alert size={16} /><span>{error}</span>
          </div>
        )}

        <button className="btn block lg" type="submit" disabled={busy} data-testid="auth-submit">
          {busy ? 'Working…' : tab === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="row gap-10" style={{ margin: '16px 0 12px' }}>
        <hr className="divider grow" /><span className="tiny muted">or</span><hr className="divider grow" />
      </div>

      <button className="btn secondary block" onClick={google} disabled={busy} data-testid="auth-google">
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16z" />
          <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.5-2.1 15.3-5.6l-7.1-5.5c-2 1.4-4.6 2.2-8.2 2.2-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Continue with Google
      </button>

      {mode === 'offline' && (
        <div className="callout info" style={{ marginTop: 14 }}>
          <Icon.alert size={16} />
          <span>
            This copy of the site cannot reach Firebase from its current host, so accounts are kept as a local
            demo session in this browser only. On a normal web host the same form creates a real Firebase account.
          </span>
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 14 }}>
        Accounts are handled by Firebase Authentication. Law Den does not ask for payment details, and signing in
        never changes which lawyers you see or how they are ranked.
      </p>
    </Modal>
  );
};

'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { ADMIN_EMAILS, useAuth } from '../auth';
import { Icon, Toast } from '../components/ui';
import { Dashboard } from './admin/Dashboard';
import { Lawyers } from './admin/Lawyers';
import { Queue } from './admin/Queue';
import { Users } from './admin/Users';
import { ADMIN_PASSCODE, useStore } from '../store';

type Section = 'dashboard' | 'queue' | 'lawyers' | 'users' | 'activity';

const SECTIONS: { id: Section; label: string; icon: () => ReactElement }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: () => <Icon.spark size={16} /> },
  { id: 'queue', label: 'Verification queue', icon: () => <Icon.doc size={16} /> },
  { id: 'lawyers', label: 'Lawyers', icon: () => <Icon.scales size={16} /> },
  { id: 'users', label: 'Public users', icon: () => <Icon.user size={16} /> },
  { id: 'activity', label: 'Activity log', icon: () => <Icon.clock size={16} /> },
];

const Gate = ({ onPasscode }: { onPasscode: () => void }) => {
  const { signIn, mode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      setError('That email is not on the reviewer list for this console.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell" style={{ paddingTop: 60, maxWidth: 480 }}>
      <div className="panel">
        <div className="row gap-10" style={{ marginBottom: 10 }}>
          <span className="cred-icon"><Icon.shield size={16} /></span>
          <h1 className="display" style={{ fontSize: 22 }}>Law Den · reviewer console</h1>
        </div>
        <p className="muted small" style={{ marginBottom: 16 }}>
          This console is served separately from the public site and is not linked from it. Sign in with a reviewer
          account, or use the demo passcode to explore.
        </p>

        <form onSubmit={submit} className="stack gap-12" noValidate>
          <div className="field">
            <label htmlFor="admin-email">Reviewer email</label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email" autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-password" autoComplete="current-password" />
          </div>
          {error && <div className="callout warn"><Icon.alert size={16} /><span>{error}</span></div>}
          <button className="btn block" type="submit" disabled={busy} data-testid="admin-signin">
            {busy ? 'Checking…' : 'Sign in with Firebase'}
          </button>
        </form>

        <div className="row gap-10" style={{ margin: '16px 0 12px' }}>
          <hr className="divider grow" /><span className="tiny muted">or</span><hr className="divider grow" />
        </div>

        <form
          className="stack gap-10"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (passcode.trim() === ADMIN_PASSCODE) onPasscode();
            else setError('That passcode is not recognised.');
          }}
        >
          <div className="field">
            <label htmlFor="admin-pass">Demo passcode</label>
            <input id="admin-pass" type="password" value={passcode} onChange={(e) => { setPasscode(e.target.value); setError(''); }} data-testid="admin-pass" />
            <span className="hint">Passcode for this prototype: <code>{ADMIN_PASSCODE}</code></span>
          </div>
          <button className="btn secondary block" type="submit" data-testid="admin-unlock">Open console with passcode</button>
        </form>

        {mode === 'offline' && (
          <p className="tiny muted" style={{ marginTop: 14 }}>
            Firebase is unreachable from this host, so reviewer sign-in will fall back to a local session. Use the
            passcode instead.
          </p>
        )}
      </div>
    </div>
  );
};

export const AdminApp = () => {
  const { account, isAdmin, signOut, loading } = useAuth();
  const { audit, resetDemo } = useStore();
  const [passcodeUnlocked, setPasscodeUnlocked] = useState(false);
  const [section, setSection] = useState<Section>('dashboard');
  const [toast, setToast] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme ?? '';
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3600);
  };

  if (loading) return <div className="shell" style={{ padding: 60 }}><p className="muted">Checking your session…</p></div>;
  if (!passcodeUnlocked && !isAdmin) return <Gate onPasscode={() => setPasscodeUnlocked(true)} />;

  return (
    <div className="admin-shell">
      <nav className="admin-rail" aria-label="Console sections">
        <div className="brand">
          <span className="mark"><Icon.scales size={18} /></span> <span>Law Den</span>
        </div>
        {SECTIONS.map((s) => (
          <button key={s.id} aria-current={section === s.id} onClick={() => setSection(s.id)} data-testid={`nav-${s.id}`}>
            {s.icon()} {s.label}
          </button>
        ))}
        <div className="rail-foot stack gap-8">
          <span className="tiny muted" style={{ padding: '0 8px' }}>
            {isAdmin ? account?.email : 'Signed in with demo passcode'}
          </span>
          <button onClick={() => { resetDemo(); flash('Prototype data reset to its original state.'); }}>
            <Icon.back size={15} /> Reset demo data
          </button>
          <button
            onClick={() => { setPasscodeUnlocked(false); void signOut(); }}
            data-testid="admin-signout"
          >
            <Icon.close size={15} /> Sign out
          </button>
        </div>
      </nav>

      <main className="admin-main">
        {section === 'dashboard' && <Dashboard onGo={setSection} />}
        {section === 'queue' && (
          <>
            <h1 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Verification queue</h1>
            <p className="muted small" style={{ marginBottom: 18 }}>
              Nothing reaches the visitor directory until every check is ticked and the profile is approved.
            </p>
            <Queue onToast={flash} />
          </>
        )}
        {section === 'lawyers' && <Lawyers onToast={flash} />}
        {section === 'users' && <Users />}
        {section === 'activity' && (
          <>
            <h1 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Activity log</h1>
            <p className="muted small" style={{ marginBottom: 18 }}>Every decision recorded in this console.</p>
            <div className="panel audit">
              <ul>
                {audit.map((a) => (
                  <li key={a.id}>
                    <span className="tiny muted">{a.at.replace('T', ' ')}</span>
                    <span>
                      <strong>{a.action}</strong> — {a.target}
                      <div className="tiny muted">{a.actor}{a.detail ? ` · ${a.detail}` : ''}</div>
                    </span>
                  </li>
                ))}
                {audit.length === 0 && <li><span className="muted small">No activity recorded yet.</span></li>}
              </ul>
            </div>
          </>
        )}
      </main>

      {toast && <Toast message={toast} />}
    </div>
  );
};

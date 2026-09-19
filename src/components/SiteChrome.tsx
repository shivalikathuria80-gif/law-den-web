'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AppLink as Link } from './AppLink';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth';
import { AuthDialog } from './AuthDialog';
import { Avatar, Icon } from './ui';

const THEME_KEY = 'lawden.theme';

/**
 * Theme resolves after mount: reading localStorage during render would not match the
 * server-rendered markup. Until then the CSS follows the operating system setting.
 */
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    let initial: 'light' | 'dark' | null = null;
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') initial = stored;
    } catch { /* storage unavailable */ }
    setTheme(initial ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
};

const NAV = [
  { href: '/find', label: 'Find a lawyer', short: 'Find' },
  { href: '/trust', label: 'How it works', short: 'How it works' },
  { href: '/for-lawyers', label: 'For lawyers', short: 'Lawyers' },
];

export const SiteChrome = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [theme, toggleTheme] = useTheme();
  const { account, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState<null | 'signin' | 'signup'>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="notice-bar">
        <strong>Prototype</strong> · Law Den is a demonstration build. All lawyers, reviews and documents shown are fictional sample data.
      </div>

      <header className="site-header">
        <div className="shell inner">
          <Link className="brand" href="/" aria-label="Law Den home">
            <span className="mark"><Icon.scales size={18} /></span>
            <span className="word">Law Den</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={pathname === n.href ? 'active' : ''}>
                <span className="full">{n.label}</span><span className="short">{n.short}</span>
              </Link>
            ))}
            <button
              className="icon-btn" onClick={toggleTheme} style={{ marginLeft: 6 }}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Icon.sun size={16} /> : <Icon.moon size={16} />}
            </button>
            {account ? (
              <div className="account">
                <button className="account-chip" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} data-testid="account-chip">
                  <Avatar name={account.name} tone={7} />
                  <span className="full">{account.name.split(' ')[0]}</span>
                  <Icon.chevron size={13} />
                </button>
                {menuOpen && (
                  <div className="account-menu card" role="menu">
                    <div className="stack gap-4" style={{ padding: '10px 12px' }}>
                      <strong style={{ fontSize: 13.5 }}>{account.name}</strong>
                      <span className="tiny muted">{account.email}</span>
                      <span className={`badge ${account.source === 'firebase' ? 'verified' : 'neutral'}`} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                        {account.source === 'firebase' ? 'Firebase account' : 'Local demo session'}
                      </span>
                    </div>
                    <hr className="divider" />
                    <Link role="menuitem" href="/enquiries" onClick={() => setMenuOpen(false)} data-testid="menu-enquiries"
                      style={{ display: 'block', padding: '11px 12px', fontSize: 13.5 }}>
                      My enquiries
                    </Link>
                    <hr className="divider" />
                    <button role="menuitem" onClick={() => { setMenuOpen(false); void signOut(); }} data-testid="sign-out">Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => setAuthOpen('signin')} data-testid="sign-in-button">
                <Icon.user size={15} /> <span className="full">Sign in</span><span className="short">Sign in</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="shell">
          <div className="inner">
            <div>
              <div className="brand" style={{ marginBottom: 10 }}>
                <span className="mark"><Icon.scales size={18} /></span> Law Den
              </div>
              <p className="small muted" style={{ maxWidth: '38ch' }}>
                A directory of lawyers whose credentials have been checked before listing. Prototype build with
                fictional sample data — nothing here is legal advice.
              </p>
            </div>
            <div>
              <h4>Visitors</h4>
              <Link href="/find">Find a lawyer</Link>
              <Link href="/trust">How verification works</Link>
              <Link href="/trust">Ranking &amp; promoted placement</Link>
              <Link href="/enquiries">My enquiries</Link>
            </div>
            <div>
              <h4>Lawyers</h4>
              <Link href="/for-lawyers">List your practice</Link>
              <Link href="/portal" data-testid="footer-portal">Lawyer portal</Link>
              <Link href="/trust">What verification covers</Link>
            </div>
          </div>
          <div className="footer-note row wrap gap-12">
            <span>© 2026 Law Den (prototype). Not a law firm and not a lawyer referral service.</span>
            <Link className="btn ghost sm" href="/trust" style={{ marginLeft: 'auto' }}>
              Read the transparency notes <Icon.chevron size={13} />
            </Link>
          </div>
        </div>
      </footer>

      {authOpen && <AuthDialog start={authOpen} onClose={() => setAuthOpen(null)} />}
    </>
  );
};

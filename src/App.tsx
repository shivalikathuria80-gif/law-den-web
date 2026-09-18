import { useEffect, useState } from 'react';
import { Icon } from './components/ui';
import { Admin } from './pages/Admin';
import { Directory } from './pages/Directory';
import { ForLawyers } from './pages/ForLawyers';
import { LawyerProfile } from './pages/LawyerProfile';
import { Trust } from './pages/Trust';
import { navigate, useRoute } from './lib/router';

const THEME_KEY = 'lawden.theme';

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* storage unavailable */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
};

const NAV = [
  { href: '#/', label: 'Find a lawyer', short: 'Find', match: 'directory' },
  { href: '#/trust', label: 'How it works', short: 'How it works', match: 'trust' },
  { href: '#/for-lawyers', label: 'For lawyers', short: 'Lawyers', match: 'for-lawyers' },
];

export const App = () => {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();

  return (
    <>
      <div className="notice-bar">
        <strong>Prototype</strong> · Law Den is a demonstration build. All lawyers, reviews and documents shown are fictional sample data.
      </div>

      <header className="site-header">
        <div className="shell inner">
          <a className="brand" href="#/" aria-label="Law Den home">
            <span className="mark"><Icon.scales size={18} /></span>
            <span className="word">Law Den</span>
          </a>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={route.name === n.match ? 'active' : ''}>
                <span className="full">{n.label}</span><span className="short">{n.short}</span>
              </a>
            ))}
            <a href="#/admin" className={route.name === 'admin' ? 'active' : ''}>Admin</a>
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} style={{ marginLeft: 6 }}>
              {theme === 'dark' ? <Icon.sun size={16} /> : <Icon.moon size={16} />}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {route.name === 'directory' && <Directory />}
        {route.name === 'lawyer' && <LawyerProfile slug={route.slug} />}
        {route.name === 'for-lawyers' && <ForLawyers />}
        {route.name === 'admin' && <Admin />}
        {route.name === 'trust' && <Trust />}
      </main>

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
              <a href="#/">Find a lawyer</a>
              <a href="#/trust">How verification works</a>
              <a href="#/trust">Ranking &amp; promoted placement</a>
            </div>
            <div>
              <h4>Lawyers</h4>
              <a href="#/for-lawyers">List your practice</a>
              <a href="#/for-lawyers">Submission checklist</a>
              <a href="#/admin">Admin console</a>
            </div>
          </div>
          <div className="footer-note row wrap gap-12">
            <span>© 2026 Law Den (prototype). Not a law firm and not a lawyer referral service.</span>
            <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/trust')}>
              Read the transparency notes <Icon.chevron size={13} />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

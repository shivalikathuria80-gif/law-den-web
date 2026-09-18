'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteChrome } from '../components/SiteChrome';
import { LawyerProfile } from '../views/LawyerProfile';

/**
 * On the static preview host only the seeded profiles have their own file, so a profile
 * approved during a demo lands here. Its slug is still in the URL, and the directory lives
 * in the browser, so the profile renders client-side instead of showing a dead end.
 */
export default function NotFound() {
  const [slug, setSlug] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/\/lawyer\/([^/]+)\/?$/);
    setSlug(match ? decodeURIComponent(match[1]!) : null);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (slug) {
    return (
      <SiteChrome>
        <LawyerProfile slug={slug} />
      </SiteChrome>
    );
  }

  return (
    <SiteChrome>
      <div className="shell" style={{ padding: '80px 0' }}>
        <div className="empty">
          <h3>Page not found</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>That address does not match anything on Law Den.</p>
          <Link className="btn secondary" href="/find">Back to the directory</Link>
        </div>
      </div>
    </SiteChrome>
  );
}

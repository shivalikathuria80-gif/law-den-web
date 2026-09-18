'use client';

import { useEffect, useState } from 'react';
import { SiteChrome } from '../components/SiteChrome';
import { AdminApp } from './AdminApp';
import { Directory } from './Directory';
import { ForLawyers } from './ForLawyers';
import { Landing } from './Landing';
import { LawyerProfile } from './LawyerProfile';
import { Trust } from './Trust';

/**
 * The preview build ships as a single document, because the private preview host serves it
 * from a path this build cannot know. Routes become hashes; the deployed app keeps real URLs.
 */
const parse = (hash: string) => {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  const [head, tail] = path.split('/');
  if (head === 'admin') return { name: 'admin' as const };
  if (head === 'lawyer' && tail) return { name: 'lawyer' as const, slug: tail };
  if (head === 'find') return { name: 'find' as const };
  if (head === 'for-lawyers') return { name: 'for-lawyers' as const };
  if (head === 'trust') return { name: 'trust' as const };
  return { name: 'landing' as const };
};

export const PreviewApp = () => {
  const [route, setRoute] = useState(() => parse(''));

  useEffect(() => {
    const sync = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  if (route.name === 'admin') return <AdminApp />;

  return (
    <SiteChrome>
      {route.name === 'landing' && <Landing />}
      {route.name === 'find' && <Directory />}
      {route.name === 'lawyer' && <LawyerProfile slug={route.slug} />}
      {route.name === 'for-lawyers' && <ForLawyers />}
      {route.name === 'trust' && <Trust />}
    </SiteChrome>
  );
};

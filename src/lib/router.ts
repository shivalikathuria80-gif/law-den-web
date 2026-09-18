import { useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'directory' }
  | { name: 'lawyer'; slug: string }
  | { name: 'for-lawyers' }
  | { name: 'trust' };

const parse = (hash: string): Route => {
  const path = hash.replace(/^#\/?/, '').split('?')[0]!.replace(/\/$/, '');
  const [head, tail] = path.split('/');
  switch (head) {
    case 'lawyer':
      return tail ? { name: 'lawyer', slug: tail } : { name: 'directory' };
    case 'for-lawyers':
      return { name: 'for-lawyers' };
    case 'trust':
      return { name: 'trust' };
    case 'find':
      return { name: 'directory' };
    default:
      return { name: 'landing' };
  }
};

export const navigate = (to: string): void => {
  window.location.hash = to.startsWith('#') ? to : `#${to}`;
};

export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
};

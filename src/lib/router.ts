import { useEffect, useState } from 'react';

export type Route =
  | { name: 'directory' }
  | { name: 'lawyer'; slug: string }
  | { name: 'for-lawyers' }
  | { name: 'admin' }
  | { name: 'trust' };

const parse = (hash: string): Route => {
  const path = hash.replace(/^#\/?/, '').split('?')[0]!.replace(/\/$/, '');
  const [head, tail] = path.split('/');
  switch (head) {
    case 'lawyer':
      return tail ? { name: 'lawyer', slug: tail } : { name: 'directory' };
    case 'for-lawyers':
      return { name: 'for-lawyers' };
    case 'admin':
      return { name: 'admin' };
    case 'trust':
      return { name: 'trust' };
    default:
      return { name: 'directory' };
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

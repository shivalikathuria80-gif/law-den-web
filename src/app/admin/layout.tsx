import type { ReactNode } from 'react';

export const metadata = {
  title: 'Law Den · Reviewer console',
  robots: { index: false, follow: false },
};

/**
 * The console deliberately does not share the public site's chrome, and nothing on the
 * public site links to it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

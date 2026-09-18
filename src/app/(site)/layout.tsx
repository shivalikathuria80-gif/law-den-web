import type { ReactNode } from 'react';
import { PREVIEW_MODE } from '../../lib/preview';
import { SiteChrome } from '../../components/SiteChrome';

export default function SiteLayout({ children }: { children: ReactNode }) {
  // The preview build renders its own chrome inside the single-document shell.
  if (PREVIEW_MODE) return <>{children}</>;
  return <SiteChrome>{children}</SiteChrome>;
}

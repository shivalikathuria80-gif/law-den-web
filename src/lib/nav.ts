'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PREVIEW_MODE } from './preview';

/** Client-side navigation helper so views do not each reach for the router directly. */
export const useNav = () => {
  const router = useRouter();
  return useCallback(
    (to: string) => {
      // The preview build is a single document: routes are hashes there.
      if (PREVIEW_MODE) { window.location.hash = to; return; }
      router.push(to);
    },
    [router],
  );
};

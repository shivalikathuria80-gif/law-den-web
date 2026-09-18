'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/** Client-side navigation helper so views do not each reach for the router directly. */
export const useNav = () => {
  const router = useRouter();
  return useCallback((to: string) => router.push(to), [router]);
};

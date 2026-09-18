'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../auth';
import { StoreProvider } from '../store';

export const Providers = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <StoreProvider>{children}</StoreProvider>
  </AuthProvider>
);

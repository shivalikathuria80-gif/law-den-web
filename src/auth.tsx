'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  authErrorMessage,
  createUserWithEmailAndPassword,
  fbSignOut,
  getFirebaseAuth,
  GoogleAuthProvider,
  isNetworkError,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from './lib/firebase';

export const UNREACHABLE_CODE = 'auth/unreachable';

const UNREACHABLE_MESSAGE =
  'Cannot reach Firebase from this page. That usually means the host blocks Google endpoints '
  + '(the private preview host does) or the network is offline.';

/** How long to wait on Firebase before calling it unreachable. */
const AUTH_TIMEOUT_MS = 8000;

const unavailable = (): Error => {
  const error = new Error(UNREACHABLE_MESSAGE);
  (error as Error & { code?: string }).code = UNREACHABLE_CODE;
  return error;
};

export const isUnavailable = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === UNREACHABLE_CODE;

/** Firebase can hang behind a blocking proxy, so every call is bounded. */
const withTimeout = async <T,>(work: Promise<T>): Promise<T> => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(unavailable()), AUTH_TIMEOUT_MS); }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};

/** Emails allowed into the admin console when signed in with Firebase. */
export const ADMIN_EMAILS = ['shivalikathuria80@gmail.com', 'admin@lawden.demo'];

export interface Account {
  uid: string;
  email: string;
  name: string;
  createdAt: string;
  /** 'firebase' when the account is a real Firebase user, 'local' for the offline demo session. */
  source: 'firebase' | 'local';
}

const LOCAL_SESSION_KEY = 'lawden.session.v1';
const KNOWN_USERS_KEY = 'lawden.users.v1';

/** Locally recorded sign-ups, so the admin dashboard can show accounts created on this device. */
export const readKnownUsers = (): Account[] => {
  try {
    const raw = window.localStorage.getItem(KNOWN_USERS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
};

const rememberUser = (account: Account) => {
  try {
    const all = readKnownUsers();
    if (all.some((u) => u.email.toLowerCase() === account.email.toLowerCase())) return;
    window.localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify([account, ...all].slice(0, 200)));
  } catch { /* storage unavailable */ }
};

interface AuthValue {
  account: Account | null;
  loading: boolean;
  /** 'firebase' once Firebase answers, 'offline' when it cannot be reached from this origin. */
  mode: 'firebase' | 'offline' | 'unknown';
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Explicit opt-in to a local demo session when Firebase cannot be reached. */
  continueOffline: (name: string, email: string) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

const localAccount = (name: string, email: string): Account => ({
  uid: `local-${Math.random().toString(36).slice(2, 10)}`,
  email,
  name,
  createdAt: new Date().toISOString(),
  source: 'local',
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'firebase' | 'offline' | 'unknown'>('unknown');

  useEffect(() => {
    // Restore an offline demo session first — it is the only state we control locally.
    try {
      const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
      if (raw) setAccount(JSON.parse(raw) as Account);
    } catch { /* storage unavailable */ }

    const auth = getFirebaseAuth();
    if (!auth) {
      setMode('offline');
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        setMode('firebase');
        if (user) {
          const next: Account = {
            uid: user.uid,
            email: user.email ?? '',
            name: user.displayName || (user.email ?? '').split('@')[0] || 'Member',
            createdAt: user.metadata.creationTime ?? new Date().toISOString(),
            source: 'firebase',
          };
          setAccount(next);
          rememberUser(next);
        } else {
          // Keep an offline session if one exists; otherwise there is nobody signed in.
          setAccount((prev) => (prev?.source === 'local' ? prev : null));
        }
        setLoading(false);
      },
      () => { setMode('offline'); setLoading(false); },
    );
    return unsub;
  }, []);

  const startLocalSession = useCallback((name: string, email: string) => {
    const next = localAccount(name, email);
    setMode('offline');
    setAccount(next);
    rememberUser(next);
    try { window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  /**
   * A failure to reach Firebase is reported, never papered over: silently creating a local
   * session made a wrong password look like a successful sign-in.
   */
  const handleFailure = useCallback((e: unknown): never => {
    const code = (e as { code?: string }).code ?? '';
    if (code === UNREACHABLE_CODE || isNetworkError(code)) {
      setMode('offline');
      throw unavailable();
    }
    throw new Error(authErrorMessage(code));
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw unavailable();
    try {
      const cred = await withTimeout(createUserWithEmailAndPassword(auth, email, password));
      if (name) {
        await updateProfile(cred.user, { displayName: name });
        // onAuthStateChanged may already have fired with an empty display name.
        setAccount((prev) => (prev && prev.uid === cred.user.uid ? { ...prev, name } : prev));
      }
      setMode('firebase');
    } catch (e) {
      handleFailure(e);
    }
  }, [handleFailure]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw unavailable();
    try {
      await withTimeout(signInWithEmailAndPassword(auth, email, password));
      setMode('firebase');
    } catch (e) {
      handleFailure(e);
    }
  }, [handleFailure]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw unavailable();
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setMode('firebase');
    } catch (e) {
      handleFailure(e);
    }
  }, [handleFailure]);

  const signOut = useCallback(async () => {
    try { window.localStorage.removeItem(LOCAL_SESSION_KEY); } catch { /* ignore */ }
    setAccount(null);
    const auth = getFirebaseAuth();
    if (auth) { try { await fbSignOut(auth); } catch { /* already signed out */ } }
  }, []);

  const value = useMemo<AuthValue>(() => ({
    account,
    loading,
    mode,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    continueOffline: startLocalSession,
    isAdmin: !!account && ADMIN_EMAILS.includes(account.email.toLowerCase()),
  }), [account, loading, mode, signUp, signIn, signInWithGoogle, signOut, startLocalSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

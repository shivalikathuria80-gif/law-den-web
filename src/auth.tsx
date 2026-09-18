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

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) return startLocalSession(name, email);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      setMode('firebase');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (isNetworkError(code)) return startLocalSession(name, email);
      throw new Error(authErrorMessage(code));
    }
  }, [startLocalSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) return startLocalSession(email.split('@')[0] ?? 'Member', email);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMode('firebase');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (isNetworkError(code)) return startLocalSession(email.split('@')[0] ?? 'Member', email);
      throw new Error(authErrorMessage(code));
    }
  }, [startLocalSession]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Google sign-in needs a network connection to Firebase, which this origin blocks.');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setMode('firebase');
    } catch (e) {
      throw new Error(authErrorMessage((e as { code?: string }).code ?? ''));
    }
  }, []);

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
    isAdmin: !!account && ADMIN_EMAILS.includes(account.email.toLowerCase()),
  }), [account, loading, mode, signUp, signIn, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

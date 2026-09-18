import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyAWStzBiuVSTLxeKtKatdRYfI1O5Kns_qU',
  authDomain: 'law-den.firebaseapp.com',
  projectId: 'law-den',
  storageBucket: 'law-den.firebasestorage.app',
  messagingSenderId: '370549831371',
  appId: '1:370549831371:web:827ea2c9504a8acc180d4e',
  measurementId: 'G-X0LEVEFGCN',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Firebase is initialised lazily and defensively: the app is also served from sandboxed
 * origins (private artifact hosting) where outbound calls to Google are blocked by CSP.
 * Callers fall back to a clearly-labelled local session when this returns null.
 */
export const getFirebaseAuth = (): Auth | null => {
  if (auth) return auth;
  try {
    app = app ?? initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Exposed for diagnostics and for the end-to-end script, which cleans up its test account.
    (window as unknown as Record<string, unknown>).__lawdenAuth = auth;
    void isSupported()
      .then((ok) => { if (ok && app) getAnalytics(app); })
      .catch(() => { /* analytics is optional and blocked on sandboxed origins */ });
    return auth;
  } catch {
    return null;
  }
};

export const isNetworkError = (code: string): boolean =>
  code === 'auth/network-request-failed' || code === 'auth/internal-error' || code === 'unavailable';

export const authErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email': return 'That email address does not look right.';
    case 'auth/missing-password': return 'Enter your password.';
    case 'auth/weak-password': return 'Use at least 6 characters for the password.';
    case 'auth/email-already-in-use': return 'An account already exists with this email — sign in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Email or password is incorrect.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a minute and try again.';
    case 'auth/popup-closed-by-user': return 'The Google sign-in window was closed before finishing.';
    case 'auth/popup-blocked': return 'Your browser blocked the Google sign-in window.';
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not enabled for this domain yet. Add it under Firebase console → Authentication → Settings → Authorized domains, or use email and password.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is switched off in the Firebase console → Authentication → Sign-in method.';
    default: return 'Sign-in failed. Please try again.';
  }
};

export type { User };
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  fbSignOut,
  GoogleAuthProvider,
};

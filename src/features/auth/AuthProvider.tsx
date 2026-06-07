'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth, getFirestoreDb, doc, getDoc, setDoc, collection, getDocs } from '@/lib/firebase';
import { STORAGE_KEYS, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS } from '@/lib/constants';
import type { User } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  bizId: string | null;
  loading: boolean;
  error: string | null;
  mustChangePassword: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, bizName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  bizId: null,
  loading: true,
  error: null,
  mustChangePassword: false,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  clearError: () => {},
  sendPasswordReset: async () => {},
  changePassword: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    bizId: null,
    loading: true,
    error: null,
    mustChangePassword: false,
  });

  const isLoginAttempt = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState({ firebaseUser: null, user: null, bizId: null, loading: false, error: null, mustChangePassword: false });
        return;
      }

      const uid = fbUser.uid;
      const email = fbUser.email || '';

      try {
        const db = getFirestoreDb();

        // 1. Check super_admin
        let isSuperAdmin = false;
        try {
          const saSnap = await getDoc(doc(db, 'super_admins', uid));
          if (saSnap.exists()) {
            isSuperAdmin = true;
          }
        } catch {
          // permission denied is fine — they're just not a super admin
        }

        // 2. Check business owner
        try {
          const ownerSnap = await getDoc(doc(db, 'businesses', uid));
          if (ownerSnap.exists()) {
            const data = ownerSnap.data();
            const bizDb = data.db;
            const ownerUser = bizDb?.users?.find((u: User) => u.role === 'owner') || {
              id: uid,
              name: data.cfg?.biz_name || 'Owner',
              role: isSuperAdmin ? ('super_admin' as const) : ('owner' as const),
              email,
            };

            if (isSuperAdmin) {
              ownerUser.role = 'super_admin' as typeof ownerUser.role;
            }

            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(bizDb || {}));
              localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.cfg || {}));
            }

            setState({
              firebaseUser: fbUser,
              user: ownerUser,
              bizId: uid,
              loading: false,
              error: null,
              mustChangePassword: false,
            });
            return;
          }
        } catch (e) {
          console.warn('[Zikkit Auth] businesses check failed:', e);
        }

        // 3. If super_admin but no business — let them in (admin panel only)
        if (isSuperAdmin) {
          setState({
            firebaseUser: fbUser,
            user: { id: uid, name: 'Admin', role: 'super_admin', email },
            bizId: uid,
            loading: false,
            error: null,
            mustChangePassword: false,
          });
          return;
        }

        // 4. Check technician via tech_lookup
        try {
          const lookupKey = email.toLowerCase().replace(/[@.]/g, '_');
          const lookupSnap = await getDoc(doc(db, 'tech_lookup', lookupKey));
          if (lookupSnap.exists()) {
            const bizId = lookupSnap.data().bizId;
            const bizSnap = await getDoc(doc(db, 'businesses', bizId));
            if (bizSnap.exists()) {
              const bizData = bizSnap.data().db;
              const tech = bizData?.users?.find(
                (u: User) =>
                  u.email?.toLowerCase() === email.toLowerCase() &&
                  u.role !== 'owner'
              );
              if (tech) {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(bizData || {}));
                  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(bizSnap.data().cfg || {}));
                }
                setState({
                  firebaseUser: fbUser,
                  user: tech,
                  bizId,
                  loading: false,
                  error: null,
                  mustChangePassword: !!tech.mustChangePassword,
                });
                return;
              }
            }
          } else {
            // Auto-heal: search all businesses for this email
            try {
              const bizsSnap = await getDocs(collection(db, 'businesses'));
              for (const bizDoc of bizsSnap.docs) {
                const bizData = bizDoc.data();
                const users = bizData?.db?.users || [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tech = users.find((u: any) =>
                  u.email?.toLowerCase() === email.toLowerCase() && u.role !== 'owner'
                );
                if (tech) {
                  // Create missing tech_lookup for next time
                  try {
                    await setDoc(doc(db, 'tech_lookup', lookupKey), {
                      bizId: bizDoc.id,
                      email: email.toLowerCase(),
                      name: tech.name || '',
                      role: tech.role || 'technician',
                      created: new Date().toISOString(),
                    });
                  } catch {}

                  if (typeof window !== 'undefined') {
                    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(bizData.db || {}));
                    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(bizData.cfg || {}));
                  }
                  setState({
                    firebaseUser: fbUser,
                    user: tech,
                    bizId: bizDoc.id,
                    loading: false,
                    error: null,
                    mustChangePassword: !!tech.mustChangePassword,
                  });
                  return;
                }
              }
            } catch (healErr) {
              console.warn('[Auth] Auto-heal failed:', healErr);
            }
          }
        } catch (e) {
          console.warn('[Auth] tech_lookup check failed:', e);
        }

        // 5. No business doc found — let them in as basic owner
        //    so they can complete setup or contact support.
        //    DO NOT sign them out — this was the bug that locked users out.
        console.warn('[Zikkit Auth] User authenticated but no business doc found. Letting in as basic user.');
        setState({
          firebaseUser: fbUser,
          user: { id: uid, name: email.split('@')[0] || 'User', role: 'owner', email },
          bizId: uid,
          loading: false,
          error: null,
          mustChangePassword: false,
        });
      } catch (e) {
        console.error('[Zikkit Auth] Fatal error during auth check:', e);
        // Even on fatal error — let them in as basic user. Better than locking them out.
        setState({
          firebaseUser: fbUser,
          user: { id: uid, name: email.split('@')[0] || 'User', role: 'owner', email },
          bizId: uid,
          loading: false,
          error: null,
          mustChangePassword: false,
        });
      }
    });

    return unsubscribe;
  }, []);

  const checkLockout = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const lockUntil = parseInt(localStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL) || '0');
    if (lockUntil > Date.now()) {
      const mins = Math.ceil((lockUntil - Date.now()) / 60000);
      return 'יותר מדי ניסיונות. נסה שוב בעוד ' + mins + ' דקות';
    }
    return null;
  }, []);

  const trackFailedAttempt = useCallback(() => {
    if (typeof window === 'undefined') return;
    const attempts = parseInt(localStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS) || '0') + 1;
    localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, String(attempts));
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(Date.now() + LOCKOUT_DURATION_MS));
      localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, '0');
    }
  }, []);

  const clearLockout = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const lockMsg = checkLockout();
      if (lockMsg) {
        setState((prev) => ({ ...prev, error: lockMsg }));
        return;
      }

      isLoginAttempt.current = true;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const auth = getFirebaseAuth();
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        clearLockout();
      } catch (e: unknown) {
        isLoginAttempt.current = false;
        trackFailedAttempt();
        const code = (e as { code?: string }).code;
        console.error('[Zikkit Auth] Login failed:', code);
        const messages: Record<string, string> = {
          'auth/invalid-credential': 'מייל או סיסמה שגויים',
          'auth/user-not-found': 'לא קיים חשבון עם המייל הזה',
          'auth/wrong-password': 'סיסמה שגויה',
          'auth/too-many-requests': 'יותר מדי ניסיונות — חכה כמה דקות',
          'auth/network-request-failed': 'אין חיבור לאינטרנט',
          'auth/invalid-email': 'כתובת מייל לא תקינה',
          'auth/user-disabled': 'החשבון הזה הושעה',
        };
        setState((prev) => ({
          ...prev,
          loading: false,
          error: messages[code || ''] || 'התחברות נכשלה: ' + (e as Error).message,
        }));
      }
    },
    [checkLockout, clearLockout, trackFailedAttempt]
  );

  const loginWithGoogle = useCallback(async () => {
    isLoginAttempt.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const db = getFirestoreDb();

      // Check if this user already has a business
      const existing = await getDoc(doc(db, 'businesses', user.uid));

      if (!existing.exists()) {
        // First-time Google sign-in — create a business with their name
        const bizName = user.displayName || (user.email?.split('@')[0] || 'My Business');
        const newDb = {
          users: [{
            id: 1,
            name: user.displayName || bizName + ' Owner',
            username: user.email || '',
            email: user.email || '',
            role: 'owner',
            phone: user.phoneNumber || '',
            zip: '',
            commission: 0,
          }],
          leads: [], jobs: [], quotes: [],
          products: [
            { id: 1, name: 'Service Call', category: 'service', unit: 'job', price: 89, cost: 0, desc: 'Diagnostic visit' },
            { id: 2, name: 'Labor (per hour)', category: 'labor', unit: 'hour', price: 85, cost: 0, desc: 'Hourly labor rate' },
          ],
          botLog: [], expenses: [],
        };

        let newCfg: Record<string, unknown> = {
          biz_name: bizName,
          setup_done: false,
          lang: 'en',
          currency: 'USD',
          region: 'US',
        };

        try {
          const geoLang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
          const isHebrew = geoLang.includes('he') || geoLang.includes('iw');
          const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
          const isIsrael = isHebrew || tz.includes('Jerusalem') || tz.includes('Israel');
          if (isIsrael) {
            newCfg = { ...newCfg, lang: 'he', currency: 'ILS', region: 'IL' };
          }
        } catch {}

        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        await setDoc(doc(db, 'businesses', user.uid), {
          db: newDb,
          cfg: { ...newCfg, plan: 'trial', planStatus: 'trial', trialEnds: trialEnd },
          created: new Date().toISOString(),
          ownerEmail: user.email?.toLowerCase() || '',
        });

        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email?.toLowerCase() || '',
            bizId: user.uid,
            role: 'owner',
            created: new Date().toISOString(),
          });
        } catch {}

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('zikkit_registered', 'google');
        }
      }

      clearLockout();
      // onAuthStateChanged handles the rest
    } catch (e: unknown) {
      isLoginAttempt.current = false;
      const code = (e as { code?: string }).code;
      console.error('[Zikkit Auth] Google sign-in failed:', code);

      // User cancelled — not an error
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return;
      }

      const messages: Record<string, string> = {
        'auth/popup-blocked': 'הדפדפן חסם את חלון Google. אפשר חלונות קופצים ונסה שוב.',
        'auth/network-request-failed': 'אין חיבור לאינטרנט',
        'auth/operation-not-allowed': 'התחברות עם Google לא פעילה. צור קשר עם התמיכה.',
      };
      setState((prev) => ({
        ...prev,
        loading: false,
        error: messages[code || ''] || 'התחברות עם Google נכשלה',
      }));
    }
  }, [clearLockout]);

  const register = useCallback(
    async (email: string, password: string, bizName: string) => {
      isLoginAttempt.current = true;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      let createdUser: import('firebase/auth').UserCredential | null = null;
      try {
        const auth = getFirebaseAuth();
        const db = getFirestoreDb();

        const cleanEmail = email.trim().toLowerCase();
        createdUser = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const uid = createdUser.user.uid;

        const newDb = {
          users: [{ id: 1, name: bizName + ' Owner', username: email, email, role: 'owner', phone: '', zip: '', commission: 0 }],
          leads: [], jobs: [], quotes: [],
          products: [
            { id: 1, name: 'Service Call', category: 'service', unit: 'job', price: 89, cost: 0, desc: 'Diagnostic visit' },
            { id: 2, name: 'Labor (per hour)', category: 'labor', unit: 'hour', price: 85, cost: 0, desc: 'Hourly labor rate' },
          ],
          botLog: [], expenses: [],
        };
        let newCfg: Record<string, unknown> = {
          biz_name: bizName,
          setup_done: false,
          lang: 'en',
          currency: 'USD',
          region: 'US',
        };

        try {
          const geoLang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
          const isHebrew = geoLang.includes('he') || geoLang.includes('iw');
          const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
          const isIsrael = isHebrew || tz.includes('Jerusalem') || tz.includes('Israel');
          if (isIsrael) {
            newCfg = { ...newCfg, lang: 'he', currency: 'ILS', region: 'IL' };
          }
        } catch {}

        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        await setDoc(doc(db, 'businesses', uid), {
          db: newDb,
          cfg: { ...newCfg, plan: 'trial', planStatus: 'trial', trialEnds: trialEnd },
          created: new Date().toISOString(),
          ownerEmail: cleanEmail,
        });

        try {
          await setDoc(doc(db, 'users', uid), {
            email: cleanEmail, bizId: uid, role: 'owner', created: new Date().toISOString(),
          });
        } catch {}

        try {
          await sendEmailVerification(createdUser.user);
        } catch {}

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('zikkit_registered', 'trial');
        }
      } catch (e: unknown) {
        isLoginAttempt.current = false;
        const code = (e as { code?: string }).code;

        if (createdUser && code !== 'auth/email-already-in-use' && code !== 'auth/weak-password') {
          try {
            await createdUser.user.delete();
          } catch {
            try { await signOut(getFirebaseAuth()); } catch {}
          }
        }

        const messages: Record<string, string> = {
          'auth/email-already-in-use': 'המייל כבר רשום. התחבר במקום.',
          'auth/weak-password': 'סיסמה חייבת להיות לפחות 6 תווים',
        };
        const friendlyMsg = messages[code || '']
          || (code ? 'שגיאה: ' + code : 'שגיאה ביצירת חשבון: ' + (e as Error).message);
        setState((prev) => ({
          ...prev, loading: false,
          error: friendlyMsg,
        }));
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.DATA);
        localStorage.removeItem(STORAGE_KEYS.CONFIG);
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/user-not-found') {
        throw new Error('המייל הזה לא רשום במערכת');
      }
      throw new Error('שגיאה בשליחת מייל. נסה שוב.');
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const fbUser = state.firebaseUser;
    if (!fbUser) throw new Error('Not authenticated');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

    try {
      await updatePassword(fbUser, newPassword);
      setState((prev) => ({ ...prev, mustChangePassword: false }));
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/requires-recent-login') {
        throw new Error('Session expired. Please log out and log in again, then change password.');
      }
      throw new Error('Failed to change password: ' + (e as Error).message);
    }
  }, [state.firebaseUser]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        loginWithGoogle,
        logout,
        clearError,
        sendPasswordReset,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Firebase client config — ENV ONLY.
 *
 * The previous version silently fell back to a hardcoded project when env vars
 * were missing, which meant a misconfigured deployment could read/write the
 * wrong production database without any error. Now: every region (IL / CA)
 * points at its own Firebase project through NEXT_PUBLIC_FIREBASE_* and a
 * missing config fails loudly in the browser.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export const FIREBASE_CONFIGURED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!FIREBASE_CONFIGURED && typeof window !== 'undefined') {
  // Fail loudly in the browser — never talk to a guessed project.
  console.error('[Zikkit] Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY / NEXT_PUBLIC_FIREBASE_PROJECT_ID (see .env.example).');
}

// Initialize once. During `next build` (server, no env) placeholders keep the build green.
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIGURED ? firebaseConfig : { ...firebaseConfig, apiKey: firebaseConfig.apiKey || 'missing', projectId: firebaseConfig.projectId || 'missing' })
  : getApps()[0];
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);
const storage = getStorage(app);

export function getFirebaseAuth(): Auth {
  return auth;
}

export function getFirestoreDb(): Firestore {
  return firestore;
}

export function getFirebaseStorage() {
  return storage;
}

// Re-export Firestore helpers for convenience
export { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, query, where, orderBy, onSnapshot };
// Re-export Storage helpers
export { ref, uploadBytes, getDownloadURL };
export { firebaseConfig };

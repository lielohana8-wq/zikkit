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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAneOk2JGTa7yTrG-wve4mFOGOIVo8FT0E',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'zikkit-5e554.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-5e554',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'zikkit-5e554.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '489216127564',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:489216127564:web:2ebd9341d3c620e9b4bae9',
};

// Initialize once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
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

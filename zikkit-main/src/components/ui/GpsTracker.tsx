'use client';
import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthProvider';

const GPS_INTERVAL = 60000; // every 60 seconds

/**
 * Technician presence.
 *
 * Fix: this used to rewrite the ENTIRE business database every 60 seconds
 * (saveData({ ...db, users })) just to store a lat/lng — the single biggest
 * source of write storms and stale-overwrite bugs. It now writes a tiny
 * per-user document: businesses/{bizId}/presence/{uid}.
 */
export function GpsTracker() {
  const { user, bizId, firebaseUser } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTech = user?.role === 'technician' || user?.role === 'tech';

  useEffect(() => {
    if (!isTech || !bizId || !firebaseUser?.uid || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    const uid = firebaseUser.uid;
    const ref = doc(getFirestoreDb(), 'businesses', bizId, 'presence', uid);

    const write = (payload: Record<string, unknown>) => setDoc(ref, { uid, userId: user?.id ?? null, name: user?.name || '', email: user?.email || '', ...payload }, { merge: true }).catch((e) => console.warn('[GPS] write failed:', e?.message));

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => write({ lastGps: { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: new Date().toISOString(), accuracy: pos.coords.accuracy }, isActive: true, updated: new Date().toISOString() }),
        (err) => console.warn('[GPS] Error:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    };

    updateLocation();
    intervalRef.current = setInterval(updateLocation, GPS_INTERVAL);
    const handleHide = () => { if (document.visibilityState === 'hidden') write({ isActive: false, updated: new Date().toISOString() }); };
    document.addEventListener('visibilitychange', handleHide);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleHide);
    };
  }, [isTech, bizId, firebaseUser?.uid, user?.id, user?.name, user?.email]);

  return null;
}

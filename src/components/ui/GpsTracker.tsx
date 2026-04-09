'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useData } from '@/hooks/useFirestore';

const GPS_INTERVAL = 60000; // every 60 seconds

export function GpsTracker() {
  const { user, bizId } = useAuth();
  const { db, saveData } = useData();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTech = user?.role === 'technician' || user?.role === 'tech';

  useEffect(() => {
    if (!isTech || !bizId || !('geolocation' in navigator)) return;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: new Date().toISOString(), accuracy: pos.coords.accuracy };
          // Update tech's location in users array
          const users = [...(db.users || [])];
          const idx = users.findIndex(u => u.email === user?.email || u.name === user?.name);
          if (idx >= 0) {
            users[idx] = { ...users[idx], lastGps: loc, isActive: true } as any;
            saveData({ ...db, users });
          }
        },
        (err) => console.warn('[GPS] Error:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    };

    // Initial location
    updateLocation();
    // Update every 60 seconds
    intervalRef.current = setInterval(updateLocation, GPS_INTERVAL);

    // Set inactive on page close
    const handleBeforeUnload = () => {
      const users = [...(db.users || [])];
      const idx = users.findIndex(u => u.email === user?.email || u.name === user?.name);
      if (idx >= 0) {
        users[idx] = { ...users[idx], isActive: false } as any;
        // Can't async save on unload, use localStorage flag
        localStorage.setItem('_gps_inactive', JSON.stringify({ idx, time: Date.now() }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTech, bizId, user]);

  return null; // invisible component
}

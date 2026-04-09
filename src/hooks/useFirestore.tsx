'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { getFirestoreDb, doc, getDoc, setDoc } from '@/lib/firebase';
import { STORAGE_KEYS, SYNC_INTERVAL_MS } from '@/lib/constants';
import type { BusinessDatabase, BusinessConfig } from '@/types';

interface DataContextValue {
  db: BusinessDatabase;
  cfg: BusinessConfig;
  bizId: string | null;
  setBizId: (id: string | null) => void;
  saveData: (data: BusinessDatabase) => Promise<void>;
  saveCfg: (patch: Partial<BusinessConfig>) => Promise<BusinessConfig>;
  syncFromCloud: () => Promise<void>;
  loading: boolean;
}

const defaultDb: BusinessDatabase = { users: [], leads: [], jobs: [], quotes: [], products: [], botLog: [], expenses: [] };
const defaultCfg: BusinessConfig = {};

const DataContext = createContext<DataContextValue>({
  db: defaultDb, cfg: defaultCfg, bizId: null, setBizId: () => {},
  saveData: async () => {}, saveCfg: async () => defaultCfg,
  syncFromCloud: async () => {}, loading: false,
});

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<BusinessDatabase>(() => loadLocal(STORAGE_KEYS.DATA, defaultDb));
  const [cfg, setCfg] = useState<BusinessConfig>(() => loadLocal(STORAGE_KEYS.CONFIG, defaultCfg));
  const [bizId, setBizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bizIdRef = useRef<string | null>(null);
  const cfgRef = useRef<BusinessConfig>(cfg);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);

  // Keep refs in sync
  useEffect(() => { bizIdRef.current = bizId; }, [bizId]);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  const saveData = useCallback(async (data: BusinessDatabase) => {
    setDb(data);
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data));
    const id = bizIdRef.current;
    if (id) {
      try {
        const firestore = getFirestoreDb();
        await setDoc(doc(firestore, 'businesses', id), { db: data }, { merge: true });
      } catch (e) { console.warn('[Zikkit Data] Cloud save failed:', e); }
    }
  }, []);

  const saveCfg = useCallback(async (patch: Partial<BusinessConfig>): Promise<BusinessConfig> => {
    // Use React state first, then localStorage as fallback — never start from empty
    const stateValue = cfgRef.current || {};
    let lsValue = {};
    try { lsValue = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}'); } catch {}
    const current = Object.keys(stateValue).length > 0 ? stateValue : lsValue;
    const merged = { ...current, ...patch };
    setCfg(merged);
    cfgRef.current = merged;
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
    const id = bizIdRef.current;
    if (id) {
      try {
        const firestore = getFirestoreDb();
        await setDoc(doc(firestore, 'businesses', id), { cfg: merged }, { merge: true });
      } catch (e) { console.warn('[Zikkit Data] Config save failed:', e); }
    }
    return merged;
  }, []);

  const syncFromCloud = useCallback(async () => {
    const id = bizIdRef.current;
    if (!id || hasSynced.current || isSyncing.current) return;
    isSyncing.current = true;
    hasSynced.current = true;
    setLoading(true);
    try {
      const firestore = getFirestoreDb();
      const snap = await getDoc(doc(firestore, 'businesses', id));
      if (snap.exists()) {
        const data = snap.data();
        if (data.db) { localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data.db)); setDb(data.db as BusinessDatabase); }
        if (data.cfg) { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.cfg)); setCfg(data.cfg as BusinessConfig); }
      }
    } catch (e) { console.warn('[Zikkit Data] Sync failed:', e); }
    finally { setLoading(false); isSyncing.current = false; }
  }, []);

  // Auto-sync timer
  useEffect(() => {
    if (!bizId) return;
    syncTimerRef.current = setInterval(() => {
      hasSynced.current = false;
      syncFromCloud();
    }, SYNC_INTERVAL_MS);
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current); };
  }, [bizId, syncFromCloud]);

  return (
    <DataContext.Provider value={{ db, cfg, bizId, setBizId, saveData, saveCfg, syncFromCloud, loading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

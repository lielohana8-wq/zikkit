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

function getBizId(ref: React.MutableRefObject<string | null>): string | null {
  if (ref.current) return ref.current;
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('zk_bizId') || localStorage.getItem('zk_bizId') || null;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<BusinessDatabase>(() => loadLocal(STORAGE_KEYS.DATA, defaultDb));
  const [cfg, setCfg] = useState<BusinessConfig>(() => loadLocal(STORAGE_KEYS.CONFIG, defaultCfg));
  const [bizId, setBizIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bizIdRef = useRef<string | null>(null);
  const cfgRef = useRef<BusinessConfig>(cfg);
  const lastSaveTime = useRef<number>(0);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);

  const setBizId = useCallback((id: string | null) => {
    setBizIdState(id);
    bizIdRef.current = id;
    if (id && typeof window !== 'undefined') {
      sessionStorage.setItem('zk_bizId', id);
      localStorage.setItem('zk_bizId', id);
    }
  }, []);

  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  const saveData = useCallback(async (data: BusinessDatabase) => {
    setDb(data);
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data));
    lastSaveTime.current = Date.now();
    const id = getBizId(bizIdRef);
    console.log('[Zikkit] saveData called, bizId=' + (id ? id.slice(0, 8) + '...' : 'NULL'));
    if (id) {
      try {
        const firestore = getFirestoreDb();
        await setDoc(doc(firestore, 'businesses', id), { db: JSON.parse(JSON.stringify(data)) }, { merge: true });
        console.log('[Zikkit] ✅ Saved to Firestore');
      } catch (e: any) {
        console.error('[Zikkit] ❌ Save FAILED:', e?.message || e);
      }
    } else {
      console.warn('[Zikkit] ⚠️ No bizId — only saved locally!');
    }
  }, []);

  const saveCfg = useCallback(async (patch: Partial<BusinessConfig>): Promise<BusinessConfig> => {
    const stateValue = cfgRef.current || {};
    let lsValue = {};
    try { lsValue = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}'); } catch {}
    const current = Object.keys(stateValue).length > 0 ? stateValue : lsValue;
    const merged = { ...current, ...patch };
    setCfg(merged);
    cfgRef.current = merged;
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
    lastSaveTime.current = Date.now();
    const id = getBizId(bizIdRef);
    if (id) {
      try {
        const firestore = getFirestoreDb();
        await setDoc(doc(firestore, 'businesses', id), { cfg: JSON.parse(JSON.stringify(merged)) }, { merge: true });
      } catch (e) { console.warn('[Zikkit] Config save failed:', e); }
    }
    return merged;
  }, []);

  const syncFromCloud = useCallback(async () => {
    const id = getBizId(bizIdRef);
    if (!id || isSyncing.current) return;
    if (Date.now() - lastSaveTime.current < 15000) return;
    isSyncing.current = true;
    setLoading(true);
    try {
      const firestore = getFirestoreDb();
      const snap = await getDoc(doc(firestore, 'businesses', id));
      if (snap.exists()) {
        const data = snap.data();
        if (Date.now() - lastSaveTime.current >= 15000) {
          if (data.db) { localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data.db)); setDb(data.db as BusinessDatabase); }
          if (data.cfg) { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.cfg)); setCfg(data.cfg as BusinessConfig); }
        }
      }
    } catch (e) { console.warn('[Zikkit] Sync failed:', e); }
    finally { setLoading(false); isSyncing.current = false; }
  }, []);

  useEffect(() => {
    if (bizId && !hasSynced.current) {
      hasSynced.current = true;
      syncFromCloud();
    }
  }, [bizId, syncFromCloud]);

  useEffect(() => {
    if (!bizId) return;
    const timer = setInterval(syncFromCloud, SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
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

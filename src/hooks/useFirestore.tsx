'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { onSnapshot, doc, collection, writeBatch, setDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { STORAGE_KEYS } from '@/lib/constants';
import { useToast } from '@/hooks/useToast';
import { KNOWN_COLLECTIONS, sanitize, sortById, docIdFor, isValidCollectionKey, type DataItem } from '@/lib/data/collections';
import { diffCollection } from '@/lib/data/diff';
import { offloadDataUrls, containsDataUrl } from '@/lib/data/offload';
import { drainInbox, backupLegacyBlob } from '@/lib/data/inbox';
import type { BusinessDatabase, BusinessConfig } from '@/types';

/**
 * DataProvider v2 — same public API as before (db / cfg / saveData / saveCfg),
 * completely different persistence:
 *
 *  • Real-time: one onSnapshot per collection instead of a 5-minute poll with a
 *    15-second "last write wins" window.
 *  • Diff writes: saveData({ ...db, jobs }) writes ONLY the changed / added /
 *    removed jobs (batched), never the whole database.
 *  • No localStorage mirror of the data (quota errors were crashing the app).
 *  • Base64 media is uploaded to Storage before writing.
 *  • Legacy inline arrays are drained into subcollections (see lib/data/inbox).
 *  • Failures are surfaced with a toast instead of console-only.
 */

interface DataContextValue {
  db: BusinessDatabase;
  cfg: BusinessConfig;
  bizId: string | null;
  setBizId: (id: string | null) => void;
  saveData: (data: BusinessDatabase) => Promise<void>;
  saveCfg: (patch: Partial<BusinessConfig>) => Promise<BusinessConfig>;
  /** Kept for backwards compatibility — data is live, this is a no-op. */
  syncFromCloud: () => Promise<void>;
  /** true until the first snapshot of every collection has arrived */
  loading: boolean;
  ready: boolean;
  /** Upsert one record without touching the rest of the collection. */
  saveItem: (key: string, item: DataItem) => Promise<void>;
  deleteItem: (key: string, id: string | number) => Promise<void>;
  /** Atomic sequential number, e.g. nextNumber('quote', 1000) → 1001, 1002, … */
  nextNumber: (name: string, start?: number) => Promise<number>;
}

const defaultDb = (): BusinessDatabase => ({ users: [], leads: [], jobs: [], quotes: [], products: [], botLog: [], expenses: [] } as unknown as BusinessDatabase);
const defaultCfg: BusinessConfig = {};

const DataContext = createContext<DataContextValue>({
  db: defaultDb(), cfg: defaultCfg, bizId: null, setBizId: () => {},
  saveData: async () => {}, saveCfg: async () => defaultCfg,
  syncFromCloud: async () => {}, loading: true, ready: false,
  saveItem: async () => {}, deleteItem: async () => {}, nextNumber: async () => 0,
});

function loadLocalCfg(): BusinessConfig {
  if (typeof window === 'undefined') return defaultCfg;
  try { const raw = localStorage.getItem(STORAGE_KEYS.CONFIG); return raw ? JSON.parse(raw) : defaultCfg; }
  catch { return defaultCfg; }
}

function mirrorCfg(cfg: BusinessConfig) {
  if (typeof window === 'undefined') return;
  try {
    let prev: Record<string, unknown> = {};
    try { prev = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}'); } catch {}
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ _langMigrated: prev._langMigrated, lang: cfg.lang, region: cfg.region, currency: cfg.currency, biz_name: cfg.biz_name }));
  } catch { /* quota — ignore */ }
}

const BATCH_LIMIT = 400;

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<BusinessDatabase>(defaultDb);
  const [cfg, setCfg] = useState<BusinessConfig>(loadLocalCfg);
  const [bizId, setBizIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();

  const dbRef = useRef<BusinessDatabase>(db);
  const cfgRef = useRef<BusinessConfig>(cfg);
  const bizIdRef = useRef<string | null>(null);
  const extraKeysRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Map<string, () => void>>(new Map());
  const pendingFirst = useRef<Set<string>>(new Set());
  const draining = useRef(false);
  const drainAgain = useRef<Record<string, unknown> | null>(null);

  useEffect(() => { dbRef.current = db; }, [db]);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  const setBizId = useCallback((id: string | null) => {
    if (bizIdRef.current === id) return;
    setBizIdState(id);
    bizIdRef.current = id;
    if (id && typeof window !== 'undefined') {
      try { sessionStorage.setItem('zk_bizId', id); localStorage.setItem('zk_bizId', id); } catch {}
    }
  }, []);

  // ---- subscribe to one collection ------------------------------------------------
  const subscribe = useCallback((id: string, key: string) => {
    if (listenersRef.current.has(key)) return;
    const firestore = getFirestoreDb();
    pendingFirst.current.add(key);
    const unsub = onSnapshot(collection(doc(firestore, 'businesses', id), key), (snap) => {
      const items = sortById(snap.docs.map((d) => d.data() as DataItem));
      setDb((prev) => { const next = { ...prev, [key]: items } as BusinessDatabase; dbRef.current = next; return next; });
      if (pendingFirst.current.delete(key) && pendingFirst.current.size === 0) setReady(true);
    }, (err) => {
      console.error(`[Zikkit] listener failed for ${key}:`, err?.message || err);
      if (pendingFirst.current.delete(key) && pendingFirst.current.size === 0) setReady(true);
    });
    listenersRef.current.set(key, unsub);
  }, []);

  // ---- business document: cfg + inbox + registered collections ------------------
  useEffect(() => {
    if (!bizId) return;
    const firestore = getFirestoreDb();
    const id = bizId;
    setReady(false);
    pendingFirst.current = new Set();
    for (const key of KNOWN_COLLECTIONS) subscribe(id, key);

    const unsubBiz = onSnapshot(doc(firestore, 'businesses', id), async (snap) => {
      const data = (snap.data() || {}) as Record<string, unknown>;
      const nextCfg = (data.cfg as BusinessConfig) || {};
      setCfg(nextCfg); cfgRef.current = nextCfg; mirrorCfg(nextCfg);

      const registered = (data.dataCollections as string[]) || [];
      for (const key of registered) if (isValidCollectionKey(key)) { extraKeysRef.current.add(key); subscribe(id, key); }

      // Inbox: anything still stored inline gets moved into subcollections.
      const inline = (data.db as Record<string, unknown>) || {};
      const hasInline = Object.values(inline).some((v) => Array.isArray(v) && v.length > 0);
      if (!hasInline) return;
      if (draining.current) { drainAgain.current = inline; return; }
      draining.current = true;
      try {
        if (!data.legacyBackupAt) await backupLegacyBlob(firestore, id, data);
        let moved = await drainInbox(firestore, id, inline);
        while (drainAgain.current) { const again = drainAgain.current; drainAgain.current = null; moved += await drainInbox(firestore, id, again); }
        if (moved > 0) console.info(`[Zikkit] migrated ${moved} records to the new data model`);
      } catch (e) {
        console.error('[Zikkit] inbox drain failed:', (e as Error)?.message || e);
        toast('Data migration hit an error — will retry on next change. ' + ((e as Error)?.message || ''), '#ff4d6d');
      } finally { draining.current = false; }
    }, (err) => console.error('[Zikkit] business listener failed:', err?.message || err));

    return () => {
      unsubBiz();
      for (const unsub of listenersRef.current.values()) unsub();
      listenersRef.current.clear();
    };
  }, [bizId, subscribe, toast]);

  // ---- writes ----------------------------------------------------------------------
  const commitUpserts = useCallback(async (id: string, key: string, upserts: DataItem[], deletes: string[]) => {
    const firestore = getFirestoreDb();
    const col = collection(doc(firestore, 'businesses', id), key);
    let batch = writeBatch(firestore); let count = 0; const batches = [batch];
    const push = (fn: (b: ReturnType<typeof writeBatch>) => void) => {
      fn(batch); count++;
      if (count >= BATCH_LIMIT) { batch = writeBatch(firestore); batches.push(batch); count = 0; }
    };
    for (const item of upserts) {
      const clean = sanitize(item);
      const stored = containsDataUrl(clean) ? await offloadDataUrls(id, `media/${key}/${docIdFor(clean)}`, clean) : clean;
      push((b) => b.set(doc(col, docIdFor(stored)), stored));
    }
    for (const delId of deletes) push((b) => b.delete(doc(col, delId)));
    for (const b of batches) await b.commit();
  }, []);

  const saveData = useCallback(async (data: BusinessDatabase) => {
    const id = bizIdRef.current;
    const prev = dbRef.current;
    const nextState: BusinessDatabase = { ...prev };
    const work: Array<{ key: string; upserts: DataItem[]; deletes: string[] }> = [];

    for (const [key, value] of Object.entries(data || {})) {
      if (!Array.isArray(value)) continue;
      if (!isValidCollectionKey(key)) { console.warn('[Zikkit] ignoring invalid collection key', key); continue; }
      const { diff, next } = diffCollection(prev[key] as DataItem[] | undefined, value as DataItem[]);
      nextState[key] = next;
      if (diff.upserts.length || diff.deletes.length) work.push({ key, ...diff });
    }

    // Optimistic local update (snapshots will confirm)
    dbRef.current = nextState; setDb(nextState);
    if (!id) { console.warn('[Zikkit] saveData without bizId — nothing persisted'); return; }
    if (work.length === 0) return;

    try {
      const firestore = getFirestoreDb();
      const newKeys = work.map((w) => w.key).filter((k) => !(KNOWN_COLLECTIONS as readonly string[]).includes(k) && !extraKeysRef.current.has(k));
      if (newKeys.length) {
        await updateDoc(doc(firestore, 'businesses', id), { dataCollections: arrayUnion(...newKeys) });
        for (const k of newKeys) { extraKeysRef.current.add(k); }
      }
      for (const w of work) await commitUpserts(id, w.key, w.upserts, w.deletes);
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      console.error('[Zikkit] save FAILED:', msg);
      toast('Save failed: ' + msg, '#ff4d6d');
      throw e;
    }
  }, [commitUpserts, toast]);

  const saveItem = useCallback(async (key: string, item: DataItem) => {
    const list = ((dbRef.current[key] as DataItem[]) || []);
    const idx = item.id != null ? list.findIndex((x) => x.id != null && docIdFor(x) === docIdFor(item)) : -1;
    const next = idx >= 0 ? list.map((x, i) => (i === idx ? item : x)) : [...list, item];
    await saveData({ ...dbRef.current, [key]: next } as BusinessDatabase);
  }, [saveData]);

  const deleteItem = useCallback(async (key: string, id: string | number) => {
    const list = ((dbRef.current[key] as DataItem[]) || []);
    await saveData({ ...dbRef.current, [key]: list.filter((x) => String(x.id) !== String(id)) } as BusinessDatabase);
  }, [saveData]);

  const saveCfg = useCallback(async (patch: Partial<BusinessConfig>): Promise<BusinessConfig> => {
    const merged = { ...(cfgRef.current || {}), ...patch };
    setCfg(merged); cfgRef.current = merged; mirrorCfg(merged);
    const id = bizIdRef.current;
    if (id) {
      try {
        const firestore = getFirestoreDb();
        const stored = containsDataUrl(merged) ? await offloadDataUrls(id, 'media/cfg', sanitize(merged)) : sanitize(merged);
        await setDoc(doc(firestore, 'businesses', id), { cfg: stored }, { merge: true });
      } catch (e) {
        console.error('[Zikkit] config save failed:', e);
        toast('Settings save failed: ' + ((e as Error)?.message || ''), '#ff4d6d');
      }
    }
    return merged;
  }, [toast]);

  const nextNumber = useCallback(async (name: string, start = 1000): Promise<number> => {
    const id = bizIdRef.current;
    if (!id) return start + 1;
    const firestore = getFirestoreDb();
    const ref = doc(collection(doc(firestore, 'businesses', id), 'counters'), name);
    return runTransaction(firestore, async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.data()?.value as number) || start;
      const value = current + 1;
      tx.set(ref, { value, updated: new Date().toISOString() });
      return value;
    });
  }, []);

  const syncFromCloud = useCallback(async () => { /* live via onSnapshot */ }, []);

  return (
    <DataContext.Provider value={{ db, cfg, bizId, setBizId, saveData, saveCfg, syncFromCloud, loading: !ready, ready, saveItem, deleteItem, nextNumber }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

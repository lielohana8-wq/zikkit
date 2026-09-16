import { doc, collection, runTransaction, setDoc, updateDoc, arrayUnion, type Firestore } from 'firebase/firestore';
import { type DataItem, newId, docIdFor, sanitize, isValidCollectionKey } from './collections';
import { offloadDataUrls } from './offload';

const CHUNK = 60;          // records per transaction (well under the 500-write limit, and keeps payloads small)
const MAX_ROUNDS = 400;    // safety valve

interface Prepared { raw: DataItem; item: DataItem; rawJson: string }

function matches(candidate: unknown, p: Prepared): boolean {
  const c = candidate as DataItem;
  if (c && typeof c === 'object' && c.id != null && p.raw.id != null) return docIdFor(c) === docIdFor(p.raw);
  try { return JSON.stringify(candidate) === p.rawJson; } catch { return false; }
}

/**
 * Drain the legacy inline `db.<key>` arrays of a business document into
 * subcollections. Transactional per chunk: the business doc is re-read inside
 * the transaction, only the exact items we moved are removed, so a server
 * route appending a lead at the same moment can never be lost.
 *
 * Returns the number of records moved.
 */
export async function drainInbox(firestore: Firestore, bizId: string, inline: Record<string, unknown>, onProgress?: (moved: number) => void): Promise<number> {
  const bizRef = doc(firestore, 'businesses', bizId);
  let moved = 0;
  let rounds = 0;

  for (const [key, value] of Object.entries(inline || {})) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!isValidCollectionKey(key)) { console.warn('[Zikkit] skipping legacy key with invalid name:', key); continue; }

    let pending = value as DataItem[];
    while (pending.length > 0 && rounds++ < MAX_ROUNDS) {
      const chunk = pending.slice(0, CHUNK);
      pending = pending.slice(CHUNK);

      // 1. Prepare outside the transaction (uploads may be slow)
      const prepared: Prepared[] = [];
      for (const raw of chunk) {
        if (!raw || typeof raw !== 'object') continue;
        const withId = raw.id == null ? { ...raw, id: newId() } : raw;
        const offloaded = await offloadDataUrls(bizId, `media/${key}/${docIdFor(withId)}`, sanitize(withId));
        prepared.push({ raw, item: offloaded, rawJson: safeJson(raw) });
      }
      if (prepared.length === 0) continue;

      // 2. Move transactionally
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(bizRef);
        const current = ((snap.data()?.db as Record<string, unknown>)?.[key] as unknown[]) || [];
        const remaining = current.filter((c) => !prepared.some((p) => matches(c, p)));
        for (const p of prepared) tx.set(doc(collection(bizRef, key), docIdFor(p.item)), p.item);
        tx.update(bizRef, { [`db.${key}`]: remaining, dataCollections: arrayUnion(key), inboxDrainedAt: new Date().toISOString() });
      });
      moved += prepared.length;
      onProgress?.(moved);
    }
  }
  return moved;
}

function safeJson(v: unknown): string { try { return JSON.stringify(v); } catch { return ''; } }

/** One-time safety copy of the legacy blob before the first drain. */
export async function backupLegacyBlob(firestore: Firestore, bizId: string, data: Record<string, unknown>): Promise<void> {
  const bizRef = doc(firestore, 'businesses', bizId);
  const id = 'legacy-' + new Date().toISOString().replace(/[:.]/g, '-');
  await setDoc(doc(collection(bizRef, 'backups'), id), { db: sanitize(data.db || {}), cfg: sanitize(data.cfg || {}), created: new Date().toISOString() });
  await updateDoc(bizRef, { legacyBackupAt: new Date().toISOString(), legacyBackupId: id });
}

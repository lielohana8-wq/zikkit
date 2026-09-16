import { type DataItem, newId, docIdFor } from './collections';

export interface CollectionDiff {
  upserts: DataItem[];
  deletes: string[];
}

function cheapEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/**
 * Compute what changed between the provider's last known array and the array a
 * page just passed to saveData({ ...db, jobs }). Pages spread unchanged items by
 * reference, so most comparisons short-circuit on `===`.
 *
 * Items without an id get one (the returned `next` array carries it so local
 * state and Firestore agree).
 */
export function diffCollection(prev: DataItem[] | undefined, next: DataItem[]): { diff: CollectionDiff; next: DataItem[] } {
  const prevMap = new Map<string, DataItem>();
  for (const p of prev || []) if (p && p.id != null) prevMap.set(docIdFor(p), p);

  const upserts: DataItem[] = [];
  const seen = new Set<string>();
  const normalized: DataItem[] = [];

  for (const raw of next) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw.id == null ? { ...raw, id: newId() } : raw;
    const key = docIdFor(item);
    if (seen.has(key)) continue; // duplicate ids — keep first
    seen.add(key);
    normalized.push(item);
    const before = prevMap.get(key);
    if (!before || !cheapEqual(before, item)) upserts.push(item);
  }

  const deletes: string[] = [];
  for (const key of prevMap.keys()) if (!seen.has(key)) deletes.push(key);

  return { diff: { upserts, deletes }, next: normalized };
}

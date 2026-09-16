/**
 * Data model v2 — one Firestore document per record.
 *
 * Legacy model (the cause of the freezes): the whole business database lived
 * inside ONE document (`businesses/{bizId}.db`) as arrays, mirrored into
 * localStorage, and re-written in full on every change — photos and
 * signatures included as base64. Once that document approached Firestore's
 * 1 MB limit every write failed silently, localStorage hit its quota and threw,
 * and JSON.stringify of megabytes on the main thread froze the UI.
 *
 * New model:
 *   businesses/{bizId}                       → cfg + small metadata (+ legacy `db` used only as an inbox)
 *   businesses/{bizId}/{collection}/{docId}  → one document per record
 *   businesses/{bizId}/members/{uid}         → membership (techs / dispatchers)
 *   businesses/{bizId}/counters/{name}       → atomic document numbering
 *   businesses/{bizId}/presence/{uid}        → GPS / online presence (tiny, high-frequency)
 *   businesses/{bizId}/backups/{id}          → one-time copy of the legacy blob before migration
 *
 * Anything (old client, server bot routes) that still appends to the inline
 * `db.<collection>` arrays is treated as an INBOX: the client drains it into
 * the subcollections transactionally. Nothing is lost, nothing needs a big-bang
 * migration, and the business document stays tiny.
 */

/** Collections the client subscribes to on load. Unknown keys written via saveData are registered in `dataCollections`. */
export const KNOWN_COLLECTIONS = [
  'users', 'leads', 'jobs', 'quotes', 'products', 'botLog', 'expenses', 'payments',
  'reviews', 'inventory', 'photoSets', 'whatsapp', 'waTemplates', 'membership',
  'memberPlans', 'memberSubs', 'support', 'tickets',
  // Solo edition
  'customers', 'receipts', 'closings',
] as const;

/** Reserved subcollection names that are NOT part of the `db` object. */
export const RESERVED_SUBCOLLECTIONS = new Set(['members', 'counters', 'presence', 'backups', 'meta']);

export type DataItem = Record<string, unknown> & { id?: number | string };

let seq = 0;
/** Numeric, time-ordered, collision-safe enough for a single business. Matches the existing `id: number` types. */
export function newId(): number {
  seq = (seq + 1) % 1000;
  return Date.now() * 1000 + seq;
}

export function docIdFor(item: DataItem): string {
  return String(item.id);
}

/** Firestore rejects `undefined`; this also drops functions / class instances. */
export function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function isValidCollectionKey(key: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key) && !RESERVED_SUBCOLLECTIONS.has(key);
}

export function sortById<T extends DataItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const x = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
    const y = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
    return x - y;
  });
}

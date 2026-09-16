import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';

/**
 * Base64 offloading.
 *
 * Photos, signatures and logos used to be stored inline as data: URLs.
 * A single job with 4 phone photos is ~600 KB — enough to break the old
 * single-document model. Before any record is written we walk it, upload every
 * data: URL to Firebase Storage and replace it with the download URL.
 * Existing UI keeps working: an <img src> renders a URL exactly like a data URL.
 */
const MIN_INLINE_LEN = 1500; // tiny icons can stay inline
const MAX_DEPTH = 5;

function isDataUrl(v: unknown): v is string {
  return typeof v === 'string' && v.length > MIN_INLINE_LEN && v.startsWith('data:');
}

function extFor(dataUrl: string): string {
  const m = /^data:([^;]+);/.exec(dataUrl);
  const mime = (m?.[1] || 'application/octet-stream').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

export async function uploadDataUrl(bizId: string, folder: string, dataUrl: string): Promise<string> {
  const storage = getFirebaseStorage();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(dataUrl)}`;
  const r = ref(storage, `businesses/${bizId}/${folder}/${name}`);
  await uploadString(r, dataUrl, 'data_url');
  return getDownloadURL(r);
}

/** Returns a copy of `value` with every large data: URL replaced by a Storage URL. Never throws — on upload failure the original string is kept. */
export async function offloadDataUrls<T>(bizId: string, folder: string, value: T, depth = 0): Promise<T> {
  if (depth > MAX_DEPTH || value == null) return value;
  if (isDataUrl(value)) {
    try { return (await uploadDataUrl(bizId, folder, value)) as unknown as T; }
    catch (e) { console.warn('[Zikkit] media upload failed, keeping inline:', (e as Error)?.message); return value; }
  }
  if (Array.isArray(value)) {
    const out = await Promise.all(value.map((v) => offloadDataUrls(bizId, folder, v, depth + 1)));
    return out as unknown as T;
  }
  if (typeof value === 'object') {
    const src = value as Record<string, unknown>;
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      const nv = await offloadDataUrls(bizId, folder, v, depth + 1);
      if (nv !== v) changed = true;
      out[k] = nv;
    }
    return (changed ? out : value) as T;
  }
  return value;
}

export function containsDataUrl(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH || value == null) return false;
  if (isDataUrl(value)) return true;
  if (Array.isArray(value)) return value.some((v) => containsDataUrl(v, depth + 1));
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some((v) => containsDataUrl(v, depth + 1));
  return false;
}

import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = 'zikkit-5e554';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAneOk2JGTa7yTrG-wve4mFOGOIVo8FT0E';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid portal link.' }, { status: 400 });
  }

  try {
    // Read from Firestore REST API — public_portals collection
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/public_portals/${token}?key=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } }); // Cache 60 seconds

    if (res.status === 404) {
      return NextResponse.json({ error: 'Portal link expired or not found.' }, { status: 404 });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[Portal API] Firestore error:', res.status, errData);
      return NextResponse.json({ error: 'Unable to load portal data.' }, { status: 500 });
    }

    const doc = await res.json();

    // Parse Firestore REST API document format into clean JSON
    const data = parseFirestoreDoc(doc.fields || {});

    return NextResponse.json({ data });
  } catch (e) {
    console.error('[Portal API] Error:', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// ── Parse Firestore REST document fields into plain objects ──
function parseFirestoreDoc(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
};

function parseFirestoreValue(val: FirestoreValue): unknown {
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue || '0');
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('mapValue' in val && val.mapValue?.fields) return parseFirestoreDoc(val.mapValue.fields);
  if ('arrayValue' in val) return (val.arrayValue?.values || []).map(parseFirestoreValue);
  return null;
}

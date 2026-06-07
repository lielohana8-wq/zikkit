import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/site/[slug]
 * Public endpoint - returns the auto-generated landing content for a business.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ success: false, error: 'No slug' }, { status: 400 });

    // Resolve slug -> bizId
    const lookup = await firestoreGet('site_lookup', slug);
    if (!lookup) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const biz = await firestoreGet('businesses', lookup.bizId as string);
    if (!biz) return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });

    const landing = (biz.landing as Record<string, unknown>) || {};
    const gallery = ((biz.gallery as Record<string, unknown>)?.images as string[]) || [];

    return NextResponse.json({ success: true, data: { ...landing, gallery } });
  } catch (e) {
    console.error('[site API]', e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';
async function firestoreGet(collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return firestoreDecode(data.fields || {});
}
async function getAccessToken(): Promise<string> {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) return '';
  try {
    const sa = JSON.parse(saKey);
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsignedJwt = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    const crypto = await import('crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    const jwt = `${unsignedJwt}.${signer.sign(sa.private_key, 'base64url')}`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
    return (await tokenRes.json()).access_token || '';
  } catch { return ''; }
}
type FV = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; arrayValue?: { values?: FV[] }; mapValue?: { fields?: Record<string, FV> } };
function firestoreDecode(fields: Record<string, FV>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}
function decodeValue(v: FV): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(decodeValue);
  if (v.mapValue) return firestoreDecode(v.mapValue.fields || {});
  return null;
}

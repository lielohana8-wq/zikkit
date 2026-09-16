import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/portal/[token]
 *
 * Returns lead status for customer-facing portal.
 * Public endpoint (no auth) - secured by token.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    // 1. Get portal entry
    const portal = await firestoreGet('public_portals', token);
    if (!portal) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // 2. Get fresh lead data from business
    const business = await firestoreGet('businesses', portal.bizId as string);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const leads = ((business.db as Record<string, unknown>)?.leads as Array<Record<string, unknown>>) || [];
    const jobs = ((business.db as Record<string, unknown>)?.jobs as Array<Record<string, unknown>>) || [];
    const users = ((business.db as Record<string, unknown>)?.users as Array<Record<string, unknown>>) || [];

    const lead = leads.find((l) => l.id === portal.leadId);
    const job = jobs.find((j) => (j as Record<string, unknown>).conversationId === (lead?.conversationId || ''));

    // Get assigned technician's phone
    const assignedToId = (lead?.assignedTo || job?.assigned_to) as string;
    const tech = users.find((u) => u.id === assignedToId);

    const data = {
      bizId: portal.bizId,
      leadId: portal.leadId,
      businessName: portal.businessName,
      customerName: lead?.customerName || portal.customerName,
      customerPhone: lead?.customerPhone || portal.customerPhone,
      service: lead?.service || portal.service,
      preferredDate: lead?.preferredDate || portal.preferredDate,
      scheduledDate: job?.scheduled_date,
      scheduledTime: job?.scheduled_time,
      status: job ? (job.status || 'scheduled') : (lead?.status || 'new'),
      assignedToName: tech?.name || lead?.assignedToName || portal.assignedToName,
      assignedToPhone: tech?.phone || null,
      notes: lead?.notes || job?.notes,
      createdAt: lead?.createdAt || portal.createdAt,
    };

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('[Portal API]', e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';

async function firestoreGet(collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
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
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsignedJwt = `${enc(header)}.${enc(payload)}`;
    const crypto = await import('crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = `${unsignedJwt}.${signature}`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    const tokenData = await tokenRes.json();
    return tokenData.access_token || '';
  } catch {
    return '';
  }
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

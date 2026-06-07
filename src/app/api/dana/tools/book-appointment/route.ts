import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/tools/book-appointment
 *
 * Called by ElevenLabs agent when customer confirms an appointment time.
 * Creates a job in the business calendar.
 *
 * Body:
 * {
 *   bizId: string,
 *   customerName: string,
 *   customerPhone: string,
 *   service: string,
 *   scheduledDate: string,   // "2026-06-08"
 *   scheduledTime: string,   // "10:00"
 *   notes?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bizId, customerName, customerPhone, service, scheduledDate, scheduledTime, notes } = body;

    if (!bizId || !customerName || !scheduledDate || !scheduledTime) {
      return NextResponse.json({
        success: false,
        message: 'חסרים פרטים חיוניים לקביעת המועד',
      });
    }

    const business = await firestoreGet('businesses', bizId);
    if (!business) {
      return NextResponse.json({ success: false, message: 'עסק לא נמצא' });
    }

    // Auto-assign technician
    const technicians = (business.db as Record<string, unknown>)?.users as Array<Record<string, unknown>> || [];
    const techsOnly = technicians.filter((u) => u.role !== 'owner');
    const assignedTech = techsOnly.length > 0
      ? techsOnly[Math.floor(Math.random() * techsOnly.length)]
      : null;

    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const job = {
      id: jobId,
      source: 'dana',
      customer_name: customerName,
      customer_phone: customerPhone || '',
      service: service || '',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      notes: notes || '',
      status: 'scheduled',
      assigned_to: assignedTech?.id || null,
      assigned_to_name: assignedTech?.name || null,
      created_at: new Date().toISOString(),
    };

    const existingJobs = ((business.db as Record<string, unknown>)?.jobs as Array<Record<string, unknown>>) || [];
    const updatedJobs = [job, ...existingJobs];

    await firestoreSetField('businesses', bizId, ['db', 'jobs'], updatedJobs);

    return NextResponse.json({
      success: true,
      jobId,
      assignedTo: assignedTech?.name || null,
      message: `המועד נקבע ל${scheduledDate} בשעה ${scheduledTime}${assignedTech ? `, ${assignedTech.name} ייגיע אליכם` : ''}`,
    });
  } catch (e) {
    console.error('[Dana book-appointment]', e);
    return NextResponse.json({ success: false, message: 'שגיאה בקביעת המועד' });
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

async function firestoreSetField(collection: string, docId: string, fieldPath: string[], value: unknown) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=${fieldPath.join('.')}`;
  const buildNested = (path: string[], val: unknown): Record<string, unknown> => {
    if (path.length === 1) return { [path[0]]: firestoreEncode(val) };
    return { [path[0]]: { mapValue: { fields: buildNested(path.slice(1), val) } } };
  };
  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: buildNested(fieldPath, value) }),
  });
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

function firestoreEncode(value: unknown): FV {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreEncode) } };
  if (typeof value === 'object') {
    const fields: Record<string, FV> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = firestoreEncode(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

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

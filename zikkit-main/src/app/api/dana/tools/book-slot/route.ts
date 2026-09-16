import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/tools/book-slot
 *
 * Books an appointment for appointment-based businesses.
 * Supports recurring appointments (every X weeks).
 *
 * Body: {
 *   bizId, customerName, customerPhone, service, duration,
 *   date, time, staff?, recurring?, recurringWeeks?, notes?
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bizId, customerName, customerPhone, service, duration = 30,
      date, time, staff, recurring, recurringWeeks = 3, notes,
    } = body;

    if (!bizId || !customerName || !date || !time) {
      return NextResponse.json({ success: false, message: 'חסרים פרטים לקביעת התור' });
    }

    const business = await firestoreGet('businesses', bizId);
    if (!business) {
      return NextResponse.json({ success: false, message: 'עסק לא נמצא' });
    }

    const apt = (business.appointments as Record<string, unknown>) || {};
    const existingBookings = (apt.bookings as Array<Record<string, unknown>>) || [];

    const bookingId = 'apt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const seriesId = recurring ? 'series_' + Date.now() : null;

    const newBookings: Array<Record<string, unknown>> = [];

    // Create the main booking
    newBookings.push({
      id: bookingId,
      seriesId,
      source: 'dana',
      customerName,
      customerPhone: customerPhone || '',
      service: service || '',
      duration,
      date,
      time,
      staff: staff || null,
      notes: notes || '',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });

    // If recurring, create the next 3 occurrences
    if (recurring && seriesId) {
      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + recurringWeeks * 7 * i);
        newBookings.push({
          id: bookingId + '_r' + i,
          seriesId,
          source: 'dana',
          customerName,
          customerPhone: customerPhone || '',
          service: service || '',
          duration,
          date: nextDate.toISOString().split('T')[0],
          time,
          staff: staff || null,
          notes: (notes || '') + ' (תור חוזר)',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        });
      }
    }

    const updatedBookings = [...newBookings, ...existingBookings];
    await firestoreSetField('businesses', bizId, ['appointments', 'bookings'], updatedBookings);

    // SMS confirmation to customer
    if (customerPhone) {
      const bizName = (business.cfg as Record<string, unknown>)?.biz_name || 'העסק';
      const recurringNote = recurring ? ` (+ ${3} תורים חוזרים כל ${recurringWeeks} שבועות)` : '';
      sendSms(
        customerPhone,
        `התור שלך ב${bizName} נקבע!\n📅 ${formatDate(date)} בשעה ${time}\n💇 ${service}${recurringNote}\nנתראה!`
      ).catch(() => {});
    }

    const recurringMsg = recurring ? ` וקבעתי גם ${3} תורים חוזרים כל ${recurringWeeks} שבועות` : '';
    return NextResponse.json({
      success: true,
      bookingId,
      message: `התור נקבע ל${formatDate(date)} בשעה ${time}${recurringMsg}. שלחתי לך SMS לאישור.`,
    });
  } catch (e) {
    console.error('[book-slot]', e);
    return NextResponse.json({ success: false, message: 'שגיאה בקביעת התור' });
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return `יום ${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return dateStr;
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_IL || process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) throw new Error('Twilio missing');
  let toNumber = to.replace(/[^\d]/g, '');
  if (toNumber.startsWith('0')) toNumber = '972' + toNumber.slice(1);
  if (!toNumber.startsWith('+')) toNumber = '+' + toNumber;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: toNumber, Body: body }),
  });
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';

async function firestoreGet(collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
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
    headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' },
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
      iat: now, exp: now + 3600,
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
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) fields[k] = firestoreEncode(v);
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

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/tools/check-availability
 *
 * Called by ElevenLabs agent during conversation when customer asks for an appointment.
 * Returns next available slots based on business calendar.
 *
 * Body:
 * {
 *   bizId: string,
 *   requestedDate?: string,  // ISO or "מחר" / "יום שלישי"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { bizId, requestedDate } = await req.json();

    if (!bizId) {
      return NextResponse.json({ available: false, message: 'חסר מזהה עסק' });
    }

    // Get business and existing appointments
    const business = await firestoreGet('businesses', bizId);
    if (!business) {
      return NextResponse.json({ available: false, message: 'לא נמצא עסק' });
    }

    const jobs = (business.db as Record<string, unknown>)?.jobs as Array<Record<string, unknown>> || [];
    const cfg = (business.cfg as Record<string, unknown>) || {};

    // Working hours (default: Sun-Thu 8-17)
    const workHours = (cfg.work_hours as { start?: string; end?: string }) || { start: '08:00', end: '17:00' };
    const workDays = (cfg.work_days as number[]) || [0, 1, 2, 3, 4]; // Sun-Thu

    // Get next 7 days of available slots
    const slots: Array<{ date: string; dayName: string; times: string[] }> = [];
    const today = new Date();
    const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    for (let i = 0; i < 7 && slots.length < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();

      if (!workDays.includes(dayOfWeek)) continue;

      const dateStr = d.toISOString().split('T')[0];

      // Generate hourly slots
      const startHour = parseInt(workHours.start.split(':')[0]);
      const endHour = parseInt(workHours.end.split(':')[0]);
      const dayTimes: string[] = [];

      for (let h = startHour; h < endHour; h++) {
        const timeStr = `${String(h).padStart(2, '0')}:00`;
        // Check if slot is taken
        const taken = jobs.some(
          (job) =>
            (job.scheduled_date as string)?.startsWith(dateStr) &&
            (job.scheduled_time as string)?.startsWith(timeStr)
        );
        if (!taken) dayTimes.push(timeStr);
      }

      if (dayTimes.length > 0) {
        slots.push({
          date: dateStr,
          dayName: i === 0 ? 'היום' : i === 1 ? 'מחר' : HEBREW_DAYS[dayOfWeek],
          times: dayTimes.slice(0, 3), // Top 3 slots per day
        });
      }
    }

    // Build message for Dana to read
    let message = '';
    if (slots.length === 0) {
      message = 'לצערי אין לי תאריכים פנויים בשבוע הקרוב. אקח את פרטיכם ונחזור אליכם.';
    } else {
      const first = slots[0];
      message = `יש לי פנוי ${first.dayName} בשעות ${first.times.join(', ')}. גם ${slots[1]?.dayName || ''} ${slots[1]?.times.join(', ') || ''} פנוי.`;
    }

    return NextResponse.json({
      available: slots.length > 0,
      slots,
      message,
    });
  } catch (e) {
    console.error('[Dana check-availability]', e);
    return NextResponse.json({ available: false, message: 'שגיאה בבדיקת זמינות' });
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

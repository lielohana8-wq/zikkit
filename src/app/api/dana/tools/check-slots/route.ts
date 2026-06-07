import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/tools/check-slots
 *
 * For appointment businesses. Finds available time slots considering:
 * - Service duration
 * - Number of stations/chairs (parallel capacity)
 * - Existing appointments
 * - Working hours
 *
 * Body: { bizId, serviceDuration (minutes), requestedDate?, preferredStaff? }
 */
export async function POST(req: NextRequest) {
  try {
    const { bizId, serviceDuration = 30, requestedDate } = await req.json();

    if (!bizId) {
      return NextResponse.json({ available: false, message: 'חסר מזהה עסק' });
    }

    const business = await firestoreGet('businesses', bizId);
    if (!business) {
      return NextResponse.json({ available: false, message: 'לא נמצא עסק' });
    }

    const apt = (business.appointments as Record<string, unknown>) || {};
    const cfg = (business.cfg as Record<string, unknown>) || {};
    const existingAppts = (apt.bookings as Array<Record<string, unknown>>) || [];

    // Stations = how many can be served in parallel
    const stations = (apt.stations as number) || 1;

    // Working hours
    const workHours = (cfg.work_hours as { start?: string; end?: string }) || { start: '09:00', end: '20:00' };
    const workDays = (cfg.work_days as number[]) || [0, 1, 2, 3, 4, 5]; // Sun-Fri

    const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const slots: Array<{ date: string; dayName: string; times: string[] }> = [];
    const today = new Date();
    const slotStep = 30; // 30-min granularity

    for (let i = 0; i < 14 && slots.length < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      if (!workDays.includes(dayOfWeek)) continue;

      const dateStr = d.toISOString().split('T')[0];
      const startMin = timeToMinutes(workHours.start);
      const endMin = timeToMinutes(workHours.end);
      const dayTimes: string[] = [];

      // For each candidate start time
      for (let t = startMin; t + serviceDuration <= endMin; t += slotStep) {
        // Count how many appointments overlap this window
        const overlapping = existingAppts.filter((a) => {
          if ((a.date as string) !== dateStr) return false;
          const aStart = timeToMinutes(a.time as string);
          const aDuration = (a.duration as number) || 30;
          const aEnd = aStart + aDuration;
          // Overlap check
          return t < aEnd && t + serviceDuration > aStart;
        }).length;

        // If fewer overlapping than stations, slot is free
        if (overlapping < stations) {
          dayTimes.push(minutesToTime(t));
        }
      }

      if (dayTimes.length > 0) {
        slots.push({
          date: dateStr,
          dayName: i === 0 ? 'היום' : i === 1 ? 'מחר' : HEBREW_DAYS[dayOfWeek],
          times: dayTimes.slice(0, 4),
        });
      }
    }

    let message = '';
    if (slots.length === 0) {
      message = 'לצערי אין תורים פנויים בשבועיים הקרובים. אקח את הפרטים ונחזור אליכם.';
    } else {
      const first = slots[0];
      message = `יש לי פנוי ${first.dayName} בשעות ${first.times.join(', ')}.`;
      if (slots[1]) {
        message += ` גם ${slots[1].dayName} ${slots[1].times.slice(0, 2).join(', ')}.`;
      }
    }

    return NextResponse.json({ available: slots.length > 0, slots, message });
  } catch (e) {
    console.error('[check-slots]', e);
    return NextResponse.json({ available: false, message: 'שגיאה בבדיקת זמינות' });
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
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

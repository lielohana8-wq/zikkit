import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/webhook
 *
 * Called by ElevenLabs after each conversation ends.
 * Creates a lead, assigns to a technician, sends SMS notifications.
 *
 * Body shape (from ElevenLabs post_call webhook):
 * {
 *   agent_id: string,
 *   conversation_id: string,
 *   from_number: string,
 *   to_number: string,         // the Dana number that was called
 *   transcript: [...],
 *   analysis: {
 *     summary: string,
 *     data_collection: {
 *       fullName: string,
 *       phone: string,
 *       reason: string,
 *       service: string,
 *       preferredDate: string,
 *       notes: string,
 *     }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to_number, from_number, conversation_id, analysis, transcript } = body;

    // 1. Find which business owns this Dana phone number
    const phone = (to_number || '').replace(/[^\d]/g, '');
    const lookup = await firestoreGet('phone_lookup', phone);
    if (!lookup) {
      console.error('[Dana Webhook] No business found for phone:', to_number);
      return NextResponse.json({ success: false, error: 'Unknown phone' });
    }

    const bizId = lookup.bizId;
    const businessName = lookup.businessName || 'לקוח';

    // 2. Get business to find technicians + dana config
    const business = await firestoreGet('businesses', bizId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' });
    }

    const technicians = business.db?.users?.filter(
      (u: { role?: string }) => u.role !== 'owner'
    ) || [];
    const dana = business.dana || {};
    const collected = analysis?.data_collection || {};

    // 3. Generate portal token (so customer can see status)
    const portalToken = generateToken();
    const leadId = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    // 4. Auto-assign technician (round robin for now)
    const assignedTech = technicians.length > 0
      ? technicians[Math.floor(Math.random() * technicians.length)]
      : null;

    // 5. Build lead object
    const lead = {
      id: leadId,
      source: 'dana',
      conversationId: conversation_id,
      customerName: collected.fullName || from_number || 'לקוח לא ידוע',
      customerPhone: collected.phone || from_number || '',
      service: collected.service || '',
      reason: collected.reason || '',
      preferredDate: collected.preferredDate || '',
      notes: collected.notes || '',
      summary: analysis?.summary || '',
      transcript: transcript || [],
      status: 'new',
      assignedTo: assignedTech?.id || null,
      assignedToName: assignedTech?.name || null,
      portalToken,
      createdAt: new Date().toISOString(),
    };

    // 6. Save lead to business.db.leads
    const existingLeads = business.db?.leads || [];
    const updatedLeads = [lead, ...existingLeads];

    await firestoreSetField('businesses', bizId, ['db', 'leads'], updatedLeads);

    // 7. Save portal entry for customer self-service
    await firestoreSet('public_portals', portalToken, {
      bizId,
      leadId,
      businessName,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      service: lead.service,
      preferredDate: lead.preferredDate,
      status: lead.status,
      assignedToName: lead.assignedToName,
      createdAt: lead.createdAt,
    });

    // 8. Send SMS notifications
    const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://zikkit-jvc7.vercel.app'}/portal/${portalToken}`;

    // To customer
    if (lead.customerPhone) {
      sendSms(
        lead.customerPhone,
        `שלום ${lead.customerName.split(' ')[0]}, תודה שפנית ל${businessName}. הפנייה התקבלה ותועבר ל${assignedTech?.name || 'הצוות'} בקרוב. למעקב: ${portalUrl}`
      ).catch((e) => console.warn('[Dana SMS to customer]', e.message));
    }

    // To business owner
    const ownerPhone = business.cfg?.owner_phone || business.db?.users?.[0]?.phone;
    if (ownerPhone) {
      sendSms(
        ownerPhone,
        `🔔 ליד חדש מ-${businessName}\n${lead.customerName} • ${lead.service || 'לא צוין'}\nסיבה: ${lead.reason || '—'}\nטלפון: ${lead.customerPhone}\nשובץ: ${assignedTech?.name || 'לא משובץ'}`
      ).catch((e) => console.warn('[Dana SMS to owner]', e.message));
    }

    // To assigned technician
    if (assignedTech?.phone) {
      sendSms(
        assignedTech.phone,
        `🔧 משימה חדשה - ${lead.customerName}\n📞 ${lead.customerPhone}\n🛠 ${lead.service || 'שירות כללי'}\n📝 ${lead.reason || ''}\n📅 ${lead.preferredDate || 'גמיש'}`
      ).catch((e) => console.warn('[Dana SMS to tech]', e.message));
    }

    return NextResponse.json({ success: true, leadId, portalUrl });
  } catch (e) {
    console.error('[Dana Webhook] Error:', e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}

// ============================================================
// Firestore REST helpers (use admin SDK in production)
// ============================================================

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';

async function firestoreGet(collection: string, docId: string): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return firestoreDecode(data.fields || {});
}

async function firestoreSet(collection: string, docId: string, data: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: firestoreEncode(data).mapValue?.fields || {} }),
  });
}

async function firestoreSetField(collection: string, docId: string, fieldPath: string[], value: unknown) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=${fieldPath.join('.')}`;
  // Build nested fields structure
  const buildNested = (path: string[], val: unknown): Record<string, unknown> => {
    if (path.length === 1) {
      return { [path[0]]: firestoreEncode(val) };
    }
    return {
      [path[0]]: {
        mapValue: {
          fields: buildNested(path.slice(1), val),
        },
      },
    };
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

// Service account access token using JWT (simplified for now - returns empty, requires admin SDK)
async function getAccessToken(): Promise<string> {
  // Get service account JSON from env
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.warn('[Dana] FIREBASE_SERVICE_ACCOUNT_KEY not set - Firestore operations will fail');
    return '';
  }

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

    const enc = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedJwt = `${enc(header)}.${enc(payload)}`;

    // Sign with crypto
    const crypto = await import('crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = `${unsignedJwt}.${signature}`;

    // Exchange JWT for access token
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
  } catch (e) {
    console.error('[Dana] Token generation failed:', e);
    return '';
  }
}

// Firestore value encode/decode
type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

function firestoreEncode(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreEncode) } };
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = firestoreEncode(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function firestoreDecode(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeValue(v);
  }
  return out;
}

function decodeValue(v: FirestoreValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(decodeValue);
  if (v.mapValue) return firestoreDecode(v.mapValue.fields || {});
  return null;
}

// ============================================================
// Twilio SMS
// ============================================================

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_IL || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials missing');
  }

  // Normalize Israeli numbers
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

function generateToken(): string {
  return Array.from({ length: 24 }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))
  ).join('');
}

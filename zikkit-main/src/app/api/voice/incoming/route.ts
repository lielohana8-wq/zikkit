import { NextRequest, NextResponse } from 'next/server';

// Twilio hits this endpoint when a call comes in
// Returns TwiML to handle the call
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callerPhone = formData.get('From') as string || '';
    const calledNumber = formData.get('To') as string || '';
    const callSid = formData.get('CallSid') as string || '';


    // Look up which business owns this phone number
    const bizData = await lookupBusinessByPhone(calledNumber);

    if (!bizData) {
      // No business found for this number
      return twimlResponse(`
        <Response>
          <Say voice="Polly.Amy">Sorry, this number is not configured. Please contact support.</Say>
          <Hangup />
        </Response>
      `);
    }

    const { cfg, botConfig } = bizData;
    const greeting = botConfig?.greeting || `Thank you for calling ${cfg.biz_name || 'us'}. How can I help you?`;
    const voice = getTwimlVoice(botConfig?.voice || 'nova', cfg.region || 'US');

    // Greet and gather first speech input
    return twimlResponse(`
      <Response>
        <Gather input="speech" action="/api/voice/gather?bizId=${bizData.bizId}&amp;turn=1" method="POST" speechTimeout="3" language="${cfg.region === 'IL' ? 'he-IL' : 'en-US'}">
          <Say voice="${voice}">${escapeXml(greeting)}</Say>
        </Gather>
        <Say voice="${voice}">I didn't hear anything. Please call back when you're ready. Goodbye.</Say>
        <Hangup />
      </Response>
    `);
  } catch (e) {
    console.error('[Voice] Error:', e);
    return twimlResponse(`
      <Response>
        <Say voice="Polly.Amy">We're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
}

// ── Helpers ──

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml.trim(), {
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTwimlVoice(botVoice: string, region: string): string {
  // Map our voice names to Twilio Polly voices
  const voices: Record<string, Record<string, string>> = {
    US: { alloy: 'Polly.Joanna', echo: 'Polly.Matthew', nova: 'Polly.Amy', shimmer: 'Polly.Salli', onyx: 'Polly.Brian' },
    IL: { alloy: 'Polly.Amy', echo: 'Polly.Matthew', nova: 'Polly.Amy', shimmer: 'Polly.Amy', onyx: 'Polly.Brian' },
  };
  return voices[region]?.[botVoice] || 'Polly.Amy';
}

async function lookupBusinessByPhone(phoneNumber: string): Promise<{
  bizId: string;
  cfg: Record<string, unknown>;
  botConfig: Record<string, unknown> | null;
} | null> {
  const PROJECT_ID = 'zikkit-5e554';
  const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

  // Clean the phone number for lookup
  const cleanNum = phoneNumber.replace(/[^+\d]/g, '');

  // Look up phone_lookup/{cleanNum} in Firestore
  const lookupUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/phone_lookup/${encodeURIComponent(cleanNum)}?key=${API_KEY}`;

  try {
    const res = await fetch(lookupUrl);
    if (!res.ok) {
      return null;
    }

    const doc = await res.json();
    const bizId = doc.fields?.bizId?.stringValue;
    if (!bizId) return null;

    // Fetch the business config
    const bizUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?key=${API_KEY}`;
    const bizRes = await fetch(bizUrl);
    if (!bizRes.ok) return null;

    const bizDoc = await bizRes.json();
    const cfg = parseFirestoreFields(bizDoc.fields?.cfg?.mapValue?.fields || {});
    const botConfig = cfg.botConfig as Record<string, unknown> || null;

    return { bizId, cfg, botConfig };
  } catch (e) {
    console.error('[Voice] Lookup error:', e);
    return null;
  }
}

function parseFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    const v = val as Record<string, unknown>;
    if ('stringValue' in v) result[key] = v.stringValue;
    else if ('integerValue' in v) result[key] = parseInt(v.integerValue as string);
    else if ('doubleValue' in v) result[key] = v.doubleValue;
    else if ('booleanValue' in v) result[key] = v.booleanValue;
    else if ('mapValue' in v) result[key] = parseFirestoreFields((v.mapValue as Record<string, unknown>).fields as Record<string, unknown> || {});
    else if ('arrayValue' in v) {
      const arr = (v.arrayValue as Record<string, unknown>)?.values as unknown[] || [];
      result[key] = arr.map((item) => {
        const i = item as Record<string, unknown>;
        if ('stringValue' in i) return i.stringValue;
        if ('integerValue' in i) return parseInt(i.integerValue as string);
        if ('mapValue' in i) return parseFirestoreFields((i.mapValue as Record<string, unknown>).fields as Record<string, unknown> || {});
        return null;
      });
    }
  }
  return result;
}

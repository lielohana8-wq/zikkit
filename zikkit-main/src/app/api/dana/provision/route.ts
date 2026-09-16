import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/provision
 *
 * Provisions a complete Dana setup for a business:
 * 1. Validates that bizId is present
 * 2. Saves config to Firestore via REST (using bizId)
 * 3. Provisions an Israeli phone number from Twilio (if available)
 * 4. Creates an ElevenLabs Conversational AI agent
 * 5. Returns the phone number to the client
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      contactName,
      services,
      appointmentHandling,
      voiceId,
      voiceName,
      greeting,
      fieldsToCollect,
    } = body;

    // Validation
    if (!businessName || !contactName || !services || services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'חסרים פרטים חיוניים' },
        { status: 400 }
      );
    }

    // Get bizId from header (sent by client)
    const bizId = req.headers.get('x-biz-id');
    const authHeader = req.headers.get('authorization');

    if (!bizId || !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'לא מאומת. נסה לרענן את הדף.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);

    // === Save Dana config to Firestore via REST API ===
    const danaConfig = {
      businessName,
      contactName,
      services,
      appointmentHandling,
      voiceId,
      voiceName,
      greeting,
      fieldsToCollect,
      createdAt: new Date().toISOString(),
    };

    try {
      await updateBusinessDana(bizId, danaConfig, idToken);
    } catch (e) {
      console.error('[Dana Provision] Save config failed:', e);
      // Continue anyway - phone provision is the important part
    }

    // === Step 2: Provision Twilio phone number ===
    let phoneNumber: string | null = null;
    let twilioError: string | null = null;
    try {
      phoneNumber = await provisionTwilioNumber(bizId);
    } catch (twilioErr) {
      twilioError = (twilioErr as Error).message;
      console.error('[Dana Provision] Twilio failed:', twilioErr);
      // Fallback: assign shared dev number
      phoneNumber = process.env.TWILIO_PHONE_IL || '+972528615350';
    }

    // === Step 3: Create ElevenLabs agent ===
    let elevenLabsAgentId: string | null = null;
    let elevenLabsError: string | null = null;
    try {
      elevenLabsAgentId = await createElevenLabsAgent({
        businessName,
        voiceId,
        greeting,
        services,
        appointmentHandling,
        fieldsToCollect,
      });
    } catch (elevenErr) {
      elevenLabsError = (elevenErr as Error).message;
      console.error('[Dana Provision] ElevenLabs failed:', elevenErr);
    }

    // === Step 4: Save final state ===
    try {
      await updateBusinessDana(
        bizId,
        {
          ...danaConfig,
          phoneNumber,
          elevenLabsAgentId,
          provisioned: true,
          provisionedAt: new Date().toISOString(),
        },
        idToken
      );

      // Also write phone_lookup
      if (phoneNumber) {
        const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
        await writePhoneLookup(normalizedPhone, bizId, elevenLabsAgentId, businessName, idToken);
      }
    } catch (e) {
      console.error('[Dana Provision] Final save failed:', e);
    }

    return NextResponse.json({
      success: true,
      phoneNumber,
      agentId: elevenLabsAgentId,
      warnings: {
        twilio: twilioError,
        elevenLabs: elevenLabsError,
      },
    });
  } catch (e) {
    console.error('[Dana Provision] Error:', e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Update business.dana via Firestore REST API
 */
async function updateBusinessDana(bizId: string, danaConfig: Record<string, unknown>, idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${bizId}?updateMask.fieldPaths=dana`;

  const firestoreDoc = {
    fields: {
      dana: firestoreEncode(danaConfig),
    },
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(firestoreDoc),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Firestore update failed: ' + errText);
  }
}

/**
 * Write phone_lookup document
 */
async function writePhoneLookup(phone: string, bizId: string, agentId: string | null, businessName: string, idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/phone_lookup/${phone}`;

  const firestoreDoc = {
    fields: firestoreEncode({
      bizId,
      agentId: agentId || '',
      businessName,
      createdAt: new Date().toISOString(),
    }).mapValue?.fields || {},
  };

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(firestoreDoc),
  });
}

/**
 * Convert JS value to Firestore REST API value format
 */
function firestoreEncode(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreEncode) } };
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = firestoreEncode(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/**
 * Provisions an Israeli phone number from Twilio
 */
async function provisionTwilioNumber(bizId: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials missing');
  }

  // 1. Search
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/IL/Mobile.json?Limit=1`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') },
  });
  if (!searchRes.ok) throw new Error('Twilio search failed: ' + searchRes.status);

  const searchData = await searchRes.json();
  const numbers = searchData.available_phone_numbers || [];
  if (numbers.length === 0) throw new Error('No Israeli numbers available');

  const phoneNumber = numbers[0].phone_number;

  // 2. Purchase
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zikkit-jvc7.vercel.app';
  const buyUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
  const buyRes = await fetch(buyUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      PhoneNumber: phoneNumber,
      VoiceUrl: `${baseUrl}/api/voice/incoming?bizId=${bizId}`,
      FriendlyName: `Zikkit Dana - ${bizId}`,
    }),
  });

  if (!buyRes.ok) {
    const errBody = await buyRes.text();
    throw new Error('Twilio purchase failed: ' + errBody);
  }

  return phoneNumber;
}

/**
 * Creates ElevenLabs Conversational AI agent
 */
async function createElevenLabsAgent(params: {
  businessName: string;
  voiceId: string;
  greeting: string;
  services: Array<{ name: string; defaultPrice: string; whatToAsk: string }>;
  appointmentHandling: string;
  fieldsToCollect: Record<string, boolean>;
}): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');

  const VOICE_MAP: Record<string, string> = {
    tai: 'pNInz6obpgDQGcFmaJgB',
    linda: '21m00Tcm4TlvDq8ikWAM',
    roni: 'AZnzlk1XvdvUeBnXmlld',
    dani: 'EXAVITQu4vr4xnSDxMaL',
    maya: 'ErXwobaYiN019PkySvjV',
  };

  const fieldsLabels: Record<string, string> = {
    fullName: 'שם מלא',
    phone: 'מספר טלפון',
    reason: 'סיבת פנייה',
    service: 'שירות מבוקש',
    preferredDate: 'תאריך מועדף',
    notes: 'הערות נוספות',
  };

  const fieldsToAsk = Object.entries(params.fieldsToCollect)
    .filter(([, v]) => v)
    .map(([k]) => fieldsLabels[k])
    .join(', ');

  const servicesDesc = params.services
    .map((s) => `- ${s.name}${s.defaultPrice ? ` (מחיר: ${s.defaultPrice} ש"ח)` : ''}${s.whatToAsk ? ` - שאל: ${s.whatToAsk}` : ''}`)
    .join('\n');

  const handlingInstructions =
    params.appointmentHandling === 'schedule'
      ? 'אם הלקוח רוצה לקבוע מועד, שאל איזה יום ושעה מתאים ורשום ביומן.'
      : params.appointmentHandling === 'collect'
      ? 'אסוף את הפרטים והודיע ללקוח שאיש קשר יחזור אליו בקרוב.'
      : 'ענה על שאלות בלבד, ללא קביעת מועד.';

  const systemPrompt = `אתה הסוכן הקולי של ${params.businessName}.

שורת פתיחה: ${params.greeting}

השירותים שאנו מציעים:
${servicesDesc}

עליך לאסוף מהלקוח: ${fieldsToAsk}

${handlingInstructions}

חשוב:
- דבר בעברית בטון מקצועי וידידותי
- משפט אחד בלבד בכל תור
- אל תחזור על אותה שאלה
- אם הלקוח שואל משהו לא קשור, החזר אותו בעדינות לנושא`;

  const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Zikkit - ${params.businessName}`,
      conversation_config: {
        agent: {
          prompt: { prompt: systemPrompt },
          first_message: params.greeting,
          language: 'he',
        },
        tts: {
          voice_id: VOICE_MAP[params.voiceId] || VOICE_MAP.linda,
          model_id: 'eleven_turbo_v2_5',
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('ElevenLabs API: ' + err);
  }

  const data = await res.json();
  return data.agent_id;
}

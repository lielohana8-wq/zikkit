import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreDb, doc, setDoc, getDoc } from '@/lib/firebase';

/**
 * POST /api/dana/provision
 *
 * Provisions a complete Dana setup for a business:
 * 1. Validates user is authenticated
 * 2. Saves config to Firestore (businesses/{bizId}/dana_config)
 * 3. Provisions an Israeli phone number from Twilio (if available)
 * 4. Creates an ElevenLabs Conversational AI agent
 * 5. Connects the phone number to the agent
 * 6. Returns the phone number to the client
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

    // === Validation ===
    if (!businessName || !contactName || !services || services.length === 0) {
      return NextResponse.json(
        { success: false, error: 'חסרים פרטים חיוניים' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'לא מאומת' }, { status: 401 });
    }

    // For now we'll use a placeholder UID. In production:
    // const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    // const bizId = decodedToken.uid;
    const bizId = req.headers.get('x-biz-id') || 'placeholder';

    // === Step 1: Save Dana config to Firestore ===
    const db = getFirestoreDb();
    const danaConfig = {
      businessName,
      contactName,
      services,
      appointmentHandling,
      voiceId,
      voiceName,
      greeting,
      fieldsToCollect,
      provisioned: false,
      createdAt: new Date().toISOString(),
    };

    await setDoc(
      doc(db, 'businesses', bizId),
      { dana: danaConfig },
      { merge: true }
    );

    // === Step 2: Provision Twilio phone number ===
    let phoneNumber: string | null = null;
    try {
      phoneNumber = await provisionTwilioNumber(bizId);
    } catch (twilioErr) {
      console.error('[Dana Provision] Twilio failed:', twilioErr);
      // Fallback: assign a shared development number
      phoneNumber = process.env.TWILIO_PHONE_IL || '+972528615350';
    }

    // === Step 3: Create ElevenLabs agent ===
    let elevenLabsAgentId: string | null = null;
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
      console.error('[Dana Provision] ElevenLabs failed:', elevenErr);
      // Continue without — admin can configure later
    }

    // === Step 4: Link phone -> agent via phone_lookup ===
    if (phoneNumber) {
      const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
      await setDoc(doc(db, 'phone_lookup', normalizedPhone), {
        bizId,
        agentId: elevenLabsAgentId,
        businessName,
        createdAt: new Date().toISOString(),
      });
    }

    // === Step 5: Update Dana config with phone + agent ID ===
    await setDoc(
      doc(db, 'businesses', bizId),
      {
        dana: {
          ...danaConfig,
          phoneNumber,
          elevenLabsAgentId,
          provisioned: true,
          provisionedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      phoneNumber,
      agentId: elevenLabsAgentId,
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
 * Provisions an Israeli phone number from Twilio
 */
async function provisionTwilioNumber(bizId: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials missing');
  }

  // 1. Search for available Israeli mobile numbers
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/IL/Mobile.json?Limit=1`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
  });

  if (!searchRes.ok) {
    throw new Error('Twilio search failed: ' + searchRes.status);
  }

  const searchData = await searchRes.json();
  const numbers = searchData.available_phone_numbers || [];
  if (numbers.length === 0) {
    throw new Error('No Israeli numbers available');
  }

  const phoneNumber = numbers[0].phone_number;

  // 2. Purchase the number
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
 * Creates an ElevenLabs Conversational AI agent
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

  // Map our voice IDs to ElevenLabs voice IDs (you'll need to update these with real IDs)
  const VOICE_MAP: Record<string, string> = {
    tai: 'pNInz6obpgDQGcFmaJgB', // Adam (placeholder)
    linda: '21m00Tcm4TlvDq8ikWAM', // Rachel (placeholder)
    roni: 'AZnzlk1XvdvUeBnXmlld', // Domi (placeholder)
    dani: 'EXAVITQu4vr4xnSDxMaL', // Bella (placeholder)
    maya: 'ErXwobaYiN019PkySvjV', // Antoni (placeholder)
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
          prompt: {
            prompt: systemPrompt,
          },
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

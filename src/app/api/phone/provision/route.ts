import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/phone/provision
 * 
 * Provisions a Twilio phone number for a business using the master Twilio account.
 * The business owner never touches Twilio — this is fully automatic.
 * 
 * Body: { bizId: string, region: 'US' | 'IL', areaCode?: string, bizName?: string }
 * Returns: { phoneNumber, phoneSid } or { error }
 */
export async function POST(req: NextRequest) {
  try {
    const { bizId, region, areaCode, bizName } = await req.json();

    if (!bizId) {
      return NextResponse.json({ error: 'Missing bizId' }, { status: 400 });
    }

    // Master Twilio credentials from environment
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://your-domain.com';

    if (!accountSid || !authToken) {
      return NextResponse.json({
        error: 'Twilio master account not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment variables.',
      }, { status: 500 });
    }

    const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // ── Step 1: Search for available phone numbers ──
    const isIL = region === 'IL';
    const countryCode = isIL ? 'IL' : 'US';
    
    // Build search URL
    let searchUrl = `${twilioBase}/AvailablePhoneNumbers/${countryCode}/Local.json?VoiceEnabled=true&SmsEnabled=true&Limit=1`;
    if (areaCode && !isIL) {
      searchUrl += `&AreaCode=${areaCode}`;
    }

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: authHeader },
    });

    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      console.error('[Phone] Search failed:', err);
      return NextResponse.json({
        error: `Could not find available numbers in ${countryCode}. ${err.message || ''}`,
      }, { status: 400 });
    }

    const searchData = await searchRes.json();
    const available = searchData.available_phone_numbers;

    if (!available || available.length === 0) {
      return NextResponse.json({
        error: `No available phone numbers found in ${countryCode}${areaCode ? ` area ${areaCode}` : ''}. Try a different area code.`,
      }, { status: 404 });
    }

    const selectedNumber = available[0].phone_number; // e.g. "+15551234567"

    // ── Step 2: Buy the number ──
    const buyUrl = `${twilioBase}/IncomingPhoneNumbers.json`;
    const buyBody = new URLSearchParams({
      PhoneNumber: selectedNumber,
      FriendlyName: `Zikkit: ${bizName || bizId}`,
      VoiceUrl: `${baseUrl}/api/voice/incoming`,
      VoiceMethod: 'POST',
      SmsUrl: `${baseUrl}/api/sms/incoming`,
      SmsMethod: 'POST',
      // StatusCallback: `${baseUrl}/api/voice/status`,
    });

    const buyRes = await fetch(buyUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: buyBody.toString(),
    });

    if (!buyRes.ok) {
      const err = await buyRes.json().catch(() => ({}));
      console.error('[Phone] Buy failed:', err);
      return NextResponse.json({
        error: `Could not purchase number. ${err.message || 'Twilio error'}`,
      }, { status: 400 });
    }

    const buyData = await buyRes.json();
    const phoneNumber = buyData.phone_number;
    const phoneSid = buyData.sid;


    // ── Step 3: Save phone_lookup in Firestore ──
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-5e554';
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
    const cleanNum = phoneNumber.replace(/[^+\d]/g, '');

    // Write to Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/phone_lookup/${encodeURIComponent(cleanNum)}?key=${API_KEY}`;
    await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          bizId: { stringValue: bizId },
          phoneNumber: { stringValue: phoneNumber },
          phoneSid: { stringValue: phoneSid },
          bizName: { stringValue: bizName || '' },
          region: { stringValue: region || 'US' },
          provisioned: { stringValue: new Date().toISOString() },
        },
      }),
    }).catch((e) => console.warn('[Phone] phone_lookup save warn:', e));

    return NextResponse.json({
      phoneNumber,
      phoneSid,
      region: countryCode,
      message: `✅ Phone number ${phoneNumber} activated for ${bizName || 'your business'}`,
    });
  } catch (e) {
    console.error('[Phone] Provision error:', e);
    return NextResponse.json({
      error: 'Something went wrong provisioning the phone number.',
    }, { status: 500 });
  }
}

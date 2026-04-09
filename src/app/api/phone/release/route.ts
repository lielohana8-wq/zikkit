import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/phone/release
 * 
 * Releases a phone number back to Twilio.
 * Body: { bizId: string, phoneSid: string, phoneNumber: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { bizId, phoneSid, phoneNumber } = await req.json();

    if (!phoneSid) {
      return NextResponse.json({ error: 'Missing phoneSid' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // Release the number
    const releaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`;
    const res = await fetch(releaseUrl, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      console.error('[Phone] Release failed:', err);
      return NextResponse.json({ error: 'Failed to release number' }, { status: 400 });
    }


    // Remove from phone_lookup
    if (phoneNumber) {
      const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-5e554';
      const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
      const cleanNum = phoneNumber.replace(/[^+\d]/g, '');
      const deleteUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/phone_lookup/${encodeURIComponent(cleanNum)}?key=${API_KEY}`;
      await fetch(deleteUrl, { method: 'DELETE' }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Phone number released' });
  } catch (e) {
    console.error('[Phone] Release error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

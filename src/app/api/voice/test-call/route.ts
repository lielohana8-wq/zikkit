import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, bizId } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      return NextResponse.json({ error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env.local' }, { status: 500 });
    }

    // Get the base URL — must be publicly accessible (not localhost)
    const envBase = process.env.NEXT_PUBLIC_BASE_URL;
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';

    let baseUrl: string;
    if (envBase) {
      baseUrl = envBase.replace(/\/$/, '');
    } else if (forwardedHost) {
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    } else if (!host.includes('localhost')) {
      baseUrl = `https://${host}`;
    } else {
      return NextResponse.json({ 
        error: 'צריך ngrok! הוסף NEXT_PUBLIC_BASE_URL=https://xxx.ngrok-free.app ל-.env.local, או הרץ ngrok http 3000 ברקע.' 
      }, { status: 400 });
    }

    // Clean phone number — ensure +972 format for Israel
    let cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+972' + cleanPhone.slice(1);
    }
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    // Create the call via Twilio REST API
    // When answered, Twilio will POST to /api/voice/incoming which starts the bot
    const twimlUrl = bizId
      ? `${baseUrl}/api/voice/test-call/twiml?bizId=${bizId}`
      : `${baseUrl}/api/voice/test-call/twiml`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioPhone,
        To: cleanPhone,
        Url: twimlUrl,
        Method: 'POST',
      }).toString(),
    });

    const data = await res.json();

    if (data.sid) {
      return NextResponse.json({
        success: true,
        callSid: data.sid,
        to: cleanPhone,
        from: twilioPhone,
        message: `Calling ${cleanPhone}... Pick up your phone!`,
      });
    } else {
      return NextResponse.json({
        error: data.message || data.more_info || 'Twilio error',
        code: data.code,
      }, { status: 400 });
    }
  } catch (e) {
    console.error('[Test Call] Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

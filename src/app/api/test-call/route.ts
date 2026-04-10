import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    const SID = process.env.TWILIO_ACCOUNT_SID;
    const TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM = process.env.TWILIO_PHONE_IL || process.env.TWILIO_PHONE_NUMBER;

    if (!SID || !TOKEN || !FROM) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    // Call the user, when they answer → bridge to Retell
    const retellNumber = process.env.RETELL_PHONE_NUMBER || '';
    const twimlUrl = retellNumber
      ? new URL('/api/forward-to-retell', req.url).toString()
      : new URL('/api/voice', req.url).toString();

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + Buffer.from(SID + ':' + TOKEN).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, From: FROM, Url: twimlUrl }).toString(),
    });

    const data = await res.json();
    if (data.sid) return NextResponse.json({ success: true, callSid: data.sid });
    return NextResponse.json({ error: data.message || 'Failed', code: data.code }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();
    const SID = process.env.TWILIO_ACCOUNT_SID;
    const TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM = process.env.TWILIO_PHONE_NUMBER;
    if (!SID || !TOKEN || !FROM) return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + Buffer.from(SID + ':' + TOKEN).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: FROM, Body: message }).toString(),
    });
    const data = await res.json();
    return NextResponse.json({ success: true, sid: data.sid });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}

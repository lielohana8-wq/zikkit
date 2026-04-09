import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, message, from } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 });
    }

    if (!from) {
      return NextResponse.json({ error: 'No business phone number. Activate the AI Bot first to get a number.' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.local' }, { status: 500 });
    }

    // Clean phone number
    const cleanTo = to.replace(/[^+\d]/g, '');
    if (cleanTo.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Send SMS via Twilio REST API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: cleanTo,
      Body: message,
      From: from,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Twilio SMS error:', data);
      return NextResponse.json({ error: data.message || 'Failed to send SMS' }, { status: res.status });
    }

    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err) {
    console.error('SMS send error:', err);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}

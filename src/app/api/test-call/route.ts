import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    
    // Try Retell first (works for US numbers)
    const RETELL_KEY = process.env.RETELL_API_KEY;
    const RETELL_AGENT = process.env.RETELL_AGENT_ID;
    const RETELL_PHONE = process.env.RETELL_PHONE_NUMBER;
    
    if (RETELL_KEY && RETELL_AGENT && RETELL_PHONE && !phone.startsWith('+972')) {
      const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RETELL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_number: RETELL_PHONE, to_number: phone, override_agent_id: RETELL_AGENT }),
      });
      const data = await res.json();
      if (data.call_id) return NextResponse.json({ success: true, callId: data.call_id, via: 'retell' });
    }

    // Fallback to Twilio (works for verified Israeli numbers)
    const SID = process.env.TWILIO_ACCOUNT_SID;
    const TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM = process.env.TWILIO_PHONE_NUMBER;
    
    if (SID && TOKEN && FROM) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + Buffer.from(SID + ':' + TOKEN).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, From: FROM, Url: new URL('/api/voice', req.url).toString() }).toString(),
      });
      const data = await res.json();
      if (data.sid) return NextResponse.json({ success: true, callSid: data.sid, via: 'twilio' });
      return NextResponse.json({ error: data.message || 'Failed' }, { status: 400 });
    }

    return NextResponse.json({ error: 'No calling service configured' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

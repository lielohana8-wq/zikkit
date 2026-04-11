import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const p = new URLSearchParams(body);
  console.log('[Forward] From:', p.get('From'), 'To:', p.get('To'));
  
  const retellNumber = process.env.RETELL_PHONE_NUMBER || '';
  const twilioUS = process.env.TWILIO_PHONE_NUMBER || '';
  
  if (!retellNumber) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error. Please try again.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // Use US Twilio number as caller ID to avoid rejection
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${twilioUS}" timeout="30">
    <Number>${retellNumber}</Number>
  </Dial>
</Response>`;

  console.log('[Forward] Dialing', retellNumber, 'with callerId', twilioUS);
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function GET() {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    retell: process.env.RETELL_PHONE_NUMBER || 'NOT SET',
    twilioUS: process.env.TWILIO_PHONE_NUMBER || 'NOT SET'
  }), { headers: { 'Content-Type': 'application/json' } });
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const p = new URLSearchParams(body);
  const from = p.get('From') || '';
  const to = p.get('To') || '';
  
  const retellNumber = process.env.RETELL_PHONE_NUMBER || '';
  
  console.log('[Forward] From:', from, 'To:', to, 'Retell:', retellNumber);
  
  if (!retellNumber) {
    console.error('[Forward] RETELL_PHONE_NUMBER not set!');
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error. Please try again later.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30">
    <Number>${retellNumber}</Number>
  </Dial>
</Response>`;

  console.log('[Forward] TwiML:', twiml);
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function GET() {
  return new Response(JSON.stringify({ status: 'ok', retell: process.env.RETELL_PHONE_NUMBER || 'NOT SET' }), 
    { headers: { 'Content-Type': 'application/json' } });
}

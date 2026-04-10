import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Get the Retell phone number to forward to
  const retellNumber = process.env.RETELL_PHONE_NUMBER || '';
  
  if (!retellNumber) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="he-IL">מצטערים, יש תקלה. נסו שוב מאוחר יותר.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // Forward the call to Retell's number
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" callerId="${process.env.TWILIO_PHONE_IL || ''}">
    <Number>${retellNumber}</Number>
  </Dial>
</Response>`;

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'forward-to-retell' });
}

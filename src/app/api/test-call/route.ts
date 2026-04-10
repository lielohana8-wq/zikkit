import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    const RETELL_KEY = process.env.RETELL_API_KEY;

    if (!RETELL_KEY) {
      return NextResponse.json({ error: 'RETELL_API_KEY not configured in Vercel' }, { status: 500 });
    }

    // Get agent ID - try from Firestore first, fallback to env
    let agentId = process.env.RETELL_AGENT_ID || '';

    if (!agentId) {
      // List agents to find the first one
      try {
        const listRes = await fetch('https://api.retellai.com/v2/list-agents', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${RETELL_KEY}` },
        });
        const agents = await listRes.json();
        if (Array.isArray(agents) && agents.length > 0) {
          agentId = agents[0].agent_id;
        }
      } catch {}
    }

    if (!agentId) {
      return NextResponse.json({ error: 'No Retell agent found' }, { status: 400 });
    }

    // Get the Retell phone number
    let fromNumber = '';
    try {
      const phonesRes = await fetch('https://api.retellai.com/v2/list-phone-numbers', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${RETELL_KEY}` },
      });
      const phones = await phonesRes.json();
      if (Array.isArray(phones) && phones.length > 0) {
        fromNumber = phones[0].phone_number;
      }
    } catch {}

    if (!fromNumber) {
      return NextResponse.json({ error: 'No Retell phone number found' }, { status: 400 });
    }

    // Create outbound call via Retell
    const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RETELL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: phone,
        override_agent_id: agentId,
      }),
    });

    const data = await res.json();
    if (data.call_id) {
      return NextResponse.json({ success: true, callId: data.call_id });
    }
    return NextResponse.json({ error: data.error_message || data.message || 'Failed', detail: data }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

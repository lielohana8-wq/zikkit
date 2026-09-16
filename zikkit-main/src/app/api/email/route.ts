import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();
    const KEY = process.env.RESEND_API_KEY;
    if (!KEY) return NextResponse.json({ error: 'Resend not configured' }, { status: 500 });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Zikkit <noreply@zikkit.com>', to, subject, html }),
    });
    const data = await res.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}

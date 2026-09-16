import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, clientName, type, bizName } = await req.json();
    if (!to || !clientName) return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@zikkit.com';
    const typeHE = type === 'investor' ? 'הסכם סודיות למשקיעים' : 'הסכם פיילוט חינם';

    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1318;color:#e8f0f4;padding:30px;border-radius:16px;">' +
      '<div style="text-align:center;margin-bottom:20px;"><div style="display:inline-block;width:50px;height:50px;background:#00e5b0;border-radius:12px;line-height:50px;font-size:24px;font-weight:900;color:#000;">Zk</div></div>' +
      '<h2 style="text-align:center;color:#00e5b0;">' + typeHE + '</h2>' +
      '<div style="background:#141920;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;direction:rtl;">' +
      '<p style="color:#e8f0f4;">שלום ' + clientName + ',</p>' +
      '<p style="color:#a8bcc8;font-size:13px;">מצורף ' + typeHE + ' מאת <strong>' + (bizName || 'Zikkit') + '</strong>.</p>' +
      '<p style="color:#a8bcc8;font-size:13px;">אנא עיין בהסכם, חתום והחזר אלינו.</p></div>' +
      '<p style="text-align:center;color:#5a7080;font-size:10px;">Zikkit 2026</p></div>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Zikkit <' + fromEmail + '>', to: [to], subject: typeHE + ' - ' + (bizName || 'Zikkit'), html }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || 'Failed' }, { status: res.status });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('Agreement email error:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}

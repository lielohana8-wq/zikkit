import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mail';

export const runtime = 'nodejs';

/**
 * POST { channel: 'sms' | 'email', to, message, subject?, bizName?, replyTo? }
 * Sends a crew member their run sheet. Plain text on purpose — it has to be
 * readable on a lock screen while someone is holding a ladder.
 */
export async function POST(req: NextRequest) {
  try {
    const { channel, to, message, subject, bizName, replyTo } = await req.json();
    if (!to || !message) return NextResponse.json({ error: 'Missing recipient or message' }, { status: 400 });
    const text = String(message).slice(0, 1400);
    const biz = String(bizName || 'Zikkit').slice(0, 80);

    if (channel === 'sms') {
      const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_CA || process.env.TWILIO_PHONE_NUMBER;
      if (!sid || !tok || !from) return NextResponse.json({ error: 'SMS is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_CA). Use WhatsApp in the meantime.' }, { status: 501 });
      const toNum = normalize(String(to));
      if (!toNum) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: toNum, From: from, Body: text }),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.message || 'Twilio error' }, { status: 502 });
      return NextResponse.json({ ok: true, sid: data.sid });
    }

    if (channel === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      const esc = (s: string) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] as string));
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
        <pre style="font:14px/1.6 Arial,sans-serif;white-space:pre-wrap;margin:0">${esc(text)}</pre>
      </div>`;
      const r = await sendMail({ to: String(to), subject: String(subject || `Your schedule — ${biz}`), html, replyTo: typeof replyTo === 'string' ? replyTo : undefined, fromName: biz });
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
      return NextResponse.json({ ok: true, id: r.id });
    }

    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function normalize(p: string): string {
  const t = p.trim();
  if (t.startsWith('+')) return '+' + t.slice(1).replace(/\D/g, '');
  let d = t.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? '+1' + d : '';
}

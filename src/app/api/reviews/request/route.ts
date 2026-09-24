import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mail';

export const runtime = 'nodejs';

/**
 * POST { channel: 'sms' | 'email', to, customerName, bizName, url, message?, replyTo? }
 * Asks a customer for a Google review after their job is done. Transactional,
 * one-to-one, and only sent when the business presses the button.
 */
export async function POST(req: NextRequest) {
  try {
    const { channel, to, customerName, bizName, url, message, replyTo } = await req.json();
    if (!to) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Add your Google review link in Settings first' }, { status: 400 });
    const biz = String(bizName || 'us').slice(0, 80);
    const name = String(customerName || '').slice(0, 80);
    const body = String(message || `Hi ${name || 'there'}, thanks for choosing ${biz}! If we did a good job, a quick Google review really helps: ${url}`)
      .replace(/\{name\}/g, name || 'there').replace(/\{link\}/g, url).replace(/\{business\}/g, biz)
      .slice(0, 600);

    if (channel === 'sms') {
      const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_CA || process.env.TWILIO_PHONE_NUMBER;
      if (!sid || !tok || !from) return NextResponse.json({ error: 'SMS is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_CA)' }, { status: 501 });
      const toNum = normalize(String(to));
      if (!toNum) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: toNum, From: from, Body: body }),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.message || 'Twilio error' }, { status: 502 });
      return NextResponse.json({ ok: true, sid: data.sid });
    }

    if (channel === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
        <p>${esc(body.replace(url, '')).trim()}</p>
        <p style="margin:28px 0"><a href="${url}" style="background:#4F46E5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Leave a review</a></p>
        <p style="font-size:12px;color:#666">Thank you — it takes 30 seconds and it genuinely helps a small business.</p>
      </div>`;
      const r = await sendMail({ to: String(to), subject: `How did we do? — ${biz}`, html, replyTo: typeof replyTo === 'string' ? replyTo : undefined, fromName: biz });
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

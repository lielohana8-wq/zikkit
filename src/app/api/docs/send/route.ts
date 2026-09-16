import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST { channel: 'sms' | 'email', to, kind, number, url, bizName, customerName }
 * Sends a quote/receipt link. SMS via Twilio, email via Resend. Transactional
 * (customer-requested) messages only — no marketing, so CASL-compliant by nature.
 */
export async function POST(req: NextRequest) {
  try {
    const { channel, to, kind, number, url, bizName, customerName, replyTo } = await req.json();
    if (!to || !url || !kind) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    const label = kind === 'quote' ? 'quote' : 'receipt';
    const biz = String(bizName || 'us').slice(0, 80);
    const name = String(customerName || '').slice(0, 80);

    if (channel === 'sms') {
      const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_CA || process.env.TWILIO_PHONE_NUMBER;
      if (!sid || !tok || !from) return NextResponse.json({ error: 'SMS is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_CA)' }, { status: 501 });
      const toNum = normalize(String(to));
      if (!toNum) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
      const body = `Hi ${name || 'there'}, here is your ${label} ${number || ''} from ${biz}: ${url}`.replace(/\s+/g, ' ');
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
      const key = process.env.RESEND_API_KEY;
      if (!key) return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY)' }, { status: 501 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      const subject = `${cap(label)} ${number || ''} from ${biz}`.trim();
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
        <p>Hi ${esc(name || 'there')},</p>
        <p>Here is your ${label} <b>${esc(number || '')}</b> from <b>${esc(biz)}</b>.</p>
        <p style="margin:28px 0"><a href="${url}" style="background:#4F46E5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">View ${label}</a></p>
        <p style="font-size:12px;color:#666">If the button doesn't work, copy this link: ${url}</p>
      </div>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'Zikkit <noreply@zikkit.com>', to, subject, html, ...(replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(replyTo)) ? { reply_to: replyTo } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: (data.message || data.error || 'Resend error') + (String(data.message || '').includes('domain') ? ' — RESEND_FROM_EMAIL must use a domain verified in Resend (resend.com/domains), or onboarding@resend.dev for testing.' : '') }, { status: 502 });
      return NextResponse.json({ ok: true, id: data.id });
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
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s: string) { return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string)); }

import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mail';

export const runtime = 'nodejs';

/** POST { to, name, role, bizName, url, replyTo } — emails a team invitation link. */
export async function POST(req: NextRequest) {
  try {
    const { to, name, role, bizName, url, replyTo } = await req.json();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    const biz = String(bizName || 'our team').slice(0, 80);
    const who = String(name || '').slice(0, 80);
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
      <p>Hi ${esc(who || 'there')},</p>
      <p>You've been added to <b>${esc(biz)}</b> on Zikkit as <b>${esc(String(role || 'team member'))}</b>.</p>
      <p>Create your account with this email address (<b>${esc(String(to))}</b>) using the link below:</p>
      <p style="margin:28px 0"><a href="${url}" style="background:#4F46E5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Join ${esc(biz)}</a></p>
      <p style="font-size:12px;color:#666">If the button doesn't work, copy this link: ${url}</p>
    </div>`;
    const r = await sendMail({ to: String(to), subject: `You're invited to join ${biz} on Zikkit`, html, replyTo: typeof replyTo === 'string' ? replyTo : undefined, fromName: biz });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

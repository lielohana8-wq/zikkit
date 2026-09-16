import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/admin';
import { sendMail, mailConfigured } from '@/lib/server/mail';

export const runtime = 'nodejs';

/**
 * POST { token, action: 'accept' | 'decline', name, signature? }
 * Customer accepts or declines a quote from the public page. Token-secured.
 * The signature (PNG data URL) is kept on the portal document; the quote record
 * only gets a reference, so business data stays small.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action, name, signature } = body as { token?: string; action?: string; name?: string; signature?: string };
    if (!token || typeof token !== 'string' || token.length < 12) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    if (action !== 'accept' && action !== 'decline') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    if (action === 'accept' && (!name || name.trim().length < 2)) return NextResponse.json({ error: 'Please type your name' }, { status: 400 });
    if (signature && (typeof signature !== 'string' || signature.length > 400_000 || !signature.startsWith('data:image/'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

    const db = adminDb();
    const portalRef = db.collection('public_portals').doc(token);
    const portal = await portalRef.get();
    if (!portal.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = portal.data() || {};
    if (data.kind !== 'quote') return NextResponse.json({ error: 'Only quotes can be accepted' }, { status: 400 });
    if (data.status === 'accepted' || data.status === 'approved') return NextResponse.json({ ok: true, already: true, status: 'accepted' });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = new Date().toISOString();
    const status = action === 'accept' ? 'accepted' : 'declined';
    const portalPatch: Record<string, unknown> = { status, [action === 'accept' ? 'acceptedAt' : 'declinedAt']: now, signedName: name || '', signedIP: ip, updated: now };
    if (signature) portalPatch.signature = signature;
    await portalRef.set(portalPatch, { merge: true });

    if (data.bizId && data.doc?.id != null) {
      const qRef = db.collection('businesses').doc(String(data.bizId)).collection('quotes').doc(String(data.doc.id));
      const qPatch: Record<string, unknown> = { status, signedName: name || '', [action === 'accept' ? 'acceptedAt' : 'declinedAt']: now };
      if (signature) qPatch.signatureToken = token;
      await qRef.set(qPatch, { merge: true });

      // Notify the owner by email when possible (best effort)
      try {
        const to = data.biz?.email;
        if (to && mailConfigured()) {
          const num = data.doc?.number || `Q-${data.doc?.id}`;
          const total = data.doc?.total;
          await sendMail({ to, subject: `${status === 'accepted' ? '✅' : '❌'} Quote ${num} ${status} by ${name || data.doc?.client || 'customer'}`, html: `<p>Quote <b>${num}</b> for <b>${data.doc?.client || ''}</b> was <b>${status}</b>${total != null ? ` — ${data.currency || ''} ${Number(total).toFixed(2)}` : ''}.</p><p>Open Zikkit to create the receipt.</p>`, fromName: 'Zikkit' });
        }
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

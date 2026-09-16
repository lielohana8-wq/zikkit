import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/server/admin';

export const runtime = 'nodejs';

/** POST { token } — records that the customer opened the document. Public, token-secured, idempotent. */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 12) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    if (!isAdminConfigured()) return NextResponse.json({ ok: true, skipped: 'admin-not-configured' });
    const db = adminDb();
    const portalRef = db.collection('public_portals').doc(token);
    const portal = await portalRef.get();
    if (!portal.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = portal.data() || {};
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { lastViewedAt: now, views: (Number(data.views) || 0) + 1 };
    if (!data.viewedAt) patch.viewedAt = now;
    await portalRef.set(patch, { merge: true });
    if (data.kind === 'quote' && data.bizId && data.doc?.id != null) {
      const qRef = db.collection('businesses').doc(String(data.bizId)).collection('quotes').doc(String(data.doc.id));
      const q = await qRef.get();
      if (q.exists) {
        const qd = q.data() || {};
        const qPatch: Record<string, unknown> = { viewedAt: qd.viewedAt || now };
        if (qd.status === 'sent') qPatch.status = 'viewed';
        await qRef.set(qPatch, { merge: true });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

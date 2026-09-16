import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone') || '';
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();

    let bizId = '';
    const clean = phone.replace(/[^0-9]/g, '');

    // Find by phone_lookup
    if (clean) {
      try {
        const snap = await fb.getDoc(fb.doc(db, 'phone_lookup', clean));
        if (snap.exists()) bizId = snap.data().bizId;
      } catch {}
    }

    // Fallback
    if (!bizId) bizId = 'StsC7Ivcl7P8gR89Ljjxm7yTMO32';

    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const cfg = bizSnap.data().cfg || {};

    return NextResponse.json({
      business_name: cfg.biz_name || '',
      business_type: cfg.biz_type || '',
      phone: cfg.biz_phone || '',
      greeting: cfg.bot_greeting || '',
      currency: cfg.currency || 'ILS',
      service_fee: cfg.service_fee || 0,
      region: cfg.region || 'IL',
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

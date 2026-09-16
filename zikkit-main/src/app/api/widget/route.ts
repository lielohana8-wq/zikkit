import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreDb, doc, getDoc, setDoc } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { bizId, name, phone, email, message, source } = await req.json();
    if (!bizId || !name || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const db = getFirestoreDb();
    const bizSnap = await getDoc(doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const bizData = bizSnap.data();
    const leads = bizData.db?.leads || [];
    const newLead = {
      id: Date.now(),
      name,
      phone,
      email: email || '',
      desc: message || '',
      status: 'new',
      source: source || 'website_form',
      created: new Date().toISOString(),
      followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    leads.push(newLead);
    await setDoc(doc(db, 'businesses', bizId), {
      ...bizData,
      db: { ...bizData.db, leads },
    });

    return NextResponse.json({ success: true, leadId: newLead.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

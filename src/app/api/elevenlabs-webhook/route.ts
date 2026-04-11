import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[ElevenLabs] Webhook:', JSON.stringify(payload).slice(0, 1000));

    // Extract data from ElevenLabs webhook
    const conversation = payload.conversation || payload;
    const analysis = conversation.analysis || payload.analysis || {};
    const dataCollection = analysis.data_collection || {};
    const transcript = conversation.transcript || payload.transcript || '';
    const fromNumber = conversation.phone_number || payload.phone_number || payload.from || '';
    const toNumber = conversation.to_number || payload.to_number || '';

    const customerName = dataCollection.customer_name || '';
    const customerPhone = dataCollection.contact_number || fromNumber;
    const customerAddress = dataCollection.service_address || '';
    const issue = dataCollection.issue_type || '';
    const urgency = dataCollection.urgency_level || '';

    // Find business by phone number
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();

    let bizId = '';
    const cleanTo = (toNumber || '').replace(/[^0-9]/g, '');
    const cleanFrom = (fromNumber || '').replace(/[^0-9]/g, '');

    // Try phone_lookup
    if (cleanTo) {
      try {
        const snap = await fb.getDoc(fb.doc(db, 'phone_lookup', cleanTo));
        if (snap.exists()) bizId = snap.data().bizId;
      } catch {}
    }

    // Fallback: try all businesses
    if (!bizId) {
      try {
        const col = await fb.getDocs(fb.collection(db, 'businesses'));
        col.forEach((doc: any) => {
          const cfg = doc.data().cfg || {};
          const bPhone = (cfg.biz_phone || '').replace(/[^0-9]/g, '');
          if (bPhone && (cleanTo.includes(bPhone) || bPhone.includes(cleanTo))) bizId = doc.id;
        });
      } catch {}
    }

    // Fallback to default
    if (!bizId) bizId = 'StsC7Ivcl7P8gR89Ljjxm7yTMO32';

    // Load business
    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return NextResponse.json({ ok: true, warning: 'no_business' });

    const bizData = bizSnap.data();
    const leads = bizData.db?.leads || [];
    const botLog = bizData.db?.botLog || [];

    // Create lead
    const leadPhone = customerPhone || fromNumber;
    const existing = leads.findIndex((l: any) => l.phone === leadPhone);

    const lead = {
      id: Date.now(),
      name: customerName || 'שיחה — ' + (leadPhone || 'לא ידוע'),
      phone: leadPhone,
      address: customerAddress,
      source: 'ai_bot',
      status: 'new',
      notes: issue || '',
      urgency,
      created: new Date().toISOString(),
    };

    if (existing >= 0) leads[existing] = { ...leads[existing], ...lead, id: leads[existing].id };
    else leads.push(lead);

    // Log
    botLog.push({
      id: Date.now(), type: 'elevenlabs_call', from: fromNumber, to: toNumber,
      transcript: typeof transcript === 'string' ? transcript.slice(0, 2000) : JSON.stringify(transcript).slice(0, 2000),
      customerName, customerPhone: leadPhone, customerAddress, issue, urgency,
      timestamp: new Date().toISOString(),
    });

    // Save
    await fb.setDoc(fb.doc(db, 'businesses', bizId), { db: { ...bizData.db, leads, botLog } }, { merge: true });

    // Create portal + send SMS
    const portalToken = 'portal_' + Date.now();
    const bizCfg = bizData.cfg || {};
    try {
      await fb.setDoc(fb.doc(db, 'public_portals', portalToken), {
        type: 'job', bizName: bizCfg.biz_name || '', bizPhone: bizCfg.biz_phone || '',
        client: lead.name, phone: leadPhone, address: customerAddress,
        desc: issue, status: 'open', currency: bizCfg.currency || 'ILS',
        created: new Date().toISOString(),
      });

      // Send SMS with portal link
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_IL || process.env.TWILIO_PHONE_NUMBER;
      if (twilioSid && twilioToken && twilioFrom && leadPhone) {
        const url = 'https://zikkit-jvc7.vercel.app/portal/' + portalToken;
        const body = 'היי ' + lead.name + ', תודה שהתקשרת! הנה פרטי הפנייה: ' + url;
        await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioSid + '/Messages.json', {
          method: 'POST',
          headers: { 'Authorization': 'Basic ' + Buffer.from(twilioSid + ':' + twilioToken).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: leadPhone, From: twilioFrom, Body: body }).toString(),
        });
      }
    } catch (e) { console.warn('[ElevenLabs] Portal/SMS:', e); }

    console.log('[ElevenLabs] Lead created:', lead.name);
    return NextResponse.json({ ok: true, lead_created: true });
  } catch (e) {
    console.error('[ElevenLabs] Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'elevenlabs-webhook' });
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[Retell] Webhook:', JSON.stringify(payload).slice(0, 500));

    const event = payload.event;
    const call = payload.call || payload;

    // Only process completed calls
    if (event !== 'call_ended' && event !== 'call_analyzed') {
      return NextResponse.json({ ok: true });
    }

    const fromNumber = call.from_number || '';
    const toNumber = call.to_number || '';
    const transcript = call.transcript || '';
    const summary = call.call_analysis?.call_summary || call.summary || '';
    const customerName = call.call_analysis?.custom_analysis_data?.customer_name || call.retell_llm_dynamic_variables?.customer_name || '';
    const customerPhone = call.call_analysis?.custom_analysis_data?.customer_phone || fromNumber;
    const customerAddress = call.call_analysis?.custom_analysis_data?.customer_address || '';
    const issue = call.call_analysis?.custom_analysis_data?.issue || summary || '';
    const sentiment = call.call_analysis?.user_sentiment || '';

    // Find business by phone number
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();
    const cleanTo = toNumber.replace(/[^0-9]/g, '');

    let bizId = '';
    // Try phone_lookup
    try {
      const lookupSnap = await fb.getDoc(fb.doc(db, 'phone_lookup', cleanTo));
      if (lookupSnap.exists()) bizId = lookupSnap.data().bizId;
    } catch {}

    // If no lookup, try to find by phone in business config
    if (!bizId) {
      try {
        const bizCol = await fb.getDocs(fb.collection(db, 'businesses'));
        bizCol.forEach((doc: any) => {
          const cfg = doc.data().cfg || {};
          const bizPhone = (cfg.biz_phone || '').replace(/[^0-9]/g, '');
          if (bizPhone && (cleanTo.includes(bizPhone) || bizPhone.includes(cleanTo))) {
            bizId = doc.id;
          }
        });
      } catch {}
    }

    if (!bizId) {
      console.log('[Retell] No business found for number:', toNumber);
      return NextResponse.json({ ok: true, warning: 'no_business_found' });
    }

    // Load business data
    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return NextResponse.json({ ok: true });

    const bizData = bizSnap.data();
    const leads = bizData.db?.leads || [];
    const botLog = bizData.db?.botLog || [];

    // Create lead
    const cleanFrom = customerPhone.replace(/[^0-9+]/g, '');
    const existingLead = leads.findIndex((l: any) => l.phone === cleanFrom || l.phone === fromNumber);

    const lead = {
      id: Date.now(),
      name: customerName || 'שיחה — ' + (fromNumber || 'לא ידוע'),
      phone: cleanFrom || fromNumber,
      address: customerAddress,
      source: 'ai_bot',
      status: 'new',
      notes: issue || transcript.slice(0, 500),
      sentiment,
      created: new Date().toISOString(),
    };

    if (existingLead >= 0) {
      leads[existingLead] = { ...leads[existingLead], ...lead, id: leads[existingLead].id };
    } else {
      leads.push(lead);
    }

    // Log the call
    botLog.push({
      id: Date.now(),
      type: 'retell_call',
      from: fromNumber,
      to: toNumber,
      transcript: transcript.slice(0, 2000),
      summary,
      customerName,
      customerPhone: cleanFrom,
      customerAddress,
      issue,
      sentiment,
      callId: call.call_id || '',
      duration: call.end_timestamp && call.start_timestamp ? Math.round((call.end_timestamp - call.start_timestamp) / 1000) : 0,
      timestamp: new Date().toISOString(),
    });

    // Save
    await fb.setDoc(fb.doc(db, 'businesses', bizId), {
      db: { ...bizData.db, leads, botLog }
    }, { merge: true });

    console.log('[Retell] Lead created:', lead.name, lead.phone);

    // Create portal for the lead
    const portalToken = 'portal_' + Date.now();
    try {
      const bizCfg = bizData.cfg || {};
      await fb.setDoc(fb.doc(db, 'public_portals', portalToken), {
        type: 'job', bizName: bizCfg.biz_name || '', bizPhone: bizCfg.biz_phone || '',
        client: lead.name, phone: lead.phone, address: lead.address || '',
        desc: lead.notes || '', status: 'open', techName: '',
        scheduledDate: '', scheduledTime: '',
        currency: bizCfg.currency || 'ILS', created: new Date().toISOString(),
      });

      // Send portal link via WhatsApp (via Twilio if configured)
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
      if (twilioSid && twilioToken && twilioFrom && lead.phone) {
        const portalUrl = 'https://zikkit-jvc7.vercel.app/portal/' + portalToken;
        const smsBody = 'היי ' + lead.name + ', תודה שהתקשרת ל-' + (bizCfg.biz_name || '') + '! הנה פרטי הפנייה שלך: ' + portalUrl;
        try {
          await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioSid + '/Messages.json', {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + Buffer.from(twilioSid + ':' + twilioToken).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: lead.phone, From: twilioFrom, Body: smsBody }).toString(),
          });
          console.log('[Retell] Portal SMS sent to:', lead.phone);
        } catch (smsErr) { console.warn('[Retell] SMS failed:', smsErr); }
      }
    } catch (portalErr) { console.warn('[Retell] Portal creation failed:', portalErr); }
    return NextResponse.json({ ok: true, lead_created: true });
  } catch (e) {
    console.error('[Retell] Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'retell-webhook' });
}

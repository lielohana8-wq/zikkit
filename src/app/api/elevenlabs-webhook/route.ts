import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[EL] Full payload:', JSON.stringify(payload).slice(0, 2000));

    // ElevenLabs sends tool call data in different formats - try all
    const customerName = payload.customer_name || payload.name || payload.data?.customer_name || '';
    const customerPhone = payload.customer_phone || payload.phone || payload.contact_number || payload.data?.customer_phone || '';
    const customerAddress = payload.customer_address || payload.address || payload.service_address || payload.data?.customer_address || '';
    const issue = payload.issue || payload.issue_type || payload.notes || payload.data?.issue || '';
    const notes = payload.notes || payload.summary || payload.data?.notes || issue;
    const preferredTime = payload.preferred_time || payload.time || payload.data?.preferred_time || '';

    console.log('[EL] Parsed:', { customerName, customerPhone, customerAddress, issue, preferredTime });

    // Find business
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();
    let bizId = 'StsC7Ivcl7P8gR89Ljjxm7yTMO32'; // fallback

    // Try phone_lookup with the business number
    try {
      const col = await fb.getDocs(fb.collection(db, 'phone_lookup'));
      col.forEach((doc: any) => {
        if (doc.data().bizId) bizId = doc.data().bizId;
      });
    } catch {}

    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return NextResponse.json({ ok: true });

    const bizData = bizSnap.data();
    const bizCfg = bizData.cfg || {};

    // If we have a preferred time — create a JOB, not just a lead
    if (customerName && customerAddress && preferredTime) {
      const jobs = bizData.db?.jobs || [];
      const newId = jobs.length > 0 ? Math.max(...jobs.map((j: any) => j.id || 0)) + 1 : 1;
      
      // Parse preferred time
      let scheduledDate = new Date().toISOString().split('T')[0];
      let scheduledTime = '09:00';
      
      if (preferredTime.includes('מחר') || preferredTime.toLowerCase().includes('tomorrow')) {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        scheduledDate = tomorrow.toISOString().split('T')[0];
      }
      if (preferredTime.includes('אחה') || preferredTime.toLowerCase().includes('afternoon')) scheduledTime = '14:00';
      if (preferredTime.includes('בוקר') || preferredTime.toLowerCase().includes('morning')) scheduledTime = '09:00';
      if (preferredTime.includes('ערב') || preferredTime.toLowerCase().includes('evening')) scheduledTime = '17:00';
      
      // Extract hour if mentioned
      const hourMatch = preferredTime.match(/(\d{1,2}):?(\d{2})?/);
      if (hourMatch) scheduledTime = hourMatch[1].padStart(2, '0') + ':' + (hourMatch[2] || '00');

      // Auto-assign technician
      const techs = (bizData.db?.users || []).filter((u: any) => u.role === 'tech' || u.role === 'technician');
      let assignedTech = '';
      if (techs.length === 1) {
        assignedTech = techs[0].name;
      } else if (techs.length > 1) {
        // Find least busy tech for that date/time
        const dayJobs = jobs.filter((j: any) => j.scheduledDate === scheduledDate && j.status !== 'cancelled');
        let minJobs = 999; let bestTech = techs[0]?.name || '';
        for (const tech of techs) {
          const techJobCount = dayJobs.filter((j: any) => j.tech === tech.name).length;
          if (techJobCount < minJobs) { minJobs = techJobCount; bestTech = tech.name; }
        }
        assignedTech = bestTech;
      }

      const job = {
        id: newId,
        num: 'JOB-' + String(newId).padStart(4, '0'),
        client: customerName,
        phone: customerPhone,
        address: customerAddress,
        desc: issue || notes || 'שיחת בוט',
        status: assignedTech ? 'assigned' : 'open',
        source: 'ai_bot',
        tech: assignedTech,
        scheduledDate,
        scheduledTime,
        notes: notes || '',
        created: new Date().toISOString(),
      };

      jobs.push(job);
      await fb.setDoc(fb.doc(db, 'businesses', bizId), { db: { ...bizData.db, jobs } }, { merge: true });
      console.log('[EL] Job created:', job.num, job.client, job.scheduledDate, job.scheduledTime);

      // Create portal
      const portalToken = 'portal_' + Date.now();
      try {
        await fb.setDoc(fb.doc(db, 'public_portals', portalToken), {
          type: 'job', bizName: bizCfg.biz_name || '', bizPhone: bizCfg.biz_phone || '',
          client: customerName, phone: customerPhone, address: customerAddress,
          desc: issue, status: assignedTech ? 'assigned' : 'open', techName: assignedTech, scheduledDate, scheduledTime,
          currency: bizCfg.currency || 'ILS', created: new Date().toISOString(),
        });
      } catch {}

      // Send SMS
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_IL || process.env.TWILIO_PHONE_NUMBER;
      if (twilioSid && twilioToken && twilioFrom && customerPhone) {
        try {
          const url = 'https://zikkit-jvc7.vercel.app/portal/' + portalToken;
          await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioSid + '/Messages.json', {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + Buffer.from(twilioSid + ':' + twilioToken).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: customerPhone, From: twilioFrom, Body: 'היי ' + customerName + ', תודה! הנה פרטי העבודה: ' + url }).toString(),
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, type: 'job', jobId: newId });
    }

    // Otherwise create a LEAD
    const leads = bizData.db?.leads || [];
    const newId = leads.length > 0 ? Math.max(...leads.map((l: any) => l.id || 0)) + 1 : 1;

    const lead = {
      id: newId,
      name: customerName || 'שיחה — ' + (customerPhone || 'לא ידוע'),
      phone: customerPhone,
      address: customerAddress,
      source: 'ai_bot',
      status: 'new',
      notes: notes || issue || '',
      created: new Date().toISOString(),
    };

    const existing = leads.findIndex((l: any) => l.phone && l.phone === customerPhone);
    if (existing >= 0) leads[existing] = { ...leads[existing], ...lead, id: leads[existing].id };
    else leads.push(lead);

    await fb.setDoc(fb.doc(db, 'businesses', bizId), { db: { ...bizData.db, leads } }, { merge: true });
    console.log('[EL] Lead created:', lead.name, lead.phone);

    return NextResponse.json({ ok: true, type: 'lead', leadId: lead.id });
  } catch (e) {
    console.error('[EL] Error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'elevenlabs-webhook' });
}

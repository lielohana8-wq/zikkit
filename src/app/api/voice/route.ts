import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

// In-memory conversation store (per call)
const conversations: Record<string, { messages: any[]; lang: string; bizName: string; bizType: string; bizPhone: string; collectedData: any }> = {};

function detectLang(calledNumber: string, speechResult: string): string {
  // Israeli numbers
  if (calledNumber.startsWith('+972') || calledNumber.startsWith('972') || calledNumber.startsWith('0')) return 'he';
  // Hebrew chars in speech
  if (/[\u0590-\u05FF]/.test(speechResult)) return 'he';
  return 'en';
}

function getSystemPrompt(lang: string, bizName: string, bizType: string): string {
  if (lang === 'he') {
    return `אתה נציג שירות טלפוני מקצועי ואנושי של "${bizName}", עסק מסוג ${bizType}.

המטרה שלך:
1. לענות בחום ובמקצועיות
2. להבין מה הלקוח צריך
3. לשכנע אותו לקבוע שירות/ביקור
4. לאסוף פרטים: שם, טלפון, כתובת, תיאור הבעיה, מתי נוח לו

שאלות מותאמות לפי סוג עסק:
- אינסטלציה: שאל על סוג הנזילה, קומה, האם יש ברז מרכזי, דחיפות
- חשמל: שאל אם נפל חשמל, ריח שריפה, תקלה ספציפית, לוח חשמל
- מיזוג אוויר: שאל על סוג המזגן, האם מקרר/מחמם, רעשים, דגם
- מנעולנות: שאל אם נעול בחוץ, סוג המנעול, דלת כניסה/רכב, דחיפות
- ניקיון: שאל על גודל הדירה, סוג ניקיון (שוטף/יסודי/אחרי שיפוץ), תדירות
- הדברה: שאל על סוג המזיק, גודל הבית, האם יש ילדים/חיות
- שיפוצים: שאל על סוג העבודה, גודל, תקציב משוער
- דלתות מוסך: שאל על סוג הדלת, התקלה, חשמלית/ידנית
- גינון: שאל על גודל הגינה, סוג העבודה (גיזום/דישון/התקנה)
- מעליות: שאל על סוג התקלה, קומה, האם תקועים בפנים
- מוצרי חשמל: שאל על סוג המוצר, הדגם, התקלה, גיל המוצר
- ארובות: שאל על סוג הארובה (קמין/גז/עץ), מתי ניקו בפעם האחרונה, האם יש עשן חוזר, גובה הבניין, גישה לגג

כללים חשובים:
- דבר בעברית טבעית, קצר וחם. לא רובוטי.
- אל תגיד שאתה AI או בוט. אתה נציג של ${bizName}.
- אם הלקוח מהסס — שכנע אותו. הדגש מקצועיות, מהירות, אמינות.
- אם שואל על מחיר — אמור "המחיר תלוי בסוג העבודה, הטכנאי שלנו יבדוק ויתן הצעת מחיר במקום ללא התחייבות."
- אם שואל על זמינות — אמור "יש לנו טכנאים זמינים. מתי נוח לך?"
- אם מתלונן — הקשב, הזדהה, הצע פתרון מיידי.
- אם שואל שאלה שאתה לא יודע — אמור "אני אבדוק ואחזור אליך. מה השם והטלפון שלך?"
- כשיש מספיק פרטים (שם + טלפון + תיאור), סכם: "מצוין [שם], פתחתי עבודה עבורך. טכנאי ייצור איתך קשר בהקדם. תודה רבה!"
- תשובות קצרות — 1-3 משפטים. זו שיחת טלפון, לא מייל.`;
  }
  
  return `You are a professional, warm phone representative for "${bizName}", a ${bizType} business.

Your goals:
1. Answer warmly and professionally
2. Understand the customer's needs
3. Convince them to book a service visit
4. Collect details: name, phone, address, issue description, preferred time

Business-specific questions to ask:
- Plumbing: ask about leak type, floor level, main shutoff valve, urgency
- Electrical: ask if power is out, burning smell, specific issue, panel type
- HVAC: ask about unit type, cooling/heating issue, noises, model
- Locksmith: ask if locked out, lock type, door/car, urgency
- Cleaning: ask about home size, cleaning type (regular/deep/post-renovation), frequency
- Pest control: ask about pest type, home size, children/pets present
- Renovation: ask about work type, scope, estimated budget
- Garage doors: ask about door type, issue, electric/manual
- Landscaping: ask about yard size, work type (trimming/planting/installation)
- Elevators: ask about issue type, floor, anyone trapped
- Appliances: ask about appliance type, model, issue, age
- Chimneys: ask about chimney type (fireplace/gas/wood), last cleaning date, any smoke backflow, building height, roof access

Important rules:
- Speak naturally and briefly. Not robotic.
- Never say you're AI or a bot. You represent ${bizName}.
- If they hesitate — persuade them. Emphasize professionalism, speed, reliability.
- If asked about pricing — say "The price depends on the job. Our technician will assess and provide a free, no-obligation quote on site."
- If asked about availability — say "We have technicians available. When works best for you?"
- If they complain — listen, empathize, offer an immediate solution.
- If asked something you don't know — say "Let me check and get back to you. What's your name and number?"
- When you have enough info (name + phone + description), summarize: "Great [name], I've opened a service request for you. A technician will contact you shortly. Thank you!"
- Keep responses short — 1-3 sentences. This is a phone call, not an email.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const callerPhone = params.get('From') || '';
    const calledNumber = params.get('To') || '';
    const speechResult = params.get('SpeechResult') || '';
    const callSid = params.get('CallSid') || '';

    // Load business config
    let bizName = 'Business';
    let bizType = 'general';
    let bizPhone = '';
    let lang = 'he';

    try {
      const firebase = await import('@/lib/firebase');
      const db = firebase.getFirestoreDb();
      const cleanPhone = calledNumber.replace(/[^0-9+]/g, '');
      
      // Try phone lookup
      const lookupSnap = await firebase.getDoc(firebase.doc(db, 'phone_lookup', cleanPhone.replace(/[^0-9]/g, '')));
      if (lookupSnap.exists()) {
        const bizId = lookupSnap.data().bizId;
        const bizSnap = await firebase.getDoc(firebase.doc(db, 'businesses', bizId));
        if (bizSnap.exists()) {
          const cfg = bizSnap.data().cfg || {};
          bizName = cfg.biz_name || 'Business';
          bizType = cfg.biz_type || 'general';
          bizPhone = cfg.biz_phone || '';
          lang = cfg.region === 'IL' ? 'he' : detectLang(calledNumber, speechResult);
        }
      }
    } catch (e) { console.error('[Voice] Lookup:', e); }

    // Initialize conversation
    if (!conversations[callSid]) {
      conversations[callSid] = { messages: [], lang, bizName, bizType, bizPhone, collectedData: {} };
      // Auto-cleanup after 10 minutes
      setTimeout(() => { delete conversations[callSid]; }, 600000);
    }
    const conv = conversations[callSid];
    const twimlLang = conv.lang === 'he' ? 'he-IL' : 'en-US';
    const voice = conv.lang === 'he' ? 'Google.he-IL-Wavenet-A' : 'Google.en-US-Wavenet-D';

    // First call — greeting
    if (!speechResult) {
      const greeting = conv.lang === 'he'
        ? (conv.bizName !== 'Business' ? `שלום! הגעת ל-${conv.bizName}. איך אוכל לעזור?` : 'שלום! איך אוכל לעזור?')
        : (conv.bizName !== 'Business' ? `Hello! You've reached ${conv.bizName}. How can I help you?` : 'Hello! How can I help you?');

      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="${twimlLang}" voice="${voice}">${greeting}</Say><Gather input="speech" language="${twimlLang}" speechTimeout="5" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather><Say language="${twimlLang}" voice="${voice}">${conv.lang === 'he' ? 'לא שמעתי אותך. אנא נסה שוב.' : "I didn't catch that. Please try again."}</Say><Gather input="speech" language="${twimlLang}" speechTimeout="5" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Add user message
    conv.messages.push({ role: 'user', content: speechResult });

    // Call AI
    let aiResponse = '';

    if (ANTHROPIC_KEY) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 150,
            system: getSystemPrompt(conv.lang, conv.bizName, conv.bizType),
            messages: conv.messages,
          }),
        });
        const data = await res.json();
        aiResponse = data.content?.[0]?.text || aiResponse;
      } catch (e) {
        console.error('[Voice] AI:', e);
        aiResponse = conv.lang === 'he'
          ? 'סליחה, לא שמעתי טוב. אפשר לחזור על זה?'
          : 'Sorry, I didn\'t catch that. Could you repeat?';
      }
    }

    // Fallback if AI returned empty
    if (!aiResponse.trim()) {
      aiResponse = conv.lang === 'he'
        ? 'סליחה, לא שמעתי טוב. אפשר לחזור על זה?'
        : 'Sorry, I didn\'t catch that. Could you repeat?';
    }
    
    // Add assistant message
    conv.messages.push({ role: 'assistant', content: aiResponse });

    // Try to extract collected data
    try {
      const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: 'Extract any customer details from this conversation. Return ONLY valid JSON with fields: name, phone, address, issue, preferredTime. Use null for unknown fields. No other text.',
          messages: [{ role: 'user', content: conv.messages.map((m: any) => m.role + ': ' + m.content).join('\n') }],
        }),
      });
      const extractData = await extractRes.json();
      const jsonStr = (extractData.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(jsonStr);
        conv.collectedData = { ...conv.collectedData, ...Object.fromEntries(Object.entries(parsed).filter(([_, v]) => v !== null)) };
      } catch {}
    } catch {}

    // === FULL AUTOMATION: Log + Create Job + Assign Tech + Send Portal ===
    try {
      const firebase = await import('@/lib/firebase');
      const fdb = firebase.getFirestoreDb();
      const cleanPhone = calledNumber.replace(/[^0-9]/g, '');
      const lookupSnap = await firebase.getDoc(firebase.doc(fdb, 'phone_lookup', cleanPhone));
      if (lookupSnap.exists()) {
        const bizId = lookupSnap.data().bizId;
        const bizSnap = await firebase.getDoc(firebase.doc(fdb, 'businesses', bizId));
        if (bizSnap.exists()) {
          const bizData = bizSnap.data();
          const botLog = bizData.db?.botLog || [];
          const existingIdx = botLog.findIndex((l: any) => l.callSid === callSid);
          const logEntry = {
            id: Date.now(), type: 'call', from: callerPhone, callSid,
            messages: conv.messages, collectedData: conv.collectedData,
            timestamp: new Date().toISOString(), lang: conv.lang,
          };
          if (existingIdx >= 0) botLog[existingIdx] = logEntry;
          else botLog.push(logEntry);

          const leads = bizData.db?.leads || [];
          const jobs = bizData.db?.jobs || [];
          const users = bizData.db?.users || [];
          const d = conv.collectedData;
          const customerPhone = d.phone || callerPhone;

          // Create/update lead
          if (d.name || customerPhone) {
            const existingLead = leads.findIndex((l: any) => l.phone === customerPhone);
            const lead = {
              id: Date.now(), name: d.name || 'שיחה — ' + callerPhone,
              phone: customerPhone, address: d.address || '',
              source: 'ai_bot', status: 'new', notes: d.issue || '',
              preferredTime: d.preferredTime || '', created: new Date().toISOString(),
            };
            if (existingLead >= 0) leads[existingLead] = { ...leads[existingLead], ...lead, id: leads[existingLead].id };
            else leads.push(lead);
          }

          // AUTO CREATE JOB when we have enough data
          const hasEnoughData = d.name && (d.address || d.issue);
          const alreadyCreatedJob = jobs.some((j: any) => j.botCallSid === callSid);

          if (hasEnoughData && !alreadyCreatedJob) {
            // Find available technician
            const techs = users.filter((u: any) => (u.role === 'technician' || u.role === 'tech') && u.isActive !== false);
            // Pick tech with fewest open jobs
            let assignedTech = '';
            if (techs.length > 0) {
              const techJobCounts = techs.map((t: any) => ({
                name: t.name,
                count: jobs.filter((j: any) => j.tech === t.name && !['completed','cancelled'].includes(j.status)).length,
              }));
              techJobCounts.sort((a: any, b: any) => a.count - b.count);
              assignedTech = techJobCounts[0].name;
            }

            // Determine scheduled time
            const now = new Date();
            let scheduledDate = now.toISOString().slice(0, 10);
            let scheduledTime = '';
            const pref = (d.preferredTime || '').toLowerCase();
            if (pref.includes('מחר') || pref.includes('tomorrow')) {
              const tom = new Date(now.getTime() + 86400000);
              scheduledDate = tom.toISOString().slice(0, 10);
            }
            if (pref.includes('בוקר') || pref.includes('morning')) scheduledTime = '09:00';
            else if (pref.includes('צהריים') || pref.includes('noon')) scheduledTime = '12:00';
            else if (pref.includes('אחהצ') || pref.includes('afternoon')) scheduledTime = '14:00';
            else if (pref.includes('ערב') || pref.includes('evening')) scheduledTime = '18:00';
            else scheduledTime = String(Math.min(now.getHours() + 2, 18)).padStart(2, '0') + ':00';

            const jobId = Date.now();
            const jobNum = '#' + String(jobs.length + 1).padStart(4, '0');
            const newJob = {
              id: jobId, num: jobNum,
              client: d.name, phone: customerPhone, address: d.address || '', desc: d.issue || '',
              status: assignedTech ? 'assigned' : 'open',
              tech: assignedTech, scheduledDate, scheduledTime,
              date: scheduledDate, time: scheduledTime,
              source: 'ai_bot', botCallSid: callSid,
              created: new Date().toISOString(),
              priority: 'normal',
            };
            jobs.push(newJob);

            // CREATE PORTAL
            const portalToken = 'portal_' + jobId;
            try {
              await firebase.setDoc(firebase.doc(fdb, 'public_portals', portalToken), {
                type: 'job', bizName: conv.bizName, bizPhone: conv.bizPhone || '',
                client: d.name, phone: customerPhone, address: d.address || '',
                desc: d.issue || '', status: newJob.status,
                scheduledDate, scheduledTime, techName: assignedTech,
                num: jobNum, currency: bizData.cfg?.currency || 'ILS',
                created: new Date().toISOString(),
              });
              // Save portal token on job
              const jobIdx = jobs.findIndex((j: any) => j.id === jobId);
              if (jobIdx >= 0) jobs[jobIdx].portalToken = portalToken;
            } catch (pe) { console.error('[Voice] Portal:', pe); }

            // SEND SMS with portal link
            const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
            const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
            const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
            if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && customerPhone) {
              const portalUrl = 'https://zikkit-jvc7.vercel.app/portal/' + portalToken;
              const smsBody = conv.lang === 'he'
                ? 'היי ' + d.name + ', קיבלנו את הפנייה שלך. עקוב אחרי הסטטוס כאן: ' + portalUrl + ' — ' + conv.bizName
                : 'Hi ' + d.name + ', we received your request. Track status here: ' + portalUrl + ' — ' + conv.bizName;
              try {
                await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_SID + '/Messages.json', {
                  method: 'POST',
                  headers: { 'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ To: customerPhone, From: TWILIO_FROM, Body: smsBody }).toString(),
                });
                console.log('[Voice] SMS sent to', customerPhone);
              } catch (se) { console.error('[Voice] SMS failed:', se); }
            }

            console.log('[Voice] Job created:', jobNum, 'Tech:', assignedTech || 'unassigned');
          }

          await firebase.setDoc(firebase.doc(fdb, 'businesses', bizId), {
            db: { ...bizData.db, botLog, leads, jobs }
          }, { merge: true });
        }
      }
    } catch (e) { console.error('[Voice] Automation error:', e); }

    // Check if conversation is complete
    // Only end when bot explicitly says goodbye phrase
    const isComplete = (aiResponse.includes('פתחתי עבודה') || aiResponse.includes('פתחתי פנייה') || aiResponse.includes("I've opened")) &&
      (aiResponse.includes('תודה') || aiResponse.includes('Thank')) ||
      conv.messages.length > 20; // Max 10 exchanges

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${twimlLang}" voice="${voice}">${aiResponse.replace(/[<>&"']/g, '')}</Say>
  ${isComplete
    ? `<Say language="${twimlLang}" voice="${voice}">${conv.lang === 'he' ? 'להתראות!' : 'Goodbye!'}</Say><Hangup/>`
    : `<Gather input="speech" language="${twimlLang}" speechTimeout="5" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather><Say language="${twimlLang}" voice="${voice}">${conv.lang === 'he' ? 'אתה עדיין שם?' : 'Are you still there?'}</Say><Gather input="speech" language="${twimlLang}" speechTimeout="5" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather>`
  }
</Response>`;

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (e) {
    console.error('[Voice] Error:', e);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="he-IL">מצטערים, אירעה שגיאה. אנא התקשרו שוב.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}

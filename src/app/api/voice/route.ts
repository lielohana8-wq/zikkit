import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreDb, doc, getDoc, setDoc, collection, getDocs } from '@/lib/firebase';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

// Twilio webhook — receives call, responds with AI
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const callerPhone = params.get('From') || '';
    const calledNumber = params.get('To') || '';
    const speechResult = params.get('SpeechResult') || '';
    const callSid = params.get('CallSid') || '';

    // Find business by phone number
    const db = getFirestoreDb();
    let bizId = '';
    let bizName = '';
    let bizType = '';
    let greeting = '';
    
    try {
      const lookupSnap = await getDoc(doc(db, 'phone_lookup', calledNumber.replace(/[^0-9]/g, '')));
      if (lookupSnap.exists()) {
        bizId = lookupSnap.data().bizId;
        const bizSnap = await getDoc(doc(db, 'businesses', bizId));
        if (bizSnap.exists()) {
          const cfg = bizSnap.data().cfg || {};
          bizName = cfg.biz_name || 'Business';
          bizType = cfg.biz_type || 'general';
          greeting = cfg.bot_greeting || '';
        }
      }
    } catch (e) { console.error('[Voice] Lookup failed:', e); }

    // First call — no speech yet
    if (!speechResult) {
      const greetMsg = greeting || `שלום! הגעת ל-${bizName}. איך אוכל לעזור?`;
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="he-IL" voice="Google.he-IL-Wavenet-A">${greetMsg}</Say>
  <Gather input="speech" language="he-IL" speechTimeout="3" action="/api/voice" method="POST">
    <Say language="he-IL" voice="Google.he-IL-Wavenet-A">ספר לי במה אני יכול לעזור.</Say>
  </Gather>
</Response>`;
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Process speech with AI
    let aiResponse = 'תודה, קיבלנו את הפנייה שלך. נחזור אליך בהקדם.';
    
    if (ANTHROPIC_KEY) {
      try {
        const systemPrompt = `אתה עוזר טלפוני של "${bizName}", עסק מסוג ${bizType}.
המטרה שלך: לקבל פרטים מהלקוח (שם, טלפון, כתובת, תיאור הבעיה) ולפתוח עבודה.
דבר בעברית, קצר ועניני. אל תגיד שאתה AI.
אם קיבלת מספיק פרטים (שם + טלפון + תיאור), אמור "תודה רבה, פתחתי עבודה עבורך. נחזור אליך בהקדם."`;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            system: systemPrompt,
            messages: [{ role: 'user', content: speechResult }],
          }),
        });
        const data = await res.json();
        aiResponse = data.content?.[0]?.text || aiResponse;
      } catch (e) { console.error('[Voice] AI failed:', e); }
    }

    // Log the call
    if (bizId) {
      try {
        const bizSnap = await getDoc(doc(db, 'businesses', bizId));
        if (bizSnap.exists()) {
          const bizData = bizSnap.data();
          const botLog = bizData.db?.botLog || [];
          botLog.push({
            id: Date.now(),
            type: 'call',
            from: callerPhone,
            message: speechResult,
            response: aiResponse,
            timestamp: new Date().toISOString(),
            callSid,
          });
          // Also create a lead
          const leads = bizData.db?.leads || [];
          const existingLead = leads.find((l: any) => l.phone === callerPhone);
          if (!existingLead) {
            leads.push({
              id: Date.now(),
              name: 'שיחה נכנסת — ' + callerPhone,
              phone: callerPhone,
              source: 'ai_bot',
              status: 'new',
              notes: speechResult,
              created: new Date().toISOString(),
            });
          }
          await setDoc(doc(db, 'businesses', bizId), {
            db: { ...bizData.db, botLog, leads }
          }, { merge: true });
        }
      } catch (e) { console.error('[Voice] Log failed:', e); }
    }

    // Check if we got enough info to close the conversation
    const isComplete = aiResponse.includes('פתחתי עבודה') || aiResponse.includes('נחזור אליך');
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="he-IL" voice="Google.he-IL-Wavenet-A">${aiResponse}</Say>
  ${isComplete ? '<Hangup/>' : `<Gather input="speech" language="he-IL" speechTimeout="3" action="/api/voice" method="POST"><Say language="he-IL" voice="Google.he-IL-Wavenet-A"></Say></Gather>`}
</Response>`;

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (e) {
    console.error('[Voice] Error:', e);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="he-IL">מצטערים, אירעה שגיאה. אנא נסה שוב מאוחר יותר.</Say></Response>`;
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }
}

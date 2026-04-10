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
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="${twimlLang}" voice="${voice}">${greeting}</Say><Gather input="speech" language="${twimlLang}" speechTimeout="3" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather><Say language="${twimlLang}" voice="${voice}">${conv.lang === 'he' ? 'לא שמעתי אותך. אנא נסה שוב.' : "I didn't catch that. Please try again."}</Say><Gather input="speech" language="${twimlLang}" speechTimeout="3" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Add user message
    conv.messages.push({ role: 'user', content: speechResult });

    // Call AI
    let aiResponse = conv.lang === 'he'
      ? 'תודה, קיבלנו את הפנייה שלך. נחזור אליך בהקדם.'
      : 'Thank you, we received your request. We will get back to you shortly.';

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
      } catch (e) { console.error('[Voice] AI:', e); }
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

    // Log to Firestore
    try {
      const firebase = await import('@/lib/firebase');
      const db = firebase.getFirestoreDb();
      const cleanPhone = calledNumber.replace(/[^0-9]/g, '');
      const lookupSnap = await firebase.getDoc(firebase.doc(db, 'phone_lookup', cleanPhone));
      if (lookupSnap.exists()) {
        const bizId = lookupSnap.data().bizId;
        const bizSnap = await firebase.getDoc(firebase.doc(db, 'businesses', bizId));
        if (bizSnap.exists()) {
          const bizData = bizSnap.data();
          const botLog = bizData.db?.botLog || [];
          // Update or add log entry
          const existingIdx = botLog.findIndex((l: any) => l.callSid === callSid);
          const logEntry = {
            id: Date.now(), type: 'call', from: callerPhone, callSid,
            messages: conv.messages, collectedData: conv.collectedData,
            timestamp: new Date().toISOString(), lang: conv.lang,
          };
          if (existingIdx >= 0) botLog[existingIdx] = logEntry;
          else botLog.push(logEntry);

          // Create/update lead if we have data
          const leads = bizData.db?.leads || [];
          if (conv.collectedData.name || conv.collectedData.phone) {
            const leadPhone = conv.collectedData.phone || callerPhone;
            const existingLead = leads.findIndex((l: any) => l.phone === leadPhone);
            const lead = {
              id: Date.now(), name: conv.collectedData.name || 'שיחה — ' + callerPhone,
              phone: leadPhone, address: conv.collectedData.address || '',
              source: 'ai_bot', status: 'new', notes: conv.collectedData.issue || '',
              preferredTime: conv.collectedData.preferredTime || '',
              created: new Date().toISOString(),
            };
            if (existingLead >= 0) leads[existingLead] = { ...leads[existingLead], ...lead, id: leads[existingLead].id };
            else leads.push(lead);
          }

          await firebase.setDoc(firebase.doc(db, 'businesses', bizId), {
            db: { ...bizData.db, botLog, leads }
          }, { merge: true });
        }
      }
    } catch (e) { console.error('[Voice] Log:', e); }

    // Check if conversation is complete
    const isComplete = aiResponse.includes('פתחתי עבודה') || aiResponse.includes('פתחתי פנייה') ||
      aiResponse.includes("I've opened") || aiResponse.includes('service request') ||
      aiResponse.includes('תודה רבה') || aiResponse.includes('Thank you') ||
      conv.messages.length > 14; // Max 7 exchanges

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${twimlLang}" voice="${voice}">${aiResponse.replace(/[<>&"']/g, '')}</Say>
  ${isComplete
    ? `<Say language="${twimlLang}" voice="${voice}">${conv.lang === 'he' ? 'להתראות!' : 'Goodbye!'}</Say><Hangup/>`
    : `<Gather input="speech" language="${twimlLang}" speechTimeout="4" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather><Say language="${twimlLang}" voice="${voice}">${conv.lang === 'he' ? 'אתה עדיין שם?' : 'Are you still there?'}</Say><Gather input="speech" language="${twimlLang}" speechTimeout="3" action="/api/voice" method="POST"><Say language="${twimlLang}" voice="${voice}"></Say></Gather>`
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

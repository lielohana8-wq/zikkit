import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

function xml(twiml: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`, { headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const p = new URLSearchParams(body);
    const speech = p.get('SpeechResult') || '';
    const callSid = p.get('CallSid') || 'x';
    const to = p.get('To') || '';
    const from = p.get('From') || '';

    const lang = to.startsWith('+972') ? 'he' : 'en';
    const ttsLang = lang === 'he' ? 'he-IL' : 'en-US';

    // Load conversation from Firestore
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();
    let biz = '', bizType = '', msgs: any[] = [];

    // Get business info + conversation history
    try {
      const convSnap = await fb.getDoc(fb.doc(db, 'bot_conversations', callSid));
      if (convSnap.exists()) {
        const d = convSnap.data();
        msgs = d.messages || [];
        biz = d.bizName || '';
        bizType = d.bizType || '';
      } else {
        // First call - lookup business
        const clean = to.replace(/[^0-9]/g, '');
        const lookupSnap = await fb.getDoc(fb.doc(db, 'phone_lookup', clean));
        if (lookupSnap.exists()) {
          const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', lookupSnap.data().bizId));
          if (bizSnap.exists()) {
            biz = bizSnap.data().cfg?.biz_name || '';
            bizType = bizSnap.data().cfg?.biz_type || '';
          }
        }
      }
    } catch (e) { console.error('[Voice] DB:', e); }

    // First call - no speech yet
    if (!speech) {
      const greeting = lang === 'he'
        ? `היי! ${biz ? 'כאן ' + biz + '.' : ''} מה קרה? ספרו לי.`
        : `Hi! ${biz ? 'This is ' + biz + '.' : ''} What happened? Tell me.`;

      // Save initial state
      try {
        await fb.setDoc(fb.doc(db, 'bot_conversations', callSid), {
          messages: [{ role: 'assistant', content: greeting }],
          bizName: biz, bizType, lang, from, to, started: new Date().toISOString(),
        });
      } catch {}

      return xml(
        `<Say language="${ttsLang}">${greeting}</Say>` +
        `<Gather input="speech" language="${ttsLang}" speechTimeout="6" action="/api/voice" method="POST"><Say language="${ttsLang}"> </Say></Gather>` +
        `<Say language="${ttsLang}">${lang === 'he' ? 'אתה שם? ספר לי מה קורה.' : 'Are you there? Tell me what happened.'}</Say>` +
        `<Gather input="speech" language="${ttsLang}" speechTimeout="6" action="/api/voice" method="POST"><Say language="${ttsLang}"> </Say></Gather>`
      );
    }

    // Add user message
    msgs.push({ role: 'user', content: speech });

    // Build system prompt
    const sysHe = `אתה דנה, מזכירה של ${biz || 'העסק'}. עסק ${bizType || 'שירות'}. שיחת טלפון חיה.

אופי: חמה, ידידותית, טבעית, אנושית לגמרי. דברי כמו ישראלית אמיתית.
אורך תשובה: משפט אחד בלבד! מקסימום שניים!

זרימה — שאלי אחת אחת, לא הכל ביחד:
שלב 1: הלקוח סיפר בעיה → הגיבי בהזדהות ושאלי שאלה אחת על הבעיה
שלב 2: הבנת את הבעיה → שאלי "איך קוראים לך?"
שלב 3: קיבלת שם → שאלי "מה הכתובת [שם]?"
שלב 4: קיבלת כתובת → שאלי "מתי נוח לך? יש לנו טכנאי פנוי"
שלב 5: קיבלת זמן → "יופי [שם]! הטכנאי יגיע [זמן]. יתקשר לפני. ביי!"

אם שואל מחיר: "הטכנאי בודק במקום ונותן הצעה בחינם"
אם דחוף: "מטפלים! מה הכתובת?"
אם כועס: "מבינה אותך לגמרי. בוא נפתור עכשיו. מה הכתובת?"

אסור: "תודה על פנייתך" / "נחזור אליך" / "מספר פנייה" / "אני מערכת"`;

    const sysEn = `You are Dana, receptionist at ${biz || 'the company'}. ${bizType || 'Service'} business. Live phone call.

Personality: Warm, friendly, natural, totally human. Talk like a real American receptionist.
Response length: ONE sentence only! Two max!

Flow — ask one thing at a time:
Step 1: Customer told you the problem → React with empathy, ask ONE question about the issue
Step 2: You understand the problem → Ask "What's your name?"
Step 3: Got name → Ask "What's your address [name]?"
Step 4: Got address → Ask "When works for you? We have a tech available"
Step 5: Got time → "Perfect [name]! Tech will be there [time]. He'll call before. Bye!"

If asks price: "The tech checks on site and quotes for free"
If urgent: "On it! What's the address?"
If angry: "I totally get it. Let's fix this now. What's the address?"

Never say: "Thank you for calling" / "We'll get back to you" / "Reference number" / "I am a system"`;

    // Call AI
    let reply = '';
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          system: lang === 'he' ? sysHe : sysEn,
          messages: msgs,
        }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || '';
      if (!reply && data.error) console.error('[Voice] API error:', data.error);
    } catch (e) { console.error('[Voice] AI fetch:', e); }

    if (!reply) {
      reply = lang === 'he' ? 'ספר לי עוד, מה בדיוק קורה?' : 'Tell me more, what exactly is going on?';
    }

    msgs.push({ role: 'assistant', content: reply });

    // Save conversation to Firestore
    try {
      await fb.setDoc(fb.doc(db, 'bot_conversations', callSid), { messages: msgs }, { merge: true });
    } catch {}

    // Check if done
    const done = reply.includes('ביי') || reply.includes('bye') || reply.includes('Bye') ||
      reply.includes('להתראות') || reply.includes('Goodbye') || msgs.length > 20;

    if (done) {
      // Log lead
      try {
        const clean = to.replace(/[^0-9]/g, '');
        const lookupSnap = await fb.getDoc(fb.doc(db, 'phone_lookup', clean));
        if (lookupSnap.exists()) {
          const bizId = lookupSnap.data().bizId;
          const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
          if (bizSnap.exists()) {
            const bizData = bizSnap.data();
            const leads = bizData.db?.leads || [];
            if (!leads.find((l: any) => l.phone === from)) {
              leads.push({ id: Date.now(), name: 'שיחה — ' + from, phone: from, source: 'ai_bot', status: 'new', created: new Date().toISOString() });
              await fb.setDoc(fb.doc(db, 'businesses', bizId), { db: { ...bizData.db, leads } }, { merge: true });
            }
          }
        }
      } catch {}
      return xml(`<Say language="${ttsLang}">${reply.replace(/[<>&]/g, '')}</Say><Hangup/>`);
    }

    return xml(
      `<Say language="${ttsLang}">${reply.replace(/[<>&]/g, '')}</Say>` +
      `<Gather input="speech" language="${ttsLang}" speechTimeout="6" action="/api/voice" method="POST"><Say language="${ttsLang}"> </Say></Gather>`
    );
  } catch (e) {
    console.error('[Voice] Fatal:', e);
    return xml('<Say language="he-IL">רגע, יש תקלה קטנה. תתקשרו שוב עוד דקה.</Say><Hangup/>');
  }
}

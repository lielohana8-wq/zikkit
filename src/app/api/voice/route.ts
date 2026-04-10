import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const convos: Record<string, { msgs: any[]; lang: string; biz: string; type: string }> = {};

function xml(twiml: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`, { headers: { 'Content-Type': 'text/xml' } });
}

function say(text: string, lang: string) {
  const l = lang === 'he' ? 'he-IL' : 'en-US';
  const v = lang === 'he' ? 'Google.he-IL-Wavenet-A' : 'Google.en-US-Wavenet-D';
  return `<Say language="${l}" voice="${v}">${text.replace(/[<>&]/g, '')}</Say>`;
}

function gather(lang: string) {
  const l = lang === 'he' ? 'he-IL' : 'en-US';
  return `<Gather input="speech" language="${l}" speechTimeout="5" action="/api/voice" method="POST"><Say language="${l}"> </Say></Gather>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const p = new URLSearchParams(body);
    const speech = p.get('SpeechResult') || '';
    const callSid = p.get('CallSid') || 'unknown';
    const to = p.get('To') || '';

    // Detect language from called number
    const lang = to.startsWith('+972') ? 'he' : (to.startsWith('+1') ? 'en' : 'he');

    // Init conversation
    if (!convos[callSid]) {
      // Try to load business name (non-blocking)
      let biz = '', type = '';
      try {
        const fb = await import('@/lib/firebase');
        const db = fb.getFirestoreDb();
        const clean = to.replace(/[^0-9]/g, '');
        const snap = await fb.getDoc(fb.doc(db, 'phone_lookup', clean));
        if (snap.exists()) {
          const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', snap.data().bizId));
          if (bizSnap.exists()) { biz = bizSnap.data().cfg?.biz_name || ''; type = bizSnap.data().cfg?.biz_type || ''; }
        }
      } catch {}
      convos[callSid] = { msgs: [], lang, biz, type };
      setTimeout(() => delete convos[callSid], 300000);
    }

    const conv = convos[callSid];

    // First call - greeting
    if (!speech) {
      const g = conv.lang === 'he'
        ? (conv.biz ? `היי! כאן ${conv.biz}. מה קרה?` : 'היי! איך אפשר לעזור?')
        : (conv.biz ? `Hi! This is ${conv.biz}. What happened?` : 'Hi! How can I help?');
      return xml(say(g, conv.lang) + gather(conv.lang));
    }

    // Add user message
    conv.msgs.push({ role: 'user', content: speech });

    // Call AI - simple and fast
    let reply = '';
    try {
      const sysPrompt = conv.lang === 'he'
        ? `אתה ${conv.biz || 'טכנאי'}. שיחת טלפון עם לקוח. סוג עסק: ${conv.type || 'שירות'}.
חוקים: דבר כמו בן אדם. משפט אחד-שניים. לא רובוטי. לא "תודה נחזור אליך" עד הסוף.
זרימה: 1) הלקוח מספר בעיה → שאל שאלה ספציפית ("מאיפה נוזל?" / "באיזה חדר?") 2) אחרי שהבנת → "מה השם שלך?" 3) אחרי שם → "מה הכתובת?" 4) אחרי כתובת → "מתי נוח?" 5) רק אז → "מעולה [שם], פתחתי עבודה. נתקשר לאשר. יאללה ביי!"
אם שואל מחיר → "הטכנאי בודק ונותן הצעה בחינם במקום. מתי נוח לך?"
לעולם אל תגיד "סליחה לא שמעתי". אם לא ברור, שאל שאלה אחרת.`
        : `You are ${conv.biz || 'a technician'}. Phone call with customer. Business: ${conv.type || 'service'}.
Rules: Talk like a human. 1-2 sentences. Not robotic. No "we'll get back to you" until the end.
Flow: 1) Customer describes issue → ask specific question ("Where's the leak?" / "Which room?") 2) After understanding → "What's your name?" 3) After name → "What's the address?" 4) After address → "When works for you?" 5) Only then → "Great [name], I've booked it. We'll call to confirm. Bye!"
If asked price → "The tech checks and quotes for free on site. When works for you?"
Never say "sorry I didn't hear you". If unclear, ask a different question.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 80, system: sysPrompt, messages: conv.msgs }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || '';
    } catch (e) {
      console.error('[Voice] AI error:', e);
    }

    // If AI failed, ask a question instead of "didn't hear"
    if (!reply) {
      reply = conv.lang === 'he'
        ? (conv.msgs.length <= 2 ? 'ספר לי, מה הבעיה?' : 'מה השם שלך?')
        : (conv.msgs.length <= 2 ? 'Tell me, what seems to be the issue?' : "What's your name?");
    }

    conv.msgs.push({ role: 'assistant', content: reply });

    // End only when bot says goodbye
    const isDone = reply.includes('ביי') || reply.includes('bye') || reply.includes('Bye') ||
      (reply.includes('פתחתי') && reply.includes('עבודה')) ||
      (reply.includes('booked') || reply.includes("I've opened")) ||
      conv.msgs.length > 20;

    if (isDone) {
      // Log to Firestore in background (don't wait)
      logCall(convos[callSid], callSid, p.get('From') || '', to).catch(() => {});
      return xml(say(reply, conv.lang) + say(conv.lang === 'he' ? 'להתראות!' : 'Goodbye!', conv.lang) + '<Hangup/>');
    }

    return xml(say(reply, conv.lang) + gather(conv.lang));
  } catch (e) {
    console.error('[Voice]', e);
    return xml('<Say language="he-IL">שנייה, יש תקלה קטנה. תנסה שוב.</Say><Hangup/>');
  }
}

async function logCall(conv: any, callSid: string, from: string, to: string) {
  try {
    const fb = await import('@/lib/firebase');
    const db = fb.getFirestoreDb();
    const clean = to.replace(/[^0-9]/g, '');
    const snap = await fb.getDoc(fb.doc(db, 'phone_lookup', clean));
    if (!snap.exists()) return;
    const bizId = snap.data().bizId;
    const bizSnap = await fb.getDoc(fb.doc(db, 'businesses', bizId));
    if (!bizSnap.exists()) return;
    const bizData = bizSnap.data();
    const botLog = bizData.db?.botLog || [];
    botLog.push({ id: Date.now(), callSid, from, messages: conv.msgs, timestamp: new Date().toISOString(), lang: conv.lang });
    const leads = bizData.db?.leads || [];
    if (!leads.find((l: any) => l.phone === from)) {
      leads.push({ id: Date.now(), name: 'שיחה — ' + from, phone: from, source: 'ai_bot', status: 'new', created: new Date().toISOString() });
    }
    await fb.setDoc(fb.doc(db, 'businesses', bizId), { db: { ...bizData.db, botLog, leads } }, { merge: true });
  } catch (e) { console.error('[Voice] Log error:', e); }
}

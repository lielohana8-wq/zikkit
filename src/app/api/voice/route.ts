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
        ? `אתה מזכירה של ${conv.biz || 'העסק'}. סוג עסק: ${conv.type || 'שירות'}. אתה בשיחת טלפון חיה עם לקוח.

מי אתה: את/ה העובד/ת הכי טוב/ה, הכי חם/ה, הכי אנושי/ת שיש. אתה מכיר את העסק בעל פה. אתה אוהב לעזור לאנשים. קוראים לך דנה.

איך לדבר:
- כמו חברה בטלפון. "היי!", "אוי לא", "וואלה", "יאללה", "סבבה", "אין בעיה"
- משפט אחד. מקסימום שניים. קצר וחם.
- אף פעם אל תגידי משהו שמזכירה אמיתית לא הייתה אומרת
- אל תגידי: "אשמח לסייע", "תודה על פנייתך", "נציג יחזור אליך", "אנו מעריכים"
- כן תגידי: "אוי, מה קרה?", "כמה זמן זה ככה?", "את/ה שם/שם עכשיו?", "סבבה מטפלים"

מה לעשות:
1. לקוח מספר בעיה → תגיבי בהזדהות + שאלה חכמה אחת
   "אוי לא! מאיפה זה נוזל, מהתקרה או מהקיר?"
   "וואלה, כמה זמן זה ככה?"
   "אאוץ', יש נזק לרצפה?"

2. אחרי שהבנת → "מה השם שלך חמודי?" / "איך קוראים לך?"

3. אחרי שם → "ו[שם], מה הכתובת?" / "איפה אתה נמצא?"

4. אחרי כתובת → "מתי נוח לך? יש לנו טכנאי פנוי היום" / "אפשר היום אחהצ, מתאים?"

5. יש שם + כתובת + זמן → "יופי [שם]! רשמתי אותך ל[זמן]. הטכנאי יתקשר לפני שהוא מגיע. יאללה ביי!"

מצבים מיוחדים:
- "כמה זה עולה?" → "תראה, זה תלוי בעבודה. הטכנאי מגיע, בודק, ונותן לך הצעה במקום — בלי התחייבות. מתי נוח לך?"
- "אתם זמינים?" → "כן כן! יש לנו מישהו פנוי. מתי נוח?"
- "זה דחוף!" → "אני מבינה! בואי נסדר טכנאי כמה שיותר מהר. מה הכתובת?"
- "אני לא בטוח" → "תשמע, הטכנאי מגיע, בודק, ואם לא מתאים — לא משלמים כלום. אין מה להפסיד"
- לקוח כועס → "אני מבינה שזה מתסכל. בוא נפתור את זה עכשיו. מה הכתובת ואני שולחת מישהו?"
- לא מבינה מה אמר → "סליחה אהבתי, אפשר להסביר לי עוד פעם מה קורה?"

לעולם לא:
- "תודה נחזור אליך" (רק בסוף!)
- "מספר הפנייה שלך הוא..."
- "אני מערכת/בוט/AI"
- "אנחנו מעריכים את פנייתך"
- "נציג שירות יחזור אליך"
`
        : `You are Dana, the receptionist at ${conv.biz || 'the company'}. Business type: ${conv.type || 'service'}. Live phone call with a customer.

Who you are: The warmest, friendliest, most helpful receptionist ever. You know the business inside out. You love helping people.

How to talk:
- Like a friend on the phone. "Oh no!", "Got it!", "No worries!", "Awesome!"
- One sentence. Two max. Short and warm.
- Never say anything a real receptionist wouldn't say
- Don't say: "I'd be happy to assist", "Thank you for calling", "A representative will contact you"
- Do say: "Oh no, what happened?", "How long has that been going on?", "Are you there now?"

What to do:
1. Customer describes issue → React with empathy + one smart question
   "Oh no! Is it leaking from the ceiling or the wall?"
   "Yikes, how long has it been like that?"
   "Ouch, any damage to the floor?"

2. After understanding → "What's your name?" / "Who am I speaking with?"

3. After name → "And [name], what's the address?"

4. After address → "When works for you? We have a tech available today" / "How about this afternoon?"

5. Have name + address + time → "Perfect [name]! I've got you down for [time]. The tech will call before he arrives. Have a great day!"

Special situations:
- "How much?" → "It really depends on the job. The tech comes, checks it out, and gives you a quote right there — totally free, no commitment. When works for you?"
- "Available today?" → "Yes! We've got someone free. When's good?"
- "It's urgent!" → "I totally get it! Let's get someone there ASAP. What's the address?"
- "I'm not sure" → "Look, the tech comes, takes a look, and if it doesn't work out — you don't pay a thing. Nothing to lose!"
- Angry customer → "I totally understand your frustration. Let's fix this right now. What's the address so I can send someone?"
- Didn't understand → "Sorry hun, can you explain what's going on one more time?"

Never ever:
- "We'll get back to you" (only at the very end!)
- "Your reference number is..."
- "I am a system/bot/AI"
- "We appreciate your inquiry"
- "A service representative will contact you"
`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 120, system: sysPrompt, messages: conv.msgs }),
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

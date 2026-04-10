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
    const sayLang = lang === 'he' ? 'he-IL' : 'en-US';
    const gatherLang = 'en-US'; // Twilio speech recognition doesn't support he-IL

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
        ? `היי!... ${biz ? 'כאן ' + biz + '.' : ''}... מה קרה?`
        : `Hi!... ${biz ? 'This is ' + biz + '.' : ''}... What happened?`;

      // Save initial state
      try {
        await fb.setDoc(fb.doc(db, 'bot_conversations', callSid), {
          messages: [{ role: 'assistant', content: greeting }],
          bizName: biz, bizType, lang, from, to, started: new Date().toISOString(),
        });
      } catch {}

      return xml(
        `<Say language="${sayLang}" voice="alice">${greeting}</Say>` +
        `<Gather input="speech" language="${gatherLang}" speechTimeout="7" action="/api/voice" method="POST"><Say language="${sayLang}" voice="alice"> </Say></Gather>` +
        `<Say language="${sayLang}" voice="alice">${lang === 'he' ? 'אתה שם? ספר לי מה קורה.' : 'Are you there? Tell me what happened.'}</Say>` +
        `<Gather input="speech" language="${gatherLang}" speechTimeout="7" action="/api/voice" method="POST"><Say language="${sayLang}" voice="alice"> </Say></Gather>`
      );
    }

    // Add user message
    msgs.push({ role: 'user', content: speech });

    // Build system prompt
    const sysHe = `אתה דנה, מזכירה ותיקה של ${biz || 'העסק'}. עסק ${bizType || 'שירות'}.

אתה בשיחת טלפון עם לקוח. אתה לא רובוט. אתה בן אדם.

=== כללי ברזל ===
- משפט אחד בלבד בכל תור! זו שיחת טלפון, לא הרצאה
- קודם תגיב למה שנאמר, אז תשאל דבר אחד
- שאל שאלה אחת בכל פעם. לעולם לא שתיים
- השתמש בעברית מדוברת: "נו", "יאללה", "אוקיי", "סבבה", "וואלה"
- אסור: "תודה על פנייתך" / "נחזור אליך" / "מספר פנייה" / "אני מערכת" / "אשמח לסייע"

=== דוגמאות שיחה מלאות ===

--- שיחה 1: נזילה ---
לקוח: יש לי נזילה במטבח
דנה: אוי, לא נעים. מהתקרה או מתחת לכיור?
לקוח: מתחת לכיור
דנה: אוקיי, כנראה בעיה בצנרת. כמה זמן זה ככה?
לקוח: מאתמול
דנה: הבנתי. בוא נשלח מישהו. איך קוראים לך?
לקוח: משה
דנה: משה, מה הכתובת?
לקוח: רוטשילד 5 תל אביב
דנה: מתי נוח לך? יש לנו טכנאי פנוי היום אחהצ
לקוח: שלוש מתאים
דנה: מעולה משה, רשמתי טכנאי לשלוש. הוא יתקשר לפני שמגיע. ביי!

--- שיחה 2: מחיר ---
לקוח: כמה עולה לתקן מזגן?
דנה: זה תלוי בתקלה. הטכנאי בודק במקום ונותן הצעה, בלי התחייבות. מה קורה עם המזגן?
לקוח: הוא לא מקרר
דנה: אוקיי, בדקת שהשלט עובד ושהוא על קור?
לקוח: כן בדקתי הכל
דנה: נשמע שצריך טכנאי. איך קוראים לך?

--- שיחה 3: לקוח כועס ---
לקוח: אתם הזמנתם לי טכנאי והוא לא הגיע!
דנה: אוי, אני ממש מצטערת. זה לא אמור לקרות. מתי היה אמור להגיע?
לקוח: היום בעשר
דנה: הבנתי. בוא נסדר טכנאי אחר עכשיו. מה הכתובת?

--- שיחה 4: לקוח מהסס ---
לקוח: אני לא בטוח אם אני צריך טכנאי
דנה: מה קורה? ספר לי ואני אגיד לך
לקוח: יש רטיבות בקיר
דנה: כן, רטיבות יכולה להחמיר. עדיף לבדוק מוקדם. הטכנאי מגיע בודק ואם אין מה לעשות, אתה לא משלם
לקוח: טוב בסדר
דנה: יופי. איך קוראים לך?

--- שיחה 5: שואל על זמינות ---
לקוח: אתם עובדים היום?
דנה: כן! מה אתה צריך?
לקוח: צריך חשמלאי
דנה: סבבה, יש לנו חשמלאי פנוי. מה הבעיה?

--- שיחה 6: לקוח רוצה הכל מהר ---
לקוח: יש לי בעיה דחופה עם הצנרת, מים בכל הבית
דנה: אוי וואלה! סגרת את הברז הראשי?
לקוח: כן סגרתי
דנה: טוב. מה הכתובת? אני שולחת מישהו עכשיו`;

    const sysEn = `You are Dana, a real receptionist at ${biz || 'the company'}. ${bizType || 'Service'} business.

You're on a live phone call. You are NOT a robot. You are a human being.

=== Iron rules ===
- ONE sentence per turn only! This is a phone call, not a lecture
- First react to what was said, then ask one thing
- Ask ONE question at a time. Never two
- Use casual English: "oh no", "gotcha", "sure thing", "no worries", "alright"
- Never: "Thank you for calling" / "We'll get back to you" / "Reference number" / "I am a system" / "I'd be happy to assist"

=== Full conversation examples ===

--- Convo 1: Leak ---
Customer: I have a leak in my kitchen
Dana: Oh no, is it from the ceiling or under the sink?
Customer: Under the sink
Dana: Gotcha, probably a pipe issue. How long has it been going on?
Customer: Since yesterday
Dana: Alright, let's get someone out there. What's your name?
Customer: Mike
Dana: Mike, what's the address?
Customer: 123 Main Street
Dana: When works for you? We have a tech free this afternoon
Customer: Three works
Dana: Perfect Mike, tech will be there at three. He'll call before he arrives. Bye!

--- Convo 2: Price ---
Customer: How much to fix an AC?
Dana: Depends on the issue. The tech checks on site and gives you a quote, no commitment. What's going on with it?
Customer: It's not cooling
Dana: Gotcha, have you checked if it's set to cool mode and the filter's clean?
Customer: Yeah I checked everything
Dana: Sounds like you need a tech. What's your name?

--- Convo 3: Angry ---
Customer: Your tech was supposed to come and never showed up!
Dana: Oh gosh, I'm so sorry about that. That shouldn't happen. When was he supposed to come?
Customer: Today at ten
Dana: I hear you. Let me get someone else out there right now. What's the address?

--- Convo 4: Hesitant ---
Customer: I'm not sure if I need a technician
Dana: What's going on? Tell me and I'll let you know
Customer: There's moisture on my wall
Dana: Yeah, that can get worse over time. Better to check it early. The tech comes, takes a look, and if there's nothing to do, you don't pay
Customer: Okay fine
Dana: Great. What's your name?`;

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
      reply = lang === 'he'
        ? ['נו, ספר לי מה קורה', 'אוקיי, מה הבעיה?', 'כן, אני שומעת. מה קרה?'][Math.floor(Math.random() * 3)]
        : ['So, tell me what happened', 'Okay, what seems to be the issue?', 'Yeah, I\'m listening. What\'s going on?'][Math.floor(Math.random() * 3)];
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
      return xml(`<Say language="${sayLang}" voice="alice">${reply.replace(/[<>&]/g, '')}</Say><Hangup/>`);
    }

    return xml(
      `<Say language="${sayLang}" voice="alice">${reply.replace(/[<>&]/g, '').replace(/\. /g, '... ').replace(/! /g, '!... ').replace(/\? /g, '?... ')}</Say>` +
      `<Gather input="speech" language="${gatherLang}" speechTimeout="7" action="/api/voice" method="POST"><Say language="${sayLang}" voice="alice"> </Say></Gather>`
    );
  } catch (e) {
    console.error('[Voice] Fatal:', e);
    return xml('<Say language="he-IL">רגע, יש תקלה קטנה. תתקשרו שוב עוד דקה.</Say><Hangup/>');
  }
}

import { NextRequest, NextResponse } from 'next/server';

const RETELL_KEY = process.env.RETELL_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { bizId, bizName, bizType, greeting, bizPhone } = await req.json();
    if (!RETELL_KEY) return NextResponse.json({ error: 'Retell not configured' }, { status: 500 });

    // 1. Build prompt
    const prompt = `## תפקיד
אתה דנה, מזכירה ותיקה ומקצועית של ${bizName || 'העסק'}. סוג עסק: ${bizType || 'שירות'}.
אתה בשיחת טלפון חיה. אתה לא AI, לא בוט. אתה בן אדם.

## ברכת פתיחה
"${greeting || `היי שלום! הגעת ל-${bizName || 'העסק'}. מה קרה? ספר לי.`}"

## סגנון
- ישראלית אמיתית. חמה, ידידותית. משפט אחד-שניים מקסימום.
- מילים: "אוי", "וואלה", "אוקיי", "סבבה", "יאללה"
- אסור: "תודה על פנייתך" / "נחזור אליך" / "אני מערכת" / "אשמח לסייע"

## זרימה
1. לקוח סיפר בעיה → תגיבי בהזדהות + שאלה אחת
2. העמקה → שאלה נוספת
3. "הבנתי. איך קוראים לך?"
4. "מה הטלפון שלך [שם]?"
5. "מה הכתובת?"
6. "מתי נוח? יש לנו טכנאי פנוי"
7. מבצעים: "אגב, הביקור כולל אבחון חינם. הטכנאי נותן הצעה במקום בלי התחייבות."
8. "מעולה [שם]! רשמתי ל[זמן]. הטכנאי יתקשר לפני. נשלח לך גם לינק לעקוב. ביי!"

## מצבים
- מחיר: "הטכנאי בודק במקום ונותן הצעה בחינם"
- דחוף: "מטפלים! מה הכתובת?"
- כועס: "ממש מבינה. בוא נפתור עכשיו. מה הכתובת?"
- מהסס: "הטכנאי בודק, אם אין מה לעשות — לא משלמים שקל"
- מנהל: "המנהל יחזור אליך תוך שעה. מה השם והטלפון?"
- תלונה: "מצטערת. המנהל יטפל בזה היום. מה השם והטלפון?"

## חשוב
- לא לנתק לפני שיש: שם + טלפון + כתובת + זמן!
- אם רוצה לסיים בלי פרטים: "רגע, מה השם? שאוכל לעזור"`;

    // 2. Create agent
    const agentRes = await fetch('https://api.retellai.com/v2/create-agent', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RETELL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: (bizName || 'Business') + ' - Zikkit',
        voice_id: '11labs-Grace',
        language: 'he-IL',
        response_engine: { type: 'retell-llm', llm_id: '' },
        agent_prompt: prompt,
        webhook_url: new URL('/api/retell-webhook', req.url).toString(),
      }),
    });
    const agent = await agentRes.json();
    console.log('[Bot] Agent created:', agent.agent_id || agent);

    if (!agent.agent_id) {
      return NextResponse.json({ error: 'Agent creation failed: ' + JSON.stringify(agent) }, { status: 400 });
    }

    // 3. Buy phone number
    let phoneNumber = '';
    try {
      const phoneRes = await fetch('https://api.retellai.com/v2/create-phone-number', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RETELL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agent.agent_id,
          area_code: '212',
        }),
      });
      const phoneData = await phoneRes.json();
      phoneNumber = phoneData.phone_number || '';
      console.log('[Bot] Phone:', phoneNumber || phoneData);
    } catch (e) {
      console.error('[Bot] Phone error:', e);
    }

    // If buying failed, use existing Retell number
    if (!phoneNumber) phoneNumber = process.env.RETELL_PHONE_NUMBER || '';

    // 4. Save to Firestore
    if (bizId) {
      try {
        const fb = await import('@/lib/firebase');
        const db = fb.getFirestoreDb();
        await fb.setDoc(fb.doc(db, 'businesses', bizId), {
          cfg: { bot_active: true, bot_phone: phoneNumber, retell_agent_id: agent.agent_id, bot_greeting: greeting }
        }, { merge: true });

        // Add phone lookup
        if (phoneNumber) {
          const clean = phoneNumber.replace(/[^0-9]/g, '');
          await fb.setDoc(fb.doc(db, 'phone_lookup', clean), { bizId });
        }
      } catch (e) { console.error('[Bot] DB error:', e); }
    }

    return NextResponse.json({ success: true, agentId: agent.agent_id, phoneNumber });
  } catch (e) {
    console.error('[Bot] Fatal:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

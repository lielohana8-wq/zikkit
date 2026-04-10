import { NextRequest, NextResponse } from 'next/server';

const RETELL_API_KEY = process.env.RETELL_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { bizName, bizType, bizPhone, greeting, bizId } = await req.json();
    if (!RETELL_API_KEY) return NextResponse.json({ error: 'Retell API key not configured' }, { status: 500 });

    const prompt = `## תפקיד
אתה דנה, מזכירה מקצועית וחמה של ${bizName}. סוג עסק: ${bizType}.
אתה בשיחת טלפון חיה עם לקוח.

## ברכת פתיחה
"${greeting || `היי שלום! הגעת ל-${bizName}. מה קרה? ספרי לי.`}"

## סגנון דיבור
- דברי כמו ישראלית אמיתית. חמה, ידידותית, אנושית.
- משפט אחד עד שניים בכל תור.
- השתמשי: "אוי", "וואלה", "אוקיי", "סבבה", "יאללה", "הבנתי"
- אסור לנתק שיחה מוקדם! תמשיכי עד שאספת כל הפרטים.

## מה אסור
- "תודה על פנייתך" / "נציג יחזור" / "אני מערכת / בוט / AI" / "אשמח לסייע"

## זרימת שיחה

### שלב 1: הקשבה
הלקוח מספר בעיה → תגיבי בהזדהות + שאלה חכמה אחת
"אוי! מאיפה בדיוק נוזל?" / "וואלה, כמה זמן זה ככה?"

### שלב 2: העמקה
שאלי עוד שאלה אחת כדי להבין:
"באיזה חדר?" / "זה קורה כל הזמן?" / "ניסית לעשות משהו?"

### שלב 3: שם
"הבנתי. איך קוראים לך?"

### שלב 4: טלפון
"מה מספר הטלפון שלך [שם]?"

### שלב 5: כתובת
"מה הכתובת?"

### שלב 6: זמינות
"מתי נוח לך? יש לנו טכנאי פנוי"

### שלב 7: מבצעים
"אגב, הביקור כולל בדיקה חינם. הטכנאי נותן הצעת מחיר במקום בלי התחייבות. ויש לנו אחריות על העבודה."

### שלב 8: סגירה
רק אחרי שם + טלפון + כתובת + זמן:
"מעולה [שם]! רשמתי ל[זמן]. הטכנאי יתקשר לפני שמגיע. נשלח לך גם לינק בוואטסאפ עם פרטי העבודה שתוכל לעקוב. ביי!"

## מצבים
- מחיר: "תלוי בעבודה. הטכנאי בודק ונותן הצעה בחינם. מתי נוח?"
- דחוף: "מטפלים! מה הכתובת?"
- כועס: "ממש מבינה. בוא נפתור עכשיו. מה הכתובת?"
- מהסס: "הטכנאי בודק, אם אין מה לעשות — לא משלמים שקל"
- שואל שם העסק: "הגעת ל-${bizName}! ספר לי מה קורה."
- לא הבנת: "סליחה, אפשר לחזור על זה?"

## חשוב מאוד
- לא לנתק לפני שאספת: שם, טלפון, כתובת, זמן!
- תמיד חיובית ואופטימית`;

    // Create agent in Retell
    const agentRes = await fetch('https://api.retellai.com/v2/create-agent', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RETELL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: bizName + ' - Zikkit Bot',
        response_engine: {
          type: 'retell-llm',
          llm_id: undefined,
        },
        voice_id: '11labs-Hebrew', // Will need to be configured
        language: 'he-IL',
        agent_prompt: prompt,
        webhook_url: new URL('/api/retell-webhook', req.url).toString(),
        post_call_analysis_data: [
          { name: 'customer_name', type: 'string', description: 'שם הלקוח' },
          { name: 'customer_phone', type: 'string', description: 'מספר טלפון' },
          { name: 'customer_address', type: 'string', description: 'כתובת' },
          { name: 'issue', type: 'string', description: 'תיאור הבעיה' },
          { name: 'preferred_time', type: 'string', description: 'זמן מועדף' },
        ],
      }),
    });

    const agentData = await agentRes.json();

    if (agentData.agent_id) {
      // Save agent ID to business config in Firestore
      try {
        const fb = await import('@/lib/firebase');
        const db = fb.getFirestoreDb();
        await fb.setDoc(fb.doc(db, 'businesses', bizId), {
          cfg: { retell_agent_id: agentData.agent_id, bot_active: true }
        }, { merge: true });
      } catch {}

      return NextResponse.json({ success: true, agentId: agentData.agent_id });
    }

    return NextResponse.json({ error: agentData.error || 'Failed to create agent' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

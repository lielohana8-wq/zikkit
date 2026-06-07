import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dana/suggest-services
 *
 * Takes a business name + optional description, uses Anthropic Claude
 * to identify the business type and suggest 4-8 services with pricing,
 * what to ask customers, and an appropriate greeting.
 *
 * Body:
 * {
 *   businessName: string,
 *   description?: string,
 * }
 *
 * Returns:
 * {
 *   businessType: string,
 *   industry: string,
 *   suggestedGreeting: string,
 *   services: [
 *     {
 *       name: string,
 *       pricingType: 'fixed' | 'variable' | 'quote',
 *       defaultPrice: string,
 *       whatToAsk: string,
 *     }
 *   ],
 *   suggestedFields: { fullName, phone, reason, service, preferredDate, notes }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { businessName, description } = await req.json();

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'חסר שם עסק' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI לא זמין כרגע' }, { status: 500 });
    }

    const systemPrompt = `אתה מומחה לעסקי שירות בישראל. המשתמש יספק לך שם עסק (ואולי תיאור), ותפקידך לזהות את סוג העסק ולהציע שירותים, מחירים, ושאלות לשאול לקוחות.

חשוב:
- כל הטקסט בעברית
- מחירים בש"ח, ריאליים לישראל 2026
- 4-8 שירותים נפוצים בתחום
- שורת פתיחה ידידותית ומקצועית
- "מה לשאול" - שאלות שעוזרות לתת הצעת מחיר נכונה

החזר JSON בלבד, ללא טקסט נוסף, בפורמט הבא:
{
  "businessType": "תיאור קצר של סוג העסק",
  "industry": "תחום (ניקיון/אינסטלציה/חשמל/הסעות/וטרינר/...)",
  "suggestedGreeting": "שורת פתיחה לסוכן",
  "services": [
    {
      "name": "שם השירות",
      "pricingType": "fixed או variable או quote",
      "defaultPrice": "מחיר כמספר בלבד, ללא ש\\"ח",
      "whatToAsk": "מה הסוכן צריך לשאול לפני שנותן מחיר"
    }
  ],
  "suggestedFields": {
    "fullName": true,
    "phone": true,
    "reason": true,
    "service": true,
    "preferredDate": true,
    "notes": false
  }
}`;

    const userMsg = description
      ? `שם העסק: ${businessName}\nתיאור נוסף: ${description}`
      : `שם העסק: ${businessName}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Anthropic]', err);
      return NextResponse.json({ error: 'AI לא הצליח לזהות את העסק' }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'תשובה לא תקינה מ-AI' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add unique IDs to services
    if (parsed.services && Array.isArray(parsed.services)) {
      parsed.services = parsed.services.map((s: Record<string, unknown>) => ({
        ...s,
        id: 'svc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      }));
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[Suggest services]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

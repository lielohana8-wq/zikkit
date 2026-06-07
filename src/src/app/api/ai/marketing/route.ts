import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai/marketing
 *
 * Analyzes a business's data (jobs, leads, services) and returns
 * concrete marketing + optimization recommendations in Hebrew.
 *
 * Body: { bizId }  (reads business data server-side)
 * OR:   { summary } (caller provides a pre-built summary)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI לא זמין כרגע' }, { status: 500 });
    }

    let businessSummary = body.summary || '';

    // If bizId provided, build summary from Firestore
    if (body.bizId && !businessSummary) {
      const biz = await firestoreGet('businesses', body.bizId);
      if (biz) {
        const cfg = (biz.cfg as Record<string, unknown>) || {};
        const db = (biz.db as Record<string, unknown>) || {};
        const jobs = (db.jobs as unknown[]) || [];
        const leads = (db.leads as unknown[]) || [];
        const products = (db.products as Array<Record<string, unknown>>) || [];
        businessSummary = `שם העסק: ${cfg.biz_name || 'לא ידוע'}
תחום: ${cfg.industry || 'שירות'}
מספר עבודות: ${jobs.length}
מספר לידים: ${leads.length}
שירותים: ${products.map((p) => p.name).join(', ') || 'לא הוגדרו'}`;
      }
    }

    const systemPrompt = `אתה יועץ שיווק ועסקים מומחה לעסקי שירות ותורים בישראל. אתה מנתח נתוני עסק ונותן המלצות שיווק וייעול קונקרטיות, מעשיות, וברות-יישום מיידי.

עקרונות:
- כל הטקסט בעברית
- המלצות קונקרטיות (לא כלליות כמו "תשווק יותר")
- מותאם לשוק הישראלי 2026
- פרקטי - דברים שאפשר לעשות השבוע
- כולל רעיונות לפוסטים, מבצעים, שיפור תהליכים

החזר JSON בלבד:
{
  "headline": "תובנה מרכזית במשפט אחד",
  "recommendations": [
    {
      "category": "שיווק / תפעול / תמחור / שימור לקוחות",
      "icon": "אימוג'י מתאים",
      "title": "כותרת ההמלצה",
      "action": "מה לעשות בדיוק",
      "impact": "high / medium / low"
    }
  ],
  "postIdeas": ["רעיון לפוסט 1", "רעיון לפוסט 2", "רעיון לפוסט 3"],
  "quickWin": "דבר אחד מהיר שאפשר לעשות היום"
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `נתוני העסק:\n${businessSummary}\n\nתן המלצות שיווק וייעול.` }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[AI marketing]', err);
      return NextResponse.json({ error: 'AI נכשל' }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'תשובה לא תקינה' }, { status: 500 });

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.error('[AI marketing]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';
async function firestoreGet(collection: string, docId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return firestoreDecode(data.fields || {});
}
async function getAccessToken(): Promise<string> {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) return '';
  try {
    const sa = JSON.parse(saKey);
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsignedJwt = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    const crypto = await import('crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    const jwt = `${unsignedJwt}.${signer.sign(sa.private_key, 'base64url')}`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
    return (await tokenRes.json()).access_token || '';
  } catch { return ''; }
}
type FV = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null; arrayValue?: { values?: FV[] }; mapValue?: { fields?: Record<string, FV> } };
function firestoreDecode(fields: Record<string, FV>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}
function decodeValue(v: FV): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(decodeValue);
  if (v.mapValue) return firestoreDecode(v.mapValue.fields || {});
  return null;
}

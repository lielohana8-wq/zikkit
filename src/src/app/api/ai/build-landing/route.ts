import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai/build-landing
 *
 * Generates complete landing-page content for a business using Claude,
 * then stores it so it can be served at /site/[slug].
 *
 * Body: { bizId, businessName, industry, services, contactPhone, contactEmail }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bizId, businessName, industry, services = [], contactPhone, contactEmail } = body;

    if (!businessName) {
      return NextResponse.json({ error: 'חסר שם עסק' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI לא זמין כרגע' }, { status: 500 });
    }

    const servicesText = services.map((s: Record<string, unknown>) =>
      `${s.name}${s.price ? ` (₪${s.price})` : ''}`).join(', ');

    const systemPrompt = `אתה קופירייטר ומעצב דפי נחיתה מומחה לעסקי שירות בישראל. אתה יוצר תוכן מלא ומשכנע לדף נחיתה.

החזר JSON בלבד:
{
  "tagline": "סלוגן קצר וקולע",
  "heroTitle": "כותרת ראשית גדולה",
  "heroSubtitle": "תת-כותרת שמסבירה את הערך",
  "ctaText": "טקסט לכפתור הזמנה",
  "about": "פסקת 'עלינו' - 2-3 משפטים",
  "whyUs": [
    { "icon": "אימוג'י", "title": "כותרת", "desc": "תיאור קצר" }
  ],
  "servicesIntro": "משפט מקדים לרשימת השירותים",
  "testimonialPlaceholder": "המלצה לדוגמה שאפשר להחליף",
  "ctaSection": "טקסט מעורר לפעולה בתחתית הדף",
  "colorTheme": "צבע מומלץ לפי התחום (hex)",
  "seoDescription": "תיאור SEO ל-meta"
}`;

    const userMsg = `שם העסק: ${businessName}
תחום: ${industry || 'שירות'}
שירותים: ${servicesText || 'שירותים כלליים'}
${contactPhone ? `טלפון: ${contactPhone}` : ''}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[AI build-landing]', err);
      return NextResponse.json({ error: 'AI נכשל' }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'תשובה לא תקינה' }, { status: 500 });

    const landingContent = JSON.parse(jsonMatch[0]);

    // Generate a URL-safe slug
    const slug = (businessName as string)
      .toLowerCase()
      .replace(/[^\w\u0590-\u05FF]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'biz-' + Date.now();

    // Save the landing content + slug to the business doc (if bizId + service account present)
    if (bizId && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        await firestoreSetField('businesses', bizId, ['landing'], {
          ...landingContent,
          slug,
          businessName,
          industry: industry || '',
          services,
          contactPhone: contactPhone || '',
          contactEmail: contactEmail || '',
          generatedAt: new Date().toISOString(),
        });
        // Also create a slug -> bizId lookup so /site/[slug] resolves
        await firestoreSet('site_lookup', slug, { bizId, businessName });
      } catch (e) {
        console.warn('[build-landing] save failed:', e);
      }
    }

    return NextResponse.json({ ...landingContent, slug });
  } catch (e) {
    console.error('[AI build-landing]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zikkit-e87ff';
async function firestoreSet(collection: string, docId: string, data: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: (firestoreEncode(data) as { mapValue?: { fields?: Record<string, unknown> } }).mapValue?.fields || {} }) });
}
async function firestoreSetField(collection: string, docId: string, fieldPath: string[], value: unknown) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=${fieldPath.join('.')}`;
  const buildNested = (path: string[], val: unknown): Record<string, unknown> => path.length === 1 ? { [path[0]]: firestoreEncode(val) } : { [path[0]]: { mapValue: { fields: buildNested(path.slice(1), val) } } };
  await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: buildNested(fieldPath, value) }) });
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
function firestoreEncode(value: unknown): FV {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreEncode) } };
  if (typeof value === 'object') {
    const fields: Record<string, FV> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) fields[k] = firestoreEncode(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

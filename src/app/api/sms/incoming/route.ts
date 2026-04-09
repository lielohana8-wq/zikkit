import { NextRequest, NextResponse } from 'next/server';
import { buildSmsPrompt } from '@/lib/bot/promptBuilder';
import type { BusinessConfig } from '@/types/config';
import type { BotConfig } from '@/types/bot';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string || '';
    const from = formData.get('From') as string || '';
    const to = formData.get('To') as string || '';


    // Look up business by phone number
    const bizData = await lookupBusiness(to);
    if (!bizData) {
      return twimlSms('This number is not configured. Please contact support.');
    }

    const { cfg, botConfig, bizId } = bizData;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let reply = '';

    if (anthropicKey) {
      // Use Claude to generate smart reply
      const systemPrompt = buildSmsPrompt(cfg as BusinessConfig, (botConfig || {}) as BotConfig);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: 'user', content: body }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.content?.[0]?.text || '';
      }
    }

    if (!reply) {
      // Fallback auto-reply
      const isIL = (cfg.region as string) === 'IL';
      const bizName = (cfg.biz_name as string) || 'Business';
      reply = isIL
        ? `תודה שפנית ל${bizName}! קיבלנו את הודעתך ונחזור אליך בהקדם.`
        : `Thanks for reaching ${bizName}! We received your message and will get back to you soon.`;
    }

    // Log to botLog
    await logSms(bizId, from, body, reply, bizData.db);

    return twimlSms(reply);
  } catch (e) {
    console.error('[SMS] Error:', e);
    return twimlSms('Thanks for your message! We will get back to you soon.');
  }
}

function twimlSms(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function lookupBusiness(phoneNumber: string) {
  const PROJECT_ID = 'zikkit-5e554';
  const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const cleanNum = phoneNumber.replace(/[^+\d]/g, '');

  try {
    const lookupRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/phone_lookup/${encodeURIComponent(cleanNum)}?key=${API_KEY}`
    );
    if (!lookupRes.ok) return null;

    const lookupDoc = await lookupRes.json();
    const bizId = lookupDoc.fields?.bizId?.stringValue;
    if (!bizId) return null;

    const bizRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?key=${API_KEY}`
    );
    if (!bizRes.ok) return null;

    const bizDoc = await bizRes.json();
    const cfg = parseFields(bizDoc.fields?.cfg?.mapValue?.fields || {});
    const db = parseFields(bizDoc.fields?.db?.mapValue?.fields || {});
    const botConfig = cfg.botConfig as Record<string, unknown> || null;

    return { bizId, cfg, botConfig, db };
  } catch { return null; }
}

async function logSms(bizId: string, from: string, incoming: string, outgoing: string, db: Record<string, unknown>) {
  try {
    const PROJECT_ID = 'zikkit-5e554';
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

    const botLog = (db.botLog as unknown[]) || [];
    const newEntry = {
      time: new Date().toISOString(),
      msg: `💬 SMS from ${from}: "${incoming.slice(0, 80)}${incoming.length > 80 ? '...' : ''}"`,
      type: 'sms_in',
      callerPhone: from,
    };

    // Simple append — full merge would be better in production
  } catch (e) {
    console.error('[SMS] Log failed:', e);
  }
}

function parseFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    const v = val as Record<string, unknown>;
    if ('stringValue' in v) result[key] = v.stringValue;
    else if ('integerValue' in v) result[key] = parseInt(v.integerValue as string);
    else if ('doubleValue' in v) result[key] = v.doubleValue;
    else if ('booleanValue' in v) result[key] = v.booleanValue;
    else if ('mapValue' in v) result[key] = parseFields((v.mapValue as Record<string, unknown>).fields as Record<string, unknown> || {});
    else if ('arrayValue' in v) {
      const arr = (v.arrayValue as Record<string, unknown>)?.values as unknown[] || [];
      result[key] = arr.map((item) => {
        const i = item as Record<string, unknown>;
        if ('stringValue' in i) return i.stringValue;
        if ('mapValue' in i) return parseFields((i.mapValue as Record<string, unknown>).fields as Record<string, unknown> || {});
        return null;
      });
    }
  }
  return result;
}

import { NextRequest, NextResponse } from 'next/server';
import { buildVoicePrompt, parseLeadFromResponse, getSmsTemplates } from '@/lib/bot/promptBuilder';
import type { BusinessConfig } from '@/types/config';
import type { BotConfig } from '@/types/bot';

// Max conversation turns before graceful end
const MAX_TURNS = 12;

// In-memory conversation store (per CallSid) — in production use Redis
const conversations = new Map<string, { role: string; content: string }[]>();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const speechResult = formData.get('SpeechResult') as string || '';
    const callerPhone = formData.get('From') as string || '';
    const callSid = formData.get('CallSid') as string || '';

    const url = new URL(req.url);
    const bizId = url.searchParams.get('bizId') || '';
    const turn = parseInt(url.searchParams.get('turn') || '1');


    if (!speechResult.trim()) {
      return twimlGather(bizId, turn, 'I didn\'t catch that. Could you please repeat?', 'en-US', 'Polly.Amy');
    }

    // Fetch business config
    const bizData = await fetchBusinessConfig(bizId);
    if (!bizData) {
      return twimlEnd('Sorry, something went wrong. Please call back.', 'Polly.Amy');
    }

    const { cfg, botConfig } = bizData;
    const region = (cfg.region as string) || 'US';
    const voice = getTwimlVoice((botConfig?.voice as string) || 'nova', region);
    const language = region === 'IL' ? 'he-IL' : 'en-US';

    // Build/retrieve conversation history
    const convKey = callSid;
    if (!conversations.has(convKey)) {
      conversations.set(convKey, []);
    }
    const history = conversations.get(convKey)!;
    history.push({ role: 'user', content: speechResult });

    // If too many turns, gracefully end
    if (turn >= MAX_TURNS) {
      const endMsg = region === 'IL'
        ? 'תודה רבה! קיבלתי את כל הפרטים. מישהו מהצוות שלנו יחזור אליך בהקדם. יום טוב!'
        : 'Thank you! I have all your information. Someone from our team will contact you shortly. Have a great day!';
      conversations.delete(convKey);
      await createLeadFromConversation(bizId, callerPhone, history, cfg, bizData.db);
      return twimlEnd(endMsg, voice);
    }

    // Call Claude
    const systemPrompt = buildVoicePrompt(cfg as BusinessConfig, (botConfig || {}) as BotConfig);
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      // No API key — use a simple fallback
      const fallback = region === 'IL'
        ? 'תודה שפנית אלינו. אנא השאר את שמך וכתובתך ונחזור אליך בהקדם.'
        : 'Thank you for calling. Please leave your name and address and we\'ll get back to you soon.';
      return twimlGather(bizId, turn + 1, fallback, language, voice);
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!claudeResponse.ok) {
      console.error('[Voice Gather] Claude API error:', claudeResponse.status);
      return twimlGather(bizId, turn + 1, 'I apologize, could you repeat that?', language, voice);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text || '';

    // Parse lead data if ready
    const parsed = parseLeadFromResponse(rawText);
    history.push({ role: 'assistant', content: parsed.cleanResponse });

    if (parsed.isReady) {
      // Lead is ready — end call, create lead, send SMS
      conversations.delete(convKey);

      await createLeadFromConversation(
        bizId, callerPhone, history, cfg, bizData.db,
        parsed.name, parsed.address, parsed.description, parsed.urgency, parsed.category
      );

      // Send SMS to caller with portal link
      if ((botConfig as Record<string, unknown>)?.followUps) {
        const followUps = (botConfig as Record<string, unknown>).followUps as Record<string, unknown>;
        if (followUps?.smsAfterCall && cfg.twilio) {
          const twilio = cfg.twilio as Record<string, unknown>;
          await sendSms(
            twilio.phoneNumber as string,
            callerPhone,
            getSmsTemplates(cfg as BusinessConfig).afterCall.replace('{{portal_link}}', ''),
          );
        }
      }

      return twimlEnd(parsed.cleanResponse, voice);
    }

    // Continue conversation
    return twimlGather(bizId, turn + 1, parsed.cleanResponse, language, voice);
  } catch (e) {
    console.error('[Voice Gather] Error:', e);
    return twimlEnd('We experienced an error. Please call back. Goodbye.', 'Polly.Amy');
  }
}

// ─── Helpers ───

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml.trim(), { headers: { 'Content-Type': 'application/xml' } });
}

function twimlGather(bizId: string, turn: number, text: string, language: string, voice: string): NextResponse {
  return twimlResponse(`
    <Response>
      <Gather input="speech" action="/api/voice/gather?bizId=${bizId}&amp;turn=${turn}" method="POST" speechTimeout="3" language="${language}">
        <Say voice="${voice}">${escapeXml(text)}</Say>
      </Gather>
      <Say voice="${voice}">Are you still there? Goodbye.</Say>
      <Hangup />
    </Response>
  `);
}

function twimlEnd(text: string, voice: string): NextResponse {
  return twimlResponse(`
    <Response>
      <Say voice="${voice}">${escapeXml(text)}</Say>
      <Hangup />
    </Response>
  `);
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTwimlVoice(botVoice: string, region: string): string {
  const voices: Record<string, Record<string, string>> = {
    US: { alloy: 'Polly.Joanna', echo: 'Polly.Matthew', nova: 'Polly.Amy', shimmer: 'Polly.Salli', onyx: 'Polly.Brian' },
    IL: { alloy: 'Polly.Amy', echo: 'Polly.Matthew', nova: 'Polly.Amy', shimmer: 'Polly.Amy', onyx: 'Polly.Brian' },
  };
  return voices[region]?.[botVoice] || 'Polly.Amy';
}

// ── Create Lead in Firestore ──
async function createLeadFromConversation(
  bizId: string,
  callerPhone: string,
  history: { role: string; content: string }[],
  cfg: Record<string, unknown>,
  db: Record<string, unknown>,
  name?: string,
  address?: string,
  description?: string,
  urgency?: string,
  category?: string,
) {
  try {
    const PROJECT_ID = 'zikkit-5e554';
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

    // Build new lead
    const leads = (db.leads as unknown[]) || [];
    const maxId = leads.reduce((m: number, l: unknown) => {
      const lead = l as Record<string, unknown>;
      return Math.max(m, (lead.id as number) || 0);
    }, 0);

    const transcript = history.map((m) => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.content}`).join('\n');

    const newLead = {
      id: maxId + 1,
      name: name || 'Caller ' + callerPhone.slice(-4),
      phone: callerPhone,
      address: address || '',
      desc: description || 'Phone inquiry via AI bot',
      status: urgency === 'urgent' ? 'hot' : 'new',
      source: 'ai_bot',
      created: new Date().toISOString(),
      notes: `Auto-created by AI Voice Bot\nCategory: ${category || 'general'}\nUrgency: ${urgency || 'normal'}\n\n--- Transcript ---\n${transcript}`,
      tags: [category || 'bot_lead'].filter(Boolean),
    };

    // Add to leads array
    const updatedLeads = [...(leads as Record<string, unknown>[]), newLead];

    // Add bot log entry
    const botLog = (db.botLog as unknown[]) || [];
    const newLog = {
      time: new Date().toISOString(),
      msg: `📞 ${name || callerPhone}: ${description || 'Phone inquiry'} [${urgency || 'normal'}]`,
      type: 'call_in',
      callerPhone,
      leadId: newLead.id,
      transcript,
    };
    const updatedLog = [...(botLog as Record<string, unknown>[]), newLog];

    // Merge update into Firestore
    const updateUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?updateMask.fieldPaths=db.leads&updateMask.fieldPaths=db.botLog&key=${API_KEY}`;

    await fetch(updateUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          db: {
            mapValue: {
              fields: {
                ...objectToFirestoreFields(db),
                leads: { arrayValue: { values: updatedLeads.map((l) => ({ mapValue: { fields: objectToFirestoreFields(l as Record<string, unknown>) } })) } },
                botLog: { arrayValue: { values: updatedLog.map((l) => ({ mapValue: { fields: objectToFirestoreFields(l as Record<string, unknown>) } })) } },
              },
            },
          },
        },
      }),
    });

  } catch (e) {
    console.error('[Voice] Failed to create lead:', e);
  }
}

function objectToFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) fields[key] = { nullValue: null };
    else if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (Array.isArray(val)) {
      fields[key] = { arrayValue: { values: val.map((v) => {
        if (typeof v === 'string') return { stringValue: v };
        if (typeof v === 'number') return { integerValue: String(v) };
        if (typeof v === 'object' && v) return { mapValue: { fields: objectToFirestoreFields(v as Record<string, unknown>) } };
        return { stringValue: String(v) };
      })}};
    }
    else if (typeof val === 'object') fields[key] = { mapValue: { fields: objectToFirestoreFields(val as Record<string, unknown>) } };
  }
  return fields;
}

// ── Send SMS via Twilio ──
async function sendSms(from: string, to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    console.warn('[SMS] Master Twilio credentials not configured');
    return;
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('[SMS] Send failed:', e);
  }
}

async function fetchBusinessConfig(bizId: string) {
  const PROJECT_ID = 'zikkit-5e554';
  const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    const cfg = parseFields(doc.fields?.cfg?.mapValue?.fields || {});
    const db = parseFields(doc.fields?.db?.mapValue?.fields || {});
    const botConfig = cfg.botConfig as Record<string, unknown> || null;
    return { cfg, botConfig, db };
  } catch { return null; }
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
        if ('integerValue' in i) return parseInt(i.integerValue as string);
        if ('mapValue' in i) return parseFields((i.mapValue as Record<string, unknown>).fields as Record<string, unknown> || {});
        return null;
      });
    }
  }
  return result;
}

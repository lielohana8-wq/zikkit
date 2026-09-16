import type { BusinessConfig, BotLogEntry } from '@/types/config';
import type { BotConfig } from '@/types/bot';

// ─── Business type specific question templates ───
const BUSINESS_QUESTIONS: Record<string, { questions: string[]; urgencyKeywords: string[]; categories: string[] }> = {
  hvac: {
    questions: [
      'What issue are you experiencing? (no cooling, no heating, strange noise, leak, thermostat issue)',
      'What type of system? (central AC, mini split, furnace, heat pump)',
      'How old is the unit approximately?',
      'Is it a residential or commercial property?',
    ],
    urgencyKeywords: ['no heat', 'no cooling', 'gas smell', 'carbon monoxide', 'flood', 'burst', 'emergency'],
    categories: ['repair', 'installation', 'maintenance', 'duct_cleaning', 'thermostat'],
  },
  plumbing: {
    questions: [
      'What is the plumbing issue? (leak, clog, no hot water, running toilet, burst pipe)',
      'Where is the problem? (kitchen, bathroom, basement, outdoor)',
      'Is there active water damage or flooding?',
    ],
    urgencyKeywords: ['flood', 'burst pipe', 'sewage', 'no water', 'gas', 'overflow', 'emergency'],
    categories: ['leak', 'clog', 'water_heater', 'toilet', 'faucet', 'pipe', 'drain', 'sewer'],
  },
  electrical: {
    questions: [
      'What electrical issue are you experiencing? (no power, sparking, flickering, breaker tripping)',
      'Is the issue in a specific area or the whole property?',
      'Do you see any burning smell or exposed wires?',
    ],
    urgencyKeywords: ['sparking', 'burning smell', 'no power', 'exposed wire', 'shock', 'emergency'],
    categories: ['outlet', 'panel', 'wiring', 'lighting', 'breaker', 'generator', 'installation'],
  },
  garage: {
    questions: [
      'What is the issue with the garage door? (stuck, noisy, remote not working, off track, broken spring)',
      'Is it a single or double garage door?',
      'Can you still open/close it manually?',
    ],
    urgencyKeywords: ['stuck open', 'stuck closed', 'broken spring', 'off track', 'car trapped', 'emergency'],
    categories: ['spring', 'opener', 'track', 'panel', 'remote', 'installation', 'maintenance'],
  },
  chimney: {
    questions: [
      'What chimney service do you need? (cleaning, inspection, repair, installation, cap)',
      'When was the last time the chimney was cleaned/inspected?',
      'Are you experiencing smoke coming into the house?',
    ],
    urgencyKeywords: ['smoke inside', 'fire', 'crack', 'collapse', 'carbon monoxide', 'emergency'],
    categories: ['sweep', 'inspection', 'repair', 'cap', 'liner', 'installation', 'waterproofing'],
  },
  locksmith: {
    questions: [
      'What locksmith service do you need? (locked out, lock change, key copy, broken lock, installation)',
      'Is this for a home, business, or vehicle?',
      'Are you currently locked out right now?',
    ],
    urgencyKeywords: ['locked out', 'break-in', 'broken lock', 'emergency', 'stuck', 'now'],
    categories: ['lockout', 'rekey', 'lock_change', 'key_copy', 'installation', 'safe', 'car_lockout'],
  },
  general: {
    questions: [
      'What type of service do you need?',
      'Can you describe the issue?',
      'Is this urgent or can it be scheduled?',
    ],
    urgencyKeywords: ['emergency', 'urgent', 'right now', 'asap', 'flooding', 'danger'],
    categories: ['repair', 'installation', 'maintenance', 'inspection', 'other'],
  },
};

// ─── Region-specific templates ───
const REGION_TEMPLATES = {
  US: {
    addressPrompt: 'What is your address? (street, city, state, ZIP code)',
    phoneFormat: '(XXX) XXX-XXXX',
    currencySymbol: '$',
    greeting_lang: 'en',
  },
  IL: {
    addressPrompt: 'מה הכתובת שלך? (רחוב, מספר, עיר)',
    phoneFormat: '05X-XXX-XXXX',
    currencySymbol: '₪',
    greeting_lang: 'he',
  },
};

// ─── Build the system prompt for Claude ───
export function buildVoicePrompt(cfg: BusinessConfig, botCfg: BotConfig): string {
  const region = cfg.region || 'US';
  const bizType = cfg.biz_type || 'general';
  const bizQuestions = BUSINESS_QUESTIONS[bizType] || BUSINESS_QUESTIONS.general;
  const regionTpl = REGION_TEMPLATES[region] || REGION_TEMPLATES.US;
  const lang = region === 'IL' ? 'Hebrew' : 'English';
  const currency = cfg.currency || (region === 'IL' ? 'ILS' : 'USD');
  const currencySymbol = currency === 'ILS' ? '₪' : '$';

  // Build flows section
  const flowsText = (botCfg.flows || []).map((f) =>
    `- If customer says "${f.trigger}" → respond: "${f.response}"${f.action ? ` [Action: ${f.action}]` : ''}`
  ).join('\n');

  return `You are the AI phone receptionist for "${cfg.biz_name || 'the business'}".

## CRITICAL RULES
- You are a RECEPTIONIST, NOT a technician. NEVER diagnose problems or suggest fixes.
- Your job: schedule appointments, ask questions, collect information, and be helpful.
- Speak in ${lang} only.
- Be warm, professional, concise. Keep responses short (1-3 sentences max for voice).
- If the customer asks for a price → give ONLY the service fee: ${currencySymbol}${botCfg.serviceFee || 'contact us for pricing'}.
- If the customer asks about availability → "${cfg.businessHours || 'We are available during business hours.'}".
- NEVER say "I'm an AI" — you are "${cfg.biz_name}'s receptionist".

## BUSINESS INFO
- Business: ${cfg.biz_name || 'Business'}
- Type: ${bizType}
- Phone: ${cfg.biz_phone || ''}
- Address: ${cfg.biz_address || ''}
- Service Area: ${cfg.serviceArea?.label || 'Contact us for coverage area'}
- Service Fee: ${currencySymbol}${botCfg.serviceFee || 'varies'}
- Hours: ${cfg.businessHours || 'Standard business hours'}
${botCfg.promotions ? `- Current Promotions: ${botCfg.promotions}` : ''}
${botCfg.talkingPoints ? `- Key Points: ${botCfg.talkingPoints}` : ''}

## YOUR GREETING
"${botCfg.greeting || `Thank you for calling ${cfg.biz_name}. How can I help you today?`}"

## INFORMATION TO COLLECT (in this order)
1. **What they need** — Listen to their issue, classify it
2. **Name** — "May I have your name?"
3. **Address** — "${regionTpl.addressPrompt}"
${region === 'US' ? '4. **ZIP Code** — Verify it\'s in our service area' : '4. **City** — Verify it\'s in our service area'}
5. **Contact details** — Confirm their phone number
6. **Scheduling** — "When would be a good time for our technician to come?"
7. **Urgency** — If keywords suggest urgency, flag as HIGH priority

## SMART QUESTIONS FOR ${bizType.toUpperCase()}
${bizQuestions.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## URGENCY DETECTION
Flag as URGENT if customer mentions: ${bizQuestions.urgencyKeywords.join(', ')}

## SERVICE AREA CHECK
${cfg.serviceArea?.values?.length ? `We serve these areas: ${cfg.serviceArea.values.join(', ')}` : 'We serve all areas — confirm with the customer.'}
If customer is outside service area, politely let them know and suggest they call a local provider.

${flowsText ? `## CUSTOM FLOWS\n${flowsText}` : ''}

## CONVERSATION END
When you have all the information, say something like:
"${region === 'IL'
  ? `תודה [שם]! קיבלתי את כל הפרטים. מישהו מהצוות שלנו יחזור אליך בהקדם. יום טוב!`
  : `Thank you [name]! I have all your information. Someone from our team will get back to you shortly. Have a great day!`}"

## RESPONSE FORMAT
Always respond as natural speech. No markdown, no bullets, no formatting.
Keep each response to 1-3 sentences — this is a phone call, not an essay.
When you have collected all required information, add the marker [LEAD_READY] at the very end of your response (invisible to the caller).
Include the collected data as: [LEAD_DATA:name|phone|address|description|urgency|category]`;
}

// ─── Build SMS auto-reply prompt ───
export function buildSmsPrompt(cfg: BusinessConfig, botCfg: BotConfig): string {
  const region = cfg.region || 'US';
  const lang = region === 'IL' ? 'Hebrew' : 'English';

  return `You are the SMS auto-responder for "${cfg.biz_name}".

## RULES
- Respond in ${lang}.
- Keep responses under 160 characters (1 SMS).
- Be helpful, professional, concise.
- You are a receptionist — collect info, schedule, answer basic questions.
- Service fee: ${cfg.currency === 'ILS' ? '₪' : '$'}${botCfg.serviceFee || 'varies'}
- Hours: ${cfg.businessHours || 'Business hours'}

## GOAL
If someone texts about needing service: ask for their name, address, and describe the issue.
If they provide all info: confirm and say someone will call them back.
If they ask about price/hours: answer from the business info above.

Always end with the business name.`;
}

// ─── Parse lead data from Claude's response ───
export function parseLeadFromResponse(response: string): {
  isReady: boolean;
  name?: string;
  phone?: string;
  address?: string;
  description?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  cleanResponse: string;
} {
  const isReady = response.includes('[LEAD_READY]');
  let cleanResponse = response.replace('[LEAD_READY]', '').trim();

  const leadMatch = response.match(/\[LEAD_DATA:([^\]]+)\]/);
  let name, phone, address, description, urgency: 'low' | 'normal' | 'high' | 'urgent' = 'normal', category;

  if (leadMatch) {
    const parts = leadMatch[1].split('|');
    name = parts[0]?.trim() || undefined;
    phone = parts[1]?.trim() || undefined;
    address = parts[2]?.trim() || undefined;
    description = parts[3]?.trim() || undefined;
    const urg = parts[4]?.trim().toLowerCase();
    if (urg === 'urgent' || urg === 'high' || urg === 'low') urgency = urg;
    category = parts[5]?.trim() || undefined;
    cleanResponse = cleanResponse.replace(leadMatch[0], '').trim();
  }

  return { isReady, name, phone, address, description, urgency, category, cleanResponse };
}

// ─── Generate SMS templates ───
export function getSmsTemplates(cfg: BusinessConfig) {
  const isIL = cfg.region === 'IL';
  const bizName = cfg.biz_name || 'Business';

  return {
    afterCall: isIL
      ? `תודה שפנית ל${bizName}! קיבלנו את פנייתך ונחזור אליך בהקדם. צפה בפרטים: {{portal_link}}`
      : `Thanks for contacting ${bizName}! We received your request and will get back to you soon. View details: {{portal_link}}`,
    leadCreated: isIL
      ? `📞 ליד חדש מהבוט: {{name}}, {{description}}, {{urgency}}. {{address}}`
      : `📞 New bot lead: {{name}}, {{description}}, {{urgency}}. {{address}}`,
    followUp: isIL
      ? `שלום {{name}}, תזכורת מ${bizName} — פנייתך עדיין פתוחה. נשמח לעזור! {{biz_phone}}`
      : `Hi {{name}}, reminder from ${bizName} — your request is still open. We're happy to help! {{biz_phone}}`,
    noAnswer: isIL
      ? `שלום, ניסינו להשיג אותך מ${bizName}. אנא חזור/י אלינו: {{biz_phone}}`
      : `Hi, we tried reaching you from ${bizName}. Please call us back: {{biz_phone}}`,
  };
}

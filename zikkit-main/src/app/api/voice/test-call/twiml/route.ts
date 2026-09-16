import { NextRequest, NextResponse } from 'next/server';

// When the test call is answered, this TwiML instructs Twilio to greet and gather speech
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const bizId = url.searchParams.get('bizId') || '';

  // Use the owner's business config if available, otherwise generic test greeting
  let greeting = 'Hello! This is a test call from your Zikkit AI bot. How can I help you today?';
  let voice = 'Polly.Amy';
  let language = 'en-US';

  if (bizId) {
    try {
      const PROJECT_ID = 'zikkit-5e554';
      const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
      const bizUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/businesses/${bizId}?key=${API_KEY}`;
      const res = await fetch(bizUrl);
      if (res.ok) {
        const doc = await res.json();
        const cfg = doc.fields?.cfg?.mapValue?.fields || {};
        const bizName = cfg.biz_name?.stringValue || '';
        const region = cfg.region?.stringValue || 'US';

        if (region === 'IL') {
          greeting = `שלום! תודה שהתקשרת ל${bizName || 'העסק שלנו'}. איך אפשר לעזור?`;
          language = 'he-IL';
        } else {
          greeting = `Hello! Thank you for calling ${bizName || 'us'}. How can I help you today?`;
        }
      }
    } catch {
      // Use defaults
    }
  }

  const gatherUrl = bizId ? `/api/voice/gather?bizId=${bizId}&turn=1` : `/api/voice/gather?bizId=test&turn=1`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${gatherUrl}" method="POST" speechTimeout="3" language="${language}">
    <Say voice="${voice}">${escapeXml(greeting)}</Say>
  </Gather>
  <Say voice="${voice}">${language === 'he-IL' ? 'לא שמעתי. להתראות!' : 'I didnt hear anything. Goodbye!'}</Say>
  <Hangup />
</Response>`;

  return new NextResponse(twiml.trim(), {
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

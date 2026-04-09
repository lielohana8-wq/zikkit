import { NextRequest, NextResponse } from 'next/server';
import { buildQuoteEmail, buildReceiptEmail, buildPortalEmail } from '@/lib/email/templates';
import type { Quote, Job } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Email not configured. Add RESEND_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { type, to, quote, job, bizName, bizPhone, bizEmail, currency, taxRate, footer, fromName, portalUrl, clientName, docType, docLabel } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Missing "to" or "type" field.' }, { status: 400 });
    }

    let subject = '';
    let html = '';

    if (type === 'quote' && quote) {
      const result = buildQuoteEmail(quote as Quote, bizName || 'Business', bizPhone || '', bizEmail || '', currency || 'USD', footer || '');
      subject = result.subject;
      html = result.html;
    } else if (type === 'receipt' && job) {
      const result = buildReceiptEmail(job as Job, bizName || 'Business', bizPhone || '', bizEmail || '', currency || 'USD', taxRate || 0, footer || '');
      subject = result.subject;
      html = result.html;
    } else if (type === 'portal' && portalUrl) {
      const result = buildPortalEmail(
        docType || 'job',
        clientName || 'Customer',
        portalUrl,
        docLabel || '',
        bizName || 'Business',
        bizPhone || '',
        bizEmail || '',
      );
      subject = result.subject;
      html = result.html;
    } else {
      return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
    }

    const fromAddr = process.env.RESEND_FROM_EMAIL || 'Zikkit <onboarding@resend.dev>';
    const from = fromName ? `${fromName} <${fromAddr.includes('<') ? fromAddr.split('<')[1].replace('>', '') : fromAddr}>` : fromAddr;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Zikkit Email] Resend error:', data);
      return NextResponse.json({ error: data.message || 'Failed to send email.' }, { status: res.status });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('[Zikkit Email] Error:', e);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}
